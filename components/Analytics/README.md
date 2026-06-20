# `components/Analytics/` — Analytics

The **Analytics** top-level tab. Visualizations over data collected by other modules.

## Files

| File | Purpose |
|------|---------|
| `enhanced-analytics.tsx` | Tabbed analytics dashboard with recharts charts and a custom habit heatmap |

## Tabs

| Tab | Data source | Contents |
|-----|-------------|----------|
| **Overview** | tasks, points | Headline metrics, completion rate, recent points |
| **Habits** | `habits-store` | GitHub-style completion heatmap (~17 weeks), per-habit rates |
| **Points** | `points-store` | Daily points bar chart, cumulative line, top tasks |
| **Tracking** | `time-tracking-store` | Time distribution pie chart per scope (TimeGrid pens) |
| **Reviews** | `reviews-store` | Browse saved period reviews |

## Libraries

- **recharts** — Bar, line, pie charts
- Custom SVG/div heatmap for habit daily completion (`calculateDayPercentageAV` from `lib/calculations.ts`)

## Notes

- Cognitive-state slider trends are replaced by TimeGrid scope data in the Tracking tab.
- Plan vs. reality comparison is partially covered by Home Tracking Day Log, not yet a dedicated analytics view.
-plan to update a lot and add way more stuff here just not exactly sure what yet. Where ive been on a map? 
-eventually like that analysis map stuff 
