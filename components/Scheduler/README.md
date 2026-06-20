# `components/Scheduler/` — Scheduler (Period Funnel)

The **Scheduler** top-level tab. Progressive refinement: bucket tasks into Always → Year → Month → Week → Day before assigning specific dates/times.

## Files

| File | Purpose |
|------|---------|
| `enhanced-scheduler.tsx` | Full funnel UI: inbox of unscheduled tasks, period buckets, drag between levels, filters, sort, task detail popup |

## Data

Reads/writes **`lib/task-store.ts`** scheduling fields:

| Field | Period |
|-------|--------|
| `scheduledYear` | Year |
| `scheduledMonth` | Month (`YYYY-MM`) |
| `scheduledWeek` | Week (`getWeekString` range) |
| `scheduledDate` + `scheduledTime` | Day |

## Visibility rules

A task appears in the Scheduler only if it belongs to at least one **scheduleable** list (`TaskCategory.scheduleable !== false`).

The **Always** overview shows tasks at their stored schedule level only (`taskBelongsInOverviewBox` in `lib/item-utils.ts`).

## UI structure

1. **Scheduler Inbox** — tasks with no schedule assignment.
2. **Period tabs** — Always, Year, Month, Week, Day with date navigation where applicable.
3. **Task cards** — drag to refine period; click to open `TaskDetailPopup`.
4. **Filters** — by list/category; sort by importance, duration, deadline, reward, category.

## Drag behavior

Dragging a task from a coarser bucket to a finer one sets the appropriate scheduling field and clears coarser fields (e.g. week → day clears `scheduledWeek`, sets `scheduledDate`).

## Related panels

| Panel | Relationship |
|-------|----------------|
| Home Plan | Calendar placement of day/week scheduled tasks |
| Home To Do | Execution lists for scheduled tasks |
| Lists smart lists | Same schedule fields, different presentation |

## Not implemented

- Auto-scheduling with constraint solving (§7.6).
- Automatic carry-over (partially handled via Reviews).
- Event-linked checklists on calendar events.
