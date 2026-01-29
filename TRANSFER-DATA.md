# Transfer Data from Dev to Production

This guide shows how to transfer your existing bases and stations data from dev to production without re-running the sync script.

## 🚀 Quick Transfer (Automated)

```powershell
.\transfer-to-prod.ps1
```

This will:
1. Export all data from dev deployment
2. Deploy Convex functions to production
3. Import data to production
4. Keep a backup of the export

**Time:** ~2-3 minutes (vs 20-30 minutes for full sync)

---

## 📋 Manual Transfer Steps

### Step 1: Export from Dev

```powershell
# Export all tables from dev
npx convex export --path ./dev-export
```

This creates a `dev-export/` folder with all your data.

### Step 2: Deploy Functions to Production

```powershell
# Deploy Convex functions to prod
npx convex deploy --prod
```

### Step 3: Import to Production

```powershell
# Import data to production
npx convex import --prod --path ./dev-export
```

**That's it!** Your bases, stations, and base_stations data are now in production.

---

## 🎯 What Gets Transferred

### Tables Included
- ✅ `bases` - All 371 bases with enriched data
- ✅ `stations` - All transit stations
- ✅ `base_stations` - Links between bases and their nearby stations

### Tables Excluded (by default)
- ⚠️ `users`, `troops`, `members`, `trips`, `participations` - NOT transferred (dev-only data)

If you want to transfer specific tables only:

```powershell
# Export only bases and stations
npx convex export --path ./bases-export --table bases --table stations --table base_stations

# Import to production
npx convex import --prod --path ./bases-export
```

---

## 🔒 Safety

The import process:
- ✅ Adds new records
- ✅ Preserves existing production data (if any)
- ✅ Uses Convex's built-in import validation
- ✅ Creates export backup automatically

**Note:** If production already has some bases, the import will:
- Keep existing bases
- Add new bases from dev
- Update if IDs match (rare)

---

## ⚡ Why This is Better Than Re-Sync

| Method | Time | Network Load | Data Source |
|--------|------|--------------|-------------|
| **Transfer** | 2-3 min | Low | Your dev DB |
| Re-sync | 20-30 min | High | zakladny.skaut.cz + OSM |

Use transfer when:
- ✅ You already have synced data in dev
- ✅ You just need to copy it to prod
- ✅ You want it fast

Use re-sync when:
- ⚠️ You need fresh data from zakladny.skaut.cz
- ⚠️ Bases have been updated/added
- ⚠️ You're starting from scratch

---

## 🔍 Verify After Transfer

1. **Open Convex Dashboard**
   - Go to https://dashboard.convex.dev
   - Select production deployment

2. **Check Bases Table**
   - Data → bases
   - Should see ~371 records
   - Click any record to verify enriched data

3. **Check Stations Table**
   - Data → stations
   - Should see thousands of station records

4. **Check Base-Stations Links**
   - Data → base_stations
   - Should see ~7,000+ links (371 bases × ~20 stations each)

---

## 🆘 Troubleshooting

### "Table already has data"
→ This is fine! Import adds to existing data. If you want fresh start:
```powershell
# Clear production tables first (CAUTION!)
npx convex run --prod bases:clearAll
# Then import
npx convex import --prod --path ./dev-export
```

### "Unauthorized"
→ Login to production:
```powershell
npx convex login
npx convex deploy --prod  # This sets production context
```

### Export/Import too slow
→ Normal for large datasets. The script shows progress.

### Import fails midway
→ Convex import is transactional per table. Already imported tables are safe. Re-run import command.

---

## 🔄 Update Production Later

If you sync more bases to dev later and want to update production:

```powershell
# 1. Export fresh data from dev
npx convex export --path ./latest-export

# 2. Import to production (adds/updates)
npx convex import --prod --path ./latest-export
```

---

## 📝 Notes

- Export files are stored locally - safe to delete after import
- Export format is JSON - you can inspect the files if needed
- Each export is timestamped by the script
- Keep one export as backup before major changes

---

## ✅ Done!

After successful transfer:
1. ✅ All Convex functions in production
2. ✅ All bases data in production
3. ✅ All stations data in production
4. ✅ BaseFinder map will work
5. ✅ Trip assignment will work
6. ✅ Ready to test production app!
