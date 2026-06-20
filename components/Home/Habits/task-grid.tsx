/**
 * components/Home/Habits/task-grid.tsx — Habit grid
 *
 * The spreadsheet-style grid: habits as rows, the 7 weekdays as columns. Renders
 * the correct input per habit type (checkbox / minutes / count / textarea /
 * incremental), per-habit weekly progress, the per-day "Daily Completion" row,
 * and edit/delete actions.
 *
 * Spec: §9.2 (habit types), §9.3 (display & interaction).
 */
"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Edit, Trash2, CheckCircle2, Clock, Hash, AlignLeft, TrendingUp } from "lucide-react"
import { type WeeklyTask as Task, TaskType, type TaskCompletion, type WeeklyData, type HabitFrequency } from "@/lib/types"
import { formatLocalDateKey, formatDateDisplay, getDayOfWeek, isToday } from "@/lib/date-utils"
import { isHabitGoalMet, isGoalType } from "@/lib/habit-utils"
import { useThemeStore } from "@/lib/theme-store"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface TaskGridProps {
  tasks: Task[]
  weeklyData: WeeklyData
  weekDates: Date[]
  onUpdateTaskCompletion: (taskId: string, date: Date, completion: TaskCompletion) => void
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  calculateTaskPercentage: (taskId: string) => number
  calculateDayPercentage: (date: Date, index: number) => number
  hideCompleted?: boolean
  viewMode?: "week" | "day"
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
}

