"use client"

import { useState, useEffect } from "react"
import { TaskGrid } from "@/components/Home/Habits/task-grid"
import { TaskFormDialog } from "@/components/Home/Habits/daily-task-form-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PlusCircle, Settings } from "lucide-react"
import { type WeeklyTask as Task, TaskType, type TaskCompletion, type WeeklyData, type Category } from "@/lib/types"
import { calculateTaskPercentage, calculateDayPercentageAV } from "@/lib/calculations"
import { getWeekStartDate, getWeekDates, formatDateKey } from "@/lib/date-utils"
import { WeekNavigation } from "@/components/Home/Habits/week-navigation"
import { SettingsDialog } from "@/components/Home/Habits/settings-dialog"
import { usePointsStore } from "@/lib/points-store"

const getDefaultTasks = (): Task[] => {
  return [
    { id: "task-1", name: "Work for at least 1 hour", type: TaskType.TIME, goal: 60, unit: "minutes", rewardValue: 50 },
    {
      id: "task-2",
      name: "Exercise for at least 30 minutes",
      type: TaskType.TIME,
      goal: 30,
      unit: "minutes",
      rewardValue: 30,
    },
    {
      id: "task-3",
      name: "Clean for at least 15 minutes",
      type: TaskType.TIME,
      goal: 15,
      unit: "minutes",
      rewardValue: 15,
    },
    { id: "task-4", name: "Drink water", type: TaskType.BOOLEAN, rewardValue: 10 },
    { id: "task-5", name: "Practice language", type: TaskType.BOOLEAN, rewardValue: 20 },
    { id: "task-6", name: "Practice an instrument", type: TaskType.BOOLEAN, rewardValue: 25 },
    {
      id: "task-7",
      name: "Chess score + 10, puzzle score + 10",
      type: TaskType.INCREMENTAL,
      rewardValue: 40,
      incrementalData: {
        currentValues: { match: 265, puzzle: 850 },
        weeklyIncrement: { match: 10, puzzle: 10 },
      },
    },
    {
      id: "task-8",
      name: "Write at least 3 pages per day (⅓)",
      type: TaskType.COUNT,
      goal: 3,
      unit: "pages",
      rewardValue: 30,
    },
    {
      id: "task-9",
      name: "Read at least 10 pages per day (+5/week)",
      type: TaskType.COUNT,
      goal: 10,
      unit: "pages",
      rewardValue: 20,
    },
    { id: "task-10", name: "Plan the day", type: TaskType.BOOLEAN, rewardValue: 15 },
    { id: "task-11", name: "Stretch", type: TaskType.BOOLEAN, rewardValue: 10 },
    {
      id: "task-12",
      name: "Meditate for 4 minutes (+1 minute per week)",
      type: TaskType.INCREMENTAL,
      rewardValue: 25,
      incrementalData: {
        currentValues: { meditation: 4 },
        weeklyIncrement: { meditation: 1 },
      },
    },
    { id: "task-13", name: "Act of kindness", type: TaskType.BOOLEAN, rewardValue: 20 },
    { id: "task-14", name: "Do something artistic/creative", type: TaskType.TEXT, rewardValue: 30 },
  ]
}

const getDefaultCategories = (): Category[] => {
  return [
    { id: "category-1", name: "Health", color: "#8cd4a5" },
    { id: "category-2", name: "Work", color: "#8b7ecc" },
    { id: "category-3", name: "Learning", color: "#b89fbf" },
    { id: "category-4", name: "Personal", color: "#9fc2a5" },
  ]
}

