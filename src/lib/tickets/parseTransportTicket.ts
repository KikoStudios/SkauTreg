type Overview = {
  from?: string;
  to?: string;
  departTime?: string;
  departDate?: string;
  arriveTime?: string;
  arriveDate?: string;
  fareType?: string;
  platform?: string;
  seat?: string;
  service?: string;
};

export type ParsedTransportTicket = {
  ticketCode?: string;
  pages: Array<{
    pageNumber: number;
    overview?: Overview;
    eTicketCodes: string[];
    referenceCodes: string[];
    platforms: string[];
    seats: string[];
  }>;
  groups: Array<{
    key: string;
    from?: string;
    to?: string;
    departTime?: string;
    departDate?: string;
    arriveTime?: string;
    arriveDate?: string;
    fareType?: string;
    platform?: string;
    seat?: string;
    seats: string[];
    service?: string;
    codes: string[];
    referenceCodes: string[];
    pageNumbers: number[];
  }>;
};

function normalizeWs(text: string): string {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .replace(/[‐‑‒–—]/g, "-")
    .trim();
}

function normalizeForRegex(text: string): string {
  return normalizeWs(text);
}

function extractETicketCodes(text: string): string[] {
  const t = normalizeForRegex(text);
  const out = new Set<string>();

  const labelRe = /\b(k[oó]d|kod)\s*e-?\s*(j[ií]zdenk[ay]|jizdenk[ay])\s*[:\-]?\s*([A-Z0-9]{5,10})\b/gi;
  for (const m of t.matchAll(labelRe)) {
    const code = String(m[3]).toUpperCase();
    out.add(code);
  }

  const checkInRe = /\b(odbavovac[ií]\s*k[oó]d|check-?\s*in\s*code)\s*[:\-]?\s*([A-Z0-9]{5,10})\b/gi;
  for (const m of t.matchAll(checkInRe)) {
    const code = String(m[2]).toUpperCase();
    out.add(code);
  }

  const kodemRe = /\b(k[oó]dem|kodem)\s*[:\-]?\s*([A-Z0-9]{5,10})\b/gi;
  for (const m of t.matchAll(kodemRe)) {
    const code = String(m[2]).toUpperCase();
    out.add(code);
  }

  return Array.from(out);
}

function extractReferenceCodes(text: string): string[] {
  const t = normalizeForRegex(text);
  const out = new Set<string>();
  const labelled = /\b(?:k[oó]d|kod)\s+IDOS(?:\.cz)?\s*[:\-]?\s*([A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})\b/gi;
  for (const m of t.matchAll(labelled)) out.add(String(m[1]).toUpperCase());
  return Array.from(out);
}

function extractPlatforms(text: string): string[] {
  const t = normalizeForRegex(text);
  const out = new Set<string>();
  const re = /\b(n[aá]stupi[sš]t[eě]\/platform|n[aá]stupi[sš]t[eě]|platform)\s*[:\-]?\s*([0-9A-Z]{1,5})\b/gi;
  for (const m of t.matchAll(re)) out.add(String(m[2]).toUpperCase());
  return Array.from(out);
}

function extractSeats(text: string): string[] {
  const t = normalizeForRegex(text);
  const out = new Set<string>();
  const re = /\b(sedadlo\/seat|sedadlo|seat)\s*[:\-]?\s*([0-9]{1,4}(?:\s*\/\s*[0-9]{1,3})?)\b/gi;
  for (const m of t.matchAll(re)) out.add(String(m[2]).replace(/\s+/g, "").toUpperCase());
  return Array.from(out);
}

