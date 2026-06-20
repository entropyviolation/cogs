# `components/Home/ToDo/` — To-Do Panel

The Home **To Do** sub-tab. Day / week / month scoped task lists with tier-based sorting, quarterly/importance flags, overdue indicators, and push-to-next-period actions.

## Files

| File | Purpose |
|------|---------|
| `todo-panel.tsx` | `TodoPanel`: Day/Week/Month tabs, tier table, add-task dialog, task detail popup |

## Data

All tasks come from **`lib/task-store.ts`**. The panel derives display rows from scheduling fields:

| Tab | Filter |
|-----|--------|
| Day | `taskScheduledOnDay(task, today)` |
| Week | `taskScheduledInWeek(task, getWeekString(today))` |
| Month | `taskScheduledInMonth(task, YYYY-MM)` |

**Add Task** creates a real task via `addTask()` with scheduling set for the active tab (day → `scheduledDate`, week → `scheduledWeek`, month → `scheduledMonth`).

## Tier system

Tier (A+ through D) is computed from urgency + importance on each task. The table sorts by tier, then by push count for the active period.

## Q/I flags

Quarterly/importance badges (Q+, Q, I+, I) map to urgency/importance and can be edited inline; updates write back to the task store.

## Overdue

For day-scoped items, overdue days/weeks/months are computed from `scheduledDate` vs. today.

## Actions per row

| Action | Effect |
|--------|--------|
| Complete | Marks task done in store |
| Push | `pushTaskOnePeriod()` — moves schedule forward one period |
| Hide | Sets `hiddenFromTodo` |
| Click row | Opens `TaskDetailPopup` |

## Options

- **Show All Tasks** — includes unscheduled tasks when enabled.
- Collapse long lists after 8 rows with "Show more".

## Related

- Lists smart lists (Daily/Weekly/Monthly To Do) read the same `task-store` scheduling fields.
- Scheduler funnel assigns the underlying schedule; this panel is the execution view.
