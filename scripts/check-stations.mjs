import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://kindred-okapi-371.convex.cloud");

const result = await client.query(api.bases.listBasesWithStations, { limit: 1 });
console.log(JSON.stringify(result, null, 2));
