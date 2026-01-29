const url = "https://zakladny.skaut.cz/318-klubovna-41-bo-kampelikova-brno";

const resp = await fetch(url);
const html = await resp.text();

// Extract __NEXT_DATA__ JSON
const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
if (!match) {
  console.log("No __NEXT_DATA__ found");
  process.exit(1);
}

const nextData = JSON.parse(match[1]);
const detail = nextData.props?.pageProps?.detail;

console.log("Detail keys:", Object.keys(detail).join(", "));
console.log("\n--- RealtyLocations ---");
console.log(JSON.stringify(detail.RealtyLocations, null, 2));

console.log("\n--- OccupationLocations ---");
if (detail.OccupationLocations) {
  console.log(JSON.stringify(detail.OccupationLocations, null, 2));
}

console.log("\n--- All detail fields (first 50 chars each) ---");
Object.keys(detail).forEach(key => {
  const val = detail[key];
  const preview = typeof val === 'string' ? val.substring(0, 50) : 
                  Array.isArray(val) ? `[${val.length} items]` :
                  typeof val === 'object' ? JSON.stringify(val).substring(0, 50) :
                  String(val);
  console.log(`${key}: ${preview}`);
});
