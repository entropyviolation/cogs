/**
 * components/enhanced-task-detail.tsx — Full-screen task detail/editor
 *
 * The full task editor opened from the app shell when a task is selected. Exposes
 * all task attributes — details, description, scheduling, dependencies, subtasks,
 * partial completion, repeat settings, and analysis.
 *
 * Spec: §5.5 (Item detail view). Consolidation target with
 * `task-detail-popup.tsx` per docs/SPEC_MAPPING.md §5.
 */
"use client"

import { useState, useEffect, useCallback } from "react"
import { useTaskStore } from "@/lib/task-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft,
  Save,
  Calendar,
  Clock,
  AlertTriangle,
  Star,
  CheckCircle,
  XCircle,
  Plus,
  Trash,
  GitBranch,
  Target,
  CalendarDays,
  Users,
  Timer,
  Award,
} from "lucide-react"
import type { Task } from "@/lib/types"
import { safeDateFormat, safeISODateString } from "@/lib/date-utils"

interface EnhancedTaskDetailProps {
  taskId: string
  onBack: () => void
}

export function EnhancedTaskDetail({ taskId, onBack }: EnhancedTaskDetailProps) {
  const allTasks = useTaskStore((state) => state.tasks)
  const categories = useTaskStore((state) => state.categories)
  const updateTask = useTaskStore((state) => state.updateTask)
  const addTask = useTaskStore((state) => state.addTask)
  const deleteTask = useTaskStore((state) => state.deleteTask)

  const [task, setTask] = useState<Task | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [newSubtaskDescription, setNewSubtaskDescription] = useState("")
  const [selectedDependency, setSelectedDependency] = useState("")
  const [actualDurationInput, setActualDurationInput] = useState("")

  useEffect(() => {
    const foundTask = allTasks.find((t) => t.id === taskId)
    if (foundTask) {
      setTask(foundTask)
    }
  }, [taskId, allTasks])

  const handleSave = useCallback(() => {
    if (task) {
      updateTask(task)
      setIsEditing(false)
    }
  }, [task, updateTask])

  const handleComplete = useCallback(() => {
    if (task) {
      const actualDuration = actualDurationInput ? Number.parseInt(actualDurationInput) : undefined
      updateTask({
        ...task,
        completed: true,
        actualDuration: actualDuration,
      })
    }
  }, [task, actualDurationInput, updateTask])

  const handleSchedule = useCallback(
    (type: "date" | "week" | "month" | "year", value: string) => {
      if (task) {
        const updates: Partial<Task> = {}

        switch (type) {
          case "date":
            updates.scheduledDate = value ? new Date(value) : undefined
            break
          case "week":
            updates.scheduledWeek = value
            break
          case "month":
            updates.scheduledMonth = value
            break
          case "year":
            updates.scheduledYear = value
            break
        }

        setTask({ ...task, ...updates })
      }
    },
    [task],
  )

  const addToCategory = useCallback(
    (categoryId: string) => {
      if (task && !task.categories?.includes(categoryId)) {
        setTask({
          ...task,
          categories: [...(task.categories || []), categoryId],
        })
      }
    },
    [task],
  )

  const removeFromCategory = useCallback(
    (categoryId: string) => {
      if (task) {
        setTask({
          ...task,
          categories: task.categories?.filter((id) => id !== categoryId) || [],
        })
      }
    },
    [task],
  )

  const addSubtask = useCallback(() => {
    if (task && newSubtaskDescription.trim()) {
      const subtask: Task = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        description: newSubtaskDescription,
        category: "clarified",
        createdAt: new Date(),
        estimatedDuration: 15,
        cognitiveLoad: 1,
        urgency: task.urgency,
        importance: task.importance,
        dependencies: [],
        context: task.context,
        entropy: 0.3,
        rewardValue: 3,
        completed: false,
        categories: task.categories || [],
        parentTaskId: task.id,
        subtasks: [],
        allowPartialCompletion: false,
        minimumChunkSize: 15,
      }

      // Add the subtask to the store
      addTask(subtask)

      // Update the parent task to include this subtask
      const updatedTask = {
        ...task,
        subtasks: [...(task.subtasks || []), { id: subtask.id, description: subtask.description, completed: false }],
      }
      setTask(updatedTask)
      updateTask(updatedTask)

      setNewSubtaskDescription("")
    }
  }, [task, newSubtaskDescription, addTask, updateTask])

  const removeSubtask = useCallback(
    (subtaskId: string) => {
      if (task) {
        deleteTask(subtaskId)
        const updatedTask = {
          ...task,
          subtasks: task.subtasks?.filter((s) => s.id !== subtaskId) || [],
        }
        setTask(updatedTask)
        updateTask(updatedTask)
      }
    },
    [task, deleteTask, updateTask],
  )

  const addDependency = useCallback(() => {
    if (task && selectedDependency && !(task.dependencies ?? []).includes(selectedDependency)) {
      setTask({
        ...task,
        dependencies: [...(task.dependencies ?? []), selectedDependency],
      })
      setSelectedDependency("")
    }
  }, [task, selectedDependency])

  const removeDependency = useCallback(
    (depId: string) => {
      if (task) {
        setTask({
          ...task,
          dependencies: (task.dependencies ?? []).filter((id) => id !== depId),
        })
      }
    },
    [task],
  )

  // Get available tasks for dependencies (excluding current task and its subtasks)
  const availableDependencies = allTasks.filter((t) => t.id !== taskId && !t.completed && t.parentTaskId !== taskId)

  // Get subtasks
  const subtaskIds = new Set((task?.subtasks ?? []).map((s) => s.id))
  const subtasks = allTasks.filter((t) => subtaskIds.has(t.id))

  if (!task) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Task not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Fixed header with task title */}
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{task.description}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={task.completed ? "default" : "secondary"}>
                  {task.completed ? "Completed" : task.category}
                </Badge>
                {task.actualDuration && (
                  <Badge variant="outline">
                    <Timer className="h-3 w-3 mr-1" />
                    Took {task.actualDuration}m
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {!task.completed && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Actual minutes"
                  value={actualDurationInput}
                  onChange={(e) => setActualDurationInput(e.target.value)}
                  className="w-32"
                />
                <Button variant="outline" onClick={handleComplete}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete
                </Button>
              </div>
            )}
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>Edit Task</Button>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="subtasks">Subtasks</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estimated-duration">Estimated Duration (minutes)</Label>
                      {isEditing ? (
                        <Input
                          id="estimated-duration"
                          type="number"
                          value={task.estimatedDuration}
                          onChange={(e) =>
                            setTask({ ...task, estimatedDuration: Number.parseInt(e.target.value) || 0 })
                          }
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{task.estimatedDuration} minutes</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reward-value">Reward Value (1-10)</Label>
                      {isEditing ? (
                        <Input
                          id="reward-value"
                          type="number"
                          min="1"
                          max="10"
                          value={task.rewardValue}
                          onChange={(e) => setTask({ ...task, rewardValue: Number.parseInt(e.target.value) || 5 })}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-muted-foreground" />
                          <span>{task.rewardValue}/10</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="urgency">Urgency</Label>
                      {isEditing ? (
                        <Select
                          value={(task.urgency ?? 3).toString()}
                          onValueChange={(value) => setTask({ ...task, urgency: Number.parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 - Low</SelectItem>
                            <SelectItem value="2">2 - Medium-Low</SelectItem>
                            <SelectItem value="3">3 - Medium</SelectItem>
                            <SelectItem value="4">4 - High</SelectItem>
                            <SelectItem value="5">5 - Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                          <span>{task.urgency ?? 3}/5</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="importance">Importance</Label>
                      {isEditing ? (
                        <Select
                          value={(task.importance ?? 3).toString()}
                          onValueChange={(value) => setTask({ ...task, importance: Number.parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 - Low</SelectItem>
                            <SelectItem value="2">2 - Medium-Low</SelectItem>
                            <SelectItem value="3">3 - Medium</SelectItem>
                            <SelectItem value="4">4 - High</SelectItem>
                            <SelectItem value="5">5 - Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-muted-foreground" />
                          <span>{task.importance ?? 3}/5</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="context">Context</Label>
                      {isEditing ? (
                        <Input
                          id="context"
                          value={task.context}
                          onChange={(e) => setTask({ ...task, context: e.target.value })}
                        />
                      ) : (
                        <Badge variant="outline">{task.context}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Partial Completion Settings */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-medium">Partial Completion Settings</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="allow-partial"
                          checked={task.allowPartialCompletion}
                          onCheckedChange={(checked) =>
                            isEditing && setTask({ ...task, allowPartialCompletion: !!checked })
                          }
                          disabled={!isEditing}
                        />
                        <Label htmlFor="allow-partial">Allow partial completion</Label>
                      </div>

                      {task.allowPartialCompletion && (
                        <div className="space-y-2">
                          <Label htmlFor="chunk-size">Minimum chunk size (minutes)</Label>
                          {isEditing ? (
                            <Input
                              id="chunk-size"
                              type="number"
                              min="5"
                              value={task.minimumChunkSize}
                              onChange={(e) =>
                                setTask({ ...task, minimumChunkSize: Number.parseInt(e.target.value) || 15 })
                              }
                            />
                          ) : (
                            <span className="text-sm">{task.minimumChunkSize} minutes</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Lists</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {task.categories?.map((categoryId) => {
                      const category = categories.find((c) => c.id === categoryId)
                      if (!category) return null

                      return (
                        <Badge
                          key={categoryId}
                          variant="secondary"
                          className="flex items-center gap-1"
                          style={{ backgroundColor: `${category.color}20`, borderColor: category.color }}
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
                          {category.name}
                          {isEditing && (
                            <button
                              onClick={() => removeFromCategory(categoryId)}
                              className="ml-1 hover:text-destructive"
                            >
                              <XCircle className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      )
                    })}
                  </div>

                  {isEditing && (
                    <div className="space-y-2">
                      <Label>Add to List</Label>
                      <Select onValueChange={addToCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a list" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter((category) => !task.categories?.includes(category.id))
                            .map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                                  {category.name}
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Task Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div>Created: {safeDateFormat(task.createdAt)}</div>
                  <div>Status: {task.category}</div>
                  <div>Completed: {task.completed ? "Yes" : "No"}</div>
                  {task.deadline && <div>Deadline: {safeDateFormat(task.deadline)}</div>}
                  {task.parentTaskId && (
                    <div>Parent Task: {allTasks.find((t) => t.id === task.parentTaskId)?.description}</div>
                  )}
                  {task.actualDuration && <div>Actual Duration: {task.actualDuration} minutes</div>}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scheduling" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Scheduling & Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Specific Date & Time</h3>
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-date">Scheduled Date</Label>
                    <Input
                      id="scheduled-date"
                      type="date"
                      value={safeISODateString(task.scheduledDate)}
                      onChange={(e) => handleSchedule("date", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduled-time">Scheduled Time</Label>
                    <Input
                      id="scheduled-time"
                      type="time"
                      value={task.scheduledTime || ""}
                      onChange={(e) => setTask({ ...task, scheduledTime: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Deadline</h3>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline Date</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={safeISODateString(task.deadline)}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : undefined
                        setTask({ ...task, deadline: date })
                      }}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Flexible Scheduling</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-week">Scheduled Week</Label>
                    <Input
                      id="scheduled-week"
                      placeholder="e.g., 2024-05-19_2024-05-25"
                      value={task.scheduledWeek || ""}
                      onChange={(e) => handleSchedule("week", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduled-month">Scheduled Month</Label>
                    <Input
                      id="scheduled-month"
                      type="month"
                      value={task.scheduledMonth || ""}
                      onChange={(e) => handleSchedule("month", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduled-year">Scheduled Year</Label>
                    <Input
                      id="scheduled-year"
                      type="number"
                      min="2024"
                      max="2030"
                      value={task.scheduledYear || ""}
                      onChange={(e) => handleSchedule("year", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>

              {(task.scheduledDate ||
                task.deadline ||
                task.scheduledWeek ||
                task.scheduledMonth ||
                task.scheduledYear) && (
                <div className="p-4 bg-muted rounded-md space-y-2">
                  {task.scheduledDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Scheduled for {safeDateFormat(task.scheduledDate)}
                        {task.scheduledTime && ` at ${task.scheduledTime}`}
                      </span>
                    </div>
                  )}
                  {task.deadline && (
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4" />
                      <span>Deadline: {safeDateFormat(task.deadline)}</span>
                    </div>
                  )}
                  {task.scheduledWeek && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>Scheduled for week: {task.scheduledWeek}</span>
                    </div>
                  )}
                  {task.scheduledMonth && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>Scheduled for month: {task.scheduledMonth}</span>
                    </div>
                  )}
                  {task.scheduledYear && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>Scheduled for year: {task.scheduledYear}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dependencies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Task Dependencies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Dependencies</Label>
                {(task.dependencies ?? []).length > 0 ? (
                  <div className="space-y-2">
                    {(task.dependencies ?? []).map((depId) => {
                      const depTask = allTasks.find((t) => t.id === depId)
                      return (
                        <div key={depId} className="flex justify-between items-center p-2 border rounded-md">
                          <span className="text-sm">{depTask?.description || "Unknown Task"}</span>
                          {isEditing && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeDependency(depId)}
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No dependencies</p>
                )}
              </div>

              {isEditing && (
                <div className="space-y-2">
                  <Label>Add Dependency</Label>
                  <div className="flex gap-2">
                    <Select value={selectedDependency} onValueChange={setSelectedDependency}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a task" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDependencies
                          .filter((t) => !(task.dependencies ?? []).includes(t.id))
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.description}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addDependency} disabled={!selectedDependency}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subtasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Subtasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing && (
                <div className="space-y-2">
                  <Label>Add Subtask</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter subtask description..."
                      value={newSubtaskDescription}
                      onChange={(e) => setNewSubtaskDescription(e.target.value)}
                      className="flex-1"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          addSubtask()
                        }
                      }}
                    />
                    <Button onClick={addSubtask} disabled={!newSubtaskDescription.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Current Subtasks</Label>
                {subtasks.length > 0 ? (
                  <div className="space-y-2">
                    {subtasks.map((subtask) => (
                      <div key={subtask.id} className="flex justify-between items-center p-2 border rounded-md">
                        <div className="flex items-center gap-2">
                          <CheckCircle
                            className={`h-4 w-4 ${subtask.completed ? "text-green-500" : "text-muted-foreground"}`}
                          />
                          <span className={`text-sm ${subtask.completed ? "line-through text-muted-foreground" : ""}`}>
                            {subtask.description}
                          </span>
                        </div>
                        {isEditing && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeSubtask(subtask.id)}
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No subtasks</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="why">Why do you need to do this task?</Label>
                {isEditing ? (
                  <Textarea
                    id="why"
                    value={task.why || ""}
                    onChange={(e) => setTask({ ...task, why: e.target.value })}
                    placeholder="Explain the purpose and motivation behind this task..."
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{task.why || "No reason specified"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="consequences">What happens if you don't do it?</Label>
                {isEditing ? (
                  <Textarea
                    id="consequences"
                    value={task.consequences || ""}
                    onChange={(e) => setTask({ ...task, consequences: e.target.value })}
                    placeholder="Describe the potential consequences of not completing this task..."
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{task.consequences || "No consequences specified"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                {isEditing ? (
                  <Textarea
                    id="notes"
                    value={task.notes || ""}
                    onChange={(e) => setTask({ ...task, notes: e.target.value })}
                    placeholder="Any additional thoughts or context..."
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{task.notes || "No additional notes"}</p>
                )}
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Task Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Entropy:</span>
                    <span className="font-medium">{(task.entropy ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Reward Value:</span>
                    <span className="font-medium">{task.rewardValue}/10</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cognitive Load:</span>
                    <span className="font-medium">{task.cognitiveLoad}/3</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Estimated Duration:</span>
                    <span className="font-medium">{task.estimatedDuration} minutes</span>
                  </div>
                  {task.actualDuration && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Actual Duration:</span>
                      <span className="font-medium">{task.actualDuration} minutes</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
