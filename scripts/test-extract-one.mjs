import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

function htmlToLines(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d)>/gi, "\n")
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
  for (let i = startIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*(Rezervace|Kapacita|Podmínky|Další údaje|Kontakty|Cena)\b/i.test(l)) break;
    section.push(l);
  }
  return section.join(" \n").trim();
}

function extractDetailsFromHtml(html) {
  const lines = htmlToLines(html);
  const lower = lines.map((l) => l.toLowerCase());

  const pricing = {};
  const baseLine = findLine(lower, (l) => l.includes("cena (základní)"));
  if (baseLine) pricing.perNight = firstNumber(lines[baseLine.idx]);
  const childrenLine = findLine(lower, (l) => l.includes("dětsk"));
  if (childrenLine) pricing.discountChildrenOrgs = firstNumber(lines[childrenLine.idx]);
  const scoutLine = findLine(lower, (l) => l.includes("skaut"));
  if (scoutLine) pricing.discountScouts = firstNumber(lines[scoutLine.idx]);
  const minLine = findLine(lower, (l) => l.includes("minimální"));
  if (minLine) pricing.minimumCharge = firstNumber(lines[minLine.idx]);
  if (Object.keys(pricing).length) pricing.currencyCode = "CZK";

  const availabilityLine = findLine(lower, (l) => /^(leden|únor|březen|duben|květen|červen|červenec|srpen|září|říjen|listopad|prosinec)/.test(l));
  const availability = availabilityLine ? lines[availabilityLine.idx] : undefined;

  const contacts = [];
  const emailMatch = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  const phoneMatch = html.match(/\b\+?\d[\d\s]{7,}\b/g);
  if (emailMatch || phoneMatch) {
    contacts.push({
      name: undefined,
      role: "správce",
      email: emailMatch ? emailMatch[0] : undefined,
      phone: phoneMatch ? phoneMatch[0].replace(/\s+/g, " ").trim() : undefined,
      website: undefined,
    });
  }

  let amenitiesDescription;
  const capIdx = lower.findIndex((l) => l.startsWith("kapacita"));
  if (capIdx >= 0) amenitiesDescription = sliceSection(lines, capIdx);

  let conditionsText;
  const condIdx = lower.findIndex((l) => l.startsWith("podmínky"));
  if (condIdx >= 0) conditionsText = sliceSection(lines, condIdx);

  let language;
  const langIdx = lower.findIndex((l) => l.includes("jazyk"));
  if (langIdx >= 0 && langIdx + 1 < lines.length) language = lines[langIdx + 1];

  let photoDescription;
  const photoIdx = lower.findIndex((l) => l.includes("ilustrační fotka"));
  if (photoIdx >= 0) photoDescription = lines[photoIdx];

  return {
    pricing: Object.keys(pricing).length ? pricing : undefined,
    availability,
    contacts: contacts.length ? contacts : undefined,
    amenities: amenitiesDescription
      ? { description: amenitiesDescription }
      : undefined,
    conditions: conditionsText
      ? { specialNotes: conditionsText, language }
      : language
      ? { language }
      : undefined,
    media: photoDescription
      ? { description: photoDescription }
      : undefined,
  };
}

async function main() {
  const bases = await client.query("bases:listAllBases", {});
  
  // Find Plasy
  const plasy = bases.find(b => b.name?.toLowerCase().includes("plasy"));
  if (!plasy) {
    console.error("❌ Plasy base not found");
    process.exit(1);
  }

  console.log("📍 Testing with:", plasy.name);
  console.log("🔗 URL:", plasy.url);
  console.log("");

  if (!plasy.url) {
    console.error("❌ No URL for this base");
    process.exit(1);
  }

  const resp = await fetch(plasy.url);
  if (!resp.ok) {
    console.error(`❌ Failed to fetch: ${resp.status}`);
    process.exit(1);
  }

  const html = await resp.text();
  const extracted = extractDetailsFromHtml(html);

  console.log("📊 EXTRACTED DATA:");
  console.log(JSON.stringify(extracted, null, 2));
  console.log("");
  console.log("🔍 Tell me what's wrong and what's good. Then I'll fix the parser.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
