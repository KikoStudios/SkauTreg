import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

async function main() {
  console.log("🚀 Adding Coordinates to Base Stations");
  console.log("=" + "=".repeat(50));

  // Fetch all base_stations
  console.log("📡 Fetching all base_stations...");
  const baseStations = await client.query("bases:listAllBaseStations");
  console.log(`✅ Found ${baseStations.length} base_stations`);

  // Group by stationId and get unique stations
  const stationIds = [...new Set(baseStations.map(bs => bs.stationId))];
  console.log(`📍 Unique stations: ${stationIds.length}`);

  // Fetch all stations
  console.log("📡 Fetching all stations...");
  const allStations = await client.query("bases:listAllStations");
  console.log(`✅ Found ${allStations.length} stations`);
  const stationMap = new Map(allStations.map(s => [s._id, s]));
  console.log(`✅ Station map built`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  // Process base_stations
  console.log("\n🔄 Processing base_stations...");
  for (let i = 0; i < baseStations.length; i++) {
    const bs = baseStations[i];
    
    if ((i + 1) % 100 === 0) {
      console.log(`[${i + 1}/${baseStations.length}] Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
    }

    // Check if already has coordinates
    if (bs.lat && bs.lng) {
      skipped++;
      continue;
    }

    // Get station coords
    const station = stationMap.get(bs.stationId);
    if (!station || !station.lat || !station.lng) {
      failed++;
      continue;
    }

    try {
      await client.mutation("bases:updateBaseStationCoordinates", {
        baseStationId: bs._id,
        lat: station.lat,
        lng: station.lng
      });
      updated++;
    } catch (error) {
      console.error(`❌ Failed to update ${bs._id}:`, error.message);
      failed++;
    }

    // Rate limiting
    if ((i + 1) % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log("\n" + "=".repeat(52));
  console.log("📊 Summary:");
  console.log(`  Total base_stations: ${baseStations.length}`);
  console.log(`  Already had coordinates: ${skipped}`);
  console.log(`  Successfully updated: ${updated}`);
  console.log(`  Failed: ${failed}`);
  console.log("=".repeat(52));
}

main().catch(console.error);