function extractFareType(text: string): string | undefined {
  const t = normalizeWs(text);
  if (!t) return undefined;
  const lower = t.toLowerCase();

  let idx = lower.indexOf("druh jízdného");
  if (idx < 0) idx = lower.indexOf("druh jizdneho");
  if (idx < 0) idx = lower.indexOf("fare type");
  if (idx < 0) return undefined;

  const window = t.slice(idx, idx + 600);
  const priceRe = /\b\d[\d\s]{0,4}(?:[.,]\d{1,2})?\s*[,.\-]{0,2}\s*(kč|czk|eur|€)(?:\s|$)/iu;
  const pm = window.match(priceRe);
  if (pm && pm.index != null) {
    const beforePrice = window.slice(0, pm.index);
    const beforeLower = beforePrice.toLowerCase();
    const cutMarkers = ["conditions", "podmínky vracení", "cancellat.", "fare type", "druh jízdného", "druh jizdneho"];
    let cut = -1;
    for (const m of cutMarkers) {
      const j = beforeLower.lastIndexOf(m);
      if (j >= 0) cut = Math.max(cut, j + m.length);
    }
    let cand = normalizeWs(beforePrice.slice(cut >= 0 ? cut : 0));
    cand = cand.replace(/^[:\-\s]+/u, "").trim();
    cand = cand.split(/\b(cena\s+s\s*dph|cena\b|price\b|sazba\s+dan[ěe]|vat\s+rate)\b/i)[0] ?? cand;
    cand = normalizeWs(cand);
    if (cand && cand.length >= 3 && !/\b(cena|price|sazba|vat)\b/i.test(cand)) return cand;
  }

  let after = window;
  after = after.replace(/^.*?\bfare\s*type\b/i, "");
  after = after.replace(/^.*?\bdruh\s*j[ií]zdn[ée]ho\b/i, "");
  after = after.replace(/^[:\-\s]+/u, "");
  after = after.split(/\b(cena\s+s\s*dph|cena\b|price\b|sazba\s+dan[ěe]|vat\s+rate)\b/i)[0] ?? "";
  after = normalizeWs(after);
  after = after.replace(/\s+\d[\d\s,.\-]*(?:kč|czk|eur|€).*$/iu, "").trim();
  if (after && after.length >= 3 && !/\b(cena|price|sazba|vat)\b/i.test(after)) return after;

  const m2 = t.match(/\bconditions\b\s+(.+?)\s+\d[\d\s]{0,4}(?:[.,]\d{1,2})?\s*[,.\-]{0,2}\s*(kč|czk|eur|€)(?:\s|$)/iu);
  if (m2) {
    const cand = normalizeWs(m2[1]).replace(/^[:\-\s]+/u, "").trim();
    if (cand && cand.length >= 3) return cand;
  }

  return undefined;
}

function extractOverview(text: string): Overview | undefined {
  const t = normalizeWs(text);
  if (!t) return undefined;

  const reRow =
    /\b(\d{1,2}:\d{2})\s+(\d{1,2}\.\d{1,2}\.\d{4})\s+([0-9][0-9 -]{0,20}(?:\s*\([^)]+\))?)\s+([0-9A-Z]{1,5})\s+([0-9]{1,4}(?:\s*\/\s*[0-9]{1,3})?)\b/i;
  const m = reRow.exec(t);
  if (!m || typeof m.index !== "number") return { fareType: extractFareType(t) };

  const departTime = m[1];
  const departDate = m[2];
  const service = normalizeWs(m[3]);
  const platform = String(m[4]).toUpperCase();
  const seat = String(m[5]).replace(/\s+/g, "").toUpperCase();
  const rowStart = m.index;
  const rowEnd = rowStart + m[0].length;

  const after = t.slice(rowEnd).trim();
  const mArr = after.match(/\b(\d{1,2}:\d{2})\s+(\d{1,2}\.\d{1,2}\.\d{4})\b/);
  const arriveTime = mArr?.[1];
  const arriveDate = mArr?.[2];
  const to =
    mArr && mArr.index != null ? normalizeWs(after.slice(0, mArr.index)) : normalizeWs(after.split(/\s+(?:druh\s*j[ií]zdn[ée]ho|cena\s+s\s*dph)\b/i)[0] ?? "");

  const before = t.slice(0, rowStart);
  const beforeLower = before.toLowerCase();
  const markers = ["sedadlo/ seat", "sedadlo", "seat", "nástupiště/ platform", "nástupiště", "platform"];
  let cut = -1;
  for (const marker of markers) {
    const idx = beforeLower.lastIndexOf(marker);
    if (idx >= 0) cut = Math.max(cut, idx + marker.length);
  }
  const from = normalizeWs((cut >= 0 ? before.slice(cut) : before).trim());

  const fareType = extractFareType(t);
  return {
    from: from || undefined,
    to: to || undefined,
    departTime,
    departDate,
    arriveTime,
    arriveDate,
    fareType,
    platform,
    seat,
    service,
  };
}

