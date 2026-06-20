/**
 * components/Lists/enhanced-category-view.tsx — Lists board (retro "File Manager")
 *
 * The Lists module styled as a Windows 95/98 file manager. It keeps every COGS
 * connection (all data flows through `lib/task-store.ts`) and the same
 * `onTaskSelect` contract, and layers on:
 *   - Home vs All directories (Home is user-curated + smart lists)
 *   - Smart Home lists (Daily / Weekly / Monthly To-Do) that are live, two-way
 *     views over the same tasks the dashboard To-Do panel reads/writes
 *   - Four folder views: Icons (velvet desktop), List, Details, Cards (classic)
 *   - Four list-content display types: Default, Checklist, Icons, Details
 *   - Working global search across folders, lists and items
 *   - Per folder/list/item icons with an orb picker + user upload (bg removed)
 *
 * Spec: §6 (Next Actions / Lists). "to schedule" should become a tag (§6.5).
 */
"use client"

import type React from "react"
import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useTaskStore } from "@/lib/task-store"
import { useListsUiStore, type ListDisplay, type FolderView } from "@/lib/lists-ui-store"
import { removeBackground } from "@/lib/remove-background"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Trash,
  Calendar,
  CheckCircle2,
  X,
  CalendarClock,
  Settings,
  Plus,
  GripVertical,
  AlertTriangle,
  Star,
  Eye,
  Check,
} from "lucide-react"
import type { TaskCategory, Task, CategoryFolder, AttributeDefinition } from "@/lib/types"
import { AttributeSchemaEditor, AttributeValuesEditor, mergeListAttributes, formatAttributeValue } from "@/components/Lists/attribute-editor"
import {
  safeDateFormat,
  getWeekString,
  taskScheduledOnDay,
  taskScheduledInWeek,
  taskScheduledInMonth,
} from "@/lib/date-utils"
import { TaskDetailPopup } from "@/components/task-detail-popup"
import { NextActionsSettingsDialog } from "@/components/Lists/settings-dialog"
import { DailyHabitsList, WeeklyHabitsList, MonthlyHabitsList } from "@/components/Lists/daily-habits-list"
import { parseCsv, inferColumnType } from "@/lib/csv"
import {
  createListItem,
  createNextActionItem,
  withCategoryDefaults,
  categoryIsNextActions,
  getItemLabel,
  capitalizeLabel,
} from "@/lib/item-utils"
import {
  syncNextActionsSmartLists,
  syncScheduledFolderHierarchy,
  isNaSmartCategoryId,
  naSmartIdToPeriod,
  NA_SCHEDULED_FOLDER,
  isScheduledFolderId,
  getTasksForScheduledFolder,
} from "@/lib/scheduled-lists-sync"
import {
  syncFolderAllItemsCategories,
  isFolderAllItemsCategoryId,
  getTasksForFolderAllView,
  assignTaskToFolderUncategorized,
  assignTaskToFolderList,
  isTaskUncategorizedInFolder,
  folderListCategoryIds,
} from "@/lib/folder-all-items"
import { ORB_PATHS } from "@/lib/orbs-manifest"
import "./filemanager98.css"

// Starter attribute schemas a new list can adopt (spec §5). Items in the list
// inherit these attributes (editable later in List settings / the item popup).
const LIST_TEMPLATES: Record<string, { label: string; attributes: AttributeDefinition[] }> = {
  none: { label: "Plain list", attributes: [] },
  shopping: {
    label: "Shopping",
    attributes: [
      { id: "price_est", name: "Est. price", type: "number", unit: "$", allowFloat: true },
      { id: "price_actual", name: "Actual price", type: "number", unit: "$", allowFloat: true },
      { id: "store", name: "Store / location", type: "string" },
      { id: "channel", name: "Online or in-person", type: "selection", options: ["Online", "In person"] },
    ],
  },
  reading: {
    label: "Reading",
    attributes: [
      { id: "author", name: "Author", type: "string" },
      { id: "description", name: "Description", type: "string" },
      { id: "link", name: "Link", type: "link" },
      { id: "pages", name: "Pages", type: "number", allowFloat: false },
    ],
  },
}

const ROOT_ALL_FOLDER_ID = "__root__"

/** Stable default positions so icons don't jump when entries are added/removed. */
const PRESET_ICON_POSITIONS: Record<string, { x: number; y: number }> = {
  "habits-habits": { x: 16, y: 16 },
  "habits-weekly-habits": { x: 104, y: 16 },
  "habits-monthly-habits": { x: 192, y: 16 },
  "smart-daily": { x: 16, y: 112 },
  "smart-weekly": { x: 104, y: 112 },
  "smart-monthly": { x: 192, y: 112 },
  "folder-all-all-root": { x: 16, y: 16 },
}

function hashIconSlot(key: string): { x: number; y: number } {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0
  const COLS = 8
  const ICON_W = 96
  const ICON_H = 100
  const slot = Math.abs(h) % 32
  return { x: 16 + (slot % COLS) * ICON_W, y: 16 + Math.floor(slot / COLS) * ICON_H }
}

interface EnhancedCategoryViewProps {
  onTaskSelect: (taskId: string) => void
}

type SmartId = "daily" | "weekly" | "monthly"
type OpenTarget =
  | { type: "category"; id: string }
  | { type: "smart"; id: SmartId }
  | { type: "habits"; id: "habits" | "weekly-habits" | "monthly-habits" }
  | { type: "folder-all"; folderId: string }
  | null

function openTargetKey(target: Exclude<OpenTarget, null>): string {
  return target.type === "folder-all" ? target.folderId : target.id
}

interface GridEntry {
  kind: "folder" | "list" | "smart" | "habits" | "folder-all"
  id: string
  name: string
  color?: string
  icon?: string
  count: number
  sub?: string
}

