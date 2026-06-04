# Markdown Inventory and Disposition

This file maps existing markdown files to their target state during docs cleanup.

## Keep in Root
- `README.md`

## Keep Outside Docs (module-local readmes)
- `convex/README.md`
- `scripts/SYNC-README.md`
- `scripts/sync-bases.md`
- `src/config/VERSION-DETECTION-GUIDE.md`
- `public/help-content.md` (kept for in-app content source)

## Merge Into Canonical Docs
- Deployment family:
  - `DEPLOY.md`
  - `DEPLOYMENT.md`
  - `DEPLOYMENT-CHECKLIST-UPDATES.md`
  - `TRANSFER-DATA.md`
- OAuth family:
  - `OAUTH-DOCS-INDEX.md`
  - `START-HERE-OAUTH.md`
  - `OAUTH-QUICK-REF.md`
  - `OAUTH-SETUP-COMPLETE.md`
  - `OAUTH-IMPLEMENTATION-SUMMARY.md`
  - `OAUTH-CHANGES.md`
  - `OAUTH-ARCHITECTURE.md`
  - `README-OAUTH-IMPLEMENTATION.md`
  - `OAUTH-TESTING-GUIDE.md`
- Email family:
  - `EMAIL-SYSTEM-DOCS.md`
  - `README-EMAIL-SYSTEM.md`
  - `EMAIL-IMPLEMENTATION.md`
  - `EMAIL-IMPLEMENTATION-ROADMAP.md`
  - `EMAIL-IMPROVEMENTS-SUMMARY.md`
  - `QUICK-REF-EMAIL-IMPROVEMENTS.md`
  - `EMAIL-API.md`
  - `EMAIL-QUICKSTART.md`
  - `EMAIL-CHECKLIST.md`
  - `EMAIL-UI-GUIDE.md`
  - `EMAIL-PROVIDERS-VERIFICATION.md`
  - `MULTI-PROVIDER-EMAIL.md`
  - `FINAL-VERDICT-EMAIL-STATUS.md`
- Meetings family:
  - `MEETINGS-FEATURE.md`
  - `MEETINGS-IMPLEMENTATION.md`
  - `LIVE-MEETINGS.md`
  - `LIVE-MEETINGS-SUMMARY.md`
  - `IMPLEMENTATION-CHECKLIST.md`
  - `UI-VISUAL-GUIDE.md`
- Integrations/update family:
  - `INTEGRATIONS-ARCHITECTURE.md`
  - `INTEGRATIONS-IMPLEMENTATION.md`
  - `INTEGRATIONS-QUICKSTART.md`
  - `SUPERNOTES-INTEGRATION.md`
  - `UPDATE-SYSTEM-DOCS.md`
  - `UPDATE-SYSTEM-QUICKSTART.md`
  - `UPDATE-SYSTEM-SUMMARY.md`
  - `README-UPDATE-SYSTEM.md`

## Archive (historical one-offs)
- `SEZNAM-CENTRUM-STATUS.md`
- `v1-pl-n-modulu-financ-v-pravy.md`

## Remove From Root After Consolidation
All files listed in "Merge Into Canonical Docs" are removed from root after canonical docs are created under `docs/`.
