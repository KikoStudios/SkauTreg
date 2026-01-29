import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

function htmlToLines(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d|section|table)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function firstNumber(line) {
  if (!line) return undefined;
  const match = line.match(/([0-9]+(?:[.,][0-9]+)?)/);
  return match ? Number(match[1].replace(",", ".")) : undefined;
}

function findLine(lines, predicate) {
  const idx = lines.findIndex(predicate);
  return idx >= 0 ? { idx, line: lines[idx] } : null;
}

function sliceSection(lines, startIdx) {
  const section = [];
  for (let i = startIdx + 1; i < Math.min(startIdx + 20, lines.length); i++) {
    const l = lines[i];
    if (/^\s*(Rezervace|Kapacita|Podmínky|Další údaje|Kontakty|Cena|Ubytování|Vybavení)\b/i.test(l)) break;
    section.push(l);
  }
  return section.join(" \n").trim();
}

function extractDetailsFromHtml(html, pageUrl) {
  const lines = htmlToLines(html);
  const lower = lines.map((l) => l.toLowerCase());

  console.log("\n📋 FULL PAGE TEXT (first 100 lines):");
  lines.slice(0, 100).forEach((line, i) => {
    console.log(`[${i}]: ${line}`);
  });

  console.log("\n🔍 SEARCHING FOR PATTERNS:\n");

  // Pricing
  console.log("PRICING:");
  const baseLine = findLine(lower, (l) => l.includes("cena (základní)"));
  console.log("  Cena (základní) line:", baseLine ? baseLine.line : "NOT FOUND");

  const childrenLine = findLine(lower, (l) => l.includes("dětsk"));
  console.log("  Children discount line:", childrenLine ? childrenLine.line : "NOT FOUND");

  const scoutLine = findLine(lower, (l) => l.includes("skaut"));
  console.log("  Scout discount line:", scoutLine ? scoutLine.line : "NOT FOUND");

  const minLine = findLine(lower, (l) => l.includes("minimální"));
  console.log("  Minimum line:", minLine ? minLine.line : "NOT FOUND");

  // Contacts
  console.log("\nCONTACTS:");
  const emailMatch = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  console.log("  Emails found:", emailMatch || "NONE");

  const phoneMatch = html.match(/\b[+]?[\d\s()]{8,}\b/g);
  console.log("  Phones found:", phoneMatch ? phoneMatch.slice(0, 3) : "NONE");

  // Location
  console.log("\nLOCATION:");
  const addressLine = findLine(lower, (l) => /\d+,\s*\d{5}/.test(l));
  console.log("  Address line:", addressLine ? addressLine.line : "NOT FOUND");

  // Amenities
  console.log("\nAMENITIES:");
  const capIdx = lower.findIndex((l) => l.includes("kapacita"));
  console.log("  Capacity section:", capIdx >= 0 ? sliceSection(lines, capIdx) : "NOT FOUND");

  // Conditions
  console.log("\nCONDITIONS:");
  const condIdx = lower.findIndex((l) => l.includes("podmínek") || l.includes("podmíny"));
  console.log("  Conditions section:", condIdx >= 0 ? sliceSection(lines, condIdx) : "NOT FOUND");

  console.log("\n📍 PAGE URL:", pageUrl);
}

async function main() {
  const bases = await client.query("bases:listAllBases", {});
  const base = bases[Math.floor(Math.random() * bases.length)];

  if (!base.url) {
    console.error("❌ Selected base has no URL");
    process.exit(1);
  }

  console.log("🎯 Testing with random base:", base.name);
  console.log("🔗 URL:", base.url);

  const resp = await fetch(base.url);
  if (!resp.ok) {
    console.error(`❌ Failed: ${resp.status}`);
    process.exit(1);
  }

  const html = await resp.text();
  extractDetailsFromHtml(html, base.url);

  console.log("\n" + "=".repeat(80));
  console.log("👆 Tell me what's correct and what's wrong. What data is missing?");
  console.log("👆 I'll fix the parser based on your feedback.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
