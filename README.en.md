# SkauTreg

SkauTreg is a modern app for scout troop management. It helps leaders with day-to-day operations: members, trips, attendance, registrations, and team communication.

## Main Features

### Done
- [x] Authentication (Clerk)
- [x] Dashboard
- [x] Member management
- [x] Troop management
- [x] Trips
- [x] Calendar
- [x] RSVP system (public links)
- [x] Settings
- [x] Base database integration
- [x] IDOS integration
- [x] Mailing (Google Mail integration)
- [x] Council notes management

### Planned
- [ ] Finance management
- [ ] Trip profitability vs subsidies
- [ ] Trip receipts
- [ ] Photos/albums after trips
- [ ] Participant payment tracking
- [ ] Git change control for rover edits (leader approval)

## Tech Stack

- **Next.js**: frontend
- **Convex**: backend and realtime database
- **Clerk**: authentication and user management
- **Browserless**: iDOS automation integration (future self-host option)

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` based on `.env.example`.
3. Start frontend:
   ```bash
   npm run dev
   ```
4. In a second terminal, start Convex:
   ```bash
   npx convex dev
   ```
5. Open `http://localhost:3000`.

## Documentation

- Docs index: `docs/README.md`
- Testing (EN): `docs/testing/testing-guide.en.md`
- Testing (CZ): `docs/testing/testing-guide.cs.md`
