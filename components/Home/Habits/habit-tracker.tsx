/**
 * components/Home/Habits/habit-tracker.tsx — Habit tracker (daily / weekly / monthly)
 */
"use client"

import { useState, useEffect } from "react"
import { TaskGrid } from "@/components/Home/Habits/task-grid"
import { PeriodHabitList, filterHabitsByFrequency } from "@/components/Home/Habits/period-habit-list"
import { TaskFormDialog } from "@/components/Home/Habits/daily-task-form-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, Settings, EyeOff } from "lucide-react"
import { type WeeklyTask as Task, type TaskCompletion } from "@/lib/types"
import { calculateTaskPercentage, calculateDayPercentageAV } from "@/lib/calculations"
import { getWeekStartDate, getWeekDates, formatLocalDateKey, getWeekString } from "@/lib/date-utils"
import { WeekNavigation } from "@/components/Home/Habits/week-navigation"
import { SettingsDialog } from "@/components/Home/Habits/settings-dialog"
import { useHabitsStore } from "@/lib/habits-store"
import { format } from "date-fns"

export function WeeklyTaskTracker({ currentDate = new Date() }: { currentDate?: Date }) {
  const tasks = useHabitsStore((s) => s.tasks)
  const weeklyData = useHabitsStore((s) => s.weeklyData)
  const weeklyHabitData = useHabitsStore((s) => s.weeklyHabitData)
  const monthlyHabitData = useHabitsStore((s) => s.monthlyHabitData)
  const addTaskToStore = useHabitsStore((s) => s.addTask)
  const updateTaskInStore = useHabitsStore((s) => s.updateTask)
  const deleteTaskFromStore = useHabitsStore((s) => s.deleteTask)
  const updateCompletion = useHabitsStore((s) => s.updateCompletion)
  const updateWeeklyHabitCompletion = useHabitsStore((s) => s.updateWeeklyHabitCompletion)
  const updateMonthlyHabitCompletion = useHabitsStore((s) => s.updateMonthlyHabitCompletion)
  const importData = useHabitsStore((s) => s.importData)
  const resetData = useHabitsStore((s) => s.resetData)

  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [hideCompletedToday, setHideCompletedToday] = useState(false)
  const [habitTab, setHabitTab] = useState<"daily" | "weekly" | "monthly">("daily")
  const [defaultFrequency, setDefaultFrequency] = useState<"daily" | "weekly" | "monthly">("daily")

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStartDate(new Date()))
  const [weekDates, setWeekDates] = useState<Date[]>(getWeekDates(getWeekStartDate(new Date())))

  useEffect(() => {
    setWeekDates(getWeekDates(currentWeekStart))
  }, [currentWeekStart])

  const dailyTasks = filterHabitsByFrequency(tasks, "daily")
  const weeklyTasks = filterHabitsByFrequency(tasks, "weekly")
  const monthlyTasks = filterHabitsByFrequency(tasks, "monthly")

  const handleAddTask = (task: Task) => {
    if (editingTask) {
      updateTaskInStore(task)
      setEditingTask(null)
    } else {
      addTaskToStore({ ...task, id: `task-${Date.now()}`, frequency: task.frequency || defaultFrequency })
    }
    setShowTaskForm(false)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setDefaultFrequency(task.frequency || "daily")
    setShowTaskForm(true)
  }

  const weekEndDate = new Date(currentWeekStart)
  weekEndDate.setDate(weekEndDate.getDate() + 6)

  const weekKey = getWeekString(currentWeekStart)
  const monthKey = format(new Date(), "yyyy-MM")

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        {habitTab === "daily" ? (
          <WeekNavigation
            currentWeekStart={currentWeekStart}
            weekEndDate={weekEndDate}
            onPreviousWeek={() => {
              const d = new Date(currentWeekStart)
              d.setDate(d.getDate() - 7)
              setCurrentWeekStart(d)
            }}
            onNextWeek={() => {
              const d = new Date(currentWeekStart)
              d.setDate(d.getDate() + 7)
              setCurrentWeekStart(d)
            }}
            onCurrentWeek={() => setCurrentWeekStart(getWeekStartDate(new Date()))}
          />
        ) : (
          <h3 className="text-lg font-semibold">
            {habitTab === "weekly" ? `Week of ${format(currentWeekStart, "MMM d")}` : format(new Date(), "MMMM yyyy")}
          </h3>
        )}

        <div className="flex flex-wrap items-center gap-4">
          {habitTab === "daily" && (
            <div className="flex items-center gap-2">
              <Switch id="hide-done" checked={hideCompletedToday} onCheckedChange={setHideCompletedToday} />
              <Label htmlFor="hide-done" className="text-sm flex items-center gap-1 cursor-pointer">
                <EyeOff className="h-3.5 w-3.5" />
                Hide completed today
              </Label>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="gap-1.5">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs value={habitTab} onValueChange={(v) => setHabitTab(v as typeof habitTab)}>
        <TabsList>
          <TabsTrigger value="daily">Daily ({dailyTasks.length})</TabsTrigger>
          <TabsTrigger value="weekly">Weekly ({weeklyTasks.length})</TabsTrigger>
          <TabsTrigger value="monthly">Monthly ({monthlyTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <Card className="overflow-hidden border-none shadow-lg rounded-xl card-glass">
            <CardContent className="p-0">
              <TaskGrid
                tasks={dailyTasks}
                weeklyData={weeklyData}
                weekDates={weekDates}
                onUpdateTaskCompletion={updateCompletion}
                onEditTask={handleEditTask}
                onDeleteTask={deleteTaskFromStore}
                calculateTaskPercentage={(taskId) =>
                  calculateTaskPercentage(taskId, dailyTasks, weeklyData, weekDates)
                }
                calculateDayPercentage={(date, index) =>
                  calculateDayPercentageAV(formatLocalDateKey(date), dailyTasks, weeklyData, index)
                }
                hideCompleted={hideCompletedToday}
                viewMode="day"
                selectedDate={currentDate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="mt-4">
          <Card className="p-4">
            <PeriodHabitList
              tasks={weeklyTasks}
              periodKey={weekKey}
              data={weeklyHabitData}
              periodLabel={`This week (${format(currentWeekStart, "MMM d")} – ${format(weekEndDate, "MMM d")})`}
              onUpdate={(taskId, c) => updateWeeklyHabitCompletion(taskId, currentWeekStart, c)}
              onEdit={handleEditTask}
              onDelete={deleteTaskFromStore}
            />
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          <Card className="p-4">
            <PeriodHabitList
              tasks={monthlyTasks}
              periodKey={monthKey}
              data={monthlyHabitData}
              periodLabel={format(new Date(), "MMMM yyyy")}
              onUpdate={(taskId, c) => updateMonthlyHabitCompletion(taskId, new Date(), c)}
              onEdit={handleEditTask}
              onDelete={deleteTaskFromStore}
            />
          </Card>
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-8 right-8">
        <Button
          onClick={() => {
            setEditingTask(null)
            setDefaultFrequency(habitTab)
            setShowTaskForm(true)
          }}
          size="lg"
          className="rounded-full h-14 w-14 shadow-xl bg-gradient-primary hover:opacity-90"
        >
          <PlusCircle className="h-6 w-6" />
          <span className="sr-only">Add Habit</span>
        </Button>
      </div>

      <TaskFormDialog
        open={showTaskForm}
        onOpenChange={setShowTaskForm}
        onSubmit={handleAddTask as (t: Task) => void}
        initialTask={editingTask}
        defaultFrequency={defaultFrequency}
      />

      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        tasks={tasks}
        weeklyData={weeklyData}
        onImportData={importData}
        onResetData={resetData}
      />
    </div>
  )
}

export default WeeklyTaskTracker
