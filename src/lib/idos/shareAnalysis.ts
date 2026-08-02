import * as cheerio from "cheerio";
import { buildBootstrapFromHtml, findFirstPriceKc, HttpSession, IdosBootstrap } from "./httpSession";
import { discoverEndpointsFromBundles, DiscoveredEndpoint } from "./endpointDiscovery";
import { IdosTrip, parseConnections } from "./parseConnections";

type FarePreset = "adult" | "child_6_15" | "student_isic";

interface PassengerTypeEntry {
  iPassengerID: number;
  sDescription?: string | null;
  aiReductionID?: number[] | null;
}

interface ReductionEntry {
  iReductionID: number;
  sDescription?: string | null;
}

interface PassengerTypeListModel {
  iDefaultPassengerID?: number;
  aoPassengerTypes?: PassengerTypeEntry[];
  aoReductions?: ReductionEntry[];
}

interface PassengerTypeListResponse {
  passengerTypeList?: PassengerTypeListModel;
  hasError?: boolean;
  error?: string;
}

interface FareContext {
  ajaxBaseUrl: string;
  handle: number;
  connId: number;
  handleThere: number;
  connIdThere: number;
  priceHandle: string;
  refererUrl?: string;
  ajaxBaseUrlAlt?: string;
}

function normalizeShareUrl(input: string): string {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("p=")) return `https://idos.cz/vlakyautobusymhdvse/spojeni/prehled/?${trimmed}`;
  if (trimmed.startsWith("/")) return `https://idos.cz${trimmed}`;
  if (!trimmed.includes("idos.cz") && !trimmed.includes("?")) {
    return `https://idos.cz/vlakyautobusymhdvse/spojeni/prehled/?p=${encodeURIComponent(trimmed)}`;
  }
  return `https://${trimmed}`;
}

function normalizeTextForMatch(text: string): string {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function priceFromAnyContentNormalized(text: string): string | null {
  const direct = findFirstPriceKc(text);
  if (direct) return direct;

  const jsonPrice = (() => {
    try {
      const m = text.match(/(\{[\s\S]{0,2000}\})/);
      if (!m) return null;
      const obj = JSON.parse(m[1]);
      const stack: any[] = [obj];
      while (stack.length) {
        const cur = stack.pop();
        if (!cur) continue;
        if (typeof cur === "string") {
          const p = findFirstPriceKc(cur);
          if (p) return p;
        } else if (typeof cur === "number") {
          if (cur > 0 && cur < 100000) return `${cur} Kč`;
        } else if (typeof cur === "object") {
          for (const v of Object.values(cur)) stack.push(v);
        }
      }
    } catch {
      return null;
    }
    return null;
  })();
  if (jsonPrice) return jsonPrice;

  const fallback = text.match(/(\d[\d\s]*)\s*(?:KÄ|Kč|Kc)/);
  if (fallback) return `${fallback[1].trim().replace(/\s+/g, " ")} Kč`;
  return null;
}

function parseJsonpPayload(text: string): any | null {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  const firstParen = trimmed.indexOf("(");
  const lastParen = trimmed.lastIndexOf(")");
  if (firstParen > 0 && lastParen > firstParen) {
    const inside = trimmed.slice(firstParen + 1, lastParen);
    try {
      return JSON.parse(inside);
    } catch {
      return null;
    }
  }
  return null;
}

function appendJqParams(out: URLSearchParams, key: string, value: any) {
  if (value === null || value === undefined) return;
  if (typeof value === "boolean") return void out.append(key, value ? "true" : "false");
  if (typeof value === "number" || typeof value === "string") return void out.append(key, String(value));
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) appendJqParams(out, `${key}[${i}]`, value[i]);
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) appendJqParams(out, `${key}[${k}]`, v);
  }
}

function extractHiddenInputs(html: string): Record<string, string> {
  const $ = cheerio.load(html);
  const inputs: Record<string, string> = {};
  $("input[type='hidden']").each((_, el) => {
    const name = String($(el).attr("name") || "").trim();
    const value = String($(el).attr("value") || "").trim();
    if (name) inputs[name] = value;
  });
  return inputs;
}

