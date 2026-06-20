# `components/Home/` — Home Dashboard

The Home tab is the default screen each session. It combines a header row (date, points, today's progress, review banner) with five sub-tabs: **Habits**, **Plan**, **To Do**, **Goals**, and **Tracking**.

## Files

| File | Purpose |
|------|---------|
| `home-dashboard.tsx` | Container: date card, `PointsStats`, `DailyProgressQuickview`, review banner, and the five sub-tabs |
| `home-review-banner.tsx` | Surfaces due end-of-period reviews (§8.7); links to header Review dropdown |
| `points-stats.tsx` | All Time / Today / This Week / This Month points cards with progress bars (`lib/points-store` + `lib/task-store`) |
| `daily-progress-quickview.tsx` | Header card showing today's to-do and daily-habit completion (% done, items left) |

## Shared date

The dashboard uses `lib/use-current-date.ts` for a single **selected day** shared by the header, points, progress, Plan panel, Day Log, and daily habit grid. The date advances at local midnight; main and Tracking sub-tabs persist in `localStorage`.

## Subfolders

| Folder | Sub-view |
|--------|----------|
| `Habits/` | Daily / weekly / monthly habit tracker |
| `Plan/` | Month / Week / Day calendar + plan text |
| `ToDo/` | Tier-based day/week/month to-do |
| `Goals/` | Goals with progress and point rewards |
| `Tracking/` | TimeGrid life tracker + actual day log |

## Layout

```
┌─────────────────────────────────────────────────┐
│ Review banner (when due)                        │
├─────────────────────────────────────────────────┤
│ Date + PointsStats          │ Today's Progress  │
├─────────────────────────────────────────────────┤
│ Habits │ Plan │ To Do │ Goals │ Tracking       │
├─────────────────────────────────────────────────┤
│           (active sub-view)                     │
└─────────────────────────────────────────────────┘
```

## Stores

| Sub-view | Primary store(s) |
|----------|------------------|
| Habits | `lib/habits-store.ts` |
| Plan | `lib/task-store.ts`, `lib/event-store.ts`, plan text via `lib/plan-text.ts` (localStorage) |
| To Do | `lib/task-store.ts` |
| Goals | `lib/goals-store.ts` |
| Tracking | `lib/time-tracking-store.ts`, `lib/task-store.ts`, `lib/event-store.ts` |

See each subfolder's `README.md` for file-level detail.
