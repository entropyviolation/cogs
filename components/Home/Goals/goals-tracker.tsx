"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Target, Plus, CheckCircle2, Book, Waves, Trophy } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Goal {
  id: string
  title: string
  type: "numerical" | "boolean" | "count"
  target: number
  current: number
  period: "week" | "month" | "year"
  category: string
  deadline?: Date
  completed: boolean
}

export function GoalsTracker() {
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: "1",
      title: "Read 7 books",
      type: "count",
      target: 7,
      current: 3,
      period: "month",
      category: "Learning",
      completed: false,
    },
    {
      id: "2",
      title: "Surf 10 times",
      type: "count",
      target: 10,
      current: 6,
      period: "month",
      category: "Health",
      completed: false,
    },
    {
      id: "3",
      title: "Finish Allieprime project",
      type: "boolean",
      target: 1,
      current: 0,
      period: "week",
      category: "Work",
      completed: false,
    },
  ])

  const [showAddGoal, setShowAddGoal] = useState(false)
  const [newGoal, setNewGoal] = useState({
    title: "",
    type: "count" as const,
    target: 1,
    period: "month" as const,
    category: "Personal",
  })

  const handleAddGoal = () => {
    const goal: Goal = {
      id: Date.now().toString(),
      ...newGoal,
      current: 0,
      completed: false,
    }
    setGoals([...goals, goal])
    setNewGoal({
      title: "",
      type: "count",
      target: 1,
      period: "month",
      category: "Personal",
    })
    setShowAddGoal(false)
  }

  const updateGoalProgress = (goalId: string, newCurrent: number) => {
    setGoals(
      goals.map((goal) =>
        goal.id === goalId ? { ...goal, current: newCurrent, completed: newCurrent >= goal.target } : goal,
      ),
    )
  }

  const getGoalsByPeriod = (period: "week" | "month" | "year") => {
    return goals.filter((goal) => goal.period === period)
  }

  const getGoalIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "learning":
        return <Book className="h-4 w-4" />
      case "health":
        return <Waves className="h-4 w-4" />
      case "work":
        return <Trophy className="h-4 w-4" />
      default:
        return <Target className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "learning":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "health":
        return "bg-green-100 text-green-800 border-green-200"
      case "work":
        return "bg-purple-100 text-purple-800 border-purple-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const renderGoalCard = (goal: Goal) => (
    <Card key={goal.id} className="card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getGoalIcon(goal.category)}
            <CardTitle className="text-lg">{goal.title}</CardTitle>
          </div>
          <Badge className={getCategoryColor(goal.category)}>{goal.category}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Progress</span>
            <span className="font-medium">
              {goal.current} / {goal.target}
              {goal.type === "count" && " items"}
            </span>
          </div>

          <Progress value={(goal.current / goal.target) * 100} className="h-3" />

          {goal.type === "count" && !goal.completed && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateGoalProgress(goal.id, Math.max(0, goal.current - 1))}
              >
                -1
              </Button>
              <Button size="sm" onClick={() => updateGoalProgress(goal.id, goal.current + 1)}>
                +1
              </Button>
            </div>
          )}

          {goal.type === "boolean" && !goal.completed && (
            <Button className="w-full" onClick={() => updateGoalProgress(goal.id, 1)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          )}

          {goal.completed && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">Completed!</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Goals & Targets</h2>
          <p className="text-muted-foreground">Track your specific, measurable objectives</p>
        </div>

        <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="goal-title">Goal Title</Label>
                <Input
                  id="goal-title"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  placeholder="e.g., Read 5 books"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="goal-type">Type</Label>
                  <Select value={newGoal.type} onValueChange={(value: any) => setNewGoal({ ...newGoal, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Count</SelectItem>
                      <SelectItem value="boolean">Yes/No</SelectItem>
                      <SelectItem value="numerical">Numerical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="goal-target">Target</Label>
                  <Input
                    id="goal-target"
                    type="number"
                    value={newGoal.target}
                    onChange={(e) => setNewGoal({ ...newGoal, target: Number.parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="goal-period">Period</Label>
                  <Select
                    value={newGoal.period}
                    onValueChange={(value: any) => setNewGoal({ ...newGoal, period: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="goal-category">Category</Label>
                  <Select
                    value={newGoal.category}
                    onValueChange={(value) => setNewGoal({ ...newGoal, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Learning">Learning</SelectItem>
                      <SelectItem value="Health">Health</SelectItem>
                      <SelectItem value="Work">Work</SelectItem>
                      <SelectItem value="Personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleAddGoal} className="w-full">
                Add Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Goals by period */}
      <Tabs defaultValue="month" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="year">This Year</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {getGoalsByPeriod("week").map(renderGoalCard)}
            {getGoalsByPeriod("week").length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No weekly goals set. Add one to get started!
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="month" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {getGoalsByPeriod("month").map(renderGoalCard)}
            {getGoalsByPeriod("month").length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No monthly goals set. Add one to get started!
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="year" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {getGoalsByPeriod("year").map(renderGoalCard)}
            {getGoalsByPeriod("year").length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No yearly goals set. Add one to get started!
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
