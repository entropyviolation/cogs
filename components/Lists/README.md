# `components/Lists/` — Lists (File Manager)

The **Lists** top-level tab. A Windows 95/98–styled file manager for folders, lists (categories), and items (tasks). All item data flows through **`lib/task-store.ts`**.

## Files

| File | Purpose |
|------|---------|
| `enhanced-category-view.tsx` | Main UI: navigation, folder views, list contents, drag-and-drop, search, CSV import, orb icons |
| `attribute-editor.tsx` | Schema editor (`AttributeSchemaEditor`) and value editor (`AttributeValuesEditor`) for flexible list attributes |
| `settings-dialog.tsx` | Global Lists settings: reorder lists, import/export JSON (`NextActionsSettingsDialog`) |
| `list-picker.tsx` | Folder-aware list selector (Inbox clarification, attribute fields) |
| `daily-habits-list.tsx` | Daily / weekly / monthly habit views embedded in Lists (uses `lib/habits-store.ts`) |
| `filemanager98.css` | Scoped Win98 skin (`.fm98` root) |

## Navigation model

| Location | Contents |
|----------|----------|
| **Home** | Pinned folders/lists + smart to-do lists + habit shortcuts |
| **All** | Every folder and list |
| **Folder** | Subfolders, **All Items**, and lists in that folder |

### Folder views (when browsing, not inside a list)

Icons (velvet desktop), List, Details, Cards — persisted in `lib/lists-ui-store.ts`.

### List content displays (when a list is open)

Default, Checklist, Icons, Details (table) — per-list setting in the UI store.

## Key features

- **Smart lists**: Daily / Weekly / Monthly To Do — live views over `task-store` scheduling (same data as Home To Do).
- **All Items per folder**: Auto-managed category (`__all-items__{folderId}`). Shows union of all folder items; add here for uncategorized folder membership. Toggle **Show uncategorized only** to filter.
- **Drag-and-drop**: Tasks onto lists; lists onto folders; tasks onto folder sidebar → uncategorized in that folder.
- **Attributes**: Per-list schema (number, string, selection, goal, etc.); reorderable in list settings.
- **Next Actions points**: Completing a task in the Next Actions folder awards **1 point** by default, or the list's **Points** number attribute if defined.
- **Orb gallery**: 1000+ orbs from `lib/orbs-manifest.ts`; edit mode to hide orbs from gallery; custom upload with background removal.
- **Icon layout**: Freeform positions per location; auto-organize grid.

## Per-list settings (in `enhanced-category-view.tsx`)

Opened from list gear icon: name, description, color, item label, detail panels, display type, attribute schema (with reorder), default values, table columns, scheduleable toggle, pin to Home.

## Stores

| Store | Role |
|-------|------|
| `task-store` | Tasks, categories, folders |
| `lists-ui-store` | Home pins, folder view, icon positions, hidden orbs, uncategorized filter |
| `habits-store` | Habits lists (`daily-habits-list.tsx`) |
| `folder-all-items` helpers | `lib/folder-all-items.ts` — All Items category sync |

## Related sync

`lib/scheduled-lists-sync.ts` keeps Next Actions smart lists and scheduled-folder hierarchy in sync with tasks.
