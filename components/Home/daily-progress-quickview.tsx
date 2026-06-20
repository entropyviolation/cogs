/**
 * components/Home/daily-progress-quickview.tsx — Today's progress summary
 *
 * Replaces the old Quick Actions card with a snapshot of daily to-do and habit
 * completion for the current day.
 */
"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, ListTodo, Repeat } from "lucide-react"
import { useTaskStore } from "@/lib/task-store"
import { useHabitsStore } from "@/lib/habits-store"
import { filterHabitsByFrequency } from "@/components/Home/Habits/period-habit-list"
import { formatLocalDateKey, taskScheduledOnDay } from "@/lib/date-utils"
import { TaskType } from "@/lib/types"

function habitDoneToday(
  taskId: string,
  type: TaskType,
  completion: { completed?: boolean; text?: string; value?: number; incrementalValues?: Record<string, number> } | undefined,
  goal?: number,
): boolean {
  if (!completion) return false
  switch (type) {
    case TaskType.BOOLEAN:
      return !!completion.completed
    case TaskType.TEXT:
      return !!completion.text?.trim()
    case TaskType.GOAL:
    case TaskType.TIME:
    case TaskType.COUNT:
      return goal ? (completion.value ?? 0) >= goal : (completion.value ?? 0) > 0
    case TaskType.INCREMENTAL:
      return !!completion.incrementalValues && Object.values(completion.incrementalValues).some((v) => v > 0)
    default:
      return false
  }
}

export function DailyProgressQuickview({ currentDate }: { currentDate: Date }) {
  const tasks = useTaskStore((s) => s.tasks)
  const habitTasks = useHabitsStore((s) => s.tasks)
  const weeklyData = useHabitsStore((s) => s.weeklyData)

  const dayKey = formatLocalDateKey(currentDate)

  const todoStats = useMemo(() => {
    const todayTodos = tasks.filter(
      (t) => !t.hiddenFromTodo && taskScheduledOnDay(t, currentDate),
    )
    const completed = todayTodos.filter((t) => t.completed).length
    const total = todayTodos.length
    const remaining = total - completed
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, remaining, percent }
  }, [tasks, currentDate])

  const habitStats = useMemo(() => {
    const dailyHabits = filterHabitsByFrequency(habitTasks, "daily")
    const dayData = weeklyData[dayKey] ?? {}
    let completed = 0
    dailyHabits.forEach((habit) => {
      if (habitDoneToday(habit.id, habit.type, dayData[habit.id], habit.goal)) completed++
    })
    const total = dailyHabits.length
    const remaining = total - completed
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, remaining, percent }
  }, [habitTasks, weeklyData, dayKey])

  return (
    <Card className="lg:w-80 card-hover">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Today&apos;s Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <ListTodo className="h-4 w-4 text-blue-600" />
              To Do
            </span>
            <span className="text-muted-foreground">
              {todoStats.remaining} left · {todoStats.percent}%
            </span>
          </div>
          <Progress value={todoStats.percent} indicatorClassName="bg-blue-500" />
          <p className="text-xs text-muted-foreground">
            {todoStats.completed} of {todoStats.total} done today
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <Repeat className="h-4 w-4 text-emerald-600" />
              Habits
            </span>
            <span className="text-muted-foreground">
              {habitStats.remaining} left · {habitStats.percent}%
            </span>
          </div>
          <Progress value={habitStats.percent} indicatorClassName="bg-emerald-500" />
          <p className="text-xs text-muted-foreground">
            {habitStats.completed} of {habitStats.total} done today
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
