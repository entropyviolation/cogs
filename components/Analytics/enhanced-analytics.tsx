"use client"

import { useState, useMemo } from "react"
import { useTaskStore } from "@/lib/task-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  PieChart,
  LineChart,
  Calendar,
  Clock,
  ArrowUpDown,
  TrendingUp,
  Activity,
  Lightbulb,
} from "lucide-react"

export function EnhancedAnalytics() {
  const allTasks = useTaskStore((state) => state.tasks)
  const [timeRange, setTimeRange] = useState("week")
  const [activeTab, setActiveTab] = useState("productivity")

  // Calculate completion rate
  const completionRate = useMemo(() => {
    const completed = allTasks.filter((t) => t.completed).length
    return allTasks.length > 0 ? (completed / allTasks.length) * 100 : 0
  }, [allTasks])

  // Calculate average task duration
  const averageTaskDuration = useMemo(() => {
    const completedTasks = allTasks.filter((t) => t.completed)
    if (completedTasks.length === 0) return 0

    const totalEffort = completedTasks.reduce((sum, task) => sum + task.effort, 0)
    return Math.round(totalEffort / completedTasks.length)
  }, [allTasks])

  // Calculate average urgency
  const averageUrgency = useMemo(() => {
    if (allTasks.length === 0) return 0

    const totalUrgency = allTasks.reduce((sum, task) => sum + task.urgency, 0)
    return (totalUrgency / allTasks.length).toFixed(1)
  }, [allTasks])

  // Calculate average importance
  const averageImportance = useMemo(() => {
    if (allTasks.length === 0) return 0

    const totalImportance = allTasks.reduce((sum, task) => sum + task.importance, 0)
    return (totalImportance / allTasks.length).toFixed(1)
  }, [allTasks])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics & Insights</h2>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="col-span-1">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-4xl font-bold">{completionRate.toFixed(0)}%</div>
              <div className="text-sm text-muted-foreground mt-1">Completion Rate</div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-4xl font-bold">{averageTaskDuration}</div>
              <div className="text-sm text-muted-foreground mt-1">Avg. Minutes per Task</div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-4xl font-bold">{averageUrgency}</div>
              <div className="text-sm text-muted-foreground mt-1">Avg. Urgency (1-5)</div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-4xl font-bold">{averageImportance}</div>
              <div className="text-sm text-muted-foreground mt-1">Avg. Importance (1-5)</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="productivity">
            <Activity className="h-4 w-4 mr-2" />
            Productivity
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <BarChart className="h-4 w-4 mr-2" />
            Task Analysis
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Lightbulb className="h-4 w-4 mr-2" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="productivity" className="mt-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Productivity</CardTitle>
              </CardHeader>
              <CardContent className="h-80 flex items-center justify-center">
                <LineChart className="h-8 w-8 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Task Completion by Context</CardTitle>
              </CardHeader>
              <CardContent className="h-80 flex items-center justify-center">
                <PieChart className="h-8 w-8 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Productivity Heatmap</CardTitle>
              </CardHeader>
              <CardContent className="h-80 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Distribution by Urgency</CardTitle>
              </CardHeader>
              <CardContent className="h-80 flex items-center justify-center">
                <BarChart className="h-8 w-8 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Task Distribution by Importance</CardTitle>
              </CardHeader>
              <CardContent className="h-80 flex items-center justify-center">
                <BarChart className="h-8 w-8 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Task Effort Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-80 flex items-center justify-center">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Task Completion Time</CardTitle>
              </CardHeader>
              <CardContent className="h-80 flex items-center justify-center">
                <ArrowUpDown className="h-8 w-8 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Volume Over Time</CardTitle>
              </CardHeader>
              <CardContent className="h-80 flex items-center justify-center">
                <LineChart className="h-8 w-8 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Completion Rate Trend</CardTitle>
              </CardHeader>
              <CardContent className="h-80 flex items-center justify-center">
                <LineChart className="h-8 w-8 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Task Duration Trend</CardTitle>
              </CardHeader>
              <CardContent className="h-80 flex items-center justify-center">
                <LineChart className="h-8 w-8 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Context Switching Trend</CardTitle>
              </CardHeader>
              <CardContent className="h-80 flex items-center justify-center">
                <LineChart className="h-8 w-8 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Productivity Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-md">
                  <h3 className="font-medium">Peak Productivity Time</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your most productive time appears to be between 9:00 AM and 11:00 AM. Consider scheduling your most
                    important tasks during this window.
                  </p>
                </div>

                <div className="p-4 border rounded-md">
                  <h3 className="font-medium">Task Completion Pattern</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You complete 35% more tasks on Tuesdays compared to other weekdays. Consider scheduling more
                    important tasks on Tuesdays.
                  </p>
                </div>

                <div className="p-4 border rounded-md">
                  <h3 className="font-medium">Context Optimization</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tasks with @work context take 20% longer than estimated. Consider adjusting your effort estimates
                    for work-related tasks.
                  </p>
                </div>

                <div className="p-4 border rounded-md">
                  <h3 className="font-medium">Urgency vs. Importance</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You tend to prioritize urgent tasks over important ones. Consider allocating more time for important
                    but non-urgent tasks to improve long-term outcomes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
