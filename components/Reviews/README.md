# `components/Reviews/` — End-of-Period Reviews

Global header **Review** dropdown (not a top-level tab). Guides the user through closing out a day, week, month, quarter, or year.

## Files

| File | Purpose |
|------|---------|
| `reviews.tsx` | `Reviews` header button + `ReviewDialog` for each period type |

## Entry point

Rendered in `app/page.tsx` header alongside Tracking, Inbox, Bulk Add, and Quick Add.

- Dropdown lists all five period types.
- **Due** badge when the just-ended period has no saved review.
- Saved reviews browsable from Analytics → Reviews tab.

## Review flow (`ReviewDialog`)

1. **Unfinished items** — tasks scheduled in the period but not completed; mark Done or Push to next period.
2. **Summary** — free-text recap.
3. **Gratitude** — multiple gratitude lines.
4. **Your plan** (day/week/month only) — read-only plan text from `lib/plan-text.ts` + reflection textarea.
5. **Reflection** — What went well? / What could improve? / What did you learn?
6. **Next plans** — intentions for the upcoming period.

## Data

| Store / helper | Role |
|----------------|------|
| `lib/reviews-store.ts` | Persists `PeriodReview[]` (`cogs-reviews-store`) |
| `lib/task-store.ts` | Incomplete tasks, push/done actions |
| `lib/plan-text.ts` | Loads saved day/week/month plan from localStorage |

## Period keys

| Period | Key format |
|--------|------------|
| Day | `YYYY-MM-DD` |
| Week | `getWeekString` range |
| Month | `YYYY-MM` |
| Quarter | `YYYY-Qn` |
| Year | `YYYY` |

Helpers: `getPeriodKey`, `previousPeriodDate`, `nextPeriodDate`, `periodLabel` in `reviews-store.ts`.

## Push behavior

Pushing a task increments the period's push counter (`daysPushed`, `weeksPushed`, or `monthsPushed`) and reschedules to the next period's field.