function extractLabeledFaresFromHtml(html: string): { adult?: string; child?: string; isic?: string } {
  const $ = cheerio.load(html);
  const text = normalizeTextForMatch($.root().text());

  const pick = (label: string): string | undefined => {
    const idx = text.indexOf(label);
    if (idx < 0) return undefined;
    const win = text.slice(idx, idx + 200);
    const m = win.match(/(\d[\d\s]*)\s*(kc|kč|czk)/);
    if (!m) return undefined;
    return `${m[1].trim().replace(/\s+/g, " ")} Kč`;
  };

  return {
    adult: pick("dospely") || pick("dospelý") || pick("adult"),
    child: pick("dite") || pick("dítě") || pick("child"),
    isic: pick("isic") || pick("student"),
  };
}

async function fetchShareHtml(session: HttpSession, shareUrl: string): Promise<string> {
  const res = await session.get(shareUrl, 6000);
  if (res.status < 200 || res.status >= 300) throw new Error(`Failed to load share link (${res.status}).`);
  return res.text;
}

function presetLabels(preset: FarePreset): { passenger: string; reduction?: string } {
  if (preset === "adult") return { passenger: "dospělý (26-59 let)" };
  if (preset === "child_6_15") return { passenger: "dítě (6-15 let)" };
  return { passenger: "mládež (18-25 let)", reduction: "ISIC" };
}

function normalizeForContains(text: string): string {
  return normalizeTextForMatch(text).replace(/[^\w]+/g, "");
}

function pickPassengerId(list: PassengerTypeListModel | null, preset: FarePreset): number | null {
  const types = list?.aoPassengerTypes || [];
  if (types.length === 0) return null;
  const describe = (p: PassengerTypeEntry) => normalizeForContains(p.sDescription || "");
  const pick = (fn: (s: string) => boolean) => types.find((t) => fn(describe(t)))?.iPassengerID ?? null;

  if (preset === "adult") return pick((s) => s.includes("dospely") || s.includes("adult"));
  if (preset === "child_6_15") return pick((s) => s.includes("dit") && (s.includes("6") || s.includes("10") || s.includes("15")));
  return (
    pick((s) => s.includes("mladez") && (s.includes("18") || s.includes("25"))) ||
    pick((s) => s.includes("student")) ||
    pick((s) => s.includes("mladez"))
  );
}

function pickIsicReductionId(list: PassengerTypeListModel | null): number | null {
  const reds = list?.aoReductions || [];
  for (const r of reds) {
    const s = normalizeForContains(r.sDescription || "");
    if (s.includes("isic")) return r.iReductionID;
  }
  return null;
}

function buildPassengersForPreset(list: PassengerTypeListModel | null, preset: FarePreset): Array<Record<string, any>> | null {
  const passengerId = pickPassengerId(list, preset);
  if (typeof passengerId !== "number") return null;
  const reductionIds = preset === "student_isic" ? [pickIsicReductionId(list)].filter(Boolean) : [];
  return [{ iPassengerID: passengerId, aiReductionID: reductionIds }];
}

function buildPassengersHardcoded(preset: FarePreset): Array<Record<string, any>> {
  // IDs verified in external route-inspect (2026-03): adult 40, child 24, student 32 + ISIC 2
  if (preset === "adult") return [{ iPassengerID: 40, aiReductionID: [] }];
  if (preset === "child_6_15") return [{ iPassengerID: 24, aiReductionID: [] }];
  return [{ iPassengerID: 32, aiReductionID: [2] }];
}

async function fetchPassengerTypeList(
  session: HttpSession,
  shareUrl: string,
  bootstrap: IdosBootstrap
): Promise<PassengerTypeListModel | null> {
  const pageUrl = new URL(shareUrl);
  const candidates: string[] = [];
  if (bootstrap.ajaxBaseUrl) {
    candidates.push(new URL("GetPassengerTypeList", new URL(bootstrap.ajaxBaseUrl, pageUrl.origin)).toString());
  }
  if (bootstrap.appBaseUrl) {
    try {
      candidates.push(new URL("Ajax/GetPassengerTypeList", bootstrap.appBaseUrl).toString());
    } catch {
      // ignore
    }
  }
  candidates.push(new URL("/vlakyautobusymhdvse/Ajax/GetPassengerTypeList", pageUrl.origin).toString());

  for (const url of candidates) {
    try {
      const res = await session.request(url, {
        method: "GET",
        timeoutMs: 2500,
        headers: { accept: "application/json, text/javascript, */*; q=0.01" },
      });
      if (res.status < 200 || res.status >= 300) continue;
      const obj = parseJsonpPayload(res.text) as PassengerTypeListResponse | null;
      if (obj?.passengerTypeList?.aoPassengerTypes?.length) return obj.passengerTypeList;
    } catch {
      // ignore
    }
  }
  return null;
}

