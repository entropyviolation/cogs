/**
 * lib/habit-utils.ts — Shared habit completion helpers
 */
import { TaskType, type TaskCompletion, type WeeklyTask } from "./types"

/** TIME and COUNT are legacy aliases for GOAL. */
export function isGoalType(type: TaskType): boolean {
  return type === TaskType.GOAL || type === TaskType.TIME || type === TaskType.COUNT
}

export function normalizeTaskType(type: TaskType): TaskType {
  if (type === TaskType.TIME || type === TaskType.COUNT) return TaskType.GOAL
  return type
}

export function isHabitGoalMet(task: WeeklyTask, completion: TaskCompletion | undefined): boolean {
  if (!completion) return false
  switch (task.type) {
    case TaskType.BOOLEAN:
      return !!completion.completed
    case TaskType.TEXT:
      return !!completion.text?.trim()
    case TaskType.GOAL:
    case TaskType.TIME:
    case TaskType.COUNT:
      return task.goal ? (completion.value ?? 0) >= task.goal : false
    case TaskType.INCREMENTAL:
      if (!task.incrementalData || !completion.incrementalValues) return false
      return Object.keys(task.incrementalData.currentValues).every((key) => {
        const goal = task.incrementalData!.currentValues[key] ?? 0
        const val = completion.incrementalValues?.[key]
        return val !== undefined && val >= goal
      })
    default:
      return false
  }
}

export function completionWithGoalFlag(task: WeeklyTask, completion: TaskCompletion): TaskCompletion {
  const met = isHabitGoalMet(task, completion)
  return met ? { ...completion, completed: true } : { ...completion, completed: false }
}
