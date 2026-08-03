# Trip Finance V1 Plan (Archived)

Originally tracked in `v1-pl-n-modulu-financ-v-pravy.md`.

## Historical Scope

- Introduce `Finance` tab in trip detail.
- Track planned vs actual costs by category/subcategory.
- Compute per-participant pricing and summary balances.
- Track participant payment status (`unpaid`, `partial`, `paid`, `excused`).

## Historical Technical Direction

- Extend `trips` finance settings.
- Add budget and payment tables in Convex schema.
- Add `convex/tripFinance.ts` with queries/mutations for dashboard and updates.
- Integrate `FinanceTab` UI in trip page.

## Note

This is kept as a historical planning artifact and not an active specification.