function parseFareContextFromResultsHtml(resultsHtml: string): { fareContext: Partial<FareContext> | null } {
  const $ = cheerio.load(resultsHtml);
  const any = $("[data-pricehandle]").first();
  if (any.length === 0) return { fareContext: null };
  const priceHandle = String(any.attr("data-pricehandle") || "").trim();
  return { fareContext: { priceHandle } };
}

function getResultsUrl(shareUrl: string, bootstrap: IdosBootstrap): string | null {
  if (!bootstrap.raw) return null;
  const searchUrl = bootstrap.raw?.searchUrl;
  if (typeof searchUrl === "string" && searchUrl.includes("spojeni/vysledky")) {
    return new URL(searchUrl, new URL(shareUrl).origin).toString();
  }
  return null;
}

async function fetchResultsHtmlForHandle(
  session: HttpSession,
  shareUrl: string,
  bootstrap: IdosBootstrap
): Promise<string | null> {
  if (typeof bootstrap.handle !== "number") return null;
  const pageUrl = new URL(shareUrl);
  const h = bootstrap.handle;
  const url = new URL("/vlakyautobusymhdvse/spojeni/vysledky/", pageUrl.origin);
  url.searchParams.set("h", String(h));
  const res = await session.get(url.toString(), 4000);
  if (res.status < 200 || res.status >= 300) return null;
  return res.text;
}

async function fetchPriceOffer(
  session: HttpSession,
  fare: FareContext,
  passengers: Array<Record<string, any>>,
  refererUrl?: string
): Promise<string | null> {
  const bodyParams = new URLSearchParams();
  const data: Record<string, any> = {
    handle: fare.handle,
    connId: fare.connId,
    passengers,
    handleThere: fare.handleThere || 0,
    connIdThere: fare.connIdThere || 0,
    format: "json",
  };
  for (const [k, v] of Object.entries(data)) appendJqParams(bodyParams, k, v);

  const tryOneBase = async (base: string) => {
    const endpoint = new URL("GetPriceOffer", base);
    if (!endpoint.searchParams.has("callback")) endpoint.searchParams.set("callback", "cb");
    const res = await session.request(endpoint.toString(), {
      method: "POST",
      timeoutMs: 6000,
      body: bodyParams.toString(),
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        referer: refererUrl || fare.refererUrl || base,
        accept: "application/json, text/javascript, */*; q=0.01",
      },
    });
    if (res.status < 200 || res.status >= 300) return null;
    const head = res.text.slice(0, 200).toLowerCase();
    if (head.includes("<!doctype") || head.includes("<html")) return null;
    return priceFromAnyContentNormalized(res.text);
  };

  const primary = await tryOneBase(fare.ajaxBaseUrl);
  if (primary) return primary;
  if (fare.ajaxBaseUrlAlt && fare.ajaxBaseUrlAlt !== fare.ajaxBaseUrl) {
    const alt = await tryOneBase(fare.ajaxBaseUrlAlt);
    if (alt) return alt;
  }
  return null;
}

async function tryEndpointsForPreset(
  session: HttpSession,
  shareUrl: string,
  bootstrap: IdosBootstrap,
  preset: FarePreset,
  discovered: DiscoveredEndpoint[],
  hiddenInputs: Record<string, string>
): Promise<string | null> {
  if (discovered.length === 0) return null;
  const origin = new URL(shareUrl).origin;
  const list = await fetchPassengerTypeList(session.clone(), shareUrl, bootstrap);
  const passengers = buildPassengersForPreset(list, preset) || buildPassengersHardcoded(preset);

  for (const ep of discovered) {
    if (ep.score <= 0) continue;
    const url = new URL(ep.path, origin);
    const baseParams: Record<string, any> = {
      handle: bootstrap.handle ?? "",
      connId: bootstrap.connIds?.[0] ?? "",
      handleThere: (bootstrap.raw?.handleConnThere as number) || 0,
      connIdThere: (bootstrap.raw?.connIdThere as number) || 0,
      passengers,
      ...hiddenInputs,
      format: "json",
    };

    for (const method of ep.methods) {
      try {
        if (method === "GET") {
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(baseParams)) appendJqParams(params, k, v);
          url.search = params.toString();
          const res = await session.get(url.toString(), 3000);
          if (res.status >= 200 && res.status < 300) {
            const price = priceFromAnyContentNormalized(res.text);
            if (price) return price;
          }
        } else {
          const body = new URLSearchParams();
          for (const [k, v] of Object.entries(baseParams)) appendJqParams(body, k, v);
          const res = await session.request(url.toString(), {
            method: "POST",
            timeoutMs: 3000,
            body: body.toString(),
            headers: {
              "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
              "x-requested-with": "XMLHttpRequest",
            },
          });
          if (res.status >= 200 && res.status < 300) {
            const price = priceFromAnyContentNormalized(res.text);
            if (price) return price;
          }
        }
      } catch {
        // ignore
      }
    }
  }
  return null;
}

