"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Task, TaskCategory, CategoryFolder } from "@/lib/types"

interface TaskState {
  tasks: Task[]
  categories: TaskCategory[]
  folders: CategoryFolder[]
  priorityFormula: {
    urgencyWeight: number
    importanceWeight: number
    effortWeight: number
    cognitiveLoadWeight: number
  }
  addTask: (task: Task) => void
  updateTask: (task: Task) => void
  deleteTask: (id: string) => void
  updatePriorityFormula: (formula: TaskState["priorityFormula"]) => void
  addCategory: (category: TaskCategory) => void
  updateCategory: (category: TaskCategory) => void
  deleteCategory: (id: string) => void
  setTasks: (tasks: Task[]) => void
  setCategories: (categories: TaskCategory[]) => void
  clearAllData: () => void
  addFolder: (folder: CategoryFolder) => void
  updateFolder: (folder: CategoryFolder) => void
  deleteFolder: (id: string) => void
  addCategoryToFolder: (folderId: string, categoryId: string) => void
  removeCategoryFromFolder: (folderId: string, categoryId: string) => void
  setFolders: (folders: CategoryFolder[]) => void
}

// Initial categories with order
const initialCategories: TaskCategory[] = [
  {
    id: "example",
    name: "Example Category",
    color: "#EF4444",
    description: "An example category for demonstration purposes",
    createdAt: new Date(),
    order: 0,
  },
]

// Initial tasks data with updated structure
const initialTasks: Task[] = [
  {
    id: "1",
    description: "Example task",
    category: "inbox",
    createdAt: new Date(),
    estimatedDuration: 60,
    actualDuration: undefined,
    cognitiveLoad: 3,
    urgency: 4,
    importance: 5,
    dependencies: [],
    context: "@work",
    entropy: 0.3,
    rewardValue: 100,
    completed: false,
    categories: ["example"],
    allowPartialCompletion: false,
    minimumChunkSize: 15,
  },
]

