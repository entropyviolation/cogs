"use client"

import { useState, useCallback, useMemo } from "react"
import { useTaskStore } from "@/lib/task-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Check, X, Clock, Brain, AlertTriangle, Star, BarChart, PieChart, LineChart } from "lucide-react"
import type { Task } from "@/lib/types"

export function DailyReview() {
  // Get all tasks
  const allTasks = useTaskStore((state) => state.tasks)
  const updateTask = useTaskStore((state) => state.updateTask)
  const [reflection, setReflection] = useState("")
  const [energy, setEnergy] = useState(3)
  const [mood, setMood] = useState(3)

  // Task review state
  const [taskReviews, setTaskReviews] = useState<
    Record<
      string,
      {
        actualEffort: number
        actualCognitiveLoad: number
        satisfaction: number
      }
    >
  >({})

  // Filter tasks for the selected date using useMemo
  const todaysTasks = useMemo(() => {
    return allTasks.filter((task) => task.category === "clarified" && !task.completed).slice(0, 5) // Just showing a few for the prototype
  }, [allTasks])

  // Mark task as completed
  const completeTask = useCallback(
    (task: Task) => {
      updateTask({
        ...task,
        completed: true,
      })
    },
    [updateTask],
  )

  // Calculate completion rate
  const completionRate = useMemo(() => {
    const completed = allTasks.filter((t) => t.completed).length
    return allTasks.length > 0 ? (completed / allTasks.length) * 100 : 0
  }, [allTasks])

  // Handle task review changes
  const handleTaskReviewChange = useCallback((taskId: string, field: string, value: number) => {
    setTaskReviews((prev) => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || { actualEffort: 0, actualCognitiveLoad: 1, satisfaction: 5 }),
        [field]: value,
      },
    }))
  }, [])

  // Get task review value with default
  const getTaskReviewValue = useCallback(
    (taskId: string, field: string, defaultValue: number): number => {
      if (!taskReviews[taskId]) return defaultValue
      return (taskReviews[taskId][field as keyof (typeof taskReviews)[string]] as number) || defaultValue
    },
    [taskReviews],
  )

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Daily Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>How was your energy today? (1-5)</Label>
              <Slider min={1} max={5} step={1} value={[energy]} onValueChange={(value) => setEnergy(value[0])} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>How was your mood today? (1-5)</Label>
              <Slider min={1} max={5} step={1} value={[mood]} onValueChange={(value) => setMood(value[0])} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Poor</span>
                <span>Neutral</span>
                <span>Great</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Daily Reflection</Label>
              <Textarea
                placeholder="What went well today? What could have gone better? Any insights or patterns you noticed?"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaysTasks.map((task) => (
                <div key={task.id} className="border rounded-md p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{task.description}</h3>
                      <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.effort}m
                        </span>
                        <span className="flex items-center gap-1">
                          <Brain className="h-3 w-3" />
                          {task.cognitiveLoad}
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {task.urgency}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {task.rewardValue}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => completeTask(task)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Actual Time Spent (minutes)</Label>
                      <Slider
                        min={0}
                        max={120}
                        step={5}
                        value={[getTaskReviewValue(task.id, "actualEffort", task.effort)]}
                        onValueChange={(value) => handleTaskReviewChange(task.id, "actualEffort", value[0])}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Actual Cognitive Load (1-3)</Label>
                      <Slider
                        min={1}
                        max={3}
                        step={1}
                        value={[getTaskReviewValue(task.id, "actualCognitiveLoad", task.cognitiveLoad)]}
                        onValueChange={(value) => handleTaskReviewChange(task.id, "actualCognitiveLoad", value[0])}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Satisfaction (1-10)</Label>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[getTaskReviewValue(task.id, "satisfaction", task.rewardValue)]}
                        onValueChange={(value) => handleTaskReviewChange(task.id, "satisfaction", value[0])}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Daily Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="border rounded-md p-3 text-center">
                <div className="text-2xl font-bold">{completionRate.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Completion Rate</div>
              </div>
              <div className="border rounded-md p-3 text-center">
                <div className="text-2xl font-bold">3/5</div>
                <div className="text-xs text-muted-foreground">Critical Path Tasks</div>
              </div>
              <div className="border rounded-md p-3 text-center">
                <div className="text-2xl font-bold">240</div>
                <div className="text-xs text-muted-foreground">Minutes Focused</div>
              </div>
              <div className="border rounded-md p-3 text-center">
                <div className="text-2xl font-bold">8</div>
                <div className="text-xs text-muted-foreground">Context Switches</div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Cognitive Load Distribution</h3>
              <div className="h-32 border rounded-md flex items-center justify-center">
                <PieChart className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Energy Throughout Day</h3>
              <div className="h-32 border rounded-md flex items-center justify-center">
                <LineChart className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Task Categories</h3>
              <div className="h-32 border rounded-md flex items-center justify-center">
                <BarChart className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button className="w-full">Save Daily Review</Button>
      </div>
    </div>
  )
}
