"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, Settings, Home, CheckSquare, Target, Calendar, ArrowLeft } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useTaskStore } from "@/lib/task-store"
import type { Task } from "@/lib/types"
import type { OperationLog, OperationReview } from "@/lib/types" // Declare OperationLog and OperationReview

// Replace the Phase interface with the updated OperationPhase interface
interface OperationPhase {
  id: string
  operationId: string
  name: string
  description?: string
  order: number
  goals: OperationGoal[]
  isCompleted: boolean
  deadline?: Date
}

// Add the OperationGoal interface
interface OperationGoal {
  id: string
  phaseId: string
  title: string
  taskIds: string[]
  kpis?: string[]
  notes?: string
  isCompleted: boolean
}

// Update the Operation interface to include new fields
interface Operation {
  id: string
  title: string
  goals: string[]
  objectives: string[]
  timeline: { start: Date; end?: Date }
  status: "not started" | "active" | "paused" | "completed"
  plan: string
  notes?: string
  tasks: string[]
  phases?: OperationPhase[]
  resources?: string[]
  logs: OperationLog[]
  review?: OperationReview
  createdAt: Date
  updatedAt: Date
  deadline?: Date
  activityLog?: { date: string; duration: number }[]
}

// Replace the mockOperations data with updated data that includes phases with goals
const mockOperations: Operation[] = [
  {
    id: "op-1",
    title: "Get Car Back",
    goals: ["Regain ownership of my vehicle"],
    objectives: ["File necessary paperwork", "Pay all outstanding fees", "Retrieve vehicle from impound"],
    timeline: { start: new Date(2023, 5, 1), end: new Date(2023, 5, 15) },
    status: "active",
    plan: "1. Gather all required documents\n2. Visit DMV to file report\n3. Pay fees\n4. Schedule pickup",
    tasks: ["task-1", "task-2", "task-3"],
    phases: [
      {
        id: "phase-1",
        operationId: "op-1",
        name: "Documentation",
        description: "Gather and submit all required paperwork",
        order: 0,
        isCompleted: true,
        goals: [
          {
            id: "goal-1",
            phaseId: "phase-1",
            title: "Submit DMV forms",
            taskIds: ["task-1"],
            kpis: ["Forms accepted without errors"],
            isCompleted: true,
          },
        ],
        deadline: new Date(2023, 5, 5),
      },
      {
        id: "phase-2",
        operationId: "op-1",
        name: "Payment",
        description: "Pay all outstanding fees",
        order: 1,
        isCompleted: false,
        goals: [
          {
            id: "goal-2",
            phaseId: "phase-2",
            title: "Pay impound fees",
            taskIds: ["task-2"],
            kpis: ["Receipt obtained", "Payment confirmed"],
            isCompleted: false,
          },
        ],
        deadline: new Date(2023, 5, 10),
      },
      {
        id: "phase-3",
        operationId: "op-1",
        name: "Retrieval",
        description: "Pick up vehicle from impound",
        order: 2,
        isCompleted: false,
        goals: [
          {
            id: "goal-3",
            phaseId: "phase-3",
            title: "Schedule and complete pickup",
            taskIds: ["task-3"],
            kpis: ["Vehicle in possession", "All paperwork completed"],
            isCompleted: false,
          },
        ],
        deadline: new Date(2023, 5, 15),
      },
    ],
    logs: [
      {
        timestamp: new Date(2023, 5, 2),
        content: "Called DMV to confirm required documents. Need to bring ID, proof of insurance, and payment.",
      },
      {
        timestamp: new Date(2023, 5, 5),
        content: "Submitted all paperwork. Officer Johnson confirmed everything is in order.",
      },
    ],
    createdAt: new Date(2023, 5, 1),
    updatedAt: new Date(2023, 5, 5),
    deadline: new Date(2023, 5, 15),
    activityLog: [
      { date: "2023-06-01", duration: 30 },
      { date: "2023-06-02", duration: 45 },
      { date: "2023-06-05", duration: 60 },
    ],
  },
  {
    id: "op-2",
    title: "Quit Vaping",
    goals: ["End nicotine addiction"],
    objectives: [
      "Reduce nicotine intake gradually",
      "Develop alternative coping mechanisms",
      "Eliminate vaping entirely",
    ],
    timeline: { start: new Date(2023, 4, 15) },
    status: "active",
    plan: "1. Taper nicotine levels over 4 weeks\n2. Identify and practice behavioral substitutes\n3. Set quit date\n4. Cold turkey after preparation",
    tasks: ["task-4", "task-5", "task-6"],
    phases: [
      {
        id: "phase-4",
        operationId: "op-2",
        name: "Tapering",
        description: "Gradually reduce nicotine levels",
        order: 0,
        isCompleted: true,
        goals: [
          {
            id: "goal-4",
            phaseId: "phase-4",
            title: "Reduce to lowest nicotine level",
            taskIds: ["task-4"],
            kpis: ["Using 3mg or less nicotine"],
            isCompleted: true,
          },
        ],
        deadline: new Date(2023, 5, 15),
      },
      {
        id: "phase-5",
        operationId: "op-2",
        name: "Alternatives",
        description: "Develop coping mechanisms",
        order: 1,
        isCompleted: false,
        goals: [
          {
            id: "goal-5",
            phaseId: "phase-5",
            title: "Identify and practice alternatives",
            taskIds: ["task-5"],
            kpis: ["3 working alternatives identified", "Successfully used during cravings"],
            isCompleted: false,
          },
        ],
        deadline: new Date(2023, 6, 1),
      },
      {
        id: "phase-6",
        operationId: "op-2",
        name: "Cessation",
        description: "Complete elimination of vaping",
        order: 2,
        isCompleted: false,
        goals: [
          {
            id: "goal-6",
            phaseId: "phase-6",
            title: "30 days vape-free",
            taskIds: ["task-6"],
            kpis: ["No vaping for 30 consecutive days"],
            isCompleted: false,
          },
        ],
        deadline: new Date(2023, 7, 1),
      },
    ],
    logs: [
      {
        timestamp: new Date(2023, 4, 20),
        content: "Switched from 50mg to 25mg nicotine. Experiencing mild irritability but manageable.",
      },
      {
        timestamp: new Date(2023, 5, 10),
        content: "Now on 3mg nicotine. Finding deep breathing exercises helpful when cravings hit.",
      },
    ],
    createdAt: new Date(2023, 4, 15),
    updatedAt: new Date(2023, 5, 10),
    activityLog: [
      { date: "2023-05-15", duration: 20 },
      { date: "2023-05-20", duration: 15 },
      { date: "2023-05-25", duration: 0 },
      { date: "2023-05-30", duration: 10 },
      { date: "2023-06-05", duration: 30 },
      { date: "2023-06-10", duration: 25 },
    ],
  },
]

