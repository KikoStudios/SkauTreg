# Deployment Guide

This canonical guide merges previous deployment notes into one flow.

## Recommended Path: Transfer Existing Synced Data

Use this when development already contains synced bases/stations.

```powershell
.\transfer-to-prod.ps1
```

Expected duration: ~2-3 minutes.

## Alternative: Full Sync From Scratch

Use this when you need fresh source data from `zakladny.skaut.cz`.

```powershell
.\deploy-production.ps1
```

Expected duration: ~20-30 minutes.

## Manual Transfer Flow

```powershell
npx convex export --path ./dev-export
npx convex deploy --prod
npx convex import --prod --path ./dev-export
```

## Verification Checklist

- `bases` table has expected records in Convex production dashboard.
- Base finder and trip base assignment works.
- RSVP links work after deploy.

## Safety Notes

- Import is additive by default.
- Keep one export backup before major production updates.
- If production reset is needed, do it intentionally and verify tables before import.

## Related Technical Scripts

- `scripts/SYNC-README.md`
- `scripts/sync-bases.md`
