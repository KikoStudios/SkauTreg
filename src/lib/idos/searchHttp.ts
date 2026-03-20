import * as cheerio from "cheerio";
import { buildBootstrapFromHtml, findFirstPriceKc, HttpSession, IdosBootstrap } from "./httpSession";
import { IdosTrip, Segment } from "./parseConnections";

type FarePreset = "adult" | "child_6_15" | "student_isic";

interface SearchTrip extends IdosTrip {
  connId?: number;
  handle?: number;
  ajaxBaseUrl?: string;
  ajaxBaseUrlAlt?: string;
}

function getVehicleType(vehicleName: string): string {
  const name = vehicleName.toLowerCase();
  if (name.startsWith("bus ")) return "Bus";
  if (name.startsWith("trol ")) return "Trolleybus";
  if (name.startsWith("tram ")) return "Tram";
  if (name.includes("metro")) return "Metro";
  return "Train";
}

function parseConnectionsSearch(html: string, pageUrl: string): SearchTrip[] {
  const trips: SearchTrip[] = [];
  const $ = cheerio.load(html);
  const connectionElements = $("div.box.connection");
  connectionElements.each((_, el) => {
    const $connection = $(el);

    const connBoxId = String($connection.attr("id") || "").trim();
    const mConn = connBoxId.match(/connectionBox-(\d+)/i);
    const connId = mConn ? parseInt(mConn[1], 10) : undefined;

    const timeElements = $connection.find("p.time");
    const depTime = timeElements.first().text().trim();
    const arrTime = timeElements.last().text().trim();
    const durationText = $connection.find("p.total strong").text().trim();

    const segments: Segment[] = [];
    $connection.find("h3 span").each((__, vehicleEl) => {
      const vehicleName = $(vehicleEl).text().trim();
      if (!vehicleName) return;
      const $journeyContainer = $(vehicleEl).closest("div.outside-of-popup, div.journey, div.route, div.trip");
      const $segmentTimes = $journeyContainer.find("p.time");
      const segDepTime = $segmentTimes.first().text().trim();
      const segArrTime = $segmentTimes.last().text().trim();
      const $stationNames = $journeyContainer.find("strong.name");
      const depStation = $stationNames.first().text().trim();
      const arrStation = $stationNames.last().text().trim();

      segments.push({
        vehicleName,
        vehicleType: getVehicleType(vehicleName),
        departureTime: segDepTime,
        arrivalTime: segArrTime,
        departureStation: depStation,
        arrivalStation: arrStation,
        stops: [],
      });
    });
    const $names = $connection.find("strong.name");
    const fallbackDepStation = $names.first().text().trim();
    const fallbackArrStation = $names.last().text().trim();
    const vehicleLabels = $connection
      .find("h3 span")
      .toArray()
      .map((x) => $(x).text().trim())
      .filter(Boolean);

    if (!segments.length && (fallbackDepStation || fallbackArrStation || vehicleLabels.length)) {
      const vehicleName = vehicleLabels.join(" + ") || "N/A";
      segments.push({
        vehicleName,
        vehicleType: getVehicleType(vehicleName),
        departureTime: depTime,
        arrivalTime: arrTime,
        departureStation: fallbackDepStation || "N/A",
        arrivalStation: fallbackArrStation || "N/A",
        stops: [],
      });
    }
    if (!segments.length) return;

    const price = findFirstPriceKc($connection.text()) ?? "N/A";

    const shareLinkRaw = $connection.attr("data-share-url") || undefined;
    const shareLink = shareLinkRaw ? new URL(shareLinkRaw, new URL(pageUrl).origin).toString() : undefined;
    const detailHref =
      $connection.find("a.title").first().attr("href") ||
      $connection.find('a[href*="/spojeni/draha/"]').first().attr("href") ||
      $connection.find('a[href*="/spojeni/detail/"]').first().attr("href") ||
      undefined;
    const detailLink = detailHref ? new URL(detailHref, new URL(pageUrl).origin).toString() : undefined;

    trips.push({
      departureTime: depTime,
      arrivalTime: arrTime,
      duration: durationText,
      transferCount: segments.length - 1,
      price,
      segments,
      shareLink,
      detailLink,
      ...(typeof connId === "number" && Number.isFinite(connId) ? { connId } : {}),
    });
  });
  return trips;
}

function buildSearchUrl(from: string, to: string, date?: string, time?: string, arrival?: boolean) {
  let url = `https://idos.cz/vlakyautobusymhdvse/spojeni/vysledky/?f=${encodeURIComponent(from)}&t=${encodeURIComponent(to)}`;
  if (date && date.trim()) url += `&date=${encodeURIComponent(date.trim())}`;
  if (time && time.trim()) url += `&time=${encodeURIComponent(time.trim())}`;
  if (arrival) url += `&arr=true`;
  return url;
}