// Function to get all operations (mock + task-based)
const getAllOperations = (): Operation[] => {
  const taskOperations: Operation[] = []

  // Get operations created from tasks
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith("operation-")) {
      try {
        const operation = JSON.parse(localStorage.getItem(key) || "{}")
        // Convert date strings back to Date objects
        operation.timeline.start = new Date(operation.timeline.start)
        operation.createdAt = new Date(operation.createdAt)
        operation.updatedAt = new Date(operation.updatedAt)
        if (operation.deadline) operation.deadline = new Date(operation.deadline)
        taskOperations.push(operation)
      } catch (e) {
        console.error("Error parsing operation:", e)
      }
    }
  }

  return [...mockOperations, ...taskOperations]
}

// Calculate progress percentage based on completed phases
const calculateProgress = (operation: Operation): number => {
  if (!operation.phases || operation.phases.length === 0) return 0
  const completedPhases = operation.phases.filter((phase) => phase.isCompleted).length
  return Math.round((completedPhases / operation.phases.length) * 100)
}

// Format date to readable string
const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

// Replace the OperationsPanel component with the updated version
export function OperationsPanel() {
  const [operations, setOperations] = useState<Operation[]>(getAllOperations())
  const [activeView, setActiveView] = useState<string>("overview")
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null)
  const [operationNotes, setOperationNotes] = useState<string>("")
  const tasks = useTaskStore((state) => state.tasks)

  // Handle operation selection
  const handleSelectOperation = (operation: Operation) => {
    setSelectedOperation(operation)
    setActiveView("detail")
    setOperationNotes(operation.notes || "")
  }

  // Handle back to overview
  const handleBackToOverview = () => {
    setSelectedOperation(null)
    setActiveView("overview")
  }

  // Save notes
  const handleSaveNotes = () => {
    if (selectedOperation) {
      const updatedOperations = operations.map((op) =>
        op.id === selectedOperation.id ? { ...op, notes: operationNotes, updatedAt: new Date() } : op,
      )
      setOperations(updatedOperations)
      setSelectedOperation({ ...selectedOperation, notes: operationNotes, updatedAt: new Date() })
    }
  }

  // Auto-save notes effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedOperation && operationNotes !== selectedOperation.notes) {
        handleSaveNotes()
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [operationNotes])

  // Get tasks for the selected operation
  const getOperationTasks = (operationId: string): Task[] => {
    // In a real implementation, this would filter tasks by operationId
    // For now, we'll just return some mock tasks
    return tasks.filter((_, index) => index < 5)
  }

  // Render activity heatmap
  const renderHeatmap = (activityLog?: { date: string; duration: number }[]) => {
    if (!activityLog || activityLog.length === 0) {
      return <div className="text-center py-4 text-muted-foreground">No activity data available</div>
    }

    // Get the last 30 days
    const today = new Date()
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(today.getDate() - (29 - i))
      return date.toISOString().split("T")[0]
    })

    // Create a map of date to duration
    const activityMap = new Map(activityLog.map((log) => [log.date, log.duration]))

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Activity (Last 30 Days)</h4>
        <div className="grid grid-cols-15 gap-1">
          {days.map((day, i) => {
            const duration = activityMap.get(day) || 0
            let intensity = "bg-gray-100"
            if (duration > 0) {
              if (duration < 30) intensity = "bg-green-100"
              else if (duration < 60) intensity = "bg-green-300"
              else intensity = "bg-green-500"
            }

            return <div key={i} className={`w-4 h-4 rounded-sm ${intensity}`} title={`${day}: ${duration} minutes`} />
          })}
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>{days[0]}</span>
          <span>{days[days.length - 1]}</span>
        </div>
      </div>
    )
  }

  useEffect(() => {
    setOperations(getAllOperations())
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Operations</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button size="sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Operation
          </Button>
        </div>
      </div>

      {activeView === "overview" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {operations.map((operation) => (
            <Card
              key={operation.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleSelectOperation(operation)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle>{operation.title}</CardTitle>
                  <Badge
                    className={
                      operation.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : operation.status === "active"
                          ? "bg-blue-100 text-blue-800"
                          : operation.status === "paused"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                    }
                  >
                    {operation.status}
                  </Badge>
                </div>
                <CardDescription>
                  {formatDate(operation.timeline.start)} →{" "}
                  {operation.timeline.end ? formatDate(operation.timeline.end) : "Ongoing"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    {operation.phases?.length || 0} phases • {operation.tasks.length} tasks
                  </div>
                  {operation.phases && operation.phases.length > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${calculateProgress(operation)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <div className="flex flex-wrap gap-1">
                  {operation.goals.map((goal, index) => (
                    <Badge key={index} variant="outline">
                      {goal}
                    </Badge>
                  ))}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        selectedOperation && (
          <div className="space-y-6">
            <Button variant="ghost" onClick={handleBackToOverview}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Operations
            </Button>

            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">{selectedOperation.title}</h2>
                <p className="text-muted-foreground">
                  {formatDate(selectedOperation.timeline.start)} →{" "}
                  {selectedOperation.timeline.end ? formatDate(selectedOperation.timeline.end) : "Ongoing"}
                </p>
              </div>
              <Badge
                className={
                  selectedOperation.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : selectedOperation.status === "active"
                      ? "bg-blue-100 text-blue-800"
                      : selectedOperation.status === "paused"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                }
              >
                {selectedOperation.status}
              </Badge>
            </div>

            <Tabs defaultValue="home">
              <TabsList>
                <TabsTrigger value="home">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </TabsTrigger>
                <TabsTrigger value="todo">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  To-do
                </TabsTrigger>
                <TabsTrigger value="goals">
                  <Target className="h-4 w-4 mr-2" />
                  Goals
                </TabsTrigger>
                <TabsTrigger value="timeline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Timeline
                </TabsTrigger>
              </TabsList>

              <TabsContent value="home" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Notes</CardTitle>
                    <CardDescription>
                      Document your thoughts, progress, and reflections on this operation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Write your notes here..."
                      className="min-h-[200px]"
                      value={operationNotes}
                      onChange={(e) => setOperationNotes(e.target.value)}
                    />
                  </CardContent>
                  <CardFooter>
                    <Button onClick={handleSaveNotes}>Save Notes</Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Activity Tracking</CardTitle>
                    <CardDescription>Visual representation of your work on this operation</CardDescription>
                  </CardHeader>
                  <CardContent>{renderHeatmap(selectedOperation.activityLog)}</CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Created</dt>
                          <dd>{formatDate(selectedOperation.createdAt)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Last Updated</dt>
                          <dd>{formatDate(selectedOperation.updatedAt)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Tasks</dt>
                          <dd>{selectedOperation.tasks.length}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Phases</dt>
                          <dd>{selectedOperation.phases?.length || 0}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Progress</dt>
                          <dd>{calculateProgress(selectedOperation)}%</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button className="w-full justify-start">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Task to This Operation
                      </Button>
                      <Button className="w-full justify-start" variant="outline">
                        <Target className="h-4 w-4 mr-2" />
                        Review Goals
                      </Button>
                      <Button className="w-full justify-start" variant="outline">
                        <Calendar className="h-4 w-4 mr-2" />
                        Log Work Done
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="todo">
                <Card>
                  <CardHeader>
                    <CardTitle>Tasks for {selectedOperation.title}</CardTitle>
                    <CardDescription>Manage tasks associated with this operation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getOperationTasks(selectedOperation.id).length > 0 ? (
                        getOperationTasks(selectedOperation.id).map((task, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                            <div>
                              <h4 className="font-medium">{task.description}</h4>
                              <p className="text-sm text-muted-foreground">
                                {task.estimatedDuration} min • Priority: {task.importance + task.urgency}/10
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                Edit
                              </Button>
                              <Button size="sm" variant="outline">
                                Schedule
                              </Button>
                              <Button size="sm">Complete</Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No tasks associated with this operation yet.
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add New Task
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="goals" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Operation Goals</CardTitle>
                    <CardDescription>High-level goals for the entire operation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedOperation.goals.map((goal, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                            {index + 1}
                          </div>
                          <span>{goal}</span>
                        </div>
                      ))}
                    </div>
                    <Button className="mt-4" variant="outline" size="sm">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Goal
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Phases & Milestones</CardTitle>
                      <Button size="sm">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Phase
                      </Button>
                    </div>
                    <CardDescription>
                      Break down your operation into manageable phases with specific goals
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedOperation.phases && selectedOperation.phases.length > 0 ? (
                      <div className="space-y-6">
                        {selectedOperation.phases.map((phase, phaseIndex) => (
                          <div key={phaseIndex} className="border rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <h3 className="text-lg font-medium flex items-center">
                                <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs mr-2">
                                  {phaseIndex + 1}
                                </span>
                                {phase.name}
                              </h3>
                              <Badge variant={phase.isCompleted ? "default" : "outline"}>
                                {phase.isCompleted ? "Completed" : "In Progress"}
                              </Badge>
                            </div>

                            {phase.description && <p className="text-muted-foreground mb-3">{phase.description}</p>}

                            <div className="space-y-3 mt-4">
                              <h4 className="text-sm font-medium">Goals:</h4>
                              {phase.goals.map((goal, goalIndex) => (
                                <div key={goalIndex} className="border-l-2 border-blue-500 pl-3 py-1">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-medium">{goal.title}</h5>
                                    <Badge variant={goal.isCompleted ? "default" : "outline"} className="ml-2">
                                      {goal.isCompleted ? "Completed" : "Pending"}
                                    </Badge>
                                  </div>

                                  {goal.kpis && goal.kpis.length > 0 && (
                                    <div className="mt-2">
                                      <h6 className="text-xs text-muted-foreground mb-1">KPIs:</h6>
                                      <ul className="list-disc list-inside text-sm">
                                        {goal.kpis.map((kpi, kpiIndex) => (
                                          <li key={kpiIndex}>{kpi}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  <div className="flex gap-2 mt-2">
                                    <Button size="sm" variant="outline">
                                      Edit
                                    </Button>
                                    <Button size="sm" variant="outline">
                                      View Tasks ({goal.taskIds.length})
                                    </Button>
                                  </div>
                                </div>
                              ))}

                              <Button size="sm" variant="ghost" className="mt-2">
                                <PlusCircle className="h-3 w-3 mr-1" />
                                Add Goal to Phase
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No phases defined for this operation yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Operation Timeline</CardTitle>
                    <CardDescription>Plan and visualize the timeline for this operation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Operation Timeframe</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(selectedOperation.timeline.start)} →{" "}
                            {selectedOperation.deadline ? formatDate(selectedOperation.deadline) : "No end date set"}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Set Deadline
                        </Button>
                      </div>

                      <div className="relative pt-6 pb-12">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gray-200"></div>

                        {selectedOperation.phases &&
                          selectedOperation.phases.map((phase, index) => {
                            // Calculate position based on dates
                            const start = selectedOperation.timeline.start.getTime()
                            const end = selectedOperation.deadline
                              ? selectedOperation.deadline.getTime()
                              : new Date().getTime() + 30 * 24 * 60 * 60 * 1000
                            const phaseDate = phase.deadline
                              ? phase.deadline.getTime()
                              : start + (end - start) * ((index + 1) / (selectedOperation.phases?.length || 1))

                            const position = ((phaseDate - start) / (end - start)) * 100

                            return (
                              <div
                                key={index}
                                className="absolute transform -translate-x-1/2"
                                style={{ left: `${Math.min(Math.max(position, 0), 100)}%`, top: 0 }}
                              >
                                <div
                                  className={`h-3 w-3 rounded-full ${phase.isCompleted ? "bg-green-500" : "bg-blue-500"} mb-1`}
                                ></div>
                                <div className="text-xs font-medium whitespace-nowrap transform -translate-x-1/2">
                                  {phase.name}
                                  <br />
                                  <span className="text-muted-foreground">
                                    {phase.deadline ? formatDate(phase.deadline) : "No deadline"}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Planning</CardTitle>
                    <CardDescription>Plan tasks by week for the duration of the operation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {Array.from({ length: 4 }, (_, i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <h3 className="font-medium mb-2">Week {i + 1}</h3>
                          <div className="space-y-2">
                            {i === 0 ? (
                              <>
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span>Submit documentation</span>
                                  <Badge>Completed</Badge>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span>Pay initial fees</span>
                                  <Badge variant="outline">Pending</Badge>
                                </div>
                              </>
                            ) : i === 1 ? (
                              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span>Schedule pickup appointment</span>
                                <Badge variant="outline">Pending</Badge>
                              </div>
                            ) : (
                              <div className="text-center py-4 text-muted-foreground">
                                No tasks scheduled for this week
                              </div>
                            )}
                          </div>
                          <Button size="sm" variant="ghost" className="mt-2">
                            <PlusCircle className="h-3 w-3 mr-1" />
                            Add Task to Week {i + 1}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button>Auto-Schedule Remaining Tasks</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )
      )}
    </div>
  )
}
