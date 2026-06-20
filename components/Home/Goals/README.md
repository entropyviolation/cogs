# `components/Home/Goals/` — Goals & Objectives

The Home **Goals** sub-tab. Users define goals with a target, period, category, and point reward; progress is tracked manually and awards points when a goal is marked complete.

## Files

| File | Purpose |
|------|---------|
| `goals-tracker.tsx` | `GoalsTracker`: CRUD for goals, grouped by period (day/week/month/quarter/year), progress bars, complete/edit/delete dialogs |

## Data

All goal data persists in **`lib/goals-store.ts`** (`cogs-goals-store` in localStorage).

Each `Goal` has:

- `title`, `description`, `category`
- `type`: `count` | `boolean` | `percentage`
- `target`, `current`, `period`
- `points` — awarded via `lib/points-store.ts` when completed

Default seed goals (read, surf, ship milestone) are created on first load.

## UI

- Tabs filter goals by period.
- **Add Goal** dialog: title, description, type, target, period, category, points.
- Inline progress update and **Complete** awards points and marks done.
- Category icons (Learning → book, Health → waves, etc.).

## Gaps vs. full spec

- No separate `Objective` entity or multi-horizon objective trees.
- Progress is manual, not auto-linked to habits/tasks.
- No milestone-style objectives or penalty amounts.
