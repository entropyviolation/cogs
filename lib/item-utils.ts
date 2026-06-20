/**
 * lib/item-utils.ts — Item / task helpers
 *
 * Shared logic for distinguishing "next actions" items (lists in the Next Actions
 * folder tree) from plain list items, building minimal vs full task records,
 * and filtering planned-task sidebars in Plan views.
 */
import type { Task, TaskCategory, CategoryFolder, AttributeValue } from "@/lib/types"
import {
  formatDateKey,
  getWeekString,
  parseLocalDate,
  parseWeekString,
  taskScheduledOnDay,
  safeToDate,
  type SchedulableFields,
} from "@/lib/date-utils"
import { normalizeAttributeType } from "@/lib/attribute-utils"

const NEXT_ACTIONS_RE = /next\s*actions?/i

export function isNextActionsFolder(folderId: string, folders: CategoryFolder[]): boolean {
  const folder = folders.find((f) => f.id === folderId)
  if (!folder) return false
  if (NEXT_ACTIONS_RE.test(folder.name)) return true
  if (folder.parentFolderId) return isNextActionsFolder(folder.parentFolderId, folders)
  return false
}

export function folderForCategory(categoryId: string, folders: CategoryFolder[]): CategoryFolder | undefined {
  return folders.find((f) => f.categoryIds.includes(categoryId))
}

export function categoryIsNextActions(categoryId: string, folders: CategoryFolder[]): boolean {
  const folder = folderForCategory(categoryId, folders)
  return folder ? isNextActionsFolder(folder.id, folders) : false
}

export function taskIsNextAction(task: Task, folders: CategoryFolder[]): boolean {
  return (task.categories ?? []).some((cid) => categoryIsNextActions(cid, folders))
}

/** Which explicit schedule field is set (most specific stored assignment). */
export function getStoredScheduleLevel(task: SchedulableFields): "day" | "week" | "month" | "year" | null {
  if (task.scheduledDate) return "day"
  if (task.scheduledWeek) return "week"
  if (task.scheduledMonth) return "month"
  if (task.scheduledYear) return "year"
  return null
}

/** Scheduler "Always" overview: match only the task's stored schedule level. */
export function taskBelongsInOverviewBox(
  task: Task,
  period: "year" | "month" | "week" | "day",
  value: string,
): boolean {
  const level = getStoredScheduleLevel(task)
  if (!level) return false
  switch (period) {
    case "day":
      return level === "day" && taskScheduledOnDay(task, value)
    case "week":
      return level === "week" && task.scheduledWeek === value
    case "month":
      return level === "month" && task.scheduledMonth === value
    case "year":
      return level === "year" && task.scheduledYear === value
    default:
      return false
  }
}

export function taskHasFinerScheduleThanMonth(task: Task): boolean {
  return !!(task.scheduledWeek || task.scheduledDate)
}

export function taskHasDaySchedule(task: Task): boolean {
  return !!(task.scheduledDate && task.scheduledTime)
}

/** Month sidebar: scheduled for this month only (not also assigned to a week/day). */
export function isMonthOnlyPlanned(task: Task, monthKey: string): boolean {
  if (task.completed) return false
  if (taskHasFinerScheduleThanMonth(task)) return false
  if (task.scheduledMonth === monthKey) return true
  const deadline = safeToDate(task.deadline)
  if (deadline && !task.scheduledMonth && deadline.toISOString().slice(0, 7) === monthKey) return true
  return false
}

/** Week sidebar: scheduled for this week only (not assigned to a specific day/time). */
export function isWeekOnlyPlanned(task: Task, weekKey: string): boolean {
  if (task.completed) return false
  if (task.scheduledDate) return false
  if (task.scheduledWeek === weekKey) return true
  const deadline = safeToDate(task.deadline)
  if (deadline && !task.scheduledWeek && !task.scheduledDate && getWeekString(deadline) === weekKey) return true
  return false
}

/** Day sidebar: on today's to-do but not placed on the time grid yet. */
export function isDayUnscheduledPlanned(task: Task, date: Date): boolean {
  if (task.completed) return false
  if (taskHasDaySchedule(task)) return false
  const dayKey = formatDateKey(date)
  if (task.scheduledDate) {
    const d = safeToDate(task.scheduledDate)
    if (d && formatDateKey(d) === dayKey) return true
  }
  const deadline = safeToDate(task.deadline)
  if (deadline && formatDateKey(deadline) === dayKey) return true
  return false
}

/** Minimal list item — no next-actions scheduling defaults. */
export function createListItem(description: string, categoryIds: string[] = []): Task {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    description,
    category: categoryIds.length ? "clarified" : "list",
    createdAt: new Date(),
    completed: false,
    categories: categoryIds,
    subtasks: [],
  }
}

