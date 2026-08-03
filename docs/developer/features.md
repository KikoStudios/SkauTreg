# Feature Architecture and APIs

This document consolidates the high-level technical docs for Email, OAuth, Meetings, and Integrations.

## Email + Gmail OAuth

### Functional Scope
- Gmail OAuth connection in troop settings
- Draft-based trip email workflow
- Role-based sending (leader/owner)
- Smart tag personalization (`<user.name>`, `<user.sign.link>`)

### Backend Areas
- `convex/troops.ts` for Gmail connect/disconnect
- `convex/emailDrafts.ts` for draft CRUD and recipients
- `convex/mailer.ts` for final sending flow

### Frontend Areas
- `src/components/GmailSettings.tsx`
- `src/components/EmailDraftsTab.tsx`

## LIVE Meetings

### Functional Scope
- LIVE session start/end
- Real-time participant presence
- Replay of ended meetings

### Backend Areas
- `convex/schema.ts` (`meetings`, `meeting_presence`)
- `convex/meetings.ts` for session and presence mutations/queries

### Frontend Areas
- `src/components/MeetingSession.tsx`
- `src/components/MeetingReplay.tsx`
- `src/components/MeetingsList.tsx`

## Integrations

### Current Integrations
- Bases data integration
- IDOS support
- Supernotes/integration-related implementation notes consolidated from legacy docs

### Operational Guidance
- Keep integration changes documented in `docs/changelog/`.
- Add new integration-specific runbooks under `docs/developer/` as features mature.
