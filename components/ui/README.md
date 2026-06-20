# `components/ui/` — shadcn/ui primitives

Vendored [shadcn/ui](https://ui.shadcn.com/) components: thin styled wrappers around Radix UI primitives, configured via `components.json` at the repo root.

> These are application building blocks. Prefer composing them in module folders over editing them directly. If behavior must change, consider a wrapper in the consuming module first.

## Currently in tree

Only the primitives actively imported by the app are kept. As of the current codebase:

| File | Role |
|------|------|
| `alert.tsx` | Alert messages |
| `badge.tsx` | Status badges, counts |
| `button.tsx` | Buttons (variants: default, outline, ghost, destructive, …) |
| `card.tsx` | Card, CardHeader, CardTitle, CardContent |
| `checkbox.tsx` | Checkboxes |
| `collapsible.tsx` | Expand/collapse sections (Scheduler filters) |
| `dialog.tsx` | Modal dialogs |
| `dropdown-menu.tsx` | Menus (Reviews header, etc.) |
| `input.tsx` | Text and number inputs |
| `label.tsx` | Form labels |
| `progress.tsx` | Progress bars (supports `indicatorClassName`) |
| `select.tsx` | Select dropdowns |
| `separator.tsx` | Visual dividers |
| `switch.tsx` | Toggle switches |
| `table.tsx` | Table layout (Lists details view) |
| `tabs.tsx` | Tab navigation |
| `textarea.tsx` | Multi-line text |
| `tooltip.tsx` | Hover tooltips |

## Removed (not present)

Many default shadcn components were deleted as unused, including: `accordion`, `alert-dialog`, `avatar`, `breadcrumb`, `calendar`, `carousel`, `chart`, `command`, `context-menu`, `drawer`, `form`, `hover-card`, `input-otp`, `menubar`, `navigation-menu`, `pagination`, `popover`, `radio-group`, `resizable`, `scroll-area`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `toast`, `toaster`, `toggle`, `toggle-group`, and associated hooks.

Charts in Analytics import **recharts** directly, not `ui/chart.tsx`.

## Styling

- Theme variables in `app/globals.css`
- Tailwind config at `tailwind.config.ts`
- Win98 Lists skin is separate: `components/Lists/filemanager98.css` (not part of `ui/`)

## Usage pattern

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
```

All modules (Home, Lists, Scheduler, Analytics, etc.) import from this folder.