function computeDedupKey(trip: SearchTrip): string {
  const segmentKey = trip.segments
    .map((s) => `${s.departureStation}-${s.arrivalStation}-${s.departureTime}-${s.arrivalTime}-${s.vehicleName}`)
    .join("|");
  return `${trip.departureTime}|${trip.arrivalTime}|${trip.duration}|${segmentKey}`;
}

function hasPagingNextButton(html: string): boolean {
  const $ = cheerio.load(html);
  const el = $("a.pagingNext, button.pagingNext, a.paging-next, button.paging-next").first();
  if (!el.length) return false;
  const disabled = el.attr("disabled") || el.hasClass("disabled");
  return !disabled;
}

function extractListedConnectionIdsFromHtml(html: string): number[] {
  const out: number[] = [];
  const re = /id\s*=\s*["']connectionBox-(\d+)["']/gi;
  for (const m of html.matchAll(re)) out.push(parseInt(m[1], 10));
  return out;
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

function makeFareAjaxBaseUrl(bootstrap: IdosBootstrap, origin: string) {
  const hardDefault = new URL("/vlakyautobusymhdvse/spojeni/Ajax/", origin).toString();
  if (bootstrap.appBaseUrl) {
    try {
      const candidate = new URL("Ajax/", bootstrap.appBaseUrl).toString();
      return candidate;
    } catch {
      // ignore
    }
  }
  return hardDefault;
}

function makeFareAjaxBaseUrlAlt(bootstrap: IdosBootstrap, origin: string): string | null {
  try {
    if (bootstrap.ajaxBaseUrl) return new URL(bootstrap.ajaxBaseUrl, origin).toString();
  } catch {
    // ignore
  }
  return null;
}

async function fetchConnPagingNext(
  session: HttpSession,
  currentUrl: string,
  currentHtml: string,
  bootstrap: IdosBootstrap,
  arrivalFlag: boolean
): Promise<{ newHtml: string; allowNext: boolean } | null> {
  if (typeof bootstrap.handle !== "number") return null;

  const origin = new URL(currentUrl).origin;
  const ajaxBase = bootstrap.ajaxBaseUrl
    ? new URL(bootstrap.ajaxBaseUrl, origin).toString()
    : new URL("/vlakyautobusymhdvse/Ajax/", origin).toString();
  const endpoint = new URL("ConnPaging", ajaxBase);
  if (!endpoint.searchParams.has("callback")) endpoint.searchParams.set("callback", "cb");

  const listedIds = extractListedConnectionIdsFromHtml(currentHtml);
  if (listedIds.length === 0) return null;

  const model: Record<string, any> = {
    listedIds,
    isPrev: false,
    handle: bootstrap.handle,
    searchDate:
      typeof (bootstrap as any)?.raw?.searchItem?.oConn?.oUserInput?.dtSearchDate === "string"
        ? (bootstrap as any).raw.searchItem.oConn.oUserInput.dtSearchDate
        : undefined,
    connId: listedIds[listedIds.length - 1],
    arrivalThere: typeof (bootstrap as any)?.raw?.arrivalThere === "boolean" ? (bootstrap as any).raw.arrivalThere : arrivalFlag,
  };

  const bodyParams = new URLSearchParams();
  for (const [k, v] of Object.entries(model)) appendJqParams(bodyParams, k, v);

  let res: { status: number; text: string };
  try {
    res = await session.request(endpoint.toString(), {
      method: "POST",
      timeoutMs: 6000,
      body: bodyParams.toString(),
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        referer: currentUrl,
        accept: "*/*",
      },
    });
  } catch {
    return null;
  }

  if (res.status < 200 || res.status >= 300) return null;
  const head = res.text.slice(0, 200).toLowerCase();
  if (head.includes("<!doctype") || head.includes("<html")) return null;

  const obj = parseJsonpPayload(res.text) as any;
  if (!obj || obj.errorMessage) return null;

  const allowNext = obj.allowNext !== false;
  const nc = obj.newConnections;
  const newHtml = typeof nc === "string" ? nc : Array.isArray(nc) ? nc.join("\n") : "";
  if (!newHtml || !newHtml.includes("box connection")) return null;
  return { newHtml, allowNext };
}

async function fetchConnMoreConnections(
  session: HttpSession,
  currentUrl: string,
  ctx: { handle: number; connId: number; absCombId?: string; searchDate?: string }
): Promise<{ newHtml: string; allowNext: boolean } | null> {
  const origin = new URL(currentUrl).origin;

  const url = new URL("/vlakyautobusymhdvse/Ajax/ConnMoreResult", origin);
  if (!url.searchParams.has("callback")) url.searchParams.set("callback", "cb");

  const bodyParams = new URLSearchParams();
  const data: Record<string, any> = {
    handle: ctx.handle,
    connId: ctx.connId,
    ...(ctx.absCombId ? { absCombId: ctx.absCombId } : {}),
    ...(ctx.searchDate ? { searchDate: ctx.searchDate } : {}),
    isSelected: false,
    isMc: false,
    format: "json",
  };
  for (const [k, v] of Object.entries(data)) appendJqParams(bodyParams, k, v);

  let res: { status: number; text: string };
  try {
    res = await session.request(url.toString(), {
      method: "POST",
      timeoutMs: 6000,
      body: bodyParams.toString(),
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        referer: currentUrl,
        accept: "*/*",
      },
    });
  } catch {
    return null;
  }
  if (res.status < 200 || res.status >= 300) return null;

  const head = res.text.slice(0, 200).toLowerCase();
  if (head.includes("<!doctype") || head.includes("<html")) return null;

  const obj = parseJsonpPayload(res.text) as any;
  if (!obj || obj.errorMessage) return null;

  const content = typeof obj?.content === "string" ? obj.content : null;
  if (!content || !content.includes("box connection")) return null;

  const allowNext = obj?.allowNext !== false && obj?.allowNextResult !== false;
  return { newHtml: content, allowNext };
}

