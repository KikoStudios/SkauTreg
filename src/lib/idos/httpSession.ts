export type HttpMethod = "GET" | "POST";

export interface HttpResponse {
  status: number;
  headers: Headers;
  text: string;
}

export interface HttpRequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeWhitespace(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function splitSetCookieHeader(setCookieHeader: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let i = 0;
  let inExpires = false;

  const lower = setCookieHeader.toLowerCase();
  while (i < setCookieHeader.length) {
    const c = setCookieHeader[i];
    if (!inExpires) {
      if (lower.startsWith("expires=", i)) {
        inExpires = true;
        i += "expires=".length;
        continue;
      }
    } else {
      if (c === ";") inExpires = false;
      i++;
      continue;
    }

    if (c === "," && !inExpires) {
      const rest = setCookieHeader.slice(i + 1);
      const m = rest.match(/^\s*([A-Za-z0-9._-]+)=/);
      if (m) {
        parts.push(setCookieHeader.slice(start, i).trim());
        start = i + 1;
      }
    }
    i++;
  }

  const tail = setCookieHeader.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

export class CookieJar {
  private cookies = new Map<string, string>();

  ingestFromResponseHeaders(headers: Headers) {
    const anyHeaders: any = headers as any;
    const setCookies: string[] =
      (typeof anyHeaders.getSetCookie === "function" ? anyHeaders.getSetCookie() : []) || [];

    const fallback = headers.get("set-cookie");
    const all = [...setCookies, ...(fallback ? splitSetCookieHeader(fallback) : [])];

    for (const raw of all) {
      const first = raw.split(";", 1)[0];
      const eq = first.indexOf("=");
      if (eq <= 0) continue;
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();
      if (!name) continue;
      this.cookies.set(name, value);
    }
  }

  headerValue(): string {
    if (this.cookies.size === 0) return "";
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  clone(): CookieJar {
    const jar = new CookieJar();
    jar.cookies = new Map(this.cookies);
    return jar;
  }

  copyFrom(other: CookieJar) {
    this.cookies = new Map(other.cookies);
  }
}

export class HttpSession {
  readonly jar: CookieJar;
  private readonly baseHeaders: Record<string, string>;

  constructor(baseHeaders?: Record<string, string>, jar?: CookieJar) {
    this.jar = jar ? jar : new CookieJar();
    this.baseHeaders = {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "cs,en;q=0.9",
      ...(baseHeaders || {}),
    };
  }

  clone(): HttpSession {
    return new HttpSession(this.baseHeaders, this.jar.clone());
  }

  async request(url: string, opts?: HttpRequestOptions): Promise<HttpResponse> {
    const method = opts?.method || "GET";
    const timeoutMs = opts?.timeoutMs ?? 5000;
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      ...this.baseHeaders,
      ...(opts?.headers || {}),
    };

    const cookie = this.jar.headerValue();
    if (cookie) headers.cookie = cookie;

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: opts?.body,
        signal: controller.signal,
        redirect: "follow",
      } as any);

      this.jar.ingestFromResponseHeaders(res.headers);
      const text = await res.text();
      return { status: res.status, headers: res.headers, text };
    } finally {
      clearTimeout(to);
    }
  }

  async get(url: string, timeoutMs?: number): Promise<HttpResponse> {
    return await this.request(url, { method: "GET", timeoutMs });
  }

  async postForm(url: string, form: Record<string, string>, timeoutMs?: number, extraHeaders?: Record<string, string>) {
    const body = new URLSearchParams(form).toString();
    return await this.request(url, {
      method: "POST",
      timeoutMs,
      body,
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        ...(extraHeaders || {}),
      },
    });
  }
}

export interface IdosBootstrap {
  handle?: number;
  ajaxBaseUrl?: string;
  appBaseUrl?: string;
  connIds: number[];
  raw: any;
}

function extractConnResultState(html: string): any | null {
  const marker = "new Conn.ConnResult(params, null,";
  const idx = html.indexOf(marker);
  if (idx < 0) return null;

  const start = html.indexOf("{", idx);
  if (start < 0) return null;

  let i = start;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (; i < html.length; i++) {
    const c = html.charCodeAt(i);
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === 92) {
        escape = true;
        continue;
      }
      if (c === 34) {
        inString = false;
        continue;
      }
      continue;
    }

    if (c === 34) {
      inString = true;
      continue;
    }

    if (c === 123) depth++;
    else if (c === 125) {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }

  const jsonText = html.slice(start, i);
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

export function buildBootstrapFromHtml(html: string): IdosBootstrap {
  const state = extractConnResultState(html);

  const connIds: number[] = [];
  const handle = typeof state?.handle === "number" ? state.handle : undefined;
  const ajaxBaseUrl = typeof state?.ajaxBaseUrl === "string" ? state.ajaxBaseUrl : undefined;
  const appBaseUrl = typeof state?.appBaseUrl === "string" ? state.appBaseUrl : undefined;

  if (Array.isArray(state?.connData)) {
    for (const c of state.connData) {
      if (typeof c?.connId === "number") connIds.push(c.connId);
    }
  }

  return { handle, ajaxBaseUrl, appBaseUrl, connIds, raw: state };
}

export function findFirstPriceKc(text: string): string | null {
  const m = normalizeWhitespace(text).match(/(\d[\d\s]*)\s*(?:Kč|Kc|KÄ|KÃ„Â|KÃƒâ€žÃ‚Â)/);
  if (!m) return null;
  return normalizeWhitespace(m[1]) + " Kč";
}

export async function timed<T>(
  label: string,
  fn: () => Promise<T>,
  debug: boolean
): Promise<{ value: T; ms: number; label: string }> {
  const t0 = Date.now();
  const value = await fn();
  const ms = Date.now() - t0;
  if (debug) {
    console.log(`[debug-http] ${label}: ${ms}ms`);
  }
  return { value, ms, label };
}

export async function retry<T>(attempts: number, fn: (attempt: number) => Promise<T>, delayMs: number): Promise<T> {
  let lastErr: any = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn(i + 1);
    } catch (e) {
      lastErr = e;
      if (i + 1 < attempts) await sleep(delayMs);
    }
  }
  throw lastErr;
}
