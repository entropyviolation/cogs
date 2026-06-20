# `components/Home/Tracking/` — Time & Day Logging

The Home **Tracking** sub-tab (and the global header **Tracking** button via `cognitive-state.tsx`) captures how time is spent and what actually happened vs. the plan.

## Files

| File | Purpose |
|------|---------|
| `time-grid.tsx` | **TimeGrid** — 15-minute slot grid per day. User paints slots with colored "pens" grouped into scopes (Activity, Location, Mood, etc.). Supports drag-paint, typed time ranges, pen/scope management, and per-block notes. Data in `lib/time-tracking-store.ts` (`cogs-timegrid-store`). |
| `actual-day-view.tsx` | **Day Log** — Compare planned schedule (from `AgendaGrid`) against logged actual time. Lets you log duration/location/notes onto tasks via `task.timeLogs`; shows completed tasks and a manual log list for the selected day. |

## Where they appear

| Entry point | Component |
|-------------|-----------|
| Home → Tracking → Time Grid | `TimeGrid` (full layout) |
| Home → Tracking → Day Log | `ActualDayView` |
| Global header → Tracking button | `TimeGrid` with `compact` prop inside a dialog |

## `time-grid.tsx` behavior

- **Scopes**: Independent dimensions (e.g. Activity vs. Location). Each scope has its own pen palette and slot array for the day.
- **Pens**: Named colors used to paint contiguous time blocks.
- **Slots**: 96 slots/day at 15 min each (`SLOT_MINUTES`, `SLOTS_PER_DAY` from the store).
- **Painting**: Click or drag across slots; optional From/To time range input.
- **Block details**: Optional notes attached to a painted block.

## `actual-day-view.tsx` behavior

- Day navigation (prev/next/today).
- **Plan** tab: read-only `AgendaGrid` for scheduled tasks and events.
- **Log** tab: log actual minutes on planned tasks; view all `timeLogs` for the day.
- Writes to `Task.timeLogs` and updates `Task.actualDuration` via `lib/task-store.ts`.

## Related

- Analytics **Tracking** tab aggregates TimeGrid scope data into charts.
- Plan panel (`Home/Plan/`) supplies the scheduled view that Day Log compares against.
