import * as cheerio from "cheerio";
import { HttpSession, type HttpMethod, type IdosBootstrap } from "./httpSession";

export type DiscoveredHttpMethod = HttpMethod;

export interface DiscoveredEndpoint {
  path: string;
  score: number;
  methods: DiscoveredHttpMethod[];
  keys: string[];
  sources: string[];
  contexts?: string[];
  jsonp?: boolean;
}

function absUrl(fromPage: string, src: string): string {
  return new URL(src, fromPage).toString();
}

export function extractBundleScriptUrls(shareHtml: string, shareUrl: string): string[] {
  const $ = cheerio.load(shareHtml);
  const srcs = $("script[src]")
    .map((_, el) => String($(el).attr("src") || "").trim())
    .get()
    .filter(Boolean);

  const urls = srcs.map((s) => absUrl(shareUrl, s));

  const scored = urls
    .map((u) => {
      const p = new URL(u).pathname.toLowerCase();
      let score = 0;
      if (p.includes("/bundles/")) score += 5;
      if (p.includes("/bundles/app")) score += 20;
      if (p.includes("app")) score += 3;
      if (p.endsWith(".js")) score += 2;
      return { u, score };
    })
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const s of scored) {
    if (seen.has(s.u)) continue;
    seen.add(s.u);
    ordered.push(s.u);
  }
  return ordered;
}

function extractAjaxEndpoints(bundleText: string, bootstrap: IdosBootstrap): string[] {
  const endpoints = new Set<string>();
  const basePrefixes = new Set<string>();

  for (const m of bundleText.matchAll(/\/[A-Za-z0-9_-]+\/Ajax\/[A-Za-z0-9_-]+/g)) {
    endpoints.add(m[0]);
  }

  const ajaxBaseUrl = bootstrap.ajaxBaseUrl || "/vlakyautobusymhdvse/Ajax/";
  basePrefixes.add(ajaxBaseUrl.endsWith("/") ? ajaxBaseUrl : `${ajaxBaseUrl}/`);

  if (typeof bootstrap.appBaseUrl === "string" && bootstrap.appBaseUrl) {
    try {
      const appAjax = new URL("Ajax/", bootstrap.appBaseUrl).pathname;
      basePrefixes.add(appAjax.endsWith("/") ? appAjax : `${appAjax}/`);
    } catch {
      // ignore
    }
  }

  for (const m of bundleText.matchAll(/\/?Ajax\/[A-Za-z0-9_-]+/g)) {
    const raw = m[0];
    const name = raw.replace(/^\//, "").slice("Ajax/".length);
    if (!name) continue;
    for (const ajaxPrefix of basePrefixes) {
      endpoints.add(`${ajaxPrefix}${name}`.startsWith("/") ? `${ajaxPrefix}${name}` : `/${ajaxPrefix}${name}`);
    }
  }

  for (const m of bundleText.matchAll(/ajaxBaseUrl\s*\+\s*["']([A-Za-z0-9_-]+)["']/g)) {
    const name = m[1];
    if (!name) continue;
    for (const ajaxPrefix of basePrefixes) {
      endpoints.add(`${ajaxPrefix}${name}`.startsWith("/") ? `${ajaxPrefix}${name}` : `/${ajaxPrefix}${name}`);
    }
  }

  return [...endpoints];
}

function keywordScore(p: string): number {
  const low = p.toLowerCase();
  if (low.includes("removeallpriceoffer") || low.includes("removepriceoffer") || low.includes("removefrompriceoffer")) {
    return 0;
  }
  const keywords = [
    "price",
    "cena",
    "fare",
    "offer",
    "basket",
    "ticket",
    "passenger",
    "cestuj",
    "reduction",
    "sleva",
    "isic",
    "student",
    "next",
    "later",
    "more",
    "paging",
    "page",
    "conn",
    "connection",
    "result",
    "vysled",
    "vysledky",
    "load",
  ];

  let score = 0;
  for (const k of keywords) {
    if (low.includes(k)) score += 3;
  }
  if (low.includes("/ajax/")) score += 1;
  return score;
}

function inferUsageHints(
  bundleText: string,
  endpointPath: string
): { methods: DiscoveredHttpMethod[]; keys: string[]; context: string; jsonp: boolean } {
  const methods = new Set<DiscoveredHttpMethod>();
  const keys = new Set<string>();
  let jsonp = false;

  const pathName = endpointPath.split("/").filter(Boolean).pop() || endpointPath;
  const searchTokens = [endpointPath, pathName];

  for (const token of searchTokens) {
    const idx = bundleText.indexOf(token);
    if (idx < 0) continue;
    const snippet = bundleText.slice(Math.max(0, idx - 600), Math.min(bundleText.length, idx + 600));

    for (const m of snippet.matchAll(/\bGET\b/g)) methods.add("GET");
    for (const m of snippet.matchAll(/\bPOST\b/g)) methods.add("POST");
    if (/callback|jsonp/i.test(snippet)) jsonp = true;

    for (const m of snippet.matchAll(/[?&]([A-Za-z0-9_]+)=/g)) keys.add(m[1]);
    for (const m of snippet.matchAll(/["']([A-Za-z0-9_]{2,20})["']\s*:/g)) keys.add(m[1]);
  }

  if (methods.size === 0) methods.add("GET");

  return {
    methods: [...methods],
    keys: [...keys],
    context: `snip:${endpointPath}`,
    jsonp,
  };
}

export async function discoverEndpointsFromBundles(
  session: HttpSession,
  shareHtml: string,
  shareUrl: string,
  bootstrap: IdosBootstrap,
  opts?: { maxBundles?: number; bundleTimeoutMs?: number; debug?: boolean }
): Promise<DiscoveredEndpoint[]> {
  const debug = !!opts?.debug;
  const maxBundles = opts?.maxBundles ?? 2;
  const bundleTimeoutMs = opts?.bundleTimeoutMs ?? 650;

  const bundles = extractBundleScriptUrls(shareHtml, shareUrl).slice(0, maxBundles);
  if (bundles.length === 0) return [];

  const endpoints: DiscoveredEndpoint[] = [];
  for (const url of bundles) {
    try {
      const res = await session.request(url, { method: "GET", timeoutMs: bundleTimeoutMs });
      if (res.status < 200 || res.status >= 300) continue;
      const text = res.text || "";
      const paths = extractAjaxEndpoints(text, bootstrap);
      for (const p of paths) {
        const hints = inferUsageHints(text, p);
        const score = keywordScore(p);
        endpoints.push({
          path: p,
          score,
          methods: hints.methods,
          keys: hints.keys,
          sources: [url],
          contexts: [hints.context],
          jsonp: hints.jsonp,
        });
      }
      if (debug) console.log(`[debug-http] bundle ${url} -> ${paths.length} endpoints`);
    } catch {
      // ignore
    }
  }

  const seen = new Map<string, DiscoveredEndpoint>();
  for (const e of endpoints) {
    const existing = seen.get(e.path);
    if (!existing) {
      seen.set(e.path, e);
      continue;
    }
    existing.score = Math.max(existing.score, e.score);
    existing.methods = Array.from(new Set([...existing.methods, ...e.methods]));
    existing.keys = Array.from(new Set([...existing.keys, ...e.keys]));
    existing.sources = Array.from(new Set([...existing.sources, ...e.sources]));
  }

  return [...seen.values()].sort((a, b) => b.score - a.score);
}