async function importPdfJs(): Promise<any> {
  const dynamicImport = async (specifier: string): Promise<any> => {
    return (0, eval)(`import(${JSON.stringify(specifier)})`);
  };

  const candidates = ["pdfjs-dist/legacy/build/pdf.mjs", "pdfjs-dist/build/pdf.mjs", "pdfjs-dist/legacy/build/pdf.js", "pdfjs-dist/build/pdf.js"];

  let lastErr: unknown = null;
  for (const spec of candidates) {
    try {
      const mod: any = spec.endsWith(".mjs") ? await dynamicImport(spec) : require(spec);
      return mod?.default ?? mod;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function extractTextFromPage(pdfjs: any, page: any): Promise<string> {
  const content = await page.getTextContent();
  const items = content.items || [];
  const parts: string[] = [];
  for (const item of items) {
    const str = (item as any)?.str;
    if (typeof str === "string") parts.push(str);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function buildGroups(pages: ParsedTransportTicket["pages"]) {
  const map = new Map<string, ParsedTransportTicket["groups"][number]>();

  for (const p of pages) {
    const o = p.overview;
    const keyParts = [
      o?.from,
      o?.to,
      o?.departDate,
      o?.departTime,
      o?.arriveDate,
      o?.arriveTime,
      o?.service,
    ];
    const key = keyParts.filter(Boolean).join("|") || (p.eTicketCodes[0] ?? `page-${p.pageNumber}`);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        from: o?.from,
        to: o?.to,
        departTime: o?.departTime,
        departDate: o?.departDate,
        arriveTime: o?.arriveTime,
        arriveDate: o?.arriveDate,
        fareType: o?.fareType,
        platform: o?.platform,
        seat: o?.seat,
        seats: o?.seat ? [o.seat] : [...p.seats],
        service: o?.service,
        codes: [...p.eTicketCodes],
        referenceCodes: [...p.referenceCodes],
        pageNumbers: [p.pageNumber],
      });
    } else {
      existing.codes.push(...p.eTicketCodes);
      existing.referenceCodes.push(...p.referenceCodes);
      existing.seats.push(...(o?.seat ? [o.seat] : p.seats));
      existing.pageNumbers.push(p.pageNumber);
    }
  }

  for (const g of map.values()) {
    g.codes = Array.from(new Set(g.codes.filter(Boolean)));
    g.referenceCodes = Array.from(new Set(g.referenceCodes.filter(Boolean)));
    g.seats = Array.from(new Set(g.seats.filter(Boolean)));
    g.seat = g.seats[0];
    g.pageNumbers = Array.from(new Set(g.pageNumbers)).sort((a, b) => a - b);
  }

  return Array.from(map.values());
}

export async function parseTransportTicketFromPdfBytes(bytes: Uint8Array, filename?: string): Promise<ParsedTransportTicket> {
  const pdfjs = await importPdfJs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true }).promise;

  const pages: ParsedTransportTicket["pages"] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const text = await extractTextFromPage(pdfjs, page);
    const eTicketCodes = extractETicketCodes(text);
    const referenceCodes = extractReferenceCodes(text);
    const overview = extractOverview(text);
    const platforms = overview?.platform ? [overview.platform] : extractPlatforms(text);
    const seats = overview?.seat ? [overview.seat] : extractSeats(text);

    pages.push({
      pageNumber: i,
      overview,
      eTicketCodes,
      referenceCodes,
      platforms,
      seats,
    });
  }

  const groups = buildGroups(pages);
  const ticketCode =
    groups.flatMap((g) => g.codes)[0] ||
    pages.flatMap((p) => p.eTicketCodes)[0] ||
    (filename ? (filename.match(/\b([A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})\b/i)?.[1] ?? undefined) : undefined);

  return { ticketCode, pages, groups };
}
