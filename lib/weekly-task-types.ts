export enum TaskType {
  BOOLEAN = "BOOLEAN",
  TIME = "TIME",
  COUNT = "COUNT",
  TEXT = "TEXT",
  INCREMENTAL = "INCREMENTAL",
}

export interface Category {
  id: string
  name: string
  color: string
}

export interface Task {
  id: string
  name: string
  type: TaskType
  goal?: number
  unit?: string
  categoryId?: string
  incrementalData?: {
    currentValues: Record<string, number>
    weeklyIncrement: Record<string, number>
  }
}

export interface TaskCompletion {
  completed?: boolean
  value?: number
  goal?: number
  text?: string
  incrementalValues?: Record<string, number>
}

export interface WeeklyData {
  [dateString: string]: {
    [taskId: string]: TaskCompletion
  }
}
