import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://kindred-okapi-371.convex.cloud");

try {
  const res = await client.mutation(api.bases.backfillBaseStationNames, {});
  console.log(`Backfilled ${res.updated}/${res.total} base_stations with names.`);
} catch (err) {
  console.error("Backfill failed:", err.message);
  process.exit(1);
}
