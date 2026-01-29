# 🚀 Deploy to Production

## Quick Start - Transfer Existing Data (Recommended)

If you already have bases synced in dev, just transfer them:

```powershell
.\transfer-to-prod.ps1
```

**Time:** 2-3 minutes

See [TRANSFER-DATA.md](./TRANSFER-DATA.md) for details.

---

## Alternative - Full Sync from Scratch

If you want fresh data from zakladny.skaut.cz:

```powershell
.\deploy-production.ps1
```

**Time:** 20-30 minutes

See [deploy-to-prod.md](./deploy-to-prod.md) for details.

---

## What's the Difference?

| Method | Time | When to Use |
|--------|------|-------------|
| **Transfer** | 2-3 min | You have data in dev, just copy it |
| **Full Sync** | 20-30 min | Need fresh data from zakladny.skaut.cz |

**Most people want Transfer!**

---

## After Deployment

✅ Verify in Convex Dashboard → Data → bases (~371 records)  
✅ Test BaseFinder map  
✅ Test trip creation and base assignment  
✅ Test RSVP links  

---

## Need Help?

- Transfer Guide: [TRANSFER-DATA.md](./TRANSFER-DATA.md)
- Full Sync Guide: [deploy-to-prod.md](./deploy-to-prod.md)
- Sync Technical Details: [scripts/SYNC-README.md](./scripts/SYNC-README.md)