async function fetchPriceOffer(
  session: HttpSession,
  fare: { ajaxBaseUrl: string; ajaxBaseUrlAlt?: string; handle: number; connId: number },
  passengers: Array<Record<string, any>>,
  refererUrl?: string
): Promise<string | null> {
  const bodyParams = new URLSearchParams();
  const data: Record<string, any> = {
    handle: fare.handle,
    connId: fare.connId,
    passengers,
    handleThere: 0,
    connIdThere: 0,
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
        referer: refererUrl || base,
        accept: "application/json, text/javascript, */*; q=0.01",
      },
    });
    if (res.status < 200 || res.status >= 300) return null;
    const head = res.text.slice(0, 200).toLowerCase();
    if (head.includes("<!doctype") || head.includes("<html")) return null;
    const m = res.text.match(/(\d[\d\s]*)\s*(?:KÄ|Kč|Kc)/);
    return m ? `${m[1].trim().replace(/\s+/g, " ")} Kč` : null;
  };

  const primary = await tryOneBase(fare.ajaxBaseUrl);
  if (primary) return primary;
  if (fare.ajaxBaseUrlAlt && fare.ajaxBaseUrlAlt !== fare.ajaxBaseUrl) {
    const alt = await tryOneBase(fare.ajaxBaseUrlAlt);
    if (alt) return alt;
  }
  return null;
}

function buildPassengersHardcoded(preset: FarePreset): Array<Record<string, any>> {
  // IDs verified in external route-inspect (2026-03): adult 40, child 24, student 32 + ISIC 2
  if (preset === "adult") return [{ iPassengerID: 40, aiReductionID: [] }];
  if (preset === "child_6_15") return [{ iPassengerID: 24, aiReductionID: [] }];
  return [{ iPassengerID: 32, aiReductionID: [2] }];
}