export async function analyzeShareLink(rawUrl: string): Promise<IdosTrip> {
  const url = normalizeShareUrl(rawUrl);
  if (!url) throw new Error("Invalid URL/token input.");

  const session = new HttpSession();
  const html = await fetchShareHtml(session, url);
  const trip = parseConnections(html)[0];
  if (!trip) throw new Error("No connection found on share page.");

  const bootstrap = buildBootstrapFromHtml(html);
  const hiddenInputs = extractHiddenInputs(html);
  const origin = new URL(url).origin;
  const fareFromBootstrap: FareContext | null =
    typeof bootstrap.handle === "number" && bootstrap.connIds.length > 0
      ? {
          handle: bootstrap.handle,
          connId: bootstrap.connIds[0],
          ajaxBaseUrl: new URL(bootstrap.ajaxBaseUrl || "/vlakyautobusymhdvse/Ajax/", origin).toString(),
          ajaxBaseUrlAlt: bootstrap.ajaxBaseUrl ? new URL(bootstrap.ajaxBaseUrl, origin).toString() : undefined,
          handleThere: (bootstrap.raw?.handleConnThere as number) || 0,
          connIdThere: (bootstrap.raw?.connIdThere as number) || 0,
          priceHandle: "",
        }
      : null;

  if (trip.detailLink) {
    try {
      const detailRes = await session.get(trip.detailLink, 900);
      const labeled = extractLabeledFaresFromHtml(detailRes.text);
      if (labeled.adult) trip.priceAdult = labeled.adult;
      if (labeled.child) trip.priceChild = labeled.child;
      if (labeled.isic) trip.priceIsic = labeled.isic;
    } catch {
      // ignore
    }
  }

  const paxList = await fetchPassengerTypeList(session.clone(), url, bootstrap);
  const buildPassengers = (preset: FarePreset) =>
    buildPassengersForPreset(paxList, preset) || buildPassengersHardcoded(preset);

  if (fareFromBootstrap) {
    const [adult, child, isic] = await Promise.all([
      fetchPriceOffer(session.clone(), fareFromBootstrap, buildPassengers("adult"), url),
      fetchPriceOffer(session.clone(), fareFromBootstrap, buildPassengers("child_6_15"), url),
      fetchPriceOffer(session.clone(), fareFromBootstrap, buildPassengers("student_isic"), url),
    ]);
    if (adult) trip.priceAdult = adult;
    if (child) trip.priceChild = child;
    if (isic) trip.priceIsic = isic;
  }

  if (!trip.priceAdult || !trip.priceChild || !trip.priceIsic) {
    const discovered = await discoverEndpointsFromBundles(session.clone(), html, url, bootstrap, { maxBundles: 2 });
    if (!trip.priceAdult) trip.priceAdult = (await tryEndpointsForPreset(session.clone(), url, bootstrap, "adult", discovered, hiddenInputs)) ?? undefined;
    if (!trip.priceChild) trip.priceChild = (await tryEndpointsForPreset(session.clone(), url, bootstrap, "child_6_15", discovered, hiddenInputs)) ?? undefined;
    if (!trip.priceIsic) trip.priceIsic = (await tryEndpointsForPreset(session.clone(), url, bootstrap, "student_isic", discovered, hiddenInputs)) ?? undefined;
  }

  const fallbackPrice = trip.price;
  trip.priceAdult = trip.priceAdult || (fallbackPrice ? fallbackPrice : "N/A");
  trip.priceChild = trip.priceChild || "N/A";
  trip.priceIsic = trip.priceIsic || "N/A";
  trip.price = trip.priceAdult;
  trip.shareLink = trip.shareLink || url;

  return trip;
}