// Create the store with persistence
export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: initialTasks,
      categories: initialCategories,
      folders: [],
      priorityFormula: {
        urgencyWeight: 1,
        importanceWeight: 1,
        effortWeight: 1,
        cognitiveLoadWeight: 1,
      },

      addTask: (task) =>
        set((state) => {
          // Only add if the task doesn't already exist
          if (!state.tasks.some((t) => t.id === task.id)) {
            // Ensure dates are proper Date objects
            const taskWithDates = {
              ...task,
              createdAt: task.createdAt instanceof Date ? task.createdAt : new Date(task.createdAt),
              deadline: task.deadline
                ? task.deadline instanceof Date
                  ? task.deadline
                  : new Date(task.deadline)
                : undefined,
              scheduledDate: task.scheduledDate
                ? task.scheduledDate instanceof Date
                  ? task.scheduledDate
                  : new Date(task.scheduledDate)
                : undefined,
            }
            return { tasks: [...state.tasks, taskWithDates] }
          }
          return state
        }),

      updateTask: (updatedTask) =>
        set((state) => {
          const index = state.tasks.findIndex((t) => t.id === updatedTask.id)
          if (index !== -1) {
            // Ensure dates are proper Date objects
            const taskWithDates = {
              ...updatedTask,
              createdAt:
                updatedTask.createdAt instanceof Date ? updatedTask.createdAt : new Date(updatedTask.createdAt),
              deadline: updatedTask.deadline
                ? updatedTask.deadline instanceof Date
                  ? updatedTask.deadline
                  : new Date(updatedTask.deadline)
                : undefined,
              scheduledDate: updatedTask.scheduledDate
                ? updatedTask.scheduledDate instanceof Date
                  ? updatedTask.scheduledDate
                  : new Date(updatedTask.scheduledDate)
                : undefined,
            }
            const newTasks = [...state.tasks]
            newTasks[index] = taskWithDates
            return { tasks: newTasks }
          }
          return state
        }),

      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        })),

      updatePriorityFormula: (formula) =>
        set(() => ({
          priorityFormula: formula,
        })),

      addCategory: (category) =>
        set((state) => ({
          categories: [...state.categories, category],
        })),

      updateCategory: (updatedCategory) =>
        set((state) => {
          const index = state.categories.findIndex((c) => c.id === updatedCategory.id)
          if (index !== -1) {
            const newCategories = [...state.categories]
            newCategories[index] = updatedCategory
            return { categories: newCategories }
          }
          return state
        }),

      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((category) => category.id !== id),
        })),

      setTasks: (tasks) => set(() => ({ tasks })),
      setCategories: (categories) => set(() => ({ categories })),
      clearAllData: () => set(() => ({ tasks: [], categories: [], folders: [] })),
      addFolder: (folder) => set((state) => ({ folders: [...state.folders, folder] })),
      updateFolder: (folder) => set((state) => {
        const index = state.folders.findIndex((f) => f.id === folder.id)
        if (index !== -1) {
          const newFolders = [...state.folders]
          newFolders[index] = folder
          return { folders: newFolders }
        }
        return state
      }),
      deleteFolder: (id) => set((state) => ({ folders: state.folders.filter((f) => f.id !== id) })),
      addCategoryToFolder: (folderId, categoryId) => set((state) => {
        const folders = state.folders.map((folder) =>
          folder.id === folderId && !folder.categoryIds.includes(categoryId)
            ? { ...folder, categoryIds: [...folder.categoryIds, categoryId] }
            : folder
        )
        return { folders }
      }),
      removeCategoryFromFolder: (folderId, categoryId) => set((state) => {
        const folders = state.folders.map((folder) =>
          folder.id === folderId
            ? { ...folder, categoryIds: folder.categoryIds.filter((id) => id !== categoryId) }
            : folder
        )
        return { folders }
      }),
      setFolders: (folders) => set(() => ({ folders })),
    }),
    {
      name: "cogs-task-storage", // unique name for localStorage key
      // Custom serialization to handle Date objects
      serialize: (state) => {
        return JSON.stringify(state, (key, value) => {
          if (value instanceof Date) {
            return { __type: "Date", value: value.toISOString() }
          }
          return value
        })
      },
      deserialize: (str) => {
        return JSON.parse(str, (key, value) => {
          if (value && typeof value === "object" && value.__type === "Date") {
            return new Date(value.value)
          }
          return value
        })
      },
      // Add version to handle schema changes
      version: 3,
      // Migrate function to handle old data
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Convert string dates to Date objects for old data
          if (persistedState.tasks) {
            persistedState.tasks = persistedState.tasks.map((task: any) => ({
              ...task,
              createdAt: typeof task.createdAt === "string" ? new Date(task.createdAt) : task.createdAt,
              deadline: task.deadline && typeof task.deadline === "string" ? new Date(task.deadline) : task.deadline,
              scheduledDate:
                task.scheduledDate && typeof task.scheduledDate === "string"
                  ? new Date(task.scheduledDate)
                  : task.scheduledDate,
              // Add new fields with defaults
              rewardValue: task.rewardValue || 50,
              allowPartialCompletion: task.allowPartialCompletion || false,
              minimumChunkSize: task.minimumChunkSize || 15,
            }))
          }
          if (persistedState.categories) {
            persistedState.categories = persistedState.categories.map((category: any, index: number) => ({
              ...category,
              createdAt: typeof category.createdAt === "string" ? new Date(category.createdAt) : category.createdAt,
              order: category.order !== undefined ? category.order : index,
            }))
          }
        }
        if (version < 3) {
          // Add folders if missing
          if (!persistedState.folders) {
            persistedState.folders = []
          }
        }
        return persistedState
      },
    },
  ),
)

// Create a selector hook to avoid the getSnapshot error
export const useTaskSelector = <T,>(selector: (state: TaskState) => T): T => {
  return selector(useTaskStore.getState())
}

// Helper function to calculate priority score
export const calculatePriorityScore = (task: Task, formula = useTaskStore.getState().priorityFormula) => {
  const numerator = task.urgency * formula.urgencyWeight + task.importance * formula.importanceWeight
  const denominator = task.estimatedDuration * formula.effortWeight + task.cognitiveLoad * formula.cognitiveLoadWeight
  return numerator / Math.max(denominator, 0.1) // Avoid division by zero
}