export async function searchTripsHttpStream(opts: {
  from: string;
  to: string;
  date?: string;
  time?: string;
  arrival?: boolean;
  limit?: number;
  onTrip: (trip: SearchTrip) => Promise<void> | void;
}) {
  const { from, to, date, time, arrival, onTrip } = opts;
  const limit = Math.max(1, opts.limit ?? 15);
  const searchUrl = buildSearchUrl(from, to, date, time, arrival);

  const session = new HttpSession();
  const firstRes = await session.get(searchUrl, 6000);
  if (firstRes.status < 200 || firstRes.status >= 300) throw new Error(`Failed to load search results (${firstRes.status}).`);

  let pageHtml = firstRes.text;
  let bootstrap = buildBootstrapFromHtml(pageHtml);
  const origin = new URL(searchUrl).origin;

  if (parseConnectionsSearch(pageHtml, searchUrl).length === 0 && typeof bootstrap.handle === "number") {
    const resultsHtml = await fetchResultsHtmlForHandle(session.clone(), searchUrl, bootstrap);
    if (resultsHtml) {
      pageHtml = resultsHtml;
      bootstrap = buildBootstrapFromHtml(pageHtml);
    }
  }

  const seen = new Set<string>();
  const outTrips: SearchTrip[] = [];
  const baseAjaxBaseUrl = makeFareAjaxBaseUrl(bootstrap, origin);
  const absCombId = typeof (bootstrap as any)?.raw?.searchItem?.sCombId === "string" ? (bootstrap as any).raw.searchItem.sCombId : undefined;
  const searchDate = typeof (bootstrap as any)?.raw?.searchItem?.oConn?.oUserInput?.dtSearchDate === "string"
    ? (bootstrap as any).raw.searchItem.oConn.oUserInput.dtSearchDate
    : undefined;

  const addTripsFromHtml = (html: string) => {
    const handle = bootstrap.handle;
    const ajaxBaseUrl = makeFareAjaxBaseUrl(bootstrap, origin) || baseAjaxBaseUrl;
    const pageTrips = parseConnectionsSearch(html, searchUrl) as SearchTrip[];
    for (const trip of pageTrips) {
      if (typeof handle === "number") trip.handle = handle;
      trip.ajaxBaseUrl = ajaxBaseUrl;
      trip.ajaxBaseUrlAlt = makeFareAjaxBaseUrlAlt(bootstrap, origin) || undefined;
      const key = computeDedupKey(trip);
      if (seen.has(key)) continue;
      seen.add(key);
      outTrips.push(trip);
    }
  };

  addTripsFromHtml(pageHtml);

  const maxPresses = 200;
  let presses = 0;
  let allowNext = true;
  const allIds0 = extractListedConnectionIdsFromHtml(pageHtml);
  let pagingConnId =
    (allIds0.length ? allIds0[allIds0.length - 1] : undefined) ??
    (typeof bootstrap.connIds?.[bootstrap.connIds.length - 1] === "number" ? bootstrap.connIds[bootstrap.connIds.length - 1] : undefined);
  let lastPagingConnId: number | undefined = undefined;
  let noNewStreak = 0;

  while (
    allowNext &&
    presses < maxPresses &&
    typeof bootstrap.handle === "number" &&
    typeof pagingConnId === "number" &&
    outTrips.length < limit
  ) {
    let hit: { newHtml: string; allowNext: boolean } | null = null;

    if (hasPagingNextButton(pageHtml)) {
      hit = await fetchConnPagingNext(session.clone(), searchUrl, pageHtml, bootstrap, !!arrival);
    }

    if (!hit && absCombId && searchDate) {
      hit = await fetchConnMoreConnections(session.clone(), searchUrl, { handle: bootstrap.handle, connId: pagingConnId, absCombId, searchDate });
    }

    if (!hit) break;
    presses++;
    allowNext = hit.allowNext;
    pageHtml += `\n${hit.newHtml}`;
    addTripsFromHtml(hit.newHtml);

    const newIds = extractListedConnectionIdsFromHtml(hit.newHtml);
    if (newIds.length) pagingConnId = newIds[newIds.length - 1];
    else {
      const allIds = extractListedConnectionIdsFromHtml(pageHtml);
      if (allIds.length) pagingConnId = allIds[allIds.length - 1];
    }

    if (typeof pagingConnId === "number" && pagingConnId === lastPagingConnId) noNewStreak++;
    else noNewStreak = 0;
    lastPagingConnId = pagingConnId;

    if (noNewStreak >= 3) break;
  }

  const finalTrips = outTrips.slice(0, limit);
  for (const trip of finalTrips) {
    try {
      const fare = typeof trip.handle === "number" && typeof trip.connId === "number"
        ? {
            ajaxBaseUrl: trip.ajaxBaseUrl || baseAjaxBaseUrl,
            ajaxBaseUrlAlt: trip.ajaxBaseUrlAlt,
            handle: trip.handle,
            connId: trip.connId,
          }
        : null;

      if (fare) {
        const [adult, child, isic] = await Promise.all([
          fetchPriceOffer(session.clone(), fare, buildPassengersHardcoded("adult"), searchUrl),
          fetchPriceOffer(session.clone(), fare, buildPassengersHardcoded("child_6_15"), searchUrl),
          fetchPriceOffer(session.clone(), fare, buildPassengersHardcoded("student_isic"), searchUrl),
        ]);
        trip.priceAdult = adult || trip.price || "N/A";
        trip.priceChild = child || "N/A";
        trip.priceIsic = isic || "N/A";
        trip.price = trip.priceAdult || "N/A";
      }
    } catch {
      trip.priceAdult = trip.priceAdult || trip.price || "N/A";
      trip.priceChild = trip.priceChild || "N/A";
      trip.priceIsic = trip.priceIsic || "N/A";
      trip.price = trip.priceAdult || "N/A";
    }
    await onTrip(trip);
  }
}

async function fetchResultsHtmlForHandle(session: HttpSession, searchUrl: string, bootstrap: IdosBootstrap): Promise<string | null> {
  if (typeof bootstrap.handle !== "number") return null;
  const pageUrl = new URL(searchUrl);
  const h = bootstrap.handle;
  const url = new URL("/vlakyautobusymhdvse/spojeni/vysledky/", pageUrl.origin);
  url.searchParams.set("h", String(h));
  const res = await session.get(url.toString(), 4000);
  if (res.status < 200 || res.status >= 300) return null;
  return res.text;
}