function dedupeGridEntries(entries: GridEntry[]): GridEntry[] {
  const seen = new Set<string>()
  return entries.filter((e) => {
    const key = `${e.kind}-${e.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/* ---- Orb imagery -------------------------------------------------------- */
function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function orbFor(id: string): string {
  return ORB_PATHS[hashString(id) % ORB_PATHS.length]
}

/** Resolve the icon for an entity: explicit custom icon, else a stable orb. */
function iconFor(id: string, custom?: string): string {
  return custom || orbFor(id)
}

function FolderGlyph({ size = 56, color }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 40" aria-hidden>
      <path d="M2 8a3 3 0 0 1 3-3h12l4 4h22a3 3 0 0 1 3 3v3H2V8Z" fill="#d6a800" />
      <path
        d="M2 13h46v23a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V13Z"
        fill={color || "#ffd54a"}
        stroke="#9a7b00"
        strokeWidth="1"
      />
      <path d="M2 13h46v3H2v-3Z" fill="#fff2bf" />
    </svg>
  )
}

const SMART_LISTS: { id: SmartId; name: string; color: string }[] = [
  { id: "daily", name: "Daily To Do List", color: "#16a34a" },
  { id: "weekly", name: "Weekly To Do List", color: "#2563eb" },
  { id: "monthly", name: "Monthly To Do List", color: "#9333ea" },
]

/* ---- Completed Tasks dialog (kept) ------------------------------------- */
function CompletedTasksDialog({
  open,
  onClose,
  onTaskSelect,
}: {
  open: boolean
  onClose: () => void
  onTaskSelect: (taskId: string) => void
}) {
  const allTasks = useTaskStore((state) => state.tasks)
  const categories = useTaskStore((state) => state.categories)

  const completedTasks = useMemo(
    () =>
      allTasks
        .filter((task) => task.completed)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [allTasks],
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col fm98-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Completed Tasks ({completedTasks.length})
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {completedTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No completed tasks yet!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <Card
                  key={task.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    onTaskSelect(task.id)
                    onClose()
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium line-through text-muted-foreground">{task.description}</p>
                        <div className="flex gap-2 mt-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {safeDateFormat(task.createdAt)}
                          </div>
                          {task.actualDuration && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <CheckCircle2 className="h-3 w-3" />
                              {task.actualDuration}m
                            </div>
                          )}
                        </div>
                        {task.categories && task.categories.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {task.categories.slice(0, 3).map((categoryId) => {
                              const category = categories.find((c) => c.id === categoryId)
                              return category ? (
                                <Badge key={categoryId} variant="outline" className="text-xs">
                                  {category.name}
                                </Badge>
                              ) : null
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ---- Icon picker dialog ------------------------------------------------- */
function IconPickerDialog({
  open,
  current,
  onClose,
  onSelect,
}: {
  open: boolean
  current?: string
  onClose: () => void
  onSelect: (icon: string | undefined) => void
}) {
  const iconLibrary = useListsUiStore((s) => s.iconLibrary)
  const addLibraryIcon = useListsUiStore((s) => s.addLibraryIcon)
  const removeLibraryIcon = useListsUiStore((s) => s.removeLibraryIcon)
  const hiddenGalleryOrbs = useListsUiStore((s) => s.hiddenGalleryOrbs)
  const hideGalleryOrb = useListsUiStore((s) => s.hideGalleryOrb)
  const restoreGalleryOrb = useListsUiStore((s) => s.restoreGalleryOrb)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const visibleGalleryOrbs = useMemo(
    () => ORB_PATHS.filter((url) => !hiddenGalleryOrbs.includes(url)),
    [hiddenGalleryOrbs],
  )

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const dataUrl = await removeBackground(file, { threshold: 60, size: 256 })
      addLibraryIcon(dataUrl)
      onSelect(dataUrl)
    } catch (err) {
      console.error("Background removal failed", err)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="fm98-dialog sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose an Icon</DialogTitle>
          <DialogDescription>Pick an orb, use one you uploaded, or upload your own (its background is removed automatically).</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => onSelect(undefined)}>
            Use random orb
          </Button>
          <Button size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? "Processing…" : "Upload orb"}
          </Button>
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode((v) => !v)}
          >
            {editMode ? "Done editing" : "Edit gallery"}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {iconLibrary.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1">Your library</p>
              <div className="grid grid-cols-6 gap-2">
                {iconLibrary.map((url) => (
                  <div key={url} className="relative group">
                    <button
                      className={`w-full aspect-square border rounded-md p-1 flex items-center justify-center ${
                        current === url ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => onSelect(url)}
                    >
                      <img src={url} alt="" className="max-w-full max-h-full object-contain" />
                    </button>
                    <button
                      className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 text-[10px] hidden group-hover:flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeLibraryIcon(url)
                      }}
                      title="Remove from library"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold mb-1">
              Orb gallery ({visibleGalleryOrbs.length})
              {editMode && <span className="font-normal text-muted-foreground"> — click an orb to remove it</span>}
            </p>
            <div className="grid grid-cols-6 gap-2">
              {visibleGalleryOrbs.map((url) => (
                <div key={url} className="relative group">
                  <button
                    className={`w-full aspect-square border rounded-md p-1 flex items-center justify-center ${
                      current === url ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => (editMode ? hideGalleryOrb(url) : onSelect(url))}
                  >
                    <img src={url} alt="" className="max-w-full max-h-full object-contain" />
                  </button>
                  {editMode && (
                    <button
                      className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation()
                        hideGalleryOrb(url)
                      }}
                      title="Remove from gallery"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {hiddenGalleryOrbs.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold mb-1">Hidden ({hiddenGalleryOrbs.length})</p>
                <div className="flex flex-wrap gap-2">
                  {hiddenGalleryOrbs.map((url) => (
                    <button
                      key={url}
                      className="text-xs underline text-muted-foreground"
                      onClick={() => restoreGalleryOrb(url)}
                    >
                      Restore {url.split("/").pop()?.slice(0, 8)}…
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ======================================================================== */
export function EnhancedCategoryView({ onTaskSelect }: EnhancedCategoryViewProps) {
  const allTasks = useTaskStore((state) => state.tasks)
  const categories = useTaskStore((state) => state.categories)
  const folders = useTaskStore((state) => state.folders)
  const addFolder = useTaskStore((state) => state.addFolder)
  const updateFolder = useTaskStore((state) => state.updateFolder)
  const deleteFolder = useTaskStore((state) => state.deleteFolder)
  const addCategoryToFolder = useTaskStore((state) => state.addCategoryToFolder)
  const removeCategoryFromFolder = useTaskStore((state) => state.removeCategoryFromFolder)
  const addCategory = useTaskStore((state) => state.addCategory)
  const updateCategory = useTaskStore((state) => state.updateCategory)
  const deleteCategory = useTaskStore((state) => state.deleteCategory)
  const updateTask = useTaskStore((state) => state.updateTask)
  const addTask = useTaskStore((state) => state.addTask)
  const dedupeFolders = useTaskStore((state) => state.dedupeFolders)
  const dedupeCategories = useTaskStore((state) => state.dedupeCategories)

  // UI prefs store
  const homePinned = useListsUiStore((s) => s.homePinned)
  const toggleHomePin = useListsUiStore((s) => s.toggleHomePin)
  const showSmartLists = useListsUiStore((s) => s.showSmartLists)
  const setShowSmartLists = useListsUiStore((s) => s.setShowSmartLists)
  const listDisplay = useListsUiStore((s) => s.listDisplay)
  const setListDisplay = useListsUiStore((s) => s.setListDisplay)
  const folderView = useListsUiStore((s) => s.folderView)
  const setFolderView = useListsUiStore((s) => s.setFolderView)
  const setIconPosition = useListsUiStore((s) => s.setIconPosition)
  const getIconPosition = useListsUiStore((s) => s.getIconPosition)
  const autoOrganizeIcons = useListsUiStore((s) => s.autoOrganizeIcons)
  const folderAllUncategorizedOnly = useListsUiStore((s) => s.folderAllUncategorizedOnly)
  const setFolderAllUncategorizedOnly = useListsUiStore((s) => s.setFolderAllUncategorizedOnly)

  // Dialog / edit state
  const [newCategoryOpen, setNewCategoryOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryDescription, setNewCategoryDescription] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState("#3B82F6")
  const [newCategoryScheduleable, setNewCategoryScheduleable] = useState(true)
  const [newCategoryTemplate, setNewCategoryTemplate] = useState<string>("none")
  const csvRef = useRef<HTMLInputElement>(null)
  const [csvImport, setCsvImport] = useState<{
    fileName: string
    headers: string[]
    rows: string[][]
    listName: string
    nameCol: number
    targetCategoryId: string // "" = create new
  } | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [addingTaskToTarget, setAddingTaskToTarget] = useState<string | null>(null)
  const [newTaskDescription, setNewTaskDescription] = useState("")
  const [bulkAddText, setBulkAddText] = useState("")
  const [showBulkAdd, setShowBulkAdd] = useState(false)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showCategorySettings, setShowCategorySettings] = useState(false)
  const [showCompletedTasks, setShowCompletedTasks] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderColor, setNewFolderColor] = useState("#3B82F6")
  const [newFolderScheduleable, setNewFolderScheduleable] = useState(true)
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [editingFolder, setEditingFolder] = useState<CategoryFolder | null>(null)

  // Navigation: "home" | "all" | <folderId>
  const [location, setLocation] = useState<string>("home")
  const [openTarget, setOpenTarget] = useState<OpenTarget>(null)
  const [activeIconId, setActiveIconId] = useState<string | null>(null)
  // Icon picker target: which entity's icon we're editing
  const [iconPickerFor, setIconPickerFor] = useState<
    { kind: "category" | "folder" | "task"; id: string } | null
  >(null)

  const isHome = location === "home"
  const isAll = location === "all"
  const currentFolder = useMemo(() => folders.find((f) => f.id === location) || null, [folders, location])
  const isNextActionsLocation = currentFolder ? categoryIsNextActions(currentFolder.categoryIds[0] || "", folders) || /next\s*actions?/i.test(currentFolder.name) : false

  // Clean duplicate scheduled folders from prior sync bugs, then keep hierarchy in sync
  useEffect(() => {
    dedupeFolders()
    dedupeCategories()
  }, [dedupeFolders, dedupeCategories])

  useEffect(() => {
    const state = useTaskStore.getState()
    const mut = {
      categories: state.categories,
      folders: state.folders,
      addCategory: state.addCategory,
      updateCategory: state.updateCategory,
      addFolder: state.addFolder,
      updateFolder: state.updateFolder,
    }
    syncNextActionsSmartLists(mut)
    syncScheduledFolderHierarchy(allTasks, mut)
    syncFolderAllItemsCategories(mut)
  }, [allTasks])

  const itemLabelFor = useCallback(
    (categoryId?: string, category?: TaskCategory | null) =>
      capitalizeLabel(getItemLabel(category ?? undefined, folders, categoryId)),
    [folders],
  )

  // ---- Smart list membership (live, two-way with dashboard To-Do) --------
  const getSmartTasks = useCallback(
    (id: SmartId): Task[] => {
      const now = new Date()
      return allTasks.filter((t) => {
        if (t.completed) return false
        if (id === "daily") return taskScheduledOnDay(t, now)
        if (id === "weekly") return taskScheduledInWeek(t, getWeekString(now))
        return taskScheduledInMonth(t, now.toISOString().slice(0, 7))
      })
    },
    [allTasks],
  )

  const getTasksForCategory = useCallback(
    (categoryId: string) => allTasks.filter((task) => task.categories?.includes(categoryId) && !task.completed),
    [allTasks],
  )

  const countForFolder = useCallback(
    (f: CategoryFolder) => {
      if (isScheduledFolderId(f.id)) {
        const children = folders.filter((x) => x.parentFolderId === f.id)
        if (children.length > 0) return children.length
        return getTasksForScheduledFolder(allTasks, f.id).length
      }
      return f.categoryIds.length || folders.filter((x) => x.parentFolderId === f.id).length
    },
    [allTasks, folders],
  )

  const getCategoryCompletionRate = useCallback(
    (categoryId: string) => {
      const categoryTasks = allTasks.filter((task) => task.categories?.includes(categoryId))
      if (categoryTasks.length === 0) return 0
      return Math.round((categoryTasks.filter((t) => t.completed).length / categoryTasks.length) * 100)
    },
    [allTasks],
  )

  // Categories not in any folder.
  const looseCategories = useMemo(() => {
    const inFolder = new Set<string>()
    folders.forEach((f) => f.categoryIds.forEach((id) => inFolder.add(id)))
    return categories.filter((c) => !inFolder.has(c.id) && !isFolderAllItemsCategoryId(c.id))
  }, [categories, folders])

  // ---- Build the entries for the current location ------------------------
  const entries = useMemo<GridEntry[]>(() => {
    const out: GridEntry[] = []
    if (isHome) {
      out.push({ kind: "habits", id: "habits", name: "Daily Habits", color: "#0ea5e9", count: 0 })
      out.push({ kind: "habits", id: "weekly-habits", name: "Weekly Habits", color: "#6366f1", count: 0 })
      out.push({ kind: "habits", id: "monthly-habits", name: "Monthly Habits", color: "#9333ea", count: 0 })
      if (showSmartLists) {
        SMART_LISTS.forEach((s) =>
          out.push({ kind: "smart", id: s.id, name: s.name, color: s.color, count: getSmartTasks(s.id).length }),
        )
      }
      folders
        .filter((f) => homePinned.includes(f.id))
        .forEach((f) =>
          out.push({ kind: "folder", id: f.id, name: f.name, color: f.color, icon: f.icon, count: countForFolder(f) }),
        )
      categories
        .filter((c) => homePinned.includes(c.id))
        .forEach((c) =>
          out.push({ kind: "list", id: c.id, name: c.name, color: c.color, icon: c.icon, count: getTasksForCategory(c.id).length }),
        )
    } else if (isAll) {
      out.push({
        kind: "folder-all",
        id: "all-root",
        name: "All Items",
        color: "#64748b",
        count: allTasks.filter((t) => !t.completed).length,
      })
      folders.forEach((f) =>
        out.push({ kind: "folder", id: f.id, name: f.name, color: f.color, icon: f.icon, count: countForFolder(f) }),
      )
      // All lists always appear in All — folder membership is orthogonal.
      categories
        .filter((c) => !isFolderAllItemsCategoryId(c.id))
        .forEach((c) =>
        out.push({ kind: "list", id: c.id, name: c.name, color: c.color, icon: c.icon, count: getTasksForCategory(c.id).length }),
      )
    } else if (currentFolder) {
      folders
        .filter((f) => f.parentFolderId === currentFolder.id)
        .forEach((f) =>
          out.push({ kind: "folder", id: f.id, name: f.name, color: f.color, icon: f.icon, count: countForFolder(f) }),
        )
      const folderListIds = folderListCategoryIds(currentFolder)
      const allCount = isScheduledFolderId(currentFolder.id)
        ? getTasksForScheduledFolder(allTasks, currentFolder.id).length
        : getTasksForFolderAllView(allTasks, currentFolder).length
      out.push({
        kind: "folder-all",
        id: `all-${currentFolder.id}`,
        name: "All Items",
        color: currentFolder.color,
        icon: currentFolder.icon,
        count: allCount,
      })
      categories
        .filter((c) => folderListIds.includes(c.id))
        .forEach((c) =>
          out.push({ kind: "list", id: c.id, name: c.name, color: c.color, icon: c.icon, count: getTasksForCategory(c.id).length }),
        )
    }
    return dedupeGridEntries(out)
  }, [isHome, isAll, currentFolder, folders, categories, homePinned, showSmartLists, getSmartTasks, getTasksForCategory, allTasks, countForFolder])

  // ---- Global search -----------------------------------------------------
  const q = searchTerm.trim().toLowerCase()
  const searchActive = q.length > 0
  const searchResults = useMemo(() => {
    if (!searchActive) return { folders: [], lists: [], tasks: [] }
    const f = folders.filter((x) => x.name.toLowerCase().includes(q) || (x.description || "").toLowerCase().includes(q))
    const l = categories.filter((x) => x.name.toLowerCase().includes(q) || (x.description || "").toLowerCase().includes(q))
    const t = allTasks
      .filter((x) => !x.completed && x.description.toLowerCase().includes(q))
      .slice(0, 50)
    return { folders: f, lists: l, tasks: t }
  }, [searchActive, q, folders, categories, allTasks])

  // ---- Dialog helpers ----------------------------------------------------
  const openNewCategoryDialog = useCallback(() => {
    setNewCategoryName("")
    setNewCategoryDescription(currentFolder?.description || "")
    setNewCategoryColor(currentFolder?.color || "#3B82F6")
    setNewCategoryScheduleable(currentFolder ? currentFolder.scheduleable !== false : true)
    setNewCategoryOpen(true)
  }, [currentFolder])

  const handleCreateCategory = useCallback(() => {
    if (!newCategoryName.trim()) return
    const newCategoryId = Date.now().toString()
    const template = LIST_TEMPLATES[newCategoryTemplate]
    addCategory({
      id: newCategoryId,
      name: newCategoryName,
      color: newCategoryColor,
      description: newCategoryDescription,
      createdAt: new Date(),
      order: categories.length,
      scheduleable: newCategoryScheduleable,
      itemAttributes: template && template.attributes.length ? template.attributes.map((a) => ({ ...a })) : undefined,
    })
    if (currentFolder) addCategoryToFolder(currentFolder.id, newCategoryId)
    if (isHome) toggleHomePin(newCategoryId)
    setNewCategoryName("")
    setNewCategoryDescription("")
    setNewCategoryColor("#3B82F6")
    setNewCategoryScheduleable(true)
    setNewCategoryTemplate("none")
    setNewCategoryOpen(false)
  }, [
    newCategoryName,
    newCategoryColor,
    newCategoryDescription,
    newCategoryScheduleable,
    newCategoryTemplate,
    addCategory,
    categories.length,
    currentFolder,
    addCategoryToFolder,
    isHome,
    toggleHomePin,
  ])

  const handleEditCategory = useCallback(() => {
    if (editingCategory) {
      updateCategory(editingCategory)
      setEditingCategory(null)
    }
  }, [editingCategory, updateCategory])

  // ---- CSV import: build/update a list whose attributes match the columns ----
  const handleCsvFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const { headers, rows } = parseCsv(String(reader.result || ""))
      if (headers.length === 0) return
      // Default the "name" column to the first header that looks like a title.
      const lower = headers.map((h) => h.toLowerCase())
      const nameCandidates = ["name", "title", "item", "task", "description", "book", "product"]
      let nameCol = lower.findIndex((h) => nameCandidates.some((c) => h.includes(c)))
      if (nameCol === -1) nameCol = 0
      setCsvImport({
        fileName: file.name,
        headers,
        rows,
        listName: file.name.replace(/\.csv$/i, ""),
        nameCol,
        targetCategoryId: "",
      })
    }
    reader.readAsText(file)
    if (csvRef.current) csvRef.current.value = ""
  }, [])

  const performCsvImport = useCallback(() => {
    if (!csvImport) return
    const { headers, rows, nameCol, listName, targetCategoryId } = csvImport
    const slug = (s: string) => "attr_" + s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")

    // Attribute defs from every column except the name column.
    const attrDefs: AttributeDefinition[] = headers
      .map((h, i) => ({ h, i }))
      .filter(({ i }) => i !== nameCol)
      .map(({ h, i }) => ({
        id: slug(h) || `attr_${i}`,
        name: h || `Column ${i + 1}`,
        type: inferColumnType(h, rows.map((r) => r[i] ?? "")),
      }))

    let categoryId = targetCategoryId
    if (!categoryId) {
      categoryId = Date.now().toString()
      addCategory({
        id: categoryId,
        name: listName || "Imported list",
        color: newCategoryColor,
        description: `Imported from ${csvImport.fileName}`,
        createdAt: new Date(),
        order: categories.length,
        scheduleable: true,
        itemAttributes: attrDefs,
      })
      if (currentFolder) addCategoryToFolder(currentFolder.id, categoryId)
      if (isHome) toggleHomePin(categoryId)
    } else {
      // Merge new attributes into the existing list (non-destructive).
      const existing = categories.find((c) => c.id === categoryId)
      if (existing) {
        const merged = [...(existing.itemAttributes || [])]
        attrDefs.forEach((d) => {
          if (!merged.some((m) => m.id === d.id)) merged.push(d)
        })
        updateCategory({ ...existing, itemAttributes: merged })
      }
    }

    rows.forEach((row, idx) => {
      const description = (row[nameCol] || "").trim() || `Row ${idx + 1}`
      const base = buildBaseTask(description)
      base.categories = [categoryId]
      const attributes: Record<string, any> = {}
      // Map each attribute back to its source column directly.
      headers.forEach((h, i) => {
        if (i === nameCol) return
        const def = attrDefs.find((d) => d.id === (slug(h) || `attr_${i}`))
        if (!def) return
        const raw = (row[i] ?? "").trim()
        if (raw === "") return
        if (def.type === "number") attributes[def.id] = Number(raw.replace(/[$,]/g, "")) || 0
        else attributes[def.id] = raw
      })
      base.attributes = attributes
      addTask(base)
    })

    setCsvImport(null)
  }, [
    csvImport,
    addCategory,
    addTask,
    updateCategory,
    categories,
    newCategoryColor,
    currentFolder,
    addCategoryToFolder,
    isHome,
    toggleHomePin,
  ])

  const handleCompleteTask = useCallback(
    (taskId: string) => {
      const task = allTasks.find((t) => t.id === taskId)
      if (task) updateTask({ ...task, completed: !task.completed })
    },
    [allTasks, updateTask],
  )

  // Create a task into a category or a smart list (sets the right schedule).
  const buildBaseTask = (description: string, categoryId?: string): Task => {
    const nextAction = categoryId ? categoryIsNextActions(categoryId, folders) : false
    const base = nextAction ? createNextActionItem(description, categoryId ? [categoryId] : []) : createListItem(description, categoryId ? [categoryId] : [])
    if (categoryId) {
      const cat = categories.find((c) => c.id === categoryId)
      return withCategoryDefaults(base, cat)
    }
    return base
  }

  const handleAddTaskToOpen = useCallback(() => {
    if (!newTaskDescription.trim() || !openTarget) return
    const base = buildBaseTask(newTaskDescription, openTarget.type === "category" ? openTarget.id : undefined)
    if (openTarget.type === "category") {
      base.categories = [openTarget.id]
    } else if (openTarget.type === "folder-all" && openTarget.folderId === ROOT_ALL_FOLDER_ID) {
      base.category = "list"
    } else if (openTarget.type === "folder-all" && currentFolder) {
      Object.assign(base, assignTaskToFolderUncategorized(base, currentFolder))
    } else if (openTarget.type === "smart") {
      const now = new Date()
      if (openTarget.id === "daily") base.scheduledDate = now
      else if (openTarget.id === "weekly") base.scheduledWeek = getWeekString(now)
      else base.scheduledMonth = now.toISOString().slice(0, 7)
    }
    addTask(base)
    setNewTaskDescription("")
    setAddingTaskToTarget(null)
  }, [newTaskDescription, openTarget, addTask, currentFolder, categories, folders])

  const handleBulkAddToOpen = useCallback(() => {
    if (!openTarget || !bulkAddText.trim()) return
    const lines = bulkAddText.split("\n").map((l) => l.trim()).filter(Boolean)
    const now = new Date()
    for (const line of lines) {
      let categoryId: string | undefined
      if (openTarget.type === "category" && !isNaSmartCategoryId(openTarget.id)) categoryId = openTarget.id
      else if (openTarget.type === "folder-all" && openTarget.folderId !== ROOT_ALL_FOLDER_ID && currentFolder) {
        /* uncategorized folder item — handled below */
      }
      const base = buildBaseTask(line, categoryId)
      if (openTarget.type === "category") {
        if (isNaSmartCategoryId(openTarget.id)) {
          const p = naSmartIdToPeriod(openTarget.id)
          if (p === "daily") base.scheduledDate = now
          else if (p === "weekly") base.scheduledWeek = getWeekString(now)
          else base.scheduledMonth = now.toISOString().slice(0, 7)
        } else {
          base.categories = [openTarget.id]
        }
      } else if (openTarget.type === "smart") {
        if (openTarget.id === "daily") base.scheduledDate = now
        else if (openTarget.id === "weekly") base.scheduledWeek = getWeekString(now)
        else base.scheduledMonth = now.toISOString().slice(0, 7)
      } else if (openTarget.type === "folder-all" && openTarget.folderId === ROOT_ALL_FOLDER_ID) {
        base.category = "list"
      } else if (openTarget.type === "folder-all" && currentFolder) {
        Object.assign(base, assignTaskToFolderUncategorized(base, currentFolder))
      }
      addTask(base)
    }
    setBulkAddText("")
    setShowBulkAdd(false)
  }, [bulkAddText, openTarget, currentFolder, addTask, categories, folders])

  // Quick-add for the Cards view (per-category), mirrors the classic behaviour.
  const handleAddTaskToCategory = useCallback(
    (categoryId: string) => {
      if (!newTaskDescription.trim()) return
      const base = buildBaseTask(newTaskDescription, categoryId)
      base.categories = [categoryId]
      addTask(base)
      setNewTaskDescription("")
      setAddingTaskToTarget(null)
    },
    [newTaskDescription, addTask],
  )

  // ---- Drag & drop -------------------------------------------------------
  const handleTaskDragStart = useCallback((e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    setDraggedCategoryId(null)
    e.dataTransfer.effectAllowed = "copyMove"
    try {
      e.dataTransfer.setData("text/plain", `task:${task.id}`)
    } catch {}
  }, [])

  const handleCategoryDragStart = useCallback((e: React.DragEvent, categoryId: string) => {
    setDraggedCategoryId(categoryId)
    setDraggedTask(null)
    e.dataTransfer.effectAllowed = "move"
    try {
      e.dataTransfer.setData("text/plain", `list:${categoryId}`)
    } catch {}
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = draggedCategoryId ? "move" : "copy"
  }, [draggedCategoryId])

  const clearDrag = useCallback(() => {
    setDraggedTask(null)
    setDraggedCategoryId(null)
    setDropTargetId(null)
  }, [])

  const fileCategoryIntoFolder = useCallback(
    (categoryId: string, folderId: string | null) => {
      folders.forEach((f) => {
        if (f.categoryIds.includes(categoryId)) removeCategoryFromFolder(f.id, categoryId)
      })
      if (folderId) addCategoryToFolder(folderId, categoryId)
    },
    [folders, addCategoryToFolder, removeCategoryFromFolder],
  )

  const applySmartScheduleToTask = useCallback(
    (task: Task, smart: SmartId) => {
      const now = new Date()
      const patch: Partial<Task> = {}
      if (smart === "daily") patch.scheduledDate = now
      else if (smart === "weekly") patch.scheduledWeek = getWeekString(now)
      else patch.scheduledMonth = now.toISOString().slice(0, 7)
      updateTask({ ...task, ...patch })
    },
    [updateTask],
  )

  // Drop onto an entry (folder / list / smart).
  const handleDropOnEntry = useCallback(
    (e: React.DragEvent, entry: GridEntry) => {
      e.preventDefault()
      e.stopPropagation()
      if (draggedTask) {
        if (entry.kind === "list" && !draggedTask.categories?.includes(entry.id)) {
          const folder = folders.find((f) => f.categoryIds.includes(entry.id))
          if (folder && !isFolderAllItemsCategoryId(entry.id)) {
            updateTask(assignTaskToFolderList(draggedTask, folder, entry.id))
          } else {
            updateTask({ ...draggedTask, categories: [...(draggedTask.categories || []), entry.id] })
          }
        } else if (entry.kind === "smart") {
          applySmartScheduleToTask(draggedTask, entry.id as SmartId)
        } else if (entry.kind === "folder" && !isScheduledFolderId(entry.id)) {
          const folder = folders.find((f) => f.id === entry.id)
          if (folder) updateTask(assignTaskToFolderUncategorized(draggedTask, folder))
        }
      } else if (draggedCategoryId) {
        if (entry.kind === "folder") {
          fileCategoryIntoFolder(draggedCategoryId, entry.id)
        } else if (entry.kind === "folder-all") {
          fileCategoryIntoFolder(draggedCategoryId, null)
        }
      }
      clearDrag()
    },
    [draggedTask, draggedCategoryId, updateTask, applySmartScheduleToTask, fileCategoryIntoFolder, clearDrag, folders],
  )

  const handleIconCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (draggedCategoryId && (isAll || currentFolder)) {
        fileCategoryIntoFolder(draggedCategoryId, null)
      }
      clearDrag()
    },
    [draggedCategoryId, isAll, currentFolder, fileCategoryIntoFolder, clearDrag],
  )

  // Reset open target if the underlying list vanished or location changed.
  useEffect(() => {
    if (openTarget?.type === "category" && !categories.find((c) => c.id === openTarget.id)) {
      setOpenTarget(null)
    }
  }, [categories, openTarget])

  // ---- Derived: the currently open list/smart ----------------------------
  const openCategory = openTarget?.type === "category" ? categories.find((c) => c.id === openTarget.id) || null : null
  const openSmart = openTarget?.type === "smart" ? SMART_LISTS.find((s) => s.id === openTarget.id) || null : null
  const openHabits = openTarget?.type === "habits"
  const openFolderAll = openTarget?.type === "folder-all"
  const isRootAll = openFolderAll && openTarget?.folderId === ROOT_ALL_FOLDER_ID
  const openName = openHabits
    ? openTarget?.id === "weekly-habits"
      ? "Weekly Habits"
      : openTarget?.id === "monthly-habits"
        ? "Monthly Habits"
        : "Daily Habits"
    : openFolderAll ? "All Items" : openCategory?.name || openSmart?.name || ""
  const openColor = openHabits ? "#0ea5e9" : isRootAll ? "#64748b" : openFolderAll ? currentFolder?.color : openCategory?.color || openSmart?.color
  const openIconKey = openCategory
    ? iconFor(openCategory.id, openCategory.icon)
    : isRootAll
      ? iconFor("lists-root", undefined)
    : openFolderAll && currentFolder
      ? iconFor(currentFolder.id, currentFolder.icon)
    : openSmart
      ? orbFor(openSmart.id)
      : openHabits
        ? orbFor("daily-habits")
        : orbFor("lists-root")
  const openTasks =
    openTarget?.type === "category"
      ? isNaSmartCategoryId(openTarget.id)
        ? (() => {
            const p = naSmartIdToPeriod(openTarget.id)
            return p ? getSmartTasks(p) : []
          })()
        : getTasksForCategory(openTarget.id)
      : openTarget?.type === "folder-all" && openTarget.folderId === ROOT_ALL_FOLDER_ID
        ? allTasks.filter((t) => !t.completed)
      : openTarget?.type === "folder-all" && currentFolder
        ? isScheduledFolderId(currentFolder.id)
          ? getTasksForScheduledFolder(allTasks, currentFolder.id)
          : (() => {
              let items = getTasksForFolderAllView(allTasks, currentFolder)
              if (folderAllUncategorizedOnly[currentFolder.id]) {
                items = items.filter((t) => isTaskUncategorizedInFolder(t, currentFolder))
              }
              return items
            })()
      : openTarget?.type === "smart"
        ? getSmartTasks(openTarget.id)
        : []
  const currentDisplay: ListDisplay =
    openTarget && openTarget.type !== "habits"
      ? listDisplay[openTargetKey(openTarget)] ||
        (openSmart ? "checklist" : openFolderAll ? "table" : "default")
      : "default"

  const navTo = (loc: string) => {
    setLocation(loc)
    setOpenTarget(null)
    setActiveIconId(null)
  }

  // ---- Icon picker apply -------------------------------------------------
  const applyIcon = (icon: string | undefined) => {
    if (!iconPickerFor) return
    if (iconPickerFor.kind === "category") {
      const c = categories.find((x) => x.id === iconPickerFor.id)
      if (c) updateCategory({ ...c, icon })
    } else if (iconPickerFor.kind === "folder") {
      const f = folders.find((x) => x.id === iconPickerFor.id)
      if (f) updateFolder({ ...f, icon })
    } else {
      const t = allTasks.find((x) => x.id === iconPickerFor.id)
      if (t) updateTask({ ...t, icon })
    }
    setIconPickerFor(null)
  }

  const iconPickerCurrent = useMemo(() => {
    if (!iconPickerFor) return undefined
    if (iconPickerFor.kind === "category") return categories.find((x) => x.id === iconPickerFor.id)?.icon
    if (iconPickerFor.kind === "folder") return folders.find((x) => x.id === iconPickerFor.id)?.icon
    return allTasks.find((x) => x.id === iconPickerFor.id)?.icon
  }, [iconPickerFor, categories, folders, allTasks])

  /* ====================== Render helpers ============================== */

  const renderEntryIcon = (entry: GridEntry, px: number) => {
    if ((entry.kind === "folder" || entry.kind === "folder-all") && !entry.icon)
      return <FolderGlyph size={px} color={entry.color} />
    const src = entry.kind === "smart" || entry.kind === "habits" ? orbFor(entry.id) : iconFor(entry.id, entry.icon)
    return <img className="fm-icon-img" src={src} alt="" draggable={false} style={{ maxWidth: px, maxHeight: px }} />
  }

  const openEntry = (entry: GridEntry) => {
    if (entry.kind === "folder") {
      setLocation(entry.id)
      setOpenTarget(null)
      setActiveIconId(null)
    } else if (entry.kind === "folder-all") {
      if (isAll || entry.id === "all-root") {
        setOpenTarget({ type: "folder-all", folderId: ROOT_ALL_FOLDER_ID })
      } else if (currentFolder) {
        setOpenTarget({ type: "folder-all", folderId: currentFolder.id })
      }
    } else if (entry.kind === "list") {
      setOpenTarget({ type: "category", id: entry.id })
    } else if (entry.kind === "habits") {
      setOpenTarget({ type: "habits", id: entry.id as "habits" | "weekly-habits" | "monthly-habits" })
    } else {
      setOpenTarget({ type: "smart", id: entry.id as SmartId })
    }
  }

  const renderIconEntry = (entry: GridEntry) => {
    const isSel = selectedCategories.includes(entry.id)
    const isActive = activeIconId === entry.id
    const pinned = homePinned.includes(entry.id)
    return (
      <div
        key={`${entry.kind}-${entry.id}`}
        className={`fm-icon${isActive || isSel ? " selected" : ""}${dropTargetId === entry.id ? " drop-target" : ""}`}
        draggable={entry.kind === "list" && !selectMode}
        onDragStart={(e) => entry.kind === "list" && handleCategoryDragStart(e, entry.id)}
        onDragOver={(e) => {
          handleDragOver(e)
          if (dropTargetId !== entry.id) setDropTargetId(entry.id)
        }}
        onDragLeave={() => setDropTargetId((id) => (id === entry.id ? null : id))}
        onDrop={(e) => handleDropOnEntry(e, entry)}
        onDragEnd={clearDrag}
        title={entry.name}
        onClick={() => {
          setActiveIconId(entry.id)
          if (selectMode && entry.kind === "list") {
            setSelectedCategories((prev) => (isSel ? prev.filter((id) => id !== entry.id) : [...prev, entry.id]))
          }
        }}
        onDoubleClick={() => !selectMode && openEntry(entry)}
      >
        {entry.kind !== "smart" && (
          <button
            className={`fm-icon-pin${pinned ? " pinned" : ""}`}
            title={pinned ? "Remove from Home" : "Add to Home"}
            onClick={(e) => {
              e.stopPropagation()
              toggleHomePin(entry.id)
            }}
          >
            ★
          </button>
        )}
        {entry.kind !== "smart" && (
          <button
            className="fm-icon-edit"
            title="Change icon"
            onClick={(e) => {
              e.stopPropagation()
              setIconPickerFor({ kind: entry.kind === "folder" ? "folder" : "category", id: entry.id })
            }}
          >
            ✎
          </button>
        )}
        <div className="fm-icon-img-wrap">
          {renderEntryIcon(entry, 60)}
          {entry.color && <span className="fm-icon-swatch" style={{ background: entry.color }} />}
        </div>
        <span className="fm-icon-label">
          {entry.name}
          {entry.count > 0 ? ` (${entry.count})` : ""}
        </span>
        {selectMode && entry.kind === "list" && (
          <span className="fm-checkbox" aria-hidden>
            {isSel ? "✓" : ""}
          </span>
        )}
      </div>
    )
  }

  const [iconLayoutDrag, setIconLayoutDrag] = useState<{
    key: string
    startX: number
    startY: number
    origX: number
    origY: number
  } | null>(null)

  const iconPosKey = (entry: GridEntry) => `${entry.kind}-${entry.id}`

  const getEntryPosition = (entry: GridEntry) => {
    const key = iconPosKey(entry)
    const stored = getIconPosition(location, key)
    if (stored) return stored
    const preset = PRESET_ICON_POSITIONS[key]
    if (preset) return preset
    return hashIconSlot(key)
  }

  const renderIconsView = () => (
    <div
      key={`icons-${location}`}
      className="fm-sunken fm-desktop velvet fm-icon-canvas"
      onDragOver={handleDragOver}
      onDrop={handleIconCanvasDrop}
      onMouseMove={(e) => {
        if (!iconLayoutDrag) return
        const dx = e.clientX - iconLayoutDrag.startX
        const dy = e.clientY - iconLayoutDrag.startY
        setIconPosition(location, iconLayoutDrag.key, iconLayoutDrag.origX + dx, iconLayoutDrag.origY + dy)
      }}
      onMouseUp={() => setIconLayoutDrag(null)}
      onMouseLeave={() => setIconLayoutDrag(null)}
    >
      <div className="fm-icon-grid fm-icon-grid-free" style={{ position: "relative", minHeight: Math.max(480, Math.ceil(entries.length / 8) * 100 + 32), width: "100%" }}>
        {entries.map((entry) => {
          const pos = getEntryPosition(entry)
          const isSel = selectedCategories.includes(entry.id)
          const isActive = activeIconId === entry.id
          const pinned = homePinned.includes(entry.id)
          return (
            <div
              key={`${entry.kind}-${entry.id}`}
              className={`fm-icon fm-icon-free${isActive || isSel ? " selected" : ""}${dropTargetId === entry.id ? " drop-target" : ""}`}
              style={{ position: "absolute", left: pos.x, top: pos.y }}
              draggable={entry.kind === "list" && !selectMode}
              onDragStart={(e) => entry.kind === "list" && handleCategoryDragStart(e, entry.id)}
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).closest(".fm-icon-pin, .fm-icon-edit")) return
                if (e.altKey || entry.kind === "folder" || entry.kind === "folder-all" || entry.kind === "smart" || entry.kind === "habits") {
                  e.preventDefault()
                  const p = getEntryPosition(entry)
                  setIconLayoutDrag({ key: iconPosKey(entry), startX: e.clientX, startY: e.clientY, origX: p.x, origY: p.y })
                }
              }}
              onDragOver={(e) => {
                handleDragOver(e)
                if (dropTargetId !== entry.id) setDropTargetId(entry.id)
              }}
              onDragLeave={() => setDropTargetId((id) => (id === entry.id ? null : id))}
              onDrop={(e) => handleDropOnEntry(e, entry)}
              onDragEnd={clearDrag}
              title={`${entry.name}${entry.kind === "list" ? "" : " (Alt+drag to move)"}`}
              onClick={() => {
                setActiveIconId(entry.id)
                if (selectMode && entry.kind === "list") {
                  setSelectedCategories((prev) => (isSel ? prev.filter((id) => id !== entry.id) : [...prev, entry.id]))
                }
              }}
              onDoubleClick={() => !selectMode && openEntry(entry)}
            >
              {entry.kind !== "smart" && entry.kind !== "folder-all" && (
                <button
                  className={`fm-icon-pin${pinned ? " pinned" : ""}`}
                  title={pinned ? "Remove from Home" : "Add to Home"}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleHomePin(entry.id)
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  ★
                </button>
              )}
              {entry.kind === "list" && (
                <button
                  className="fm-icon-edit"
                  title="Change icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIconPickerFor({ kind: "category", id: entry.id })
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  ✎
                </button>
              )}
              {entry.kind === "folder" && (
                <button
                  className="fm-icon-edit"
                  title="Change icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIconPickerFor({ kind: "folder", id: entry.id })
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  ✎
                </button>
              )}
              <div className="fm-icon-img-wrap">
                {renderEntryIcon(entry, 60)}
                {entry.color && entry.kind !== "folder-all" && <span className="fm-icon-swatch" style={{ background: entry.color }} />}
              </div>
              <span className="fm-icon-label">
                {entry.name}
                {entry.count > 0 ? ` (${entry.count})` : ""}
              </span>
            </div>
          )
        })}
        {entries.length === 0 && (
          <div className="fm-empty" style={{ color: "#fff", textShadow: "0 1px 2px #000" }}>
            <FolderGlyph size={48} />
            <p>{isHome ? "Pin lists/folders here, or create one." : "This location is empty."}</p>
            <button className="fm-btn fm-btn-sm" onClick={openNewCategoryDialog}>
              Create a list
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const renderListView = () => (
    <div className="fm-sunken">
      <div className="fm-linklist">
        {entries.map((entry) => (
          <div
            key={`${entry.kind}-${entry.id}`}
            className={`fm-link-row${activeIconId === entry.id ? " selected" : ""}`}
            draggable={entry.kind === "list"}
            onDragStart={(e) => entry.kind === "list" && handleCategoryDragStart(e, entry.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropOnEntry(e, entry)}
            onDragEnd={clearDrag}
            onClick={() => setActiveIconId(entry.id)}
            onDoubleClick={() => openEntry(entry)}
          >
            {entry.kind === "folder" && !entry.icon ? (
              <FolderGlyph size={22} color={entry.color} />
            ) : (
              <img
                className="fm-link-icon"
                src={entry.kind === "smart" ? orbFor(entry.id) : iconFor(entry.id, entry.icon)}
                alt=""
                draggable={false}
              />
            )}
            <span className="fm-link-text">{entry.name}</span>
            <span className="fm-icon-badge">{entry.count}</span>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="fm-empty">
            <p>This location is empty.</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderDetailsView = () => (
    <div className="fm-sunken">
      <table className="fm-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Items</th>
            <th>Complete</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={`${entry.kind}-${entry.id}`}
              className={activeIconId === entry.id ? "selected" : ""}
              draggable={entry.kind === "list"}
              onDragStart={(e) => entry.kind === "list" && handleCategoryDragStart(e, entry.id)}
              onClick={() => setActiveIconId(entry.id)}
              onDoubleClick={() => openEntry(entry)}
            >
              <td>
                <span
                  style={{ display: "inline-block", width: 9, height: 9, marginRight: 6, background: entry.color || "#999" }}
                />
                {entry.name}
              </td>
              <td>{entry.kind === "folder" ? "Folder" : entry.kind === "smart" ? "Smart List" : "List"}</td>
              <td>{entry.kind === "folder" ? `${entry.count} lists` : `${entry.count} active`}</td>
              <td>{entry.kind === "list" ? `${getCategoryCompletionRate(entry.id)}%` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length === 0 && (
        <div className="fm-empty">
          <p>This location is empty.</p>
        </div>
      )}
    </div>
  )

  // Classic "Cards" view (the original Next Actions board behaviour).
  const renderCardsView = () => (
    <div className="fm-sunken fm-cards">
      <div
        className="fm-cards-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 20, alignItems: "start" }}
      >
        {entries
          .filter((e) => e.kind === "habits")
          .map((entry) => (
            <Card key={entry.id} className="cursor-pointer card-hover" onClick={() => openEntry(entry)}>
              <CardHeader className="pb-3 flex flex-row items-center gap-3">
                <img src={orbFor(entry.id)} alt="" className="w-8 h-8 object-contain" />
                <div>
                  <CardTitle className="text-lg">{entry.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">Daily habit tracking</p>
                </div>
              </CardHeader>
            </Card>
          ))}
        {entries
          .filter((e) => e.kind === "smart")
          .map((entry) => {
            const smartTasks = getSmartTasks(entry.id as SmartId)
            const itemLabel = "Task"
            return (
              <Card key={entry.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <img src={orbFor(entry.id)} alt="" className="w-7 h-7 object-contain" />
                      <div>
                        <CardTitle className="text-lg">{entry.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{smartTasks.length} due</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEntry(entry)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2 max-h-64 overflow-y-auto">
                  {smartTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nothing scheduled for this period.</p>
                  ) : (
                    smartTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedTaskId(task.id)}
                      >
                        <p className="text-sm font-medium truncate">{task.description}</p>
                        {task.estimatedDuration != null && (
                          <span className="text-xs text-muted-foreground">{task.estimatedDuration}m</span>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )
          })}
        {entries
          .filter((e) => e.kind === "folder")
          .map((entry) => (
            <Card
              key={entry.id}
              className="cursor-pointer card-hover"
              onClick={() => openEntry(entry)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnEntry(e, entry)}
            >
              <CardHeader className="pb-3 flex flex-row items-center gap-3">
                <FolderGlyph size={32} color={entry.color} />
                <div>
                  <CardTitle className="text-lg">{entry.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{entry.count} lists</p>
                </div>
              </CardHeader>
            </Card>
          ))}
        {entries
          .filter((e) => e.kind === "list")
          .map((entry) => {
            const category = categories.find((c) => c.id === entry.id)
            if (!category) return null
            const categoryTasks = getTasksForCategory(category.id)
            const completionRate = getCategoryCompletionRate(category.id)
            const isSelected = selectedCategories.includes(category.id)
            const itemLabel = itemLabelFor(category.id, category)
            return (
              <Card
                key={category.id}
                className={`overflow-hidden ${selectMode && isSelected ? "ring-2 ring-primary" : ""}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnEntry(e, entry)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 flex-1">
                      {selectMode && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            setSelectedCategories((prev) =>
                              isSelected ? prev.filter((id) => id !== category.id) : [...prev, category.id],
                            )
                          }
                          className="mr-1"
                        />
                      )}
                      <img src={iconFor(category.id, category.icon)} alt="" className="w-7 h-7 object-contain" />
                      <div>
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        {category.description && (
                          <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAddingTaskToTarget(category.id)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="List Settings"
                        onClick={() => setEditingCategory(category)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteCategory(category.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <Badge variant="secondary">{categoryTasks.length} active {itemLabel.toLowerCase()}s</Badge>
                    <Badge variant="outline">{completionRate}% complete</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {addingTaskToTarget === category.id && (
                    <div className="mb-4 p-3 border rounded-md bg-muted/50">
                      <div className="space-y-2">
                        <Textarea
                          placeholder={`Enter ${itemLabel.toLowerCase()} description...`}
                          value={newTaskDescription}
                          onChange={(e) => setNewTaskDescription(e.target.value)}
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAddTaskToCategory(category.id)}>
                            Add {itemLabel}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setAddingTaskToTarget(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {categoryTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No active {itemLabel.toLowerCase()}s in this list</p>
                    ) : (
                      categoryTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer group transition-all duration-200 task-item"
                          draggable
                          onDragStart={(e) => handleTaskDragStart(e, task)}
                          onDragEnd={clearDrag}
                          onClick={() => setSelectedTaskId(task.id)}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{task.description}</p>
                              </div>
                              <div className="flex gap-3 mt-1">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>Urgency {task.urgency}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Star className="h-3 w-3" />
                                  <span>Importance {task.importance}</span>
                                </div>
                                {task.scheduledDate && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {safeDateFormat(task.scheduledDate)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 focus-ring"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedTaskId(task.id)
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600 hover:text-green-700 focus-ring"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCompleteTask(task.id)
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-8">This location is empty.</p>
        )}
      </div>
    </div>
  )

  // ---- Open list contents (4 display types) ------------------------------
  const renderOpenContents = () => {
    if (!openTarget) return null
    const tasks = openTasks
    const openCatId = openTarget.type === "category" ? openTarget.id : undefined
    const openCat = openCatId ? categories.find((c) => c.id === openCatId) : openCategory
    const itemLabel =
      openFolderAll && currentFolder && !isRootAll ? "Item" : itemLabelFor(openCatId, openCat)

    const uncategorizedFilter =
      openFolderAll && currentFolder && !isScheduledFolderId(currentFolder.id) ? (
        <div className="fm-toolbar" style={{ marginBottom: 6, padding: "4px 8px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={!!folderAllUncategorizedOnly[currentFolder.id]}
              onChange={(e) => setFolderAllUncategorizedOnly(currentFolder.id, e.target.checked)}
            />
            Show uncategorized only
          </label>
        </div>
      ) : null

    const quickAdd =
      addingTaskToTarget === openTargetKey(openTarget) ? (
        <div className="fm-quickadd">
          <Textarea
            placeholder={`Enter ${itemLabel.toLowerCase()} description...`}
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <button className="fm-btn fm-btn-sm" onClick={handleAddTaskToOpen}>
              Add {itemLabel}
            </button>
            <button className="fm-btn fm-btn-sm" onClick={() => setAddingTaskToTarget(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null

    const bulkAddPanel = showBulkAdd ? (
      <div className="fm-quickadd" style={{ marginTop: 8 }}>
        <Textarea
          placeholder={`Paste one ${itemLabel.toLowerCase()} per line…`}
          value={bulkAddText}
          onChange={(e) => setBulkAddText(e.target.value)}
          rows={5}
        />
        <div className="flex gap-2">
          <button className="fm-btn fm-btn-sm" onClick={handleBulkAddToOpen}>
            Add all
          </button>
          <button className="fm-btn fm-btn-sm" onClick={() => { setShowBulkAdd(false); setBulkAddText("") }}>
            Cancel
          </button>
        </div>
      </div>
    ) : (
      <button className="fm-btn fm-btn-sm" style={{ marginTop: 8 }} onClick={() => setShowBulkAdd(true)}>
        Bulk add {itemLabel.toLowerCase()}s
      </button>
    )

    if (tasks.length === 0) {
      return (
        <div className="fm-sunken">
          {uncategorizedFilter}
          {quickAdd}
          {!addingTaskToTarget && bulkAddPanel}
          <div className="fm-empty">
            <img src={openIconKey} alt="" style={{ width: 56, height: 56, opacity: 0.6 }} />
            <p>
              {folderAllUncategorizedOnly[currentFolder?.id || ""]
                ? "No uncategorized items in this folder."
                : openSmart
                  ? "Nothing scheduled for this period."
                  : `No active ${itemLabel.toLowerCase()}s in this list.`}
            </p>
          </div>
        </div>
      )
    }

    let body: React.ReactNode = null
    if (currentDisplay === "default") {
      body = (
        <div className="fm-linklist">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="fm-link-row"
              draggable
              onDragStart={(e) => handleTaskDragStart(e, task)}
              onDragEnd={clearDrag}
              onClick={() => setSelectedTaskId(task.id)}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                <span className={`fm-link-text${task.completed ? " done" : ""}`}>{task.description}</span>
                {(() => {
                  // Show only THIS list's attributes here (non-destructive: the
                  // item still carries attributes from its other lists, visible
                  // in its detail view). Smart lists fall back to the union.
                  const defs = openCategory?.itemAttributes?.length
                    ? openCategory.itemAttributes
                    : mergeListAttributes(categories, task.categories)
                  const chips = defs
                    .map((d) => ({ d, text: formatAttributeValue(d, task.attributes?.[d.id]) }))
                    .filter((x) => x.text)
                  if (chips.length === 0) return null
                  return (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {chips.map(({ d, text }) => (
                        <span key={d.id} className="fm-attr-chip" title={d.name}>
                          {text}
                        </span>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          ))}
        </div>
      )
    } else if (currentDisplay === "checklist") {
      body = (
        <div className="fm-linklist">
          {tasks.map((task) => (
            <div key={task.id} className="fm-link-row" draggable onDragStart={(e) => handleTaskDragStart(e, task)} onDragEnd={clearDrag}>
              <button
                className="fm-checkbox"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCompleteTask(task.id)
                }}
                aria-label="Complete"
              >
                {task.completed ? "✓" : ""}
              </button>
              <span
                className="fm-link-text"
                style={{ color: "#000", textDecoration: task.completed ? "line-through" : "none" }}
                onClick={() => setSelectedTaskId(task.id)}
              >
                {task.description}
              </span>
            </div>
          ))}
        </div>
      )
    } else if (currentDisplay === "icons") {
      body = (
        <div className="fm-icon-grid">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="fm-icon"
              draggable
              onDragStart={(e) => handleTaskDragStart(e, task)}
              onDragEnd={clearDrag}
              onClick={() => setSelectedTaskId(task.id)}
              title={task.description}
            >
              <button
                className="fm-icon-edit"
                title="Change icon"
                onClick={(e) => {
                  e.stopPropagation()
                  setIconPickerFor({ kind: "task", id: task.id })
                }}
              >
                ✎
              </button>
              <div className="fm-icon-img-wrap">
                <img className="fm-icon-img" src={iconFor(task.id, task.icon)} alt="" draggable={false} />
              </div>
              <span className="fm-icon-label">{task.description}</span>
            </div>
          ))}
        </div>
      )
    } else {
      const tableCat = openCategory
      const attrDefs = tableCat?.itemAttributes ?? []
      const displayIds =
        tableCat?.displayedAttributes && tableCat.displayedAttributes.length > 0
          ? tableCat.displayedAttributes
          : attrDefs.map((d) => d.id)
      const cols = attrDefs.filter((d) => displayIds.includes(d.id))
      const showNextActionCols =
        (tableCat && categoryIsNextActions(tableCat.id, folders)) ||
        (openFolderAll && tasks.some((t) => categoryIsNextActions(t.categories?.[0] || "", folders)))

      body = (
        <table className="fm-table">
          <thead>
            <tr>
              <th>✓</th>
              <th>Name</th>
              {openFolderAll && <th>Lists</th>}
              {cols.map((d) => (
                <th key={d.id}>{d.name}</th>
              ))}
              {showNextActionCols && (
                <>
                  <th>Urgency</th>
                  <th>Importance</th>
                  <th>Scheduled</th>
                </>
              )}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} draggable onDragStart={(e) => handleTaskDragStart(e, task)} onDragEnd={clearDrag}>
                <td>
                  <button
                    className="fm-checkbox"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCompleteTask(task.id)
                    }}
                  >
                    {task.completed ? "✓" : ""}
                  </button>
                </td>
                <td onClick={() => setSelectedTaskId(task.id)} style={{ cursor: "pointer" }}>
                  {task.description}
                </td>
                {openFolderAll && currentFolder && (
                  <td className="text-xs">
                    {isTaskUncategorizedInFolder(task, currentFolder)
                      ? "Uncategorized"
                      : (task.categories || [])
                          .filter((cid) => !isFolderAllItemsCategoryId(cid))
                          .map((cid) => categories.find((c) => c.id === cid)?.name)
                          .filter(Boolean)
                          .join(", ") || "—"}
                  </td>
                )}
                {cols.map((d) => (
                  <td key={d.id}>{formatAttributeValue(d, task.attributes?.[d.id]) || "—"}</td>
                ))}
                {showNextActionCols && (
                  <>
                    <td>{task.urgency ?? "—"}</td>
                    <td>{task.importance ?? "—"}</td>
                    <td>{task.scheduledDate ? safeDateFormat(task.scheduledDate) : "—"}</td>
                  </>
                )}
                <td>
                  <button className="fm-btn fm-btn-sm" onClick={() => setSelectedTaskId(task.id)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    return (
      <div className="fm-sunken">
        {uncategorizedFilter}
        {quickAdd}
        {!addingTaskToTarget && bulkAddPanel}
        {body}
      </div>
    )
  }

  // ---- Search results view ----------------------------------------------
  const renderSearchResults = () => {
    const { folders: rf, lists: rl, tasks: rt } = searchResults
    const total = rf.length + rl.length + rt.length
    return (
      <div className="fm-sunken">
        <div className="fm-search-results">
          {total === 0 && <div className="fm-empty"><p>No matches for “{searchTerm}”.</p></div>}
          {rf.length > 0 && (
            <>
              <div className="fm-search-group-label">Folders ({rf.length})</div>
              {rf.map((f) => (
                <div
                  key={f.id}
                  className="fm-link-row"
                  onClick={() => {
                    navTo(f.id)
                    setSearchTerm("")
                  }}
                >
                  <FolderGlyph size={22} color={f.color || undefined} />
                  <span className="fm-link-text">{f.name}</span>
                </div>
              ))}
            </>
          )}
          {rl.length > 0 && (
            <>
              <div className="fm-search-group-label">Lists ({rl.length})</div>
              {rl.map((c) => (
                <div
                  key={c.id}
                  className="fm-link-row"
                  onClick={() => {
                    const parent = folders.find((f) => f.categoryIds.includes(c.id))
                    setLocation(parent ? parent.id : "all")
                    setOpenTarget({ type: "category", id: c.id })
                    setSearchTerm("")
                  }}
                >
                  <img className="fm-link-icon" src={iconFor(c.id, c.icon)} alt="" />
                  <span className="fm-link-text">{c.name}</span>
                  <span className="fm-icon-badge">{getTasksForCategory(c.id).length}</span>
                </div>
              ))}
            </>
          )}
          {rt.length > 0 && (
            <>
              <div className="fm-search-group-label">Items ({rt.length})</div>
              {rt.map((t) => (
                <div
                  key={t.id}
                  className="fm-link-row"
                  onClick={() => {
                    setSelectedTaskId(t.id)
                  }}
                >
                  <img className="fm-link-icon" src={iconFor(t.id, t.icon)} alt="" />
                  <span className="fm-link-text">{t.description}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    )
  }

  const breadcrumb = searchActive
    ? `Search: ${searchTerm}`
    : openTarget
      ? `${isHome ? "Home" : isAll ? "All" : currentFolder?.name || "All"} \\ ${openName}`
      : isHome
        ? "Home"
        : isAll
          ? "All"
          : `All \\ ${currentFolder?.name || ""}`

  const statusText = openTarget
    ? `${openTasks.length} item(s) in "${openName}"`
    : `${entries.filter((e) => e.kind === "folder").length} folder(s), ${entries.filter((e) => e.kind !== "folder").length} list(s)`

  /* ============================== JSX =============================== */
  return (
    <div className="fm98" style={{ height: "calc(100vh - 150px)", minHeight: 560 }}>
      <div className="fm-window">
        {/* Title bar */}
        <div className="fm-title-bar">
          <div className="fm-title-bar-text">
            <img src={openIconKey} alt="" />
            {openTarget ? `${openName} — Lists` : "Lists — File Manager"}
          </div>
          <div className="fm-title-bar-controls">
            <button className="fm-title-btn" aria-label="Minimize">
              _
            </button>
            <button className="fm-title-btn" aria-label="Maximize">
              □
            </button>
            <button className="fm-title-btn" aria-label="Close" onClick={() => setOpenTarget(null)}>
              ×
            </button>
          </div>
        </div>

        <div className="fm-window-body">
          {/* Toolbar */}
          <div className="fm-toolbar">
            <button
              className="fm-btn fm-btn-sm"
              disabled={!openTarget && (isHome || isAll)}
              onClick={() => {
                if (openTarget) setOpenTarget(null)
                else setLocation("all")
                setActiveIconId(null)
              }}
            >
              ↑ Up
            </button>
            <button className="fm-btn fm-btn-sm" onClick={openNewCategoryDialog}>
              New List
            </button>
            <button className="fm-btn fm-btn-sm" onClick={() => setShowNewFolderDialog(true)}>
              New Folder
            </button>
            <button className="fm-btn fm-btn-sm" onClick={() => csvRef.current?.click()}>
              Import CSV
            </button>
            <input ref={csvRef} type="file" accept=".csv,text/csv" hidden onChange={handleCsvFile} />
            <div className="fm-toolbar-sep" />
            <button className="fm-btn fm-btn-sm" onClick={() => setShowCompletedTasks(true)}>
              Completed
            </button>
            <button className="fm-btn fm-btn-sm" onClick={() => setShowCategorySettings(true)}>
              Settings
            </button>
            <button
              className={`fm-btn fm-btn-sm${selectMode ? " active" : ""}`}
              onClick={() => {
                setSelectMode((v) => !v)
                setSelectedCategories([])
              }}
            >
              {selectMode ? "Cancel Select" : "Select"}
            </button>
            <div className="fm-toolbar-sep" />
            {!openTarget ? (
              <>
                <span style={{ fontSize: 11 }}>View:</span>
                {(["icons", "list", "details", "cards"] as FolderView[]).map((v) => (
                  <button
                    key={v}
                    className={`fm-btn fm-btn-sm${folderView === v ? " active" : ""}`}
                    onClick={() => setFolderView(v)}
                  >
                    {v === "cards" ? "Cards" : v[0].toUpperCase() + v.slice(1)}
                  </button>
                ))}
                {folderView === "icons" && (
                  <button
                    className="fm-btn fm-btn-sm"
                    title="Reset icon positions to a tidy grid"
                    onClick={() => autoOrganizeIcons(location, entries.map((e) => `${e.kind}-${e.id}`))}
                  >
                    Auto-organize
                  </button>
                )}
              </>
            ) : openTarget.type !== "habits" ? (
              <>
                <span style={{ fontSize: 11 }}>Display:</span>
                {(["default", "checklist", "icons", "table"] as ListDisplay[]).map((d) => (
                  <button
                    key={d}
                    className={`fm-btn fm-btn-sm${currentDisplay === d ? " active" : ""}`}
                    onClick={() => setListDisplay(openTargetKey(openTarget), d)}
                  >
                    {d === "table" ? "Details" : d[0].toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </>
            ) : null}
            <div className="fm-toolbar-spacer" />
            <input
              className="fm-input"
              style={{ width: 180 }}
              placeholder="Search folders, lists, items…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchActive && (
              <button className="fm-btn fm-btn-sm" onClick={() => setSearchTerm("")}>
                Clear
              </button>
            )}
          </div>

          {/* Address bar */}
          <div className="fm-status-bar">
            <div className="fm-status-field shrink" style={{ minWidth: 60 }}>
              Address
            </div>
            <div className="fm-status-field">{breadcrumb}</div>
          </div>

          {/* Selection strip */}
          {selectMode && (
            <div className="fm-toolbar" style={{ marginTop: 3 }}>
              <span style={{ fontSize: 11 }}>{selectedCategories.length} selected</span>
              <button
                className="fm-btn fm-btn-sm"
                onClick={() => setShowNewFolderDialog(true)}
                disabled={selectedCategories.length === 0}
              >
                Add to New Folder
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  className="fm-btn fm-btn-sm"
                  disabled={selectedCategories.length === 0}
                  onClick={() => {
                    selectedCategories.forEach((catId) => addCategoryToFolder(folder.id, catId))
                    setSelectMode(false)
                    setSelectedCategories([])
                  }}
                >
                  → {folder.name}
                </button>
              ))}
            </div>
          )}

          {/* Split: sidebar + content */}
          <div className="fm-split">
            {/* Sidebar */}
            <div className="fm-sidebar">
              <div className="fm-search-group-label" style={{ padding: "4px 6px 2px" }}>
                Quick Access
              </div>
              <div
                className={`fm-tree-item${isHome && !openTarget ? " active" : ""}`}
                onClick={() => navTo("home")}
                onDragOver={handleDragOver}
              >
                <span>🏠</span>
                <span>Home</span>
              </div>
              <div
                className={`fm-tree-item${isAll && !openTarget ? " active" : ""}`}
                onClick={() => navTo("all")}
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  e.preventDefault()
                  if (draggedCategoryId) fileCategoryIntoFolder(draggedCategoryId, null)
                  clearDrag()
                }}
              >
                <span>🗂</span>
                <span>All</span>
              </div>

              <div className="fm-search-group-label" style={{ padding: "8px 6px 2px" }}>
                Folders
              </div>
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={`fm-tree-item${location === folder.id ? " active" : ""}`}
                  onClick={() => navTo(folder.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (draggedTask && !isScheduledFolderId(folder.id)) {
                      updateTask(assignTaskToFolderUncategorized(draggedTask, folder))
                    } else if (draggedCategoryId) {
                      fileCategoryIntoFolder(draggedCategoryId, folder.id)
                    }
                    clearDrag()
                  }}
                >
                  <span className="fm-tree-swatch" style={{ background: folder.color || "#9CA3AF" }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{folder.name}</span>
                </div>
              ))}
              <div style={{ padding: 6 }}>
                <button className="fm-btn fm-btn-sm" style={{ width: "100%" }} onClick={() => setShowNewFolderDialog(true)}>
                  + New Folder
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
              {openTarget && (
                <div className="fm-title-bar inactive" style={{ marginBottom: 3 }}>
                  <div className="fm-title-bar-text">
                    {openColor && <span style={{ display: "inline-block", width: 12, height: 12, background: openColor }} />}
                    {openName}
                  </div>
                  <div className="fm-title-bar-controls">
                    {openTarget.type !== "habits" && (
                      <button className="fm-title-btn" title="Add task" onClick={() => setAddingTaskToTarget(openTargetKey(openTarget))}>
                        +
                      </button>
                    )}
                    {openCategory && (
                      <button className="fm-title-btn" title="List settings" onClick={() => setEditingCategory(openCategory)}>
                        ⚙
                      </button>
                    )}
                    <button className="fm-title-btn" aria-label="Close" onClick={() => setOpenTarget(null)}>
                      ×
                    </button>
                  </div>
                </div>
              )}

              {searchActive
                ? renderSearchResults()
                : openTarget?.type === "habits"
                  ? openTarget.id === "weekly-habits" ? (
                    <WeeklyHabitsList />
                  ) : openTarget.id === "monthly-habits" ? (
                    <MonthlyHabitsList />
                  ) : (
                    <DailyHabitsList />
                  )
                  : openTarget
                  ? renderOpenContents()
                  : folderView === "icons"
                    ? renderIconsView()
                    : folderView === "list"
                      ? renderListView()
                      : folderView === "details"
                        ? renderDetailsView()
                        : renderCardsView()}
            </div>

            {/* Right rail */}
            {openCategory ? (
              <div className="fm-sidebar" style={{ width: 150 }}>
                <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                  <button className="fm-btn fm-btn-sm" onClick={() => setAddingTaskToTarget(openCategory.id)}>
                    Add {itemLabelFor(openCategory.id, openCategory)}
                  </button>
                  <button className="fm-btn fm-btn-sm" onClick={() => setShowBulkAdd(true)}>
                    Bulk add
                  </button>
                  <button className="fm-btn fm-btn-sm" onClick={() => setEditingCategory(openCategory)}>
                    List Settings
                  </button>
                  <button
                    className="fm-btn fm-btn-sm"
                    onClick={() => setIconPickerFor({ kind: "category", id: openCategory.id })}
                  >
                    Change Icon
                  </button>
                  <button
                    className="fm-btn fm-btn-sm"
                    onClick={() => toggleHomePin(openCategory.id)}
                  >
                    {homePinned.includes(openCategory.id) ? "Unpin Home" : "Pin to Home"}
                  </button>
                  <button
                    className="fm-btn fm-btn-sm fm-btn-danger"
                    onClick={() => {
                      if (confirm(`Delete list "${openCategory.name}"?`)) {
                        deleteCategory(openCategory.id)
                        setOpenTarget(null)
                      }
                    }}
                  >
                    Delete List
                  </button>
                </div>
              </div>
            ) : openFolderAll && currentFolder && !isRootAll ? (
              <div className="fm-sidebar" style={{ width: 150 }}>
                <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                  <button className="fm-btn fm-btn-sm" onClick={() => setAddingTaskToTarget(openTargetKey(openTarget!))}>
                    Add Item
                  </button>
                  <button className="fm-btn fm-btn-sm" onClick={() => setShowBulkAdd(true)}>
                    Bulk add
                  </button>
                  <p style={{ fontSize: 10, color: "var(--fm-button-shadow)" }}>
                    Items added here stay uncategorized until filed into a list.
                  </p>
                </div>
              </div>
            ) : openSmart ? (
              <div className="fm-sidebar" style={{ width: 150 }}>
                <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                  <button className="fm-btn fm-btn-sm" onClick={() => setAddingTaskToTarget(openSmart.id)}>
                    Add Task
                  </button>
                  <p style={{ fontSize: 10, color: "var(--fm-button-shadow)" }}>
                    Synced with the dashboard To-Do panel.
                  </p>
                </div>
              </div>
            ) : (
              currentFolder && (
                <div className="fm-sidebar" style={{ width: 150 }}>
                  <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                    <button className="fm-btn fm-btn-sm" onClick={() => setEditingFolder(currentFolder)}>
                      Folder Settings
                    </button>
                    <button className="fm-btn fm-btn-sm" onClick={() => setIconPickerFor({ kind: "folder", id: currentFolder.id })}>
                      Change Icon
                    </button>
                    <button className="fm-btn fm-btn-sm" onClick={openNewCategoryDialog}>
                      New List Here
                    </button>
                    <button className="fm-btn fm-btn-sm" onClick={() => toggleHomePin(currentFolder.id)}>
                      {homePinned.includes(currentFolder.id) ? "Unpin Home" : "Pin to Home"}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Status bar */}
          <div className="fm-status-bar">
            <div className="fm-status-field">{statusText}</div>
            <div className="fm-status-field shrink" style={{ minWidth: 140 }}>
              {folders.length} folder(s), {categories.length} list(s)
            </div>
            <div className="fm-status-field shrink" style={{ minWidth: 90 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <input type="checkbox" checked={showSmartLists} onChange={(e) => setShowSmartLists(e.target.checked)} />
                Smart lists
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ============================ Dialogs ============================ */}

      {/* Create New List */}
      <Dialog open={newCategoryOpen} onOpenChange={setNewCategoryOpen}>
        <DialogContent className="fm98-dialog">
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
            <DialogDescription>
              {currentFolder
                ? `Create a new list inside "${currentFolder.name}". Settings are inherited from the folder by default.`
                : isHome
                  ? "Create a new list (it will be pinned to Home)."
                  : "Create a new list to organize your tasks."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">List Name</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Work Projects"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description (optional)</Label>
              <Input
                id="category-description"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Brief description of this list"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-color">Color</Label>
              <Input
                id="category-color"
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-template">Item template</Label>
              <select
                id="category-template"
                className="w-full border rounded-md h-9 px-2 bg-background text-sm"
                value={newCategoryTemplate}
                onChange={(e) => setNewCategoryTemplate(e.target.value)}
              >
                {Object.entries(LIST_TEMPLATES).map(([key, t]) => (
                  <option key={key} value={key}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Gives items in this list a starting set of attributes (e.g. price &amp; store, or author &amp; pages). Editable later.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="category-scheduleable" className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Scheduleable
                </Label>
                <p className="text-xs text-muted-foreground">Show items in this list in the Scheduler.</p>
              </div>
              <Switch id="category-scheduleable" checked={newCategoryScheduleable} onCheckedChange={setNewCategoryScheduleable} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewCategoryOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCategory}>Create List</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Import */}
      {csvImport && (
        <Dialog open={!!csvImport} onOpenChange={() => setCsvImport(null)}>
          <DialogContent className="fm98-dialog sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Import “{csvImport.fileName}”</DialogTitle>
              <DialogDescription>
                {csvImport.rows.length} rows · {csvImport.headers.length} columns. Each column becomes an item attribute.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Import into</Label>
                <select
                  className="w-full border rounded-md h-9 px-2 bg-background text-sm"
                  value={csvImport.targetCategoryId}
                  onChange={(e) => setCsvImport({ ...csvImport, targetCategoryId: e.target.value })}
                >
                  <option value="">➕ New list</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {csvImport.targetCategoryId === "" && (
                <div className="space-y-2">
                  <Label>New list name</Label>
                  <Input
                    value={csvImport.listName}
                    onChange={(e) => setCsvImport({ ...csvImport, listName: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Item name column</Label>
                <select
                  className="w-full border rounded-md h-9 px-2 bg-background text-sm"
                  value={csvImport.nameCol}
                  onChange={(e) => setCsvImport({ ...csvImport, nameCol: Number(e.target.value) })}
                >
                  {csvImport.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-muted-foreground">
                Attributes:{" "}
                {csvImport.headers
                  .filter((_, i) => i !== csvImport.nameCol)
                  .map((h) => h || "?")
                  .join(", ") || "(none)"}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCsvImport(null)}>
                  Cancel
                </Button>
                <Button onClick={performCsvImport}>Import {csvImport.rows.length} items</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* List Settings */}
      {editingCategory && (
        <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
          <DialogContent className="fm98-dialog sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                List Settings
              </DialogTitle>
              <DialogDescription>Update the settings for this list.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="flex items-center gap-3">
                <img src={iconFor(editingCategory.id, editingCategory.icon)} alt="" className="w-12 h-12 object-contain border rounded-md p-1" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIconPickerFor({ kind: "category", id: editingCategory.id })}>
                    Change Icon
                  </Button>
                  {editingCategory.icon && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCategory({ ...editingCategory, icon: undefined })}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category-name">List Name</Label>
                <Input
                  id="edit-category-name"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category-description">Description</Label>
                <Input
                  id="edit-category-description"
                  value={editingCategory.description || ""}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category-color">Color</Label>
                <Input
                  id="edit-category-color"
                  type="color"
                  value={editingCategory.color}
                  onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-item-label">Item name (singular)</Label>
                <Input
                  id="edit-item-label"
                  value={editingCategory.itemLabel || ""}
                  onChange={(e) => setEditingCategory({ ...editingCategory, itemLabel: e.target.value || undefined })}
                  placeholder={categoryIsNextActions(editingCategory.id, folders) ? "task" : "item"}
                />
                <p className="text-xs text-muted-foreground">Used in “Add …” buttons and labels. Next Actions lists default to “task”.</p>
              </div>
              <div className="space-y-2">
                <Label>Item detail panels</Label>
                <div className="flex flex-wrap gap-2">
                  {(["details", "scheduling", "dependencies", "subtasks", "analysis", "time"] as const).map((panel) => {
                    const panels = editingCategory.detailPanels || ["details", "scheduling", "dependencies", "subtasks", "analysis"]
                    const on = panels.includes(panel)
                    return (
                      <label key={panel} className="flex items-center gap-1 text-sm border rounded px-2 py-1">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => {
                            const next = on ? panels.filter((p) => p !== panel) : [...panels, panel]
                            setEditingCategory({ ...editingCategory, detailPanels: next })
                          }}
                        />
                        {panel}
                      </label>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Display</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["default", "checklist", "icons", "table"] as ListDisplay[]).map((d) => (
                    <label key={d} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="list-display"
                        checked={(listDisplay[editingCategory.id] || "default") === d}
                        onChange={() => setListDisplay(editingCategory.id, d)}
                      />
                      <span className="capitalize">{d === "table" ? "Details" : d}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Item attributes</Label>
                <p className="text-xs text-muted-foreground">
                  Fields every item in this list can fill in (shown in the item's detail view).
                </p>
                <AttributeSchemaEditor
                  value={editingCategory.itemAttributes || []}
                  onChange={(defs) => setEditingCategory({ ...editingCategory, itemAttributes: defs })}
                />
              </div>
              {(editingCategory.itemAttributes?.length ?? 0) > 0 && (
                <>
                  <div className="space-y-2">
                    <Label>Default values for new items</Label>
                    <AttributeValuesEditor
                      definitions={editingCategory.itemAttributes || []}
                      values={editingCategory.defaultAttributeValues || {}}
                      onChange={(vals) => setEditingCategory({ ...editingCategory, defaultAttributeValues: vals })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Table view columns</Label>
                    <div className="flex flex-wrap gap-2">
                      {(editingCategory.itemAttributes || []).map((def) => {
                        const on = (editingCategory.displayedAttributes || editingCategory.itemAttributes!.map((d) => d.id)).includes(def.id)
                        return (
                          <label key={def.id} className="flex items-center gap-1 text-sm border rounded px-2 py-1">
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => {
                                const current = editingCategory.displayedAttributes || editingCategory.itemAttributes!.map((d) => d.id)
                                const next = on ? current.filter((id) => id !== def.id) : [...current, def.id]
                                setEditingCategory({ ...editingCategory, displayedAttributes: next })
                              }}
                            />
                            {def.name}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-category-scheduleable" className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    Scheduleable
                  </Label>
                  <p className="text-xs text-muted-foreground">Show items in this list in the Scheduler.</p>
                </div>
                <Switch
                  id="edit-category-scheduleable"
                  checked={editingCategory.scheduleable !== false}
                  onCheckedChange={(checked) => setEditingCategory({ ...editingCategory, scheduleable: checked })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Show in Home
                  </Label>
                  <p className="text-xs text-muted-foreground">Pin this list to your Home directory.</p>
                </div>
                <Switch
                  checked={homePinned.includes(editingCategory.id)}
                  onCheckedChange={() => toggleHomePin(editingCategory.id)}
                />
              </div>
            </div>
            <div className="flex justify-between gap-2 pt-3 border-t shrink-0">
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm(`Delete list "${editingCategory.name}"?`)) {
                    deleteCategory(editingCategory.id)
                    if (openTarget?.type === "category" && openTarget.id === editingCategory.id) setOpenTarget(null)
                    setEditingCategory(null)
                  }
                }}
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingCategory(null)}>
                  Cancel
                </Button>
                <Button onClick={handleEditCategory}>Save Changes</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Settings */}
      <NextActionsSettingsDialog open={showCategorySettings} onClose={() => setShowCategorySettings(false)} />

      {/* Completed */}
      <CompletedTasksDialog open={showCompletedTasks} onClose={() => setShowCompletedTasks(false)} onTaskSelect={setSelectedTaskId} />

      {/* Task detail */}
      <TaskDetailPopup taskId={selectedTaskId} open={!!selectedTaskId} onClose={() => setSelectedTaskId(null)} />

      {/* Icon picker */}
      <IconPickerDialog
        open={!!iconPickerFor}
        current={iconPickerCurrent}
        onClose={() => setIconPickerFor(null)}
        onSelect={applyIcon}
      />

      {/* New Folder */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="fm98-dialog">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              {selectedCategories.length > 0
                ? "Name your folder and set its defaults. The selected lists will be added to it."
                : "Name your folder and set its defaults. Lists created inside it inherit these settings."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g., Work"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder-color">Color</Label>
              <Input id="folder-color" type="color" value={newFolderColor} onChange={(e) => setNewFolderColor(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="folder-scheduleable" className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Scheduleable
                </Label>
                <p className="text-xs text-muted-foreground">Default for lists created inside this folder.</p>
              </div>
              <Switch id="folder-scheduleable" checked={newFolderScheduleable} onCheckedChange={setNewFolderScheduleable} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (newFolderName.trim()) {
                    addFolder({
                      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                      name: newFolderName,
                      createdAt: new Date(),
                      categoryIds: selectedCategories,
                      color: newFolderColor,
                      scheduleable: newFolderScheduleable,
                    })
                    setShowNewFolderDialog(false)
                    setNewFolderName("")
                    setNewFolderColor("#3B82F6")
                    setNewFolderScheduleable(true)
                    setSelectMode(false)
                    setSelectedCategories([])
                  }
                }}
                disabled={!newFolderName.trim()}
              >
                Create Folder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Folder Settings */}
      {editingFolder && (
        <Dialog open={!!editingFolder} onOpenChange={() => setEditingFolder(null)}>
          <DialogContent className="fm98-dialog">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Folder Settings
              </DialogTitle>
              <DialogDescription>
                Update this folder. New lists created inside it inherit these settings by default.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {editingFolder.icon ? (
                  <img src={editingFolder.icon} alt="" className="w-12 h-12 object-contain border rounded-md p-1" />
                ) : (
                  <FolderGlyph size={40} color={editingFolder.color || undefined} />
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIconPickerFor({ kind: "folder", id: editingFolder.id })}>
                    Change Icon
                  </Button>
                  {editingFolder.icon && (
                    <Button variant="ghost" size="sm" onClick={() => setEditingFolder({ ...editingFolder, icon: undefined })}>
                      Reset
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-folder-name">Folder Name</Label>
                <Input
                  id="edit-folder-name"
                  value={editingFolder.name}
                  onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-folder-description">Description</Label>
                <Input
                  id="edit-folder-description"
                  value={editingFolder.description || ""}
                  onChange={(e) => setEditingFolder({ ...editingFolder, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-folder-color">Color</Label>
                <Input
                  id="edit-folder-color"
                  type="color"
                  value={editingFolder.color || "#3B82F6"}
                  onChange={(e) => setEditingFolder({ ...editingFolder, color: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-folder-scheduleable" className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    Scheduleable
                  </Label>
                  <p className="text-xs text-muted-foreground">Default for lists created inside this folder.</p>
                </div>
                <Switch
                  id="edit-folder-scheduleable"
                  checked={editingFolder.scheduleable !== false}
                  onCheckedChange={(checked) => setEditingFolder({ ...editingFolder, scheduleable: checked })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Show in Home
                  </Label>
                  <p className="text-xs text-muted-foreground">Pin this folder to your Home directory.</p>
                </div>
                <Switch checked={homePinned.includes(editingFolder.id)} onCheckedChange={() => toggleHomePin(editingFolder.id)} />
              </div>
              <div className="flex justify-between gap-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Delete this folder? The lists inside it will not be deleted.")) {
                      deleteFolder(editingFolder.id)
                      if (location === editingFolder.id) setLocation("all")
                      setEditingFolder(null)
                    }
                  }}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Folder
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditingFolder(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      updateFolder(editingFolder)
                      setEditingFolder(null)
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
