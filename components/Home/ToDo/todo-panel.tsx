/**
 * components/Home/ToDo/todo-panel.tsx — To-Do panel
 *
 * The day/week/month to-do view. Groups items by tier (A+, A, A/B, B, C, D),
 * shows quarterly/immediate-importance flags (Q+/Q, I+/I) and computed overdue
 * indicators, and supports complete/edit/reschedule. Same underlying records as
 * the Scheduler's planned-tasks lists (spec §7.3).
 *
 * Spec: §8.4 (To-Do panel). Carry-over (§7.7) not yet automated.
 */
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, CheckCircle2, Eye, EyeOff, Calendar, Clock, AlertTriangle, ArrowRight } from "lucide-react"
import { useTaskStore } from "@/lib/task-store"
import { pushTaskOnePeriod } from "@/lib/item-utils"
import {
  getWeekString,
  parseWeekString,
  parseLocalDate,
  taskScheduledOnDay,
  taskScheduledInWeek,
  taskScheduledInMonth,
} from "@/lib/date-utils"
import {
  format,
  startOfWeek,
  startOfMonth,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
} from "date-fns"
import type { TodoItem, Task } from "@/lib/types"
import { Switch } from "@/components/ui/switch"
import { TaskDetailPopup } from "@/components/task-detail-popup"

