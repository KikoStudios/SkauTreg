# Feature Architecture and APIs

This document consolidates the high-level technical docs for Email, Meetings, and Integrations.

## Email + Gmail SMTP

### Functional Scope
- Gmail SMTP connection with a Google app password in troop settings
- Server-side credential verification before the encrypted password is stored
- Draft-based trip email workflow
- Role-based sending (leader/owner)
- Smart tag personalization (`<user.name>`, `<user.sign.link>`)

### Backend Areas
- `convex/troops.ts` for encrypted Gmail SMTP configuration and disconnect
- `convex/emailDrafts.ts` for draft CRUD and recipients
- `convex/mailer.ts` for SMTP verification and final sending flow

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
