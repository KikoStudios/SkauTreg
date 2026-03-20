/**
 * Preload stations for all bases (v2 algorithm)
 *
 * Usage:
 *   node scripts/preload-base-stations-v2.mjs --radius 5 --limit 15
 *   node scripts/preload-base-stations-v2.mjs --prod --radius 5 --limit 15
 *
 * Notes:
 * - Uses `api.bases.getAllBases` and updates `base_stations` via `api.bases.upsertBaseWithStations`.
 * - Intended to run after you manually clear `stations` / `base_stations`.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { findStationsV2 } from "./lib/find-stations-v2.mjs";

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getArg = (name, fallback) => {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  const val = args[idx + 1];
  if (!val || val.startsWith("--")) return fallback;
  return val;
};

const USE_PROD = hasFlag("--prod");
const radiusKm = Number(getArg("--radius", "5"));
const limitStations = Number(getArg("--limit", "15"));
const limitBases = Number(getArg("--bases", "0"));
const sleepMs = Number(getArg("--sleepMs", "250"));

const CONVEX_URL =
  process.env.CONVEX_URL ||
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  (USE_PROD ? "https://kindred-okapi-371.convex.cloud" : "https://kindred-okapi-371.convex.cloud");

if (!CONVEX_URL) {
  console.error("? Missing CONVEX_URL / NEXT_PUBLIC_CONVEX_URL");
  process.exit(1);
}

console.log("?? Preloading base stations (v2)");
console.log(`?? Convex: ${CONVEX_URL} (${USE_PROD ? "prod-ish" : "dev-ish"})`);
console.log(`?? radius=${radiusKm}km, limit=${limitStations}, bases=${limitBases || "ALL"}`);

const client = new ConvexHttpClient(CONVEX_URL);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pickBaseInput(base, nowIso) {
  return {
    zakladnyId: base.zakladnyId,
    name: base.name,
    slug: base.slug ?? undefined,
    url: base.url ?? undefined,
    type: base.type ?? undefined,
    typeKey: base.typeKey ?? undefined,
    capacity: base.capacity ?? undefined,
    capacityNote: base.capacityNote ?? undefined,
    coordinates: base.coordinates,
    pricing: base.pricing ?? undefined,
    location: base.location ?? undefined,
    contacts: base.contacts ?? undefined,
    amenities: base.amenities ?? undefined,
    conditions: base.conditions ?? undefined,
    media: base.media ?? undefined,
    highlighted: base.highlighted ?? undefined,
    availability: base.availability ?? undefined,
    lastSyncedAt: nowIso,
  };
}

async function main() {
  const bases = await client.query(api.bases.getAllBases, {});
  const filtered = bases
    .filter((b) => b.coordinates?.lat != null && b.coordinates?.lng != null)
    .slice(0, limitBases > 0 ? limitBases : undefined);

  console.log(`? Loaded ${filtered.length} base(s) with coordinates`);

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < filtered.length; i++) {
    const base = filtered[i];
    const nowIso = new Date().toISOString();

    console.log(`\n[${i + 1}/${filtered.length}] ${base.name} (${base.coordinates.lat}, ${base.coordinates.lng})`);

    try {
      const stations = await findStationsV2({
        lat: base.coordinates.lat,
        lng: base.coordinates.lng,
        radiusKm,
        limit: limitStations,
      });

      console.log(`  ? stations: ${stations.length}`);

      await client.mutation(api.bases.upsertBaseWithStations, {
        base: pickBaseInput(base, nowIso),
        stations,
      });

      ok += 1;
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ??  Failed: ${msg}`);
    }

    if (sleepMs > 0) await sleep(sleepMs);
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Done. OK=${ok}, Failed=${failed}`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});