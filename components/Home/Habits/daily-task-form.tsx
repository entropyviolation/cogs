"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type Task, TaskType, type Category } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, Hash, AlignLeft, TrendingUp, X, Plus, Tag } from "lucide-react"

interface TaskFormProps {
  onSubmit: (task: Task) => void
  onCancel: () => void
  initialTask?: Task | null
  categories: Category[]
}

export function TaskForm({ onSubmit, onCancel, initialTask, categories }: TaskFormProps) {
  const [task, setTask] = useState<Task>({
    id: initialTask?.id || "",
    name: initialTask?.name || "",
    type: initialTask?.type || TaskType.BOOLEAN,
    goal: initialTask?.goal || 0,
    unit: initialTask?.unit || "",
    categoryId: initialTask?.categoryId || undefined,
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
    switch (type) {
      case TaskType.BOOLEAN:
        return <CheckCircle2 className="h-4 w-4" />
      case TaskType.TIME:
        return <Clock className="h-4 w-4" />
      case TaskType.COUNT:
        return <Hash className="h-4 w-4" />
      case TaskType.TEXT:
        return <AlignLeft className="h-4 w-4" />
      case TaskType.INCREMENTAL:
        return <TrendingUp className="h-4 w-4" />
    }
  }

  const getSelectedCategory = () => {
    if (!task.categoryId) return null
    return categories.find((category) => category.id === task.categoryId) || null
  }

  const selectedCategory = getSelectedCategory()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="task-name">Task Name</Label>
          <Input
            id="task-name"
            value={task.name}
            onChange={(e) => setTask({ ...task, name: e.target.value })}
            placeholder="Enter task name"
            required
            className="transition-all duration-200 focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Category selection */}
        <div className="space-y-2">
          <Label htmlFor="task-category">Category (Optional)</Label>
          <Select
            value={task.categoryId || "none"}
            onValueChange={(value) => setTask({ ...task, categoryId: value === "none" ? undefined : value })}
          >
            <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-purple-500">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex items-center">
                  <span className="text-muted-foreground">No category</span>
                </div>
              </SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: category.color }}
                      aria-hidden="true"
                    />
                    <span>{category.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Display selected category as a badge */}
        {selectedCategory && (
          <div className="flex justify-start">
            <Badge
              variant="outline"
              className="flex items-center gap-1 px-3 py-1"
              style={{
                borderColor: `${selectedCategory.color}40`,
                backgroundColor: `${selectedCategory.color}10`,
                color: selectedCategory.color,
              }}
            >
              <Tag className="h-3 w-3" />
              <span>{selectedCategory.name}</span>
            </Badge>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="task-type">Task Type</Label>
          <Select
            value={task.type}
            onValueChange={(value) =>
              setTask({
                ...task,
                type: value as TaskType,
                // Reset other properties when changing type
                goal: value === TaskType.TIME || value === TaskType.COUNT ? task.goal : undefined,
                unit: value === TaskType.TIME || value === TaskType.COUNT ? task.unit : undefined,
                incrementalData: value === TaskType.INCREMENTAL ? task.incrementalData : undefined,
              })
            }
          >
            <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-purple-500">
              <SelectValue placeholder="Select task type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TaskType.BOOLEAN} className="flex items-center">
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  <span>Yes/No Task</span>
                </div>
              </SelectItem>
              <SelectItem value={TaskType.TIME}>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-blue-500" />
                  <span>Time-based Task</span>
                </div>
              </SelectItem>
              <SelectItem value={TaskType.COUNT}>
                <div className="flex items-center">
                  <Hash className="h-4 w-4 mr-2 text-orange-500" />
                  <span>Count-based Task</span>
                </div>
              </SelectItem>
              <SelectItem value={TaskType.TEXT}>
                <div className="flex items-center">
                  <AlignLeft className="h-4 w-4 mr-2 text-purple-500" />
                  <span>Text Entry Task</span>
                </div>
              </SelectItem>
              <SelectItem value={TaskType.INCREMENTAL}>
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-cyan-500" />
                  <span>Incremental Goal Task</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task type badge */}
        <div className="flex justify-start">
          <Badge
            variant="outline"
            className={`
              flex items-center gap-1 px-3 py-1
              ${task.type === TaskType.BOOLEAN ? "border-secondary/30 bg-secondary/10 text-secondary" : ""}
              ${task.type === TaskType.TIME ? "border-primary/30 bg-primary/10 text-primary" : ""}
              ${task.type === TaskType.COUNT ? "border-accent/30 bg-accent/10 text-accent" : ""}
              ${task.type === TaskType.TEXT ? "border-mint/30 bg-mint/10 text-mint" : ""}
              ${task.type === TaskType.INCREMENTAL ? "border-sage/30 bg-sage/10 text-sage" : ""}
            `}
          >
            {getTaskTypeIcon(task.type)}
            <span>
              {task.type === TaskType.BOOLEAN && "Yes/No Task"}
              {task.type === TaskType.TIME && "Time-based Task"}
              {task.type === TaskType.COUNT && "Count-based Task"}
              {task.type === TaskType.TEXT && "Text Entry Task"}
              {task.type === TaskType.INCREMENTAL && "Incremental Goal Task"}
            </span>
          </Badge>
        </div>

        {/* Conditional fields based on task type */}
        {(task.type === TaskType.TIME || task.type === TaskType.COUNT) && (
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
            <div className="space-y-2">
              <Label htmlFor="task-goal">Goal Amount</Label>
              <Input
                id="task-goal"
                type="number"
                min="0"
                step={task.type === TaskType.COUNT ? "0.5" : "1"}
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
