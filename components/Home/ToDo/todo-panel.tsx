"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, CheckCircle2, Eye, Calendar, Clock, AlertTriangle } from "lucide-react"
import { useTaskStore } from "@/lib/task-store"
import { formatDateKey } from "@/lib/date-utils"
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
} from "date-fns"
import type { TodoItem } from "@/lib/types"
import { Switch } from "@/components/ui/switch"
import { TaskDetailPopup } from "@/components/task-detail-popup"

export function TodoPanel() {
  const { tasks, updateTask } = useTaskStore()
  const [todoItems, setTodoItems] = useState<TodoItem[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [newTodo, setNewTodo] = useState({
    description: "",
    tier: "A" as const,
    scheduledDate: new Date(),
    quarterlyImportance: "I" as const,
  })
  const [showAllTasks, setShowAllTasks] = useState(false)

  // Initialize todo items from tasks
  useEffect(() => {
    const now = new Date()

    const items: TodoItem[] = tasks
      .filter((task) => !task.completed && (showAllTasks || task.scheduledDate))
      .map((task) => {
        const scheduledDate = task.scheduledDate ? new Date(task.scheduledDate) : new Date()

        // Calculate overdue based on the scheduled period
        let daysOverdue = 0
        let weeksOverdue = 0
        let monthsOverdue = 0

        if (task.scheduledDate && !task.completed) {
          const daysDiff = differenceInDays(now, scheduledDate)
          const weeksDiff = differenceInWeeks(now, scheduledDate)
          const monthsDiff = differenceInMonths(now, scheduledDate)

          // Only count as overdue if the scheduled date has passed
          daysOverdue = Math.max(0, daysDiff)
          weeksOverdue = Math.max(0, weeksDiff)
          monthsOverdue = Math.max(0, monthsDiff)
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
          completed: task.completed,
          taskId: task.id,
          quarterlyImportance: getQuarterlyImportance(task),
          estimatedDuration: task.estimatedDuration,
          rewardValue: task.rewardValue,
        }
      })

    setTodoItems(items)
  }, [tasks, showAllTasks])

  const getTierFromTask = (task: any): TodoItem["tier"] => {
    const score = task.urgency + task.importance
    if (score >= 9) return "A+"
    if (score >= 7) return "A"
    if (score >= 5) return "A/B"
    if (score >= 3) return "B"
    return "C"
  }

  const getQuarterlyImportance = (task: any): TodoItem["quarterlyImportance"] => {
    if (task.urgency >= 4) return task.importance >= 4 ? "Q+" : "I+"
    return task.importance >= 4 ? "Q" : "I"
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

  const getOverdueColor = (days: number) => {
    if (days === 0) return "text-gray-600"
    if (days <= 7) return "text-yellow-600"
    if (days <= 30) return "text-orange-600"
    return "text-red-600"
  }

  const handleAddTodo = () => {
    const now = new Date()
    let scheduledDate = newTodo.scheduledDate

    // Determine the current tab and set appropriate date
    const currentTab = document.querySelector('[data-state="active"]')?.getAttribute("value")

    if (currentTab === "day") {
      scheduledDate = now
    } else if (currentTab === "week") {
      scheduledDate = startOfWeek(now, { weekStartsOn: 1 })
    } else if (currentTab === "month") {
      scheduledDate = startOfMonth(now)
    }

    const todo: TodoItem = {
      id: Date.now().toString(),
      ...newTodo,
      scheduledDate,
      createdDate: new Date(),
      daysOverdue: 0,
      weeksOverdue: 0,
      monthsOverdue: 0,
      completed: false,
    }
    setTodoItems([...todoItems, todo])
    setNewTodo({
      description: "",
      tier: "A",
      scheduledDate: scheduledDate,
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

  const getFilteredTodos = (period: "day" | "week" | "month") => {
    const now = new Date()

    return todoItems
      .filter((item) => {
        if (item.completed) return false

        if (!showAllTasks && !item.scheduledDate) return false

        if (!item.scheduledDate) return showAllTasks

        const itemDate = new Date(item.scheduledDate)

        switch (period) {
          case "day":
            return formatDateKey(itemDate) === formatDateKey(now)
          case "week":
            const weekStart = startOfWeek(now, { weekStartsOn: 1 })
            const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
            return itemDate >= weekStart && itemDate <= weekEnd
          case "month":
            const monthStart = startOfMonth(now)
            const monthEnd = endOfMonth(now)
            return itemDate >= monthStart && itemDate <= monthEnd
          default:
            return true
        }
      })
      .sort((a, b) => {
        // Sort by tier first, then by overdue days
        const tierOrder = { "A+": 0, A: 1, "A/B": 2, B: 3, C: 4, D: 5 }
        const tierDiff = tierOrder[a.tier] - tierOrder[b.tier]
        if (tierDiff !== 0) return tierDiff
        return b.daysOverdue - a.daysOverdue
      })
  }

  const renderTodoTable = (todos: TodoItem[], period: "day" | "week" | "month") => {
    const overdueKey = period === "day" ? "daysOverdue" : period === "week" ? "weeksOverdue" : "monthsOverdue"
    const overdueLabel = period === "day" ? "Days" : period === "week" ? "Weeks" : "Months"

    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 grid grid-cols-12 gap-4 p-3 text-sm font-medium border-b">
          <div className="col-span-6">Task</div>
          <div className="col-span-2 text-center">Tier</div>
          <div className="col-span-2 text-center">{overdueLabel}</div>
          <div className="col-span-1 text-center">Q/I</div>
          <div className="col-span-1 text-center">Actions</div>
        </div>

        <div className="divide-y">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="grid grid-cols-12 gap-4 p-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => handleTaskClick(todo.taskId || todo.id)}
            >
              <div className="col-span-6">
                <div className="font-medium">{todo.description}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {todo.scheduledDate ? `Scheduled: ${format(todo.scheduledDate, "MMM d, yyyy")}` : "Not scheduled"}
                </div>
              </div>

              <div className="col-span-2 flex justify-center">
                <Select
                  value={todo.tier}
                  onValueChange={(value: TodoItem["tier"]) => updateTodoTier(todo.id, value)}
                  onClick={(e) => e.stopPropagation()}
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
                <span className={`font-medium ${getOverdueColor(todo[overdueKey])}`}>{todo[overdueKey]}</span>
              </div>

              <div className="col-span-1 flex justify-center">
                <Select
                  value={todo.quarterlyImportance}
                  onValueChange={(value: TodoItem["quarterlyImportance"]) => updateQuarterlyImportance(todo.id, value)}
                  onClick={(e) => e.stopPropagation()}
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

              <div className="col-span-1 flex justify-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleComplete(todo.id)
                  }}
                >
                  <CheckCircle2 className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTaskClick(todo.taskId || todo.id)
                  }}
                >
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {todos.length === 0 && (
          <div className="p-8 text-center text-gray-500">No tasks scheduled for this {period}</div>
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

      <Tabs defaultValue="day" className="w-full">
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
