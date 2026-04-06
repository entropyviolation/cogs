export interface Task {
  id: string
  description: string
  category: "inbox" | "clarified" | "scheduled" | "completed"
  createdAt: Date
  estimatedDuration: number // minutes (renamed from effort)
  actualDuration?: number // minutes - set when task is completed
  cognitiveLoad: number // 1-3
  urgency: number // 1-5
  importance: number // 1-5
  dependencies: string[] // task IDs
  context: string // @home, @work, etc.
  entropy: number // 0-1
  rewardValue: number // unlimited value
  completed: boolean
  deadline?: Date // Optional deadline
  // Enhanced functionality
  categories: string[] // Multiple categories a task can belong to
  why?: string // Why this task needs to be done
  consequences?: string // What happens if not done
  scheduledDate?: Date // When task is scheduled
  scheduledTime?: string // Time of day if scheduled
  scheduledWeek?: string // Week range (e.g., "2024-05-19_2024-05-25")
  scheduledMonth?: string // Month (e.g., "2024-05")
  scheduledYear?: string // Year (e.g., "2024")
  notes?: string // Additional notes
  parentTaskId?: string // For subtasks
  subtasks?: { id: string; description: string; completed: boolean }[] // Array of subtask objects
  // New fields for partial completion
  allowPartialCompletion: boolean
  minimumChunkSize: number // minimum minutes for partial completion
  completedChunks?: { date: Date; duration: number; notes?: string }[] // track partial completions
  // New fields
  taskDescription?: string // Optional detailed description
  // Scheduling constraints
  schedulingConstraints?: {
    canOnlyBeDoneAt?: string[] // specific times like ["09:00", "14:00"]
    canOnlyBeDoneOnDays?: string[] // specific days like ["monday", "wednesday"]
    canOnlyBeDoneOnDates?: Date[] // specific dates
    mustBeDoneAfter?: Date
    mustBeDoneBefore?: Date
    timeOfDayPreference?: "morning" | "afternoon" | "evening" | "night"
    dayConstraints?: string // free-form text for day constraints
  }
  // Repeated task settings
  isRepeated?: boolean
  repeatSettings?: {
    type: "count" | "frequency"
    totalCount?: number // must be completed X times total
    frequency?: {
      times: number // X times per period
      period: "day" | "week" | "month"
    }
    completedCount?: number // how many times completed so far
  }
  operationId?: string
  isOperation?: boolean
  operationCategory?: string
}

// To-do tracking system
export interface TodoItem {
  id: string
  description: string
  tier: "A+" | "A" | "A/B" | "B" | "C" | "D"
  scheduledDate: Date
  createdDate: Date
  daysOverdue: number
  weeksOverdue: number
  monthsOverdue: number
  completed: boolean
  taskId?: string // Reference to main task if applicable
  quarterlyImportance?: "Q+" | "Q" | "I+" | "I" // Q = Quarterly important, I = Immediately important
  estimatedDuration?: number // minutes
  rewardValue?: number
}

// Calendar event for planning
export interface CalendarEvent {
  id: string
  title: string
  startTime: string // "09:00"
  endTime: string // "10:00"
  date: Date
  type: "event" | "task" | "hardcoded"
  taskId?: string
  color?: string
  isScheduled: boolean
  estimatedDuration?: number
  rewardValue?: number
}

// Day plan text
export interface DayPlan {
  date: string // YYYY-MM-DD
  planText: string
  lastUpdated: Date
}

// Monthly deadline/reminder
export interface MonthlyItem {
  id: string
  title: string
  date: Date
  type: "deadline" | "reminder"
  description?: string
  color?: string
}

// Weekly task tracker types
export enum TaskType {
  BOOLEAN = "BOOLEAN",
  TIME = "TIME",
  COUNT = "COUNT",
  TEXT = "TEXT",
  INCREMENTAL = "INCREMENTAL",
}

export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday"

export interface Category {
  id: string
  name: string
  color: string
}

export interface WeeklyTask {
  id: string
  name: string
  type: TaskType
  goal?: number
  unit?: string
  categoryId?: string
  rewardValue?: number // Points awarded on completion
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

// Updated to use date strings as keys instead of day names
export interface WeeklyData {
  [dateString: string]: {
    [taskId: string]: TaskCompletion
  }
}

// Custom graph types
export interface GraphNode {
  id: string
  task: Task
  position: {
    x: number
    y: number
  }
  isOnCriticalPath: boolean
  isSelected: boolean
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  isOnCriticalPath: boolean
}

// New type for custom categories
export interface TaskCategory {
  id: string
  name: string
  color: string
  description?: string
  createdAt: Date
  order?: number // for custom ordering
  operationId?: string
  isOperation?: boolean
  operationCategory?: string
}

// Scheduling types
export type SchedulePeriod = "always" | "year" | "month" | "week" | "day"

export interface ScheduleBox {
  id: string
  label: string
  period: SchedulePeriod
  date?: Date
  tasks: string[] // task IDs
}

// Task completion review
export interface TaskCompletionReview {
  taskId: string
  completedAt: Date
  actualDuration: number
  satisfaction: number // 1-10
  resistance: number // 1-10
  focus: number // 1-10
  distraction: number // 1-10
  notes?: string
}

// Hard-coded events for day planning
export interface DayEvent {
  id: string
  title: string
  startTime: string // "09:00"
  endTime: string // "10:00"
  date: Date
  type: "event" | "task"
  taskId?: string // if type is "task"
  color?: string
}

// New type for category folders
export interface CategoryFolder {
  id: string
  name: string
  createdAt: Date
  categoryIds: string[] // List of category IDs in this folder
}

// Operation types
export interface OperationLog {
  timestamp: Date
  content: string
}

export interface OperationReview {
  completedAt: Date
  satisfaction: number // 1-10
  lessonsLearned: string
  whatWorked: string
  whatDidnt: string
  nextTime: string
}

export interface OperationGoal {
  id: string
  phaseId: string
  title: string
  taskIds: string[]
  kpis?: string[]
  notes?: string
  isCompleted: boolean
}

export interface OperationPhase {
  id: string
  operationId: string
  name: string
  description?: string
  order: number
  goals: OperationGoal[]
  isCompleted: boolean
  deadline?: Date
}

export interface Operation {
  id: string
  title: string
  goals: string[]
  objectives: string[]
  timeline: { start: Date; end?: Date }
  status: "not started" | "active" | "paused" | "completed"
  plan: string
  notes?: string
  tasks: string[]
  phases?: OperationPhase[]
  resources?: string[]
  logs: OperationLog[]
  review?: OperationReview
  createdAt: Date
  updatedAt: Date
  deadline?: Date
  activityLog?: { date: string; duration: number }[]
  categoryId?: string // The category created for this operation
  lastWorkedOn?: Date // Track when operation was last worked on
  statusNotes?: string // Status notes for the operation
}
