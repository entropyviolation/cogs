/**
 * components/Home/Habits/daily-task-form.tsx — Habit form
 *
 * The form for creating/editing a habit: name, type, goal/unit, incremental rule
 * (start value + weekly increment), reward value, and category.
 *
 * Spec: §9.4 (habit data model).
 */
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type WeeklyTask, TaskType, type HabitFrequency } from "@/lib/types"
import { normalizeTaskType } from "@/lib/habit-utils"
import { useThemeStore } from "@/lib/theme-store"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, AlignLeft, TrendingUp, X, Plus, Target } from "lucide-react"

interface TaskFormProps {
  onSubmit: (task: WeeklyTask) => void
  onCancel: () => void
  initialTask?: WeeklyTask | null
  defaultFrequency?: HabitFrequency
}

export function TaskForm({ onSubmit, onCancel, initialTask, defaultFrequency = "daily" }: TaskFormProps) {
  const colors = useThemeStore((s) => s.colors)
  const [task, setTask] = useState<WeeklyTask>({
    id: initialTask?.id || "",
    name: initialTask?.name || "",
    type: initialTask ? normalizeTaskType(initialTask.type) : TaskType.BOOLEAN,
    goal: initialTask?.goal || 0,
    unit: initialTask?.unit || "",
    rewardValue: initialTask?.rewardValue || 10,
    frequency: initialTask?.frequency || defaultFrequency,
    incrementalData: initialTask?.incrementalData || undefined,
  })

  const [incrementalKeys, setIncrementalKeys] = useState<string[]>([])
  const [newKey, setNewKey] = useState("")

  useEffect(() => {
    if (initialTask?.incrementalData) {
      setIncrementalKeys(Object.keys(initialTask.incrementalData.currentValues))
    }
  }, [initialTask])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Prepare incremental data if needed
    const finalTask = { ...task }

    if (task.type === TaskType.INCREMENTAL && incrementalKeys.length > 0) {
      const currentValues: Record<string, number> = {}
      const weeklyIncrement: Record<string, number> = {}

      incrementalKeys.forEach((key) => {
        currentValues[key] = Number.parseInt(
          (document.getElementById(`current-${key}`) as HTMLInputElement)?.value || "0",
        )
        weeklyIncrement[key] = Number.parseInt(
          (document.getElementById(`increment-${key}`) as HTMLInputElement)?.value || "0",
        )
      })

      finalTask.incrementalData = {
        currentValues,
        weeklyIncrement,
      }
    }

    onSubmit(finalTask)
  }

  const handleAddIncrementalKey = () => {
    if (newKey.trim() && !incrementalKeys.includes(newKey.trim())) {
      setIncrementalKeys([...incrementalKeys, newKey.trim()])
      setNewKey("")
    }
  }

  const handleRemoveIncrementalKey = (keyToRemove: string) => {
    setIncrementalKeys(incrementalKeys.filter((key) => key !== keyToRemove))
  }

  const getTaskTypeIcon = (type: TaskType) => {
    const c = (color: string) => ({ color })
    switch (normalizeTaskType(type)) {
      case TaskType.BOOLEAN:
        return <CheckCircle2 className="h-4 w-4" style={c(colors.habitBoolean)} />
      case TaskType.GOAL:
        return <Target className="h-4 w-4" style={c(colors.habitGoal)} />
      case TaskType.TEXT:
        return <AlignLeft className="h-4 w-4" style={c(colors.habitText)} />
      case TaskType.INCREMENTAL:
        return <TrendingUp className="h-4 w-4" style={c(colors.habitIncremental)} />
      default:
        return <Clock className="h-4 w-4" style={c(colors.habitGoal)} />
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="task-name">Habit Name</Label>
          <Input
            id="task-name"
            value={task.name}
            onChange={(e) => setTask({ ...task, name: e.target.value })}
            placeholder="Enter task name"
            required
            className="transition-all duration-200 focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="space-y-2">
          <Label>Frequency</Label>
          <Select
            value={task.frequency || "daily"}
            onValueChange={(value) => setTask({ ...task, frequency: value as HabitFrequency })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-type">Habit Type</Label>
          <Select
            value={normalizeTaskType(task.type)}
            onValueChange={(value) =>
              setTask({
                ...task,
                type: value as TaskType,
                goal: value === TaskType.GOAL ? task.goal : undefined,
                unit: value === TaskType.GOAL ? task.unit : undefined,
                incrementalData: value === TaskType.INCREMENTAL ? task.incrementalData : undefined,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select habit type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TaskType.BOOLEAN}>
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2" style={{ color: colors.habitBoolean }} />
                  Yes/No
                </div>
              </SelectItem>
              <SelectItem value={TaskType.GOAL}>
                <div className="flex items-center">
                  <Target className="h-4 w-4 mr-2" style={{ color: colors.habitGoal }} />
                  Goal-based (time, count, etc.)
                </div>
              </SelectItem>
              <SelectItem value={TaskType.TEXT}>
                <div className="flex items-center">
                  <AlignLeft className="h-4 w-4 mr-2" style={{ color: colors.habitText }} />
                  Text Entry
                </div>
              </SelectItem>
              <SelectItem value={TaskType.INCREMENTAL}>
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" style={{ color: colors.habitIncremental }} />
                  Incremental Goal
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-start">
          <Badge variant="outline" className="flex items-center gap-1 px-3 py-1">
            {getTaskTypeIcon(task.type)}
            <span>
              {task.type === TaskType.BOOLEAN && "Yes/No"}
              {(task.type === TaskType.GOAL || task.type === TaskType.TIME || task.type === TaskType.COUNT) &&
                "Goal-based"}
              {task.type === TaskType.TEXT && "Text Entry"}
              {task.type === TaskType.INCREMENTAL && "Incremental Goal"}
            </span>
          </Badge>
        </div>

        {(task.type === TaskType.GOAL || task.type === TaskType.TIME || task.type === TaskType.COUNT) && (
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
            <div className="space-y-2">
              <Label htmlFor="task-goal">Goal Amount</Label>
              <Input
                id="task-goal"
                type="number"
                min="0"
                step="0.5"
                value={task.goal || ""}
                onChange={(e) =>
                  setTask({
                    ...task,
                    goal: Number.parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="Enter goal amount"
                required
                className="transition-all duration-200 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-unit">Unit (optional)</Label>
              <Input
                id="task-unit"
                value={task.unit || ""}
                onChange={(e) => setTask({ ...task, unit: e.target.value })}
                placeholder="e.g., minutes, pages, etc."
                className="transition-all duration-200 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        {task.type === TaskType.INCREMENTAL && (
          <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
            <h3 className="font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-cyan-500" />
              Incremental Goals
            </h3>

            {incrementalKeys.length > 0 && (
              <div className="space-y-4">
                {incrementalKeys.map((key) => (
                  <div key={key} className="space-y-3 border-b pb-4">
                    <div className="flex justify-between items-center">
                      <Label className="capitalize flex items-center">
                        <span className="inline-block w-2 h-2 rounded-full bg-cyan-500 mr-2"></span>
                        {key}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveIncrementalKey(key)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`current-${key}`}>Current Value</Label>
                        <Input
                          id={`current-${key}`}
                          type="number"
                          defaultValue={task.incrementalData?.currentValues[key] || "0"}
                          placeholder="Starting value"
                          className="transition-all duration-200 focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`increment-${key}`}>Weekly Increment</Label>
                        <Input
                          id={`increment-${key}`}
                          type="number"
                          defaultValue={task.incrementalData?.weeklyIncrement[key] || "0"}
                          placeholder="Amount to increase per day"
                          className="transition-all duration-200 focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Add new metric (e.g., match, puzzle)"
                className="transition-all duration-200 focus:ring-2 focus:ring-purple-500"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddIncrementalKey}
                disabled={!newKey.trim()}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            {incrementalKeys.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Add at least one metric to track (e.g., "match" for chess match score)
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!task.name || (task.type === TaskType.INCREMENTAL && incrementalKeys.length === 0)}
          className="bg-gradient-primary hover:opacity-90 transition-all duration-300"
        >
          {initialTask ? "Update Task" : "Add Task"}
        </Button>
      </div>
    </form>
  )
}
