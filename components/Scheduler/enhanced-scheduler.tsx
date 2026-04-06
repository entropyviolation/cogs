"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { useTaskStore } from "@/lib/task-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Star,
  GripVertical,
  CalendarClock,
  X,
  ArrowUpDown,
  Home,
} from "lucide-react"
import type { Task, SchedulePeriod } from "@/lib/types"
import { safeToDate, formatWeekRange, getWeekString, parseWeekString } from "@/lib/date-utils"
import { TaskDetailPopup } from "@/components/task-detail-popup"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Filter, ChevronDown } from "lucide-react"

export function EnhancedScheduler() {
  const allTasks = useTaskStore((state) => state.tasks)
  const updateTask = useTaskStore((state) => state.updateTask)
  const categories = useTaskStore((state) => state.categories)

  const [activeTab, setActiveTab] = useState<SchedulePeriod>("always")
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // Filtering and sorting
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"category" | "duration" | "importance" | "deadline" | "reward">("importance")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Get available tasks (no unmet dependencies, not completed, not scheduled)
  const getAvailableTasks = useCallback(() => {
    let tasks = allTasks.filter((task) => {
      if (task.completed) return false

      // Check if all dependencies are completed
      const hasUnmetDependencies = task.dependencies.some((depId) => {
        const depTask = allTasks.find((t) => t.id === depId)
        return depTask && !depTask.completed
      })

      if (hasUnmetDependencies) return false

      // For "always" tab, show unscheduled tasks
      if (activeTab === "always") {
        return !task.scheduledYear && !task.scheduledMonth && !task.scheduledWeek && !task.scheduledDate
      }

      return true
    })

    // Apply category filter
    if (selectedCategories.length > 0) {
      tasks = tasks.filter((task) => task.categories?.some((catId) => selectedCategories.includes(catId)))
    }

    // Apply sorting
    tasks.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case "category":
          aValue = a.categories?.[0] ? categories.find((c) => c.id === a.categories[0])?.name || "" : ""
          bValue = b.categories?.[0] ? categories.find((c) => c.id === b.categories[0])?.name || "" : ""
          break
        case "duration":
          aValue = a.estimatedDuration
          bValue = b.estimatedDuration
          break
        case "importance":
          aValue = a.importance
          bValue = b.importance
          break
        case "deadline":
          aValue = a.deadline ? new Date(a.deadline).getTime() : 0
          bValue = b.deadline ? new Date(b.deadline).getTime() : 0
          break
        case "reward":
          aValue = a.rewardValue
          bValue = b.rewardValue
          break
        default:
          aValue = a.importance
          bValue = b.importance
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return tasks
  }, [allTasks, activeTab, selectedCategories, sortBy, sortOrder, categories])

  // Get tasks for specific scheduling periods
  const getTasksForPeriod = useCallback(
    (period: SchedulePeriod, value?: string) => {
      const availableTasks = allTasks.filter((task) => !task.completed)

      switch (period) {
        case "year":
          return availableTasks.filter((task) => task.scheduledYear === value)
        case "month":
          return availableTasks.filter((task) => task.scheduledMonth === value)
        case "week":
          return availableTasks.filter((task) => {
            // Handle both direct week assignments and month-to-week assignments
            if (task.scheduledWeek === value) return true

            // Check if task was assigned to a month that contains this week
            if (task.scheduledMonth && value) {
              const weekRange = parseWeekString(value)
              if (weekRange) {
                const monthStart = new Date(task.scheduledMonth + "-01")
                const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
                return weekRange.start >= monthStart && weekRange.start <= monthEnd
              }
            }
            return false
          })
        case "day":
          return availableTasks.filter((task) => {
            const taskDate = safeToDate(task.scheduledDate)
            const compareDate = safeToDate(value || currentDate)
            return taskDate && compareDate && taskDate.toDateString() === compareDate.toDateString()
          })
        default:
          return availableTasks.filter(
            (task) => !task.scheduledYear && !task.scheduledMonth && !task.scheduledWeek && !task.scheduledDate,
          )
      }
    },
    [allTasks, currentDate],
  )

  // Schedule tasks to a specific period
  const scheduleTasksToPeriod = useCallback(
    (taskIds: string[], period: SchedulePeriod, value: string) => {
      taskIds.forEach((taskId) => {
        const task = allTasks.find((t) => t.id === taskId)
        if (task) {
          const updates: Partial<Task> = {}

          // Clear other scheduling fields
          updates.scheduledYear = undefined
          updates.scheduledMonth = undefined
          updates.scheduledWeek = undefined
          updates.scheduledDate = undefined

          // Set the appropriate field
          switch (period) {
            case "year":
              updates.scheduledYear = value
              break
            case "month":
              updates.scheduledMonth = value
              break
            case "week":
              updates.scheduledWeek = value
              break
            case "day":
              updates.scheduledDate = new Date(value)
              break
          }

          updateTask({ ...task, ...updates })
        }
      })

      setSelectedTasks(new Set())
    },
    [allTasks, updateTask],
  )

  // Unschedule task
  const unscheduleTask = useCallback(
    (taskId: string) => {
      const task = allTasks.find((t) => t.id === taskId)
      if (task) {
        updateTask({
          ...task,
          scheduledYear: undefined,
          scheduledMonth: undefined,
          scheduledWeek: undefined,
          scheduledDate: undefined,
          scheduledTime: undefined,
        })
      }
    },
    [allTasks, updateTask],
  )

  // Handle task selection
  const toggleTaskSelection = useCallback(
    (taskId: string) => {
      const newSelected = new Set(selectedTasks)
      if (newSelected.has(taskId)) {
        newSelected.delete(taskId)
      } else {
        newSelected.add(taskId)
      }
      setSelectedTasks(newSelected)
    },
    [selectedTasks],
  )

  // Handle drag and drop
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, period: SchedulePeriod, value: string) => {
      e.preventDefault()
      const taskId = e.dataTransfer.getData("taskId")
      if (taskId) {
        scheduleTasksToPeriod([taskId], period, value)
      }
    },
    [scheduleTasksToPeriod],
  )

  // Get category color
  const getCategoryColor = useCallback(
    (categoryIds: string[]) => {
      if (!categoryIds || categoryIds.length === 0) return "#6B7280"
      const category = categories.find((c) => categoryIds.includes(c.id))
      return category?.color || "#6B7280"
    },
    [categories],
  )

  // Navigation functions
  const navigateToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const navigatePrevious = useCallback(() => {
    const newDate = new Date(currentDate)
    switch (activeTab) {
      case "year":
        newDate.setFullYear(newDate.getFullYear() - 1)
        break
      case "month":
        newDate.setMonth(newDate.getMonth() - 1)
        break
      case "week":
        newDate.setDate(newDate.getDate() - 7)
        break
      case "day":
        newDate.setDate(newDate.getDate() - 1)
        break
    }
    setCurrentDate(newDate)
  }, [currentDate, activeTab])

  const navigateNext = useCallback(() => {
    const newDate = new Date(currentDate)
    switch (activeTab) {
      case "year":
        newDate.setFullYear(newDate.getFullYear() + 1)
        break
      case "month":
        newDate.setMonth(newDate.getMonth() + 1)
        break
      case "week":
        newDate.setDate(newDate.getDate() + 7)
        break
      case "day":
        newDate.setDate(newDate.getDate() + 1)
        break
    }
    setCurrentDate(newDate)
  }, [currentDate, activeTab])

  // Generate time periods
  const getCurrentYear = () => currentDate.getFullYear().toString()
  const getCurrentMonth = () => currentDate.toISOString().slice(0, 7)
  const getCurrentWeek = () => getWeekString(currentDate)

  const getNavigationLabel = () => {
    switch (activeTab) {
      case "year":
        return currentDate.getFullYear().toString()
      case "month":
        return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      case "week":
        const weekRange = parseWeekString(getCurrentWeek())
        if (weekRange) {
          return formatWeekRange(weekRange.start)
        }
        return "Week"
      case "day":
        return currentDate.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" })
      default:
        return ""
    }
  }

  const getMonths = () => {
    const months = []
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), i, 1)
      months.push({
        value: date.toISOString().slice(0, 7),
        label: date.toLocaleDateString("en-US", { month: "long" }),
      })
    }
    return months
  }

  const getWeeksInMonth = (monthValue: string) => {
    const [year, month] = monthValue.split("-").map(Number)
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const weeks = []

    const currentWeekStart = new Date(firstDay)
    currentWeekStart.setDate(firstDay.getDate() - firstDay.getDay())

    while (currentWeekStart <= lastDay) {
      const weekEnd = new Date(currentWeekStart)
      weekEnd.setDate(currentWeekStart.getDate() + 6)

      const weekString = `${currentWeekStart.toISOString().slice(0, 10)}_${weekEnd.toISOString().slice(0, 10)}`
      weeks.push({
        value: weekString,
        label: formatWeekRange(currentWeekStart),
      })

      currentWeekStart.setDate(currentWeekStart.getDate() + 7)
    }

    return weeks
  }

  const getDaysInWeek = (weekValue: string) => {
    const weekRange = parseWeekString(weekValue)
    if (!weekRange) return []

    const days = []
    const currentDay = new Date(weekRange.start)

    for (let i = 0; i < 7; i++) {
      days.push({
        value: currentDay.toISOString().slice(0, 10),
        label: currentDay.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
      })
      currentDay.setDate(currentDay.getDate() + 1)
    }

    return days
  }

  // Task component
  const TaskItem = ({
    task,
    showCheckbox = false,
    showUnschedule = false,
    onClick,
  }: {
    task: Task
    showCheckbox?: boolean
    showUnschedule?: boolean
    onClick?: () => void
  }) => (
    <div
      className={`p-3 border rounded-lg transition-all duration-200 group relative task-item ${
        selectedTasks.has(task.id)
          ? "border-primary bg-primary/5 shadow-sm"
          : "hover:bg-muted/50 hover:border-muted-foreground/20"
      }`}
      draggable
      onDragStart={(e) => handleDragStart(e, task.id)}
      style={{
        borderLeftColor: getCategoryColor(task.categories || []),
        borderLeftWidth: "4px",
      }}
    >
      {showUnschedule && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity focus-ring"
          onClick={(e) => {
            e.stopPropagation()
            unscheduleTask(task.id)
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      <div className="flex items-center gap-3">
        {showCheckbox && (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedTasks.has(task.id)}
              onCheckedChange={() => toggleTaskSelection(task.id)}
              className="focus-ring"
            />
          </div>
        )}
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <p className="text-sm font-medium truncate">{task.description}</p>
          <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.estimatedDuration}m
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {task.urgency}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {task.importance}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Enhanced Scheduler</h2>

        {/* Navigation - only show for non-always tabs */}
        {activeTab !== "always" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={navigatePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[120px] text-center">{getNavigationLabel()}</span>
            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={navigateToToday}>
              <Home className="h-4 w-4 mr-1" />
              Today
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SchedulePeriod)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="always">Always</TabsTrigger>
          <TabsTrigger value="year">Year</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="day">Day</TabsTrigger>
        </TabsList>

        <TabsContent value="always" className="space-y-4">
          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Available Tasks
                    {selectedTasks.size > 0 && <Badge variant="secondary">{selectedTasks.size} selected</Badge>}
                  </CardTitle>

                  {/* Filtering and Sorting Controls */}
                  <div className="space-y-3">
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between focus-ring">
                          <span className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Filters & Sort
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 pt-3">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Filter by Categories</Label>
                          <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="all-categories"
                                checked={selectedCategories.length === 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedCategories([])
                                  }
                                }}
                              />
                              <Label htmlFor="all-categories" className="text-sm">
                                All categories
                              </Label>
                            </div>
                            {categories.map((category) => (
                              <div key={category.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`category-${category.id}`}
                                  checked={selectedCategories.includes(category.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedCategories([...selectedCategories, category.id])
                                    } else {
                                      setSelectedCategories(selectedCategories.filter((id) => id !== category.id))
                                    }
                                  }}
                                />
                                <Label htmlFor={`category-${category.id}`} className="text-sm flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                                  {category.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-xs font-medium">Sort by</Label>
                            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                              <SelectTrigger className="h-8 focus-ring">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="importance">Importance</SelectItem>
                                <SelectItem value="duration">Duration</SelectItem>
                                <SelectItem value="deadline">Deadline</SelectItem>
                                <SelectItem value="reward">Reward</SelectItem>
                                <SelectItem value="category">Category</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="pt-4">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 focus-ring"
                              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                            >
                              <ArrowUpDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {getAvailableTasks().map((task) => (
                    <TaskItem key={task.id} task={task} showCheckbox onClick={() => setSelectedTaskId(task.id)} />
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="col-span-3">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "This Year", period: "year" as SchedulePeriod, value: getCurrentYear() },
                  { label: "This Month", period: "month" as SchedulePeriod, value: getCurrentMonth() },
                  {
                    label: "Next Month",
                    period: "month" as SchedulePeriod,
                    value: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).toISOString().slice(0, 7),
                  },
                  { label: "This Week", period: "week" as SchedulePeriod, value: getCurrentWeek() },
                  {
                    label: "Next Week",
                    period: "week" as SchedulePeriod,
                    value: (() => {
                      const nextWeek = new Date(currentDate)
                      nextWeek.setDate(currentDate.getDate() + 7)
                      return getWeekString(nextWeek)
                    })(),
                  },
                  { label: "Today", period: "day" as SchedulePeriod, value: currentDate.toISOString().slice(0, 10) },
                  {
                    label: "Tomorrow",
                    period: "day" as SchedulePeriod,
                    value: (() => {
                      const tomorrow = new Date(currentDate)
                      tomorrow.setDate(currentDate.getDate() + 1)
                      return tomorrow.toISOString().slice(0, 10)
                    })(),
                  },
                ].map((box) => (
                  <Card
                    key={box.label}
                    className="cursor-pointer hover:bg-muted/50"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, box.period, box.value)}
                    onClick={() => {
                      if (selectedTasks.size > 0) {
                        scheduleTasksToPeriod(Array.from(selectedTasks), box.period, box.value)
                      }
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{box.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {getTasksForPeriod(box.period, box.value)
                        .slice(0, 3)
                        .map((task) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            showUnschedule
                            onClick={() => setSelectedTaskId(task.id)}
                          />
                        ))}
                      {getTasksForPeriod(box.period, box.value).length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{getTasksForPeriod(box.period, box.value).length - 3} more
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="year" className="space-y-4">
          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Year {getCurrentYear()}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {getTasksForPeriod("year", getCurrentYear()).map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      showCheckbox
                      showUnschedule
                      onClick={() => setSelectedTaskId(task.id)}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="col-span-3">
              <div className="grid grid-cols-3 gap-4">
                {getMonths().map((month) => (
                  <Card
                    key={month.value}
                    className="cursor-pointer hover:bg-muted/50"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, "month", month.value)}
                    onClick={() => {
                      if (selectedTasks.size > 0) {
                        scheduleTasksToPeriod(Array.from(selectedTasks), "month", month.value)
                      }
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{month.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {getTasksForPeriod("month", month.value)
                        .slice(0, 2)
                        .map((task) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            showUnschedule
                            onClick={() => setSelectedTaskId(task.id)}
                          />
                        ))}
                      {getTasksForPeriod("month", month.value).length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{getTasksForPeriod("month", month.value).length - 2} more
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="month" className="space-y-4">
          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Month Tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {getTasksForPeriod("month", getCurrentMonth()).map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      showCheckbox
                      showUnschedule
                      onClick={() => setSelectedTaskId(task.id)}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="col-span-3">
              <div className="grid grid-cols-2 gap-4">
                {getWeeksInMonth(getCurrentMonth()).map((week) => (
                  <Card
                    key={week.value}
                    className="cursor-pointer hover:bg-muted/50"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, "week", week.value)}
                    onClick={() => {
                      if (selectedTasks.size > 0) {
                        scheduleTasksToPeriod(Array.from(selectedTasks), "week", week.value)
                      }
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Week {week.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {getTasksForPeriod("week", week.value)
                        .slice(0, 2)
                        .map((task) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            showUnschedule
                            onClick={() => setSelectedTaskId(task.id)}
                          />
                        ))}
                      {getTasksForPeriod("week", week.value).length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{getTasksForPeriod("week", week.value).length - 2} more
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="week" className="space-y-4">
          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Week Tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {getTasksForPeriod("week", getCurrentWeek()).map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      showCheckbox
                      showUnschedule
                      onClick={() => setSelectedTaskId(task.id)}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="col-span-3">
              <div className="grid grid-cols-2 gap-4">
                {getDaysInWeek(getCurrentWeek()).map((day) => (
                  <Card
                    key={day.value}
                    className="cursor-pointer hover:bg-muted/50"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, "day", day.value)}
                    onClick={() => {
                      if (selectedTasks.size > 0) {
                        scheduleTasksToPeriod(Array.from(selectedTasks), "day", day.value)
                      }
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{day.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {getTasksForPeriod("day", day.value)
                        .slice(0, 3)
                        .map((task) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            showUnschedule
                            onClick={() => setSelectedTaskId(task.id)}
                          />
                        ))}
                      {getTasksForPeriod("day", day.value).length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{getTasksForPeriod("day", day.value).length - 3} more
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="day" className="space-y-4">
          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {getTasksForPeriod("day", currentDate.toISOString().slice(0, 10)).map((task) => (
                    <TaskItem key={task.id} task={task} showUnschedule onClick={() => setSelectedTaskId(task.id)} />
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5" />
                    Daily Agenda - {currentDate.toLocaleDateString()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, "0") + ":00"
                      const scheduledTasks = allTasks.filter(
                        (task) =>
                          task.scheduledDate &&
                          new Date(task.scheduledDate).toDateString() === currentDate.toDateString() &&
                          task.scheduledTime === hour,
                      )

                      return (
                        <div key={hour} className="flex border-b border-muted last:border-b-0">
                          <div className="w-16 py-2 text-xs font-medium text-muted-foreground border-r border-muted">
                            {hour}
                          </div>
                          <div
                            className="flex-1 min-h-[40px] p-2 hover:bg-muted/50 transition-colors"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault()
                              const taskId = e.dataTransfer.getData("taskId")
                              if (taskId) {
                                const task = allTasks.find((t) => t.id === taskId)
                                if (task) {
                                  updateTask({
                                    ...task,
                                    scheduledDate: currentDate,
                                    scheduledTime: hour,
                                    scheduledWeek: undefined,
                                    scheduledMonth: undefined,
                                    scheduledYear: undefined,
                                  })
                                }
                              }
                            }}
                          >
                            {scheduledTasks.map((task) => (
                              <div
                                key={task.id}
                                className="bg-primary/10 border border-primary/20 rounded px-2 py-1 mb-1 text-xs cursor-pointer hover:bg-primary/20 transition-colors group relative"
                                onClick={() => setSelectedTaskId(task.id)}
                                draggable
                                onDragStart={(e) => handleDragStart(e, task.id)}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-0 right-0 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    updateTask({
                                      ...task,
                                      scheduledTime: undefined,
                                    })
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                                <div className="font-medium truncate pr-4">{task.description}</div>
                                <div className="text-muted-foreground">{task.estimatedDuration}m</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Detail Popup */}
      <TaskDetailPopup taskId={selectedTaskId} open={!!selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  )
}
