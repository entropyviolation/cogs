/**
 * lib/folder-all-items.ts — Per-folder "All Items" list helpers
 *
 * Each folder gets an auto-managed All Items category. Items can live there
 * uncategorized until filed into a specific list in the folder.
 */
import type { Task, TaskCategory, CategoryFolder } from "@/lib/types"
import { isScheduledFolderId } from "@/lib/scheduled-lists-sync"

export const FOLDER_ALL_PREFIX = "__all-items__"

export function folderAllItemsCategoryId(folderId: string): string {
  return `${FOLDER_ALL_PREFIX}${folderId}`
}

export function isFolderAllItemsCategoryId(id: string): boolean {
  return id.startsWith(FOLDER_ALL_PREFIX)
}

type FolderMutators = {
  categories: TaskCategory[]
  folders: CategoryFolder[]
  addCategory: (c: TaskCategory) => void
  updateCategory: (c: TaskCategory) => void
  updateFolder: (f: CategoryFolder) => void
}

/** Ensure every folder has a backing All Items category registered on the folder. */
export function syncFolderAllItemsCategories(mut: FolderMutators): void {
  for (const folder of mut.folders) {
    if (isScheduledFolderId(folder.id)) continue
    const allId = folderAllItemsCategoryId(folder.id)
    const existing = mut.categories.find((c) => c.id === allId)
    if (!existing) {
      mut.addCategory({
        id: allId,
        name: "All Items",
        color: folder.color || "#64748b",
        description: "All items in this folder",
        createdAt: new Date(),
        scheduleable: folder.scheduleable !== false,
      })
    }
    if (!folder.categoryIds.includes(allId)) {
      mut.updateFolder({
        ...folder,
        categoryIds: [allId, ...folder.categoryIds.filter((id) => id !== allId)],
      })
    }
  }
}

export function folderListCategoryIds(folder: CategoryFolder): string[] {
  return folder.categoryIds.filter((id) => !isFolderAllItemsCategoryId(id))
}

export function taskInFolder(task: Task, folder: CategoryFolder): boolean {
  const allId = folderAllItemsCategoryId(folder.id)
  const listIds = folderListCategoryIds(folder)
  const cats = task.categories ?? []
  if (cats.includes(allId)) return true
  return listIds.some((id) => cats.includes(id))
}

export function isTaskUncategorizedInFolder(task: Task, folder: CategoryFolder): boolean {
  const allId = folderAllItemsCategoryId(folder.id)
  const listIds = folderListCategoryIds(folder)
  const cats = task.categories ?? []
  if (!cats.includes(allId)) return false
  return !listIds.some((id) => cats.includes(id))
}

export function getTasksForFolderAllView(tasks: Task[], folder: CategoryFolder): Task[] {
  const allId = folderAllItemsCategoryId(folder.id)
  const listIds = folderListCategoryIds(folder)
  return tasks.filter((t) => {
    if (t.completed) return false
    const cats = t.categories ?? []
    return cats.includes(allId) || listIds.some((id) => cats.includes(id))
  })
}

/** Place a task in the folder's All Items pool without assigning a specific list. */
export function assignTaskToFolderUncategorized(task: Task, folder: CategoryFolder): Task {
  const allId = folderAllItemsCategoryId(folder.id)
  const listIds = folderListCategoryIds(folder)
  const cats = (task.categories ?? []).filter(
    (id) => !listIds.includes(id) && !isFolderAllItemsCategoryId(id),
  )
  if (!cats.includes(allId)) cats.push(allId)
  return { ...task, categories: cats, category: "clarified" }
}

/** File a task into a specific list, removing uncategorized folder membership. */
export function assignTaskToFolderList(task: Task, folder: CategoryFolder, listId: string): Task {
  const allId = folderAllItemsCategoryId(folder.id)
  const cats = [...(task.categories ?? [])]
  if (!cats.includes(listId)) cats.push(listId)
  return { ...task, categories: cats.filter((id) => id !== allId), category: "clarified" }
}