export function TaskGrid({
  tasks,
  weeklyData,
  weekDates,
  onUpdateTaskCompletion,
  onEditTask,
  onDeleteTask,
  calculateTaskPercentage,
  calculateDayPercentage,
  hideCompleted = false,
  viewMode = "week",
  selectedDate,
  onDateSelect,
}: TaskGridProps) {
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const colors = useThemeStore((s) => s.colors)

  let filteredTasks = tasks

  if (hideCompleted && viewMode === "day" && selectedDate) {
    const dateKey = formatLocalDateKey(selectedDate)
    filteredTasks = filteredTasks.filter((task) => !isHabitGoalMet(task, weeklyData[dateKey]?.[task.id]))
  }

  const handleBooleanChange = (taskId: string, date: Date, checked: boolean | "indeterminate") => {
    onUpdateTaskCompletion(taskId, date, { completed: checked === true })
  }

  const handleGoalChange = (taskId: string, date: Date, value: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || !isGoalType(task.type)) return
    const num = Number.parseFloat(value) || 0
    onUpdateTaskCompletion(taskId, date, { value: num, goal: task.goal || 0 })
  }

  const handleTextChange = (taskId: string, date: Date, text: string) => {
    onUpdateTaskCompletion(taskId, date, { text })
  }

  const handleIncrementalChange = (taskId: string, date: Date, key: string, value: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.type !== TaskType.INCREMENTAL || !task.incrementalData) return

    const currentValue = Number.parseInt(value) || 0

    const dateIndex = weekDates.findIndex(
      (d) =>
        d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear(),
    )

    const existingCompletion = weeklyData[formatLocalDateKey(date)]?.[taskId] || { incrementalValues: {} }
    const updatedValues = {
      ...(existingCompletion.incrementalValues || {}),
      [key]: currentValue,
    }

    onUpdateTaskCompletion(taskId, date, {
      incrementalValues: updatedValues,
    })
  }

  const getIncrementalGoal = (task: Task, date: Date, key: string) => {
    if (task.type !== TaskType.INCREMENTAL || !task.incrementalData) return 0

    const baseValue = task.incrementalData.currentValues[key] || 0
    const increment = task.incrementalData.weeklyIncrement[key] || 0

    const dayIndex = weekDates.findIndex(
      (d) =>
        d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear(),
    )

    return baseValue + increment * dayIndex
  }

  const getTaskTypeIcon = (type: TaskType) => {
    const style = (color: string) => ({ color })
    switch (type) {
      case TaskType.BOOLEAN:
        return <CheckCircle2 className="h-4 w-4" style={style(colors.habitBoolean)} />
      case TaskType.GOAL:
      case TaskType.TIME:
      case TaskType.COUNT:
        return <Clock className="h-4 w-4" style={style(colors.habitGoal)} />
      case TaskType.TEXT:
        return <AlignLeft className="h-4 w-4" style={style(colors.habitText)} />
      case TaskType.INCREMENTAL:
        return <TrendingUp className="h-4 w-4" style={style(colors.habitIncremental)} />
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-gradient-to-r from-[#8cd4a5] to-[#9fc2a5]"
    if (percentage >= 75) return "bg-gradient-to-r from-[#8b7ecc] to-[#b89fbf]"
    if (percentage >= 50) return "bg-gradient-to-r from-[#5f756d] to-[#adc29f]"
    if (percentage >= 25) return "bg-gradient-to-r from-[#571833] to-[#130ead]"
    return "bg-gray-400"
  }

  const renderTaskCell = (task: Task, date: Date) => {
    const dateKey = formatLocalDateKey(date)
    const completion = weeklyData[dateKey]?.[task.id]
    const dayIndex = weekDates.findIndex(
      (d) =>
        d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear(),
    )

    switch (task.type) {
      case TaskType.BOOLEAN:
        return (
          <div className="flex justify-center">
            <Checkbox
              checked={completion?.completed || false}
              onCheckedChange={(checked) => handleBooleanChange(task.id, date, checked)}
              className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 transition-all duration-200"
            />
          </div>
        )

      case TaskType.GOAL:
      case TaskType.TIME:
      case TaskType.COUNT:
        return (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="0"
              step="0.5"
              value={completion?.value?.toString() || "0"}
              onChange={(e) => handleGoalChange(task.id, date, e.target.value)}
              className="w-16 text-center transition-all duration-200"
              style={{ borderColor: `${colors.habitGoal}40` }}
            />
            <span className="text-sm text-muted-foreground">/ {task.goal}</span>
          </div>
        )

      case TaskType.TEXT:
        return (
          <Textarea
            value={completion?.text || ""}
            onChange={(e) => handleTextChange(task.id, date, e.target.value)}
            className="min-h-[60px] text-sm border-purple-200 focus:border-purple-500 transition-all duration-200"
            placeholder="Enter details..."
          />
        )

      case TaskType.INCREMENTAL:
        if (!task.incrementalData) return null

        return (
          <div className="space-y-2">
            {Object.keys(task.incrementalData.currentValues).map((key) => {
              const goal = getIncrementalGoal(task, date, key)
              const value = completion?.incrementalValues?.[key]
              const isCompleted = value !== undefined && value >= goal

              return (
                <div key={key} className="flex flex-col">
                  <div
                    className={`text-xs mb-1 capitalize ${
                      isCompleted ? "text-green-600 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {key} Goal: {goal}
                  </div>
                  <Input
                    type="number"
                    value={value?.toString() || ""}
                    onChange={(e) => handleIncrementalChange(task.id, date, key, e.target.value)}
                    className={`w-full text-center transition-all duration-200 ${
                      isCompleted ? "border-green-500 bg-green-50" : "border-cyan-200 focus:border-cyan-500"
                    }`}
                    placeholder={goal.toString()}
                  />
                </div>
              )
            })}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl">
      <Table>
        <TableHeader
          style={{
            background: "linear-gradient(135deg, rgba(140, 212, 165, 0.2) 0%, rgba(185, 159, 191, 0.2) 100%)",
          }}
        >
          <TableRow>
            <TableHead className="w-[200px] font-semibold">Task</TableHead>
            {weekDates.map((date, index) => (
              <TableHead
                key={date.toISOString()}
                className={`text-center cursor-pointer transition-all duration-200 ${
                  isToday(date)
                    ? "bg-gradient-to-br from-[#8cd4a5] to-[#9fc2a5] text-white font-bold shadow-lg"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                onClick={() => viewMode === "week" && onDateSelect?.(date)}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{getDayOfWeek(date).substring(0, 3)}</span>
                  <span className={`text-xs ${isToday(date) ? "font-bold text-white" : "text-muted-foreground"}`}>
                    {formatDateDisplay(date)}
                    {isToday(date) && <span className="ml-1">●</span>}
                  </span>
                </div>
              </TableHead>
            ))}
            <TableHead className="text-center w-[120px] font-semibold">Completion</TableHead>
            <TableHead className="text-center w-[80px] font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={weekDates.length + 3} className="h-24 text-center">
                <div className="text-muted-foreground">No habits yet. Add one to get started.</div>
              </TableCell>
            </TableRow>
          ) : (
            filteredTasks.map((task) => {
              const percentage = calculateTaskPercentage(task.id)
              const progressColor = getProgressColor(percentage)

              return (
                <TableRow key={task.id} className="task-row-hover group">
                  <TableCell
                    className="font-medium cursor-pointer transition-all duration-200"
                    onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                  >
                    <div className="flex items-center gap-2">
                      {getTaskTypeIcon(task.type)}
                      <span>{task.name}</span>
                    </div>
                  </TableCell>

                  {weekDates.map((date, index) => (
                    <TableCell
                      key={date.toISOString()}
                      className={`task-cell group-hover:bg-muted/20 transition-all duration-200 ${
                        isToday(date)
                          ? "bg-gradient-to-br from-[#8cd4a5]/10 to-[#9fc2a5]/10 border-l-4 border-l-[#8cd4a5]"
                          : ""
                      }`}
                    >
                      {renderTaskCell(task, date)}
                    </TableCell>
                  ))}

                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Progress
                        value={percentage}
                        className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-800"
                        indicatorClassName={progressColor}
                      />
                      <span className={`text-sm font-medium ${percentage >= 100 ? "text-green-600" : ""}`}>
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEditTask(task)}
                              className="h-8 w-8 rounded-full"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit Task</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDeleteTask(task.id)}
                              className="h-8 w-8 rounded-full text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete Task</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}

          {/* Day totals row */}
          {filteredTasks.length > 0 && (
            <TableRow className="bg-gray-50 dark:bg-gray-900/50 font-semibold">
              <TableCell>Daily Completion</TableCell>
              {weekDates.map((date, index) => {
                const percentage = calculateDayPercentage(date, index)
                return (
                  <TableCell
                    key={date.toISOString()}
                    className={`text-center ${isToday(date) ? "task-cell-today" : ""}`}
                  >
                    <div className="flex flex-col items-center">
                      <Progress
                        value={percentage}
                        className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 mb-1"
                        indicatorClassName={getProgressColor(percentage)}
                      />
                      <span className={percentage >= 100 ? "text-green-600" : ""}>{percentage.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                )
              })}
              <TableCell colSpan={2}></TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}