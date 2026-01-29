import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

console.log("Testing equipment extraction...\n");

// Test one base
const url = "https://zakladny.skaut.cz/318-klubovna-41-bo-kampelikova-brno";
const resp = await fetch(url);
const html = await resp.text();

const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
const nextData = JSON.parse(match[1]);
const detail = nextData.props?.pageProps?.detail;

console.log("Base:", detail.DisplayName);
console.log("Equipment found:", detail.OccupationEquipment?.length || 0);

if (detail.OccupationEquipment && detail.OccupationEquipment.length > 0) {
  const equipment = detail.OccupationEquipment.map(e => e.DisplayName);
  console.log("Equipment list:");
  equipment.forEach(e => console.log("  -", e));
  
  console.log("\nFormatted:", equipment.join(', '));
}

// Now test updating one base in DB
console.log("\nFetching base from DB...");
const bases = await client.query("bases:listAllBases", {});
const testBase = bases.find(b => b.zakladnyId === 318);

if (testBase) {
  console.log("Found in DB:", testBase.name);
  console.log("Current equipment:", testBase.amenities?.equipment || "none");
  
  const updateData = {
    amenities: {
      equipment: detail.OccupationEquipment.map(e => e.DisplayName),
      accommodationType: detail.RealtyType,
      maxCapacity: detail.Capacity,
    },
    lastSyncedAt: new Date().toISOString(),
  };
  
  console.log("\nUpdating with new equipment...");
  await client.mutation("bases:updateBaseDetails", {
    baseId: testBase._id,
    data: updateData,
  });
  
  console.log("✓ Updated successfully!");
  
  // Verify
  const updated = await client.query("bases:listAllBases", {});
  const verified = updated.find(b => b.zakladnyId === 318);
  console.log("\nVerified equipment:", verified.amenities?.equipment.join(', '));
}