/** Next-actions item with scheduling / priority defaults. */
export function createNextActionItem(description: string, categoryIds: string[] = []): Task {
  return {
    ...createListItem(description, categoryIds),
    category: "clarified",
    estimatedDuration: 30,
    cognitiveLoad: 2,
    urgency: 3,
    importance: 3,
    dependencies: [],
    context: "@general",
    entropy: 0.5,
    rewardValue: 1,
    allowPartialCompletion: false,
    minimumChunkSize: 15,
  }
}

/** Seed attributes from list defaults when adding to a category. */
export function withCategoryDefaults(
  task: Task,
  category: TaskCategory | undefined,
): Task {
  if (!category?.defaultAttributeValues) return task
  return {
    ...task,
    attributes: { ...category.defaultAttributeValues, ...(task.attributes || {}) },
  }
}

export function isTaskScheduleable(
  task: Task,
  categories: TaskCategory[],
  folders: CategoryFolder[],
): boolean {
  if (task.scheduleable === false) return false
  if (task.scheduleable === true) return true
  const cats = (task.categories ?? [])
    .map((id) => categories.find((c) => c.id === id))
    .filter(Boolean) as TaskCategory[]
  if (cats.some((c) => c.scheduleable === false)) return false
  if (cats.some((c) => c.scheduleable !== false)) return true
  return taskIsNextAction(task, folders)
}

/** Points awarded when completing a next-actions task (default 1, or list "Points" attribute). */
export function resolveCompletionPoints(
  task: Task,
  categories: TaskCategory[],
  folders: CategoryFolder[],
): number {
  if (!taskIsNextAction(task, folders)) {
    return task.rewardValue || 0
  }

  const taskCategories = (task.categories ?? [])
    .map((id) => categories.find((c) => c.id === id))
    .filter(Boolean) as TaskCategory[]

  for (const cat of taskCategories) {
    const pointsDef = cat.itemAttributes?.find(
      (a) => a.name.trim().toLowerCase() === "points" && normalizeAttributeType(a.type) === "number",
    )
    if (pointsDef) {
      const raw = task.attributes?.[pointsDef.id]
      if (raw !== undefined && raw !== null && raw !== "") {
        const n = typeof raw === "number" ? raw : Number(raw)
        if (!Number.isNaN(n) && n >= 0) return n
      }
    }
  }

  return 1
}

/** Singular label for items in a list (e.g. task, book, habit). */
export function getItemLabel(
  category: TaskCategory | undefined,
  folders: CategoryFolder[],
  categoryId?: string,
): string {
  if (category?.itemLabel?.trim()) return category.itemLabel.trim()
  if (categoryId && categoryIsNextActions(categoryId, folders)) return "task"
  if (category && categoryIsNextActions(category.id, folders)) return "task"
  return "item"
}

export function capitalizeLabel(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Push a task forward one day/week/month and increment its pushed counter. */
export function pushTaskOnePeriod(
  task: Task,
  period: "day" | "week" | "month",
  refDate: Date = new Date(),
): Partial<Task> {
  const cleared = {
    scheduledDate: undefined,
    scheduledWeek: undefined,
    scheduledMonth: undefined,
    scheduledYear: undefined,
  }

  switch (period) {
    case "day": {
      const base = parseLocalDate(task.scheduledDate) ?? refDate
      const next = new Date(base)
      next.setDate(next.getDate() + 1)
      next.setHours(0, 0, 0, 0)
      return {
        ...cleared,
        scheduledDate: next,
        daysPushed: (task.daysPushed ?? 0) + 1,
        hiddenFromTodo: false,
      }
    }
    case "week": {
      const base = task.scheduledWeek
        ? (parseWeekString(task.scheduledWeek)?.start ?? refDate)
        : (parseLocalDate(task.scheduledDate) ?? refDate)
      const next = new Date(base)
      next.setDate(next.getDate() + 7)
      return {
        ...cleared,
        scheduledWeek: getWeekString(next),
        weeksPushed: (task.weeksPushed ?? 0) + 1,
        hiddenFromTodo: false,
      }
    }
    case "month": {
      const base = task.scheduledMonth
        ? (parseLocalDate(`${task.scheduledMonth}-01`) ?? refDate)
        : (parseLocalDate(task.scheduledDate) ?? refDate)
      const next = new Date(base.getFullYear(), base.getMonth() + 1, 1)
      return {
        ...cleared,
        scheduledMonth: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
        monthsPushed: (task.monthsPushed ?? 0) + 1,
        hiddenFromTodo: false,
      }
    }
  }
}
