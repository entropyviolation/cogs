# `components/Home/Habits/` — Habit Tracker

The Home **Habits** sub-tab. Supports five habit measurement types (boolean, time/goal, count, text, incremental) at **daily**, **weekly**, and **monthly** frequencies.

## Data

Single source of truth: **`lib/habits-store.ts`** (Zustand + persist).

| Field | Contents |
|-------|----------|
| `tasks` | Habit definitions (`WeeklyTask[]`) |
| `weeklyData` | Per-day completions keyed by local date (`YYYY-MM-DD`) |
| `weeklyHabitData` / `monthlyHabitData` | Weekly/monthly frequency completions |

Completing a habit awards points via `lib/points-store.ts`. Legacy `weekly-habits-*` localStorage keys are migrated on first load.

The same store is used by **`Lists/daily-habits-list.tsx`** — changes in Home or Lists stay in sync.

## Files

| File | Purpose |
|------|---------|
| `habit-tracker.tsx` | `WeeklyTaskTracker`: top-level view with Daily / Weekly / Monthly tabs, week navigation (daily tab), hide-completed toggle, settings |
| `task-grid.tsx` | Spreadsheet grid: habits × 7 weekdays; type-specific inputs; daily completion row |
| `period-habit-list.tsx` | Checklist UI for weekly/monthly habits; exports `filterHabitsByFrequency()` |
| `week-navigation.tsx` | Previous / next week, Today, date range label |
| `daily-task-form.tsx` | Habit form fields (name, type, goal, incremental rules, reward, frequency) |
| `daily-task-form-dialog.tsx` | Dialog wrapper for create/edit habit |
| `settings-dialog.tsx` | Import/export habit JSON, reset to defaults |

## Tabs in `habit-tracker.tsx`

| Tab | View |
|-----|------|
| Daily | `TaskGrid` for the selected week |
| Weekly | `PeriodHabitList` for habits with `frequency: "weekly"` |
| Monthly | `PeriodHabitList` for habits with `frequency: "monthly"` |

## Habit types (`TaskType`)

| Type | Input | Done when |
|------|-------|-----------|
| Boolean | Checkbox | Checked |
| Goal / Time / Count | Number | Value ≥ goal |
| Text | Textarea | Non-empty text |
| Incremental | Per-key numbers | Keys meet weekly increment targets |

## Notes

- Streaks are not computed or displayed yet.
- Default seed set: 14 daily habits in `getDefaultHabits()`.
