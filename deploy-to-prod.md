# Deploy to Production - Quick Guide

## 🚀 Automated Deployment (Recommended)

Run the deployment script:

```powershell
.\deploy-production.ps1
```

This will:
1. ✅ Ask for confirmation
2. ✅ Check git status
3. ✅ Deploy Convex functions to production
4. ✅ Optionally sync bases/stations data
5. ✅ Provide verification steps

## 📋 Manual Deployment Steps

### Step 1: Deploy Convex Functions

```powershell
# Deploy to production
npx convex deploy --prod
```

Or use the npm script:
```powershell
npm run deploy:convex
```

This deploys all Convex functions and schema updates. **Your existing data is safe!**

### Step 2: Sync Bases and Stations

After Convex deployment succeeds:

```powershell
# Sync to production (uses current prod deployment)
npm run sync:prod
```

**What this does:**
- Fetches all 371 bases from zakladny.skaut.cz
- Enriches each with contacts, photos, conditions, amenities
- Finds 20 nearest transit stations for each base
- **SAFELY** upserts data (won't break existing trips/members)

**Expected time:** 20-30 minutes

### Step 3: Verify

1. Open [Convex Dashboard](https://dashboard.convex.dev)
2. Select your production deployment
3. Go to **Data** → **bases** table
4. Verify ~371 bases are present
5. Click any base → check for:
   - ✅ contacts array
   - ✅ media.photos array
   - ✅ conditions object
   - ✅ amenities.equipment array

## 🔒 Safety Guarantees

The sync is **100% safe** because:

1. **Upsert Logic**: 
   - Existing bases (by `zakladnyId`) are updated
   - New bases are created
   - No deletions happen

2. **Isolated Tables**:
   - Only touches `bases` and `stations` tables
   - Your `trips`, `members`, `participations` are untouched
   - Trip-to-base assignments are preserved

3. **Additive Schema**:
   - New fields added to existing records
   - Old fields remain unchanged
   - No data loss

## 🎯 What Gets Synced

### Bases Table
Each base record includes:
- Basic info (name, type, capacity, coordinates)
- **Contacts** (name, email, phone, website)
- **Location** (address, city, postal code, region)
- **Pricing** (price types, discounts, minimum charges)
- **Conditions** (accessibility, heating, water, toilets, kitchen)
- **Amenities** (equipment list, accommodation type)
- **Media** (photo URLs with descriptions)
- **Nearby Stations** (embedded array of 20 nearest stations)

### Stations Table
Each station record includes:
- OSM ID, name, IDOS-compatible name
- Coordinates (lat/lng)
- Transport type and modes
- Hub index (estimated connections)
- Distance score

## 🔄 Re-running Sync

Safe to run multiple times:
```powershell
npm run sync:prod
```

Each run:
- Updates existing bases with latest data from zakladny.skaut.cz
- Adds any new bases
- Refreshes station data
- **Preserves** all user-created data (trips, members)

## 📊 Monitoring

During sync, watch for:
- ✅ `Synced base X/371`
- ✅ `Found N stations for [base name]`
- ⚠️ Occasional retries (normal for rate limits)
- ❌ Persistent failures (check network/API status)

## 🆘 Troubleshooting

### "Cannot find module" error
```powershell
npm install
```

### "Unauthorized" error
```powershell
npx convex login
npx convex deploy --prod
```

### Sync timeout/hangs
- Check internet connection
- OpenStreetMap Overpass API may be slow
- Script has retry logic, just wait
- Can resume by re-running

### Production deployment not set
```powershell
# Make sure you've deployed once
npx convex deploy --prod

# Then sync will use that deployment
npm run sync:prod
```

## 🔙 Rollback

If needed, rollback via Convex Dashboard:
1. Settings → Deployments
2. Find previous version
3. Click "Restore"

Or restore from export:
1. Data → Export (do this BEFORE deployment as backup!)
2. Data → Import (if rollback needed)

## 📝 Environment Variables

The sync script uses your current Convex context:
- If you ran `npx convex deploy --prod`, sync targets production
- If you're in dev mode, sync targets dev (don't worry, script checks)

To explicitly target production:
```powershell
# Option 1: Set env var
$env:CONVEX_DEPLOYMENT = "prod:your-deployment-name"
npm run sync:prod

# Option 2: Use prod deployment automatically
npx convex deploy --prod  # Sets prod context
npm run sync:prod          # Uses prod context
```

## 🎉 Done!

After successful deployment:
1. ✅ All Convex functions updated
2. ✅ Schema updated (backwards compatible)
3. ✅ 371 bases with full details
4. ✅ ~7,000+ stations linked to bases
5. ✅ BaseFinder map populated
6. ✅ Trip assignment working
7. ✅ All existing data intact

## Next Steps

- Test trip creation in production
- Test base assignment via BaseFinder
- Test RSVP links
- Monitor logs for any errors
- Consider setting up automated weekly syncs to keep base data fresh

---

**Questions?** Check:
- [Convex Docs](https://docs.convex.dev/production/deployments)
- `scripts/SYNC-README.md` for sync technical details
- Convex Discord for support

