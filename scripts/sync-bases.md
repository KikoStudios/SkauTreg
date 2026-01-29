# Base + Station pre-sync

Preload scout bases (zakladny.skaut.cz) with nearest stations into Convex so UI can read cached data quickly.

## Prereqs
- Node 18+ (native fetch + AbortSignal)
- Convex deployment URL in `CONVEX_URL` (e.g. `https://happy-otter-123.convex.cloud`)
- Schema pushed after the new tables (`bases`, `stations`, `base_stations`): `npx convex dev` or `npx convex deploy`

## Run
```
node scripts/sync-bases.mjs --radius=7 --stations=8
```
Flags:
- `--limit=<n>`: only sync first _n_ bases (debug)
- `--radius=<km>`: search radius around base (default 7)
- `--stations=<n>`: max stations per base (default 8)
- `--dry-run`: skip writes, log only

The script fetches all bases, hits Overpass to find nearby rail/PT stations, scores them, and calls `api.bases.upsertBaseWithStations` to write both station records and base->station links with a common `lastSyncedAt` timestamp.

## Checking for changes later
Re-run the sync; it upserts by `zakladnyId` for bases and `osmId` for stations, clearing old base->station links before inserting the fresh rankings. In the app you can call `api.bases.listBasesWithStations` and compare `lastSyncedAt` to detect stale rows.
