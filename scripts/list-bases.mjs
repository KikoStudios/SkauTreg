import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://kindred-okapi-371.convex.cloud");

try {
  const result = await client.query(api.bases.listBasesWithStations, { limit: 5 });
  console.log(`Total results: ${result.length}`);
  result.forEach(item => {
    console.log(`\n${item.base.name}`);
    console.log(`  Coords: ${item.base.coordinates.lat}, ${item.base.coordinates.lng}`);
    console.log(`  Stations found: ${item.stations.length}`);
  });
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
