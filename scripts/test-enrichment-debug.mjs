import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

async function main() {
  console.log("Starting test...");
  console.log("CONVEX_URL:", process.env.CONVEX_URL);

  try {
    console.log("Fetching bases...");
    const bases = await client.query("bases:listAllBases", {});
    console.log(`Found ${bases.length} bases`);
    
    if (bases.length > 0) {
      console.log("First base:", bases[0].name, bases[0]._id);
      
      // Test a simple fetch from zakladny
      console.log("\nTesting fetch from zakladny.skaut.cz for first base...");
      const testUrl = bases[0].url || `https://zakladny.skaut.cz/detail/${bases[0].zakladnyId}`;
      console.log("URL:", testUrl);
      
      console.time("Fetch");
      const resp = await fetch(testUrl);
      console.timeEnd("Fetch");
      
      if (resp.ok) {
        const html = await resp.text();
        console.log("Response size:", html.length, "bytes");
        console.log("Has Photos:", html.includes('"Photos":'));
      } else {
        console.log("Response status:", resp.status);
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main().catch(console.error);
