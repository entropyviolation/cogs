# `components/Modules/` — Modules Dashboard

The **Modules** top-level tab. A user-composed dashboard of small widgets that pull live data from Lists, tasks, habits, and analytics.

## Files

| File | Purpose |
|------|---------|
| `modules-panel.tsx` | `ModulesPanel`: grid of module cards, add/configure/remove modules, renders each module type |

## Data

Module instances persist in **`lib/modules-store.ts`** (`cogs-modules-store`).

Each module: `{ id, type, title, config }`.

## Module types

| Type | Label | Behavior |
|------|-------|----------|
| `list-explorer` | List Explorer | Pick a list (+ optional attribute filters); show random item(s); "Surprise me" reroll |
| `writing-prompt` | Writing Generator | Random form + topic + constraint; optional seed list for topics |
| `list-summary` | List Summary | Progress/completion stats for a chosen list |
| `analytics-stat` | Analytics Stat | Single headline number (total points, open tasks, habits done today, etc.) |
| `random-task` | Random Task | Pick an open task to do now (optional list filter) |
| `rules` | Rules / Cause→Effect | Attribute rules (`>`, `contains`, `is set`, …) filter items; show matches from a list |

## Configuration

Each module type has a config dialog (list picker, attribute rules, stat type, etc.). Modules can be reordered implicitly by add order; removed with trash icon.

## Data sources

| Store | Used for |
|-------|----------|
| `task-store` | Lists, tasks, attributes |
| `points-store` | Points stats |
| `habits-store` | Habit completion stats |
| `attribute-editor` helpers | Rule evaluation, attribute display |

## Props

`ModulesPanel` accepts `onTaskSelect(taskId)` — wired from `app/page.tsx` to open full-screen task detail when a module surfaces a task.
