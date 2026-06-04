# Developer Setup

## Prerequisites

- Node.js LTS
- npm
- Convex CLI access
- Required credentials for Clerk/Gmail integrations

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` from `.env.example` and fill required values.
3. Start frontend:
   ```bash
   npm run dev
   ```
4. Start Convex in separate terminal:
   ```bash
   npx convex dev
   ```
5. Open `http://localhost:3000`.

## Key Project Areas

- Frontend: `src/`
- Convex backend: `convex/`
- Scripts: `scripts/`
- Docs: `docs/`

## Related Docs

- Deployment: `docs/developer/deployment.md`
- Feature architecture and APIs: `docs/developer/features.md`
- Testing: `docs/testing/testing-guide.md`