export function WeeklyTaskTracker() {
  const [tasks, setTasks] = useState<Task[]>(getDefaultTasks())
  const [categories, setCategories] = useState<Category[]>(getDefaultCategories())
  const [weeklyData, setWeeklyData] = useState<WeeklyData>({})
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isClient, setIsClient] = useState(false)

  const { addPoints } = usePointsStore()

  // Initialize with current week
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStartDate(new Date()))
  const [weekDates, setWeekDates] = useState<Date[]>(getWeekDates(getWeekStartDate(new Date())))

  // Set isClient to true on mount
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load data from localStorage on component mount
  useEffect(() => {
    if (!isClient) return

    const savedTasks = localStorage.getItem("weekly-habits-tasks")
    const savedWeeklyData = localStorage.getItem("weekly-habits-weeklyData")
    const savedCategories = localStorage.getItem("weekly-habits-categories")

    if (savedTasks && savedTasks !== "[]") {
      setTasks(JSON.parse(savedTasks))
    }

    if (savedWeeklyData && savedWeeklyData !== "{}") {
      setWeeklyData(JSON.parse(savedWeeklyData))
    }

    if (savedCategories && savedCategories !== "[]") {
      setCategories(JSON.parse(savedCategories))
    }
  }, [isClient])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (!isClient) return
    if (tasks.length > 0) {
      localStorage.setItem("weekly-habits-tasks", JSON.stringify(tasks))
    }
    if (Object.keys(weeklyData).length > 0) {
      localStorage.setItem("weekly-habits-weeklyData", JSON.stringify(weeklyData))
    }
    if (categories.length > 0) {
      localStorage.setItem("weekly-habits-categories", JSON.stringify(categories))
    }
  }, [tasks, weeklyData, categories, isClient])

  // Update week dates when current week start changes
  useEffect(() => {
    setWeekDates(getWeekDates(currentWeekStart))
  }, [currentWeekStart])

  const handleAddTask = (task: Task) => {
    if (editingTask) {
      // Update existing task
      setTasks(tasks.map((t) => (t.id === task.id ? task : t)))
      setEditingTask(null)
    } else {
      // Add new task with a stable ID
      const newTask = {
        ...task,
        id: `task-${Date.now()}`,
      }
      setTasks([...tasks, newTask])
    }
    setShowTaskForm(false)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setShowTaskForm(true)
  }

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId))

    // Remove task data from weeklyData
    const updatedWeeklyData = { ...weeklyData }
    Object.keys(updatedWeeklyData).forEach((dateKey) => {
      if (updatedWeeklyData[dateKey]?.[taskId]) {
        delete updatedWeeklyData[dateKey][taskId]
      }
    })
    setWeeklyData(updatedWeeklyData)
  }

  const handleUpdateTaskCompletion = (taskId: string, date: Date, completion: TaskCompletion) => {
    const dateKey = formatDateKey(date)
    const updatedWeeklyData = { ...weeklyData }

    if (!updatedWeeklyData[dateKey]) {
      updatedWeeklyData[dateKey] = {}
    }

    const previousCompletion = updatedWeeklyData[dateKey][taskId]
    updatedWeeklyData[dateKey][taskId] = completion
    setWeeklyData(updatedWeeklyData)

    // Award points if task was just completed
    const task = tasks.find((t) => t.id === taskId)
    if (task && completion.completed && !previousCompletion?.completed) {
      addPoints(taskId, task.rewardValue || 0, task.name, date)
    }
  }

  const calculateOverallPercentage = () => {
    // Calculate the average of all task percentages
    if (tasks.length === 0) return 0

    const taskPercentages = tasks.map((task) => calculateTaskPercentage(task.id, tasks, weeklyData, weekDates))
    const sum = taskPercentages.reduce((acc, percentage) => acc + percentage, 0)
    return sum / taskPercentages.length
  }

  const navigateToPreviousWeek = () => {
    const newStartDate = new Date(currentWeekStart)
    newStartDate.setDate(newStartDate.getDate() - 7)
    setCurrentWeekStart(newStartDate)
  }

  const navigateToNextWeek = () => {
    const newStartDate = new Date(currentWeekStart)
    newStartDate.setDate(newStartDate.getDate() + 7)
    setCurrentWeekStart(newStartDate)
  }

  const navigateToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStartDate(new Date()))
  }

  // Get the end date of the current week (Sunday)
  const weekEndDate = new Date(currentWeekStart)
  weekEndDate.setDate(weekEndDate.getDate() + 6)

  // Calculate stats for the current week
  const overallPercentage = calculateOverallPercentage()
  const completedTasksCount = tasks.filter(
    (task) => calculateTaskPercentage(task.id, tasks, weeklyData, weekDates) >= 100,
  ).length
  const tasksInProgressCount = tasks.filter((task) => {
    const percentage = calculateTaskPercentage(task.id, tasks, weeklyData, weekDates)
    return percentage > 0 && percentage < 100
  }).length

  const handleImportData = (importedData: { tasks: Task[]; weeklyData: WeeklyData; categories?: Category[] }) => {
    setTasks(importedData.tasks)
    setWeeklyData(importedData.weeklyData)
    if (importedData.categories) {
      setCategories(importedData.categories)
    }
  }

  const handleResetData = () => {
    setTasks([])
    setWeeklyData({})
    setCategories([])
    localStorage.removeItem("weekly-habits-tasks")
    localStorage.removeItem("weekly-habits-weeklyData")
    localStorage.removeItem("weekly-habits-categories")
  }

  return (
    <div className="space-y-8">
      

      {/* Week Navigation and Action Buttons */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <WeekNavigation
          currentWeekStart={currentWeekStart}
          weekEndDate={weekEndDate}
          onPreviousWeek={navigateToPreviousWeek}
          onNextWeek={navigateToNextWeek}
          onCurrentWeek={navigateToCurrentWeek}
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 rounded-full h-9 px-4 border-gray-200 dark:border-gray-700"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Task Grid */}
      <Card className="overflow-hidden border-none shadow-lg rounded-xl card-glass">
        <CardContent className="p-0">
          <TaskGrid
            tasks={tasks}
            weeklyData={weeklyData}
            weekDates={weekDates}
            categories={categories}
            onUpdateTaskCompletion={handleUpdateTaskCompletion}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            calculateTaskPercentage={(taskId) => calculateTaskPercentage(taskId, tasks, weeklyData, weekDates)}
            calculateDayPercentage={(date, index) =>
              calculateDayPercentageAV(formatDateKey(date), tasks, weeklyData, index)
            }
            selectedCategoryId={undefined} // Remove category filtering
          />
        </CardContent>
      </Card>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8">
        <Button
          onClick={() => {
            setEditingTask(null)
            setShowTaskForm(true)
          }}
          size="lg"
          className="rounded-full h-14 w-14 shadow-xl bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:shadow-primary/20 hover:scale-105"
        >
          <PlusCircle className="h-6 w-6" />
          <span className="sr-only">Add Task</span>
        </Button>
      </div>

      {/* Task Form Dialog */}
      <TaskFormDialog
        open={showTaskForm}
        onOpenChange={setShowTaskForm}
        onSubmit={handleAddTask}
        initialTask={editingTask}
        categories={categories}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        tasks={tasks}
        weeklyData={weeklyData}
        categories={categories}
        onImportData={handleImportData}
        onResetData={handleResetData}
      />
    </div>
  )
}

export default WeeklyTaskTracker