export function TodoPanel() {
  const { tasks, updateTask, addTask } = useTaskStore()
  const [todoItems, setTodoItems] = useState<TodoItem[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [activeTodoTab, setActiveTodoTab] = useState<"day" | "week" | "month">("day")
  const [newTodo, setNewTodo] = useState({
    description: "",
    tier: "A" as const,
    scheduledDate: new Date(),
    quarterlyImportance: "I" as const,
  })
  const [showAllTasks, setShowAllTasks] = useState(false)
  const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({})

  // Show this many rows before collapsing the rest behind a "Show more" toggle.
  const COLLAPSE_THRESHOLD = 8

  // Initialize todo items from tasks
  useEffect(() => {
    const now = new Date()

    const isScheduled = (task: (typeof tasks)[number]) => {
      const monthKey = now.toISOString().slice(0, 7)
      const weekKey = getWeekString(now)
      return (
        taskScheduledOnDay(task, now) ||
        taskScheduledInWeek(task, weekKey) ||
        taskScheduledInMonth(task, monthKey) ||
        !!task.scheduledYear
      )
    }

    const items: TodoItem[] = tasks
      .filter((task) => !task.completed && !task.hiddenFromTodo && (showAllTasks || isScheduled(task)))
      .map((task) => {
        const scheduledDate = task.scheduledDate
          ? parseLocalDate(task.scheduledDate) ?? new Date(task.scheduledDate)
          : task.deadline
            ? parseLocalDate(task.deadline) ?? new Date(task.deadline)
            : null

        // Calculate overdue based on the scheduled date (only day-level
        // assignments have a meaningful overdue count).
        let daysOverdue = 0
        let weeksOverdue = 0
        let monthsOverdue = 0

        if (scheduledDate && !task.completed) {
          daysOverdue = Math.max(0, differenceInDays(now, scheduledDate))
          weeksOverdue = Math.max(0, differenceInWeeks(now, scheduledDate))
          monthsOverdue = Math.max(0, differenceInMonths(now, scheduledDate))
        }

        return {
          id: task.id,
          description: task.description,
          tier: getTierFromTask(task),
          scheduledDate,
          createdDate: task.createdAt,
          daysOverdue,
          weeksOverdue,
          monthsOverdue,
          daysPushed: task.daysPushed ?? 0,
          weeksPushed: task.weeksPushed ?? 0,
          monthsPushed: task.monthsPushed ?? 0,
          hiddenFromTodo: task.hiddenFromTodo,
          completed: task.completed,
          taskId: task.id,
          quarterlyImportance: getQuarterlyImportance(task),
          estimatedDuration: task.estimatedDuration,
          rewardValue: task.rewardValue,
          scheduledWeek: task.scheduledWeek,
          scheduledMonth: task.scheduledMonth,
          scheduledYear: task.scheduledYear,
        }
      })

    setTodoItems(items)
  }, [tasks, showAllTasks])

  const getTierFromTask = (task: any): TodoItem["tier"] => {
    const score = (task.urgency ?? 3) + (task.importance ?? 3)
    if (score >= 9) return "A+"
    if (score >= 7) return "A"
    if (score >= 5) return "A/B"
    if (score >= 3) return "B"
    return "C"
  }

  const getQuarterlyImportance = (task: any): TodoItem["quarterlyImportance"] => {
    const urgency = task.urgency ?? 3
    const importance = task.importance ?? 3
    if (urgency >= 4) return importance >= 4 ? "Q+" : "I+"
    return importance >= 4 ? "Q" : "I"
  }

  const getTierColor = (tier: TodoItem["tier"]) => {
    switch (tier) {
      case "A+":
        return "bg-red-100 text-red-800 border-red-200"
      case "A":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "A/B":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "B":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "C":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "D":
        return "bg-gray-50 text-gray-600 border-gray-100"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getScheduleLabel = (todo: TodoItem): string => {
    if (todo.scheduledDate) return `Scheduled: ${format(todo.scheduledDate, "MMM d, yyyy")}`
    if (todo.scheduledWeek) {
      const range = parseWeekString(todo.scheduledWeek)
      if (range) return `Scheduled: week of ${format(range.start, "MMM d, yyyy")}`
    }
    if (todo.scheduledMonth) {
      const parsed = new Date(`${todo.scheduledMonth}-01T00:00:00`)
      if (!isNaN(parsed.getTime())) return `Scheduled: ${format(parsed, "MMMM yyyy")}`
    }
    if (todo.scheduledYear) return `Scheduled: ${todo.scheduledYear}`
    return "Not scheduled"
  }

  const handleAddTodo = () => {
    if (!newTodo.description.trim()) return
    const now = new Date()

    let urgency = 3
    let importance = 3
    switch (newTodo.quarterlyImportance) {
      case "Q+":
        urgency = 5
        importance = 5
        break
      case "Q":
        urgency = 3
        importance = 5
        break
      case "I+":
        urgency = 5
        importance = 3
        break
      case "I":
        urgency = 3
        importance = 3
        break
    }

    const task: Task = {
      id: `todo-${Date.now()}`,
      description: newTodo.description.trim(),
      category: "clarified",
      createdAt: now,
      completed: false,
      categories: [],
      urgency,
      importance,
      estimatedDuration: 30,
      cognitiveLoad: 2,
      dependencies: [],
      context: "@general",
      entropy: 0.5,
      rewardValue: 5,
      allowPartialCompletion: false,
      minimumChunkSize: 15,
    }

    if (activeTodoTab === "day") {
      task.scheduledDate = now
    } else if (activeTodoTab === "week") {
      task.scheduledWeek = getWeekString(now)
    } else {
      task.scheduledMonth = now.toISOString().slice(0, 7)
    }

    addTask(task)
    setNewTodo({
      description: "",
      tier: "A",
      scheduledDate: now,
      quarterlyImportance: "I",
    })
    setShowAddDialog(false)
  }

  const handleComplete = (todoId: string) => {
    setTodoItems((items) => items.map((item) => (item.id === todoId ? { ...item, completed: true } : item)))

    // Also update the main task if it exists
    const todo = todoItems.find((item) => item.id === todoId)
    if (todo?.taskId) {
      const task = tasks.find((t) => t.id === todo.taskId)
      if (task) {
        updateTask({ ...task, completed: true })
      }
    }
  }

  const updateTodoTier = (todoId: string, tier: TodoItem["tier"]) => {
    setTodoItems((items) => items.map((item) => (item.id === todoId ? { ...item, tier } : item)))
  }

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId)
  }

  const handlePush = (todoId: string, period: "day" | "week" | "month") => {
    const task = tasks.find((t) => t.id === todoId)
    if (!task) return
    updateTask({ ...task, ...pushTaskOnePeriod(task, period) })
  }

  const handleHide = (todoId: string) => {
    const task = tasks.find((t) => t.id === todoId)
    if (!task) return
    updateTask({ ...task, hiddenFromTodo: true })
  }

  const getFilteredTodos = (period: "day" | "week" | "month") => {
    const now = new Date()
    const hasSchedule = (item: TodoItem) =>
      !!(item.scheduledDate || item.scheduledWeek || item.scheduledMonth || item.scheduledYear)

    return todoItems
      .filter((item) => {
        if (item.completed) return false

        // Tasks with no schedule only appear when "Show All Tasks" is on.
        if (!hasSchedule(item)) return showAllTasks

        switch (period) {
          case "day":
            return taskScheduledOnDay(item, now)
          case "week":
            return taskScheduledInWeek(item, getWeekString(now))
          case "month":
            return taskScheduledInMonth(item, now.toISOString().slice(0, 7))
          default:
            return true
        }
      })
      .sort((a, b) => {
        const tierOrder = { "A+": 0, A: 1, "A/B": 2, B: 3, C: 4, D: 5 }
        const tierDiff = tierOrder[a.tier] - tierOrder[b.tier]
        if (tierDiff !== 0) return tierDiff
        const pushedKey = period === "day" ? "daysPushed" : period === "week" ? "weeksPushed" : "monthsPushed"
        return b[pushedKey] - a[pushedKey]
      })
  }

  const renderTodoTable = (todos: TodoItem[], period: "day" | "week" | "month") => {
    const pushedKey = period === "day" ? "daysPushed" : period === "week" ? "weeksPushed" : "monthsPushed"
    const pushedLabel =
      period === "day" ? "Days (pushed)" : period === "week" ? "Weeks (pushed)" : "Months (pushed)"
    const pushLabel = period === "day" ? "next day" : period === "week" ? "next week" : "next month"

    const isExpanded = expandedPeriods[period]
    const visibleTodos = isExpanded ? todos : todos.slice(0, COLLAPSE_THRESHOLD)
    const hiddenCount = todos.length - visibleTodos.length

    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 grid grid-cols-12 gap-4 p-3 text-sm font-medium border-b">
          <div className="col-span-5">Task</div>
          <div className="col-span-2 text-center">Tier</div>
          <div className="col-span-2 text-center">{pushedLabel}</div>
          <div className="col-span-1 text-center">Q/I</div>
          <div className="col-span-2 text-center">Actions</div>
        </div>

        <div className="divide-y">
          {visibleTodos.map((todo) => (
            <div
              key={todo.id}
              className="grid grid-cols-12 gap-4 p-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => handleTaskClick(todo.taskId || todo.id)}
            >
              <div className="col-span-5">
                <div className="font-medium">{todo.description}</div>
                <div className="text-xs text-gray-500 mt-1">{getScheduleLabel(todo)}</div>
              </div>

              <div className="col-span-2 flex justify-center" onClick={(e) => e.stopPropagation()}>
                <Select
                  value={todo.tier}
                  onValueChange={(value) => updateTodoTier(todo.id, value as TodoItem["tier"])}
                >
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="A/B">A/B</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 text-center">
                <span className={`font-medium ${todo[pushedKey] > 0 ? "text-orange-600" : "text-gray-600"}`}>
                  {todo[pushedKey]}
                </span>
              </div>

              <div className="col-span-1 flex justify-center" onClick={(e) => e.stopPropagation()}>
                <Select
                  value={todo.quarterlyImportance}
                  onValueChange={(value) => updateQuarterlyImportance(todo.id, value as TodoItem["quarterlyImportance"])}
                >
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q+">Q+</SelectItem>
                    <SelectItem value="Q">Q</SelectItem>
                    <SelectItem value="I+">I+</SelectItem>
                    <SelectItem value="I">I</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  title="Mark complete"
                  onClick={() => handleComplete(todo.id)}
                >
                  <CheckCircle2 className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  title={`Push to ${pushLabel}`}
                  onClick={() => handlePush(todo.id, period)}
                >
                  <ArrowRight className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  title="View details"
                  onClick={() => handleTaskClick(todo.taskId || todo.id)}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  title="Hide from list"
                  onClick={() => handleHide(todo.id)}
                >
                  <EyeOff className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {todos.length === 0 && (
          <div className="p-8 text-center text-gray-500">No tasks scheduled for this {period}</div>
        )}

        {todos.length > COLLAPSE_THRESHOLD && (
          <button
            type="button"
            onClick={() => setExpandedPeriods((prev) => ({ ...prev, [period]: !prev[period] }))}
            className="w-full border-t p-2 text-sm font-medium text-primary hover:bg-gray-50 transition-colors"
          >
            {isExpanded ? "Show less" : `Show ${hiddenCount} more`}
          </button>
        )}
      </div>
    )
  }

  const updateQuarterlyImportance = (todoId: string, quarterlyImportance: TodoItem["quarterlyImportance"]) => {
    setTodoItems((items) => items.map((item) => (item.id === todoId ? { ...item, quarterlyImportance } : item)))

    // Also update the main task if it exists
    const todo = todoItems.find((item) => item.id === todoId)
    if (todo?.taskId) {
      const task = tasks.find((t) => t.id === todo.taskId)
      if (task) {
        // Update task urgency/importance based on Q/I rating
        let urgency = task.urgency
        let importance = task.importance

        switch (quarterlyImportance) {
          case "Q+":
            urgency = 5
            importance = 5
            break
          case "Q":
            urgency = 3
            importance = 5
            break
          case "I+":
            urgency = 5
            importance = 3
            break
          case "I":
            urgency = 3
            importance = 3
            break
        }

        updateTask({ ...task, urgency, importance })
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">To Do</h2>
          <p className="text-muted-foreground">Tier-based task management with overdue tracking</p>
        </div>

        <div className="flex items-center space-x-4">
          <Label htmlFor="show-all-tasks" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
            Show All Tasks
          </Label>
          <Switch id="show-all-tasks" checked={showAllTasks} onCheckedChange={(checked) => setShowAllTasks(checked)} />

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="todo-description">Description</Label>
                  <Input
                    id="todo-description"
                    value={newTodo.description}
                    onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                    placeholder="Task description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="todo-tier">Tier</Label>
                    <Select
                      value={newTodo.tier}
                      onValueChange={(value: any) => setNewTodo({ ...newTodo, tier: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+ (Critical)</SelectItem>
                        <SelectItem value="A">A (High)</SelectItem>
                        <SelectItem value="A/B">A/B (Medium-High)</SelectItem>
                        <SelectItem value="B">B (Medium)</SelectItem>
                        <SelectItem value="C">C (Low)</SelectItem>
                        <SelectItem value="D">D (Very Low)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="todo-qi">Q/I Rating</Label>
                    <Select
                      value={newTodo.quarterlyImportance}
                      onValueChange={(value: any) => setNewTodo({ ...newTodo, quarterlyImportance: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Q+">Q+ (Quarterly+)</SelectItem>
                        <SelectItem value="Q">Q (Quarterly)</SelectItem>
                        <SelectItem value="I+">I+ (Immediate+)</SelectItem>
                        <SelectItem value="I">I (Immediate)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="todo-date">Scheduled Date</Label>
                  <Input
                    id="todo-date"
                    type="date"
                    value={format(newTodo.scheduledDate, "yyyy-MM-dd")}
                    onChange={(e) => setNewTodo({ ...newTodo, scheduledDate: new Date(e.target.value) })}
                  />
                </div>

                <Button onClick={handleAddTodo} className="w-full">
                  Add Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="day" className="w-full" onValueChange={(v) => setActiveTodoTab(v as typeof activeTodoTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
        </TabsList>

        <TabsContent value="day" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>{renderTodoTable(getFilteredTodos("day"), "day")}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="week" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                This Week's Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>{renderTodoTable(getFilteredTodos("week"), "week")}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="month" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                This Month's Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>{renderTodoTable(getFilteredTodos("month"), "month")}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Task Detail Popup */}
      <TaskDetailPopup taskId={selectedTaskId} open={!!selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  )
}
