# Seznam and Centrum Status (Archived)

Originally tracked in `SEZNAM-CENTRUM-STATUS.md`.

## Historical Snapshot

- Date: February 21, 2026
- State at that time: provider integration code configured, but required real account testing.
- Providers covered:
  - Seznam (`smtp.seznam.cz`, `imap.seznam.cz`)
  - Centrum (`smtp.centrum.cz`, `imap.centrum.cz`)

## Historical Testing Notes

- Verification script referenced: `scripts/verify-email-providers.mjs`
- Required: real provider accounts and generated app passwords
- Goal was validating SMTP and IMAP connectivity and basic send behavior
