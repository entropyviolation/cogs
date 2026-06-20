/**
 * components/Home/Goals/goals-tracker.tsx — Goals with persistence & points
 */
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Target, Plus, CheckCircle2, Book, Waves, Trophy, Pencil, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useGoalsStore } from "@/lib/goals-store"
import type { Goal } from "@/lib/types"

export function GoalsTracker() {
  const goals = useGoalsStore((s) => s.goals)
  const addGoal = useGoalsStore((s) => s.addGoal)
  const updateGoal = useGoalsStore((s) => s.updateGoal)
  const deleteGoal = useGoalsStore((s) => s.deleteGoal)
  const setProgress = useGoalsStore((s) => s.setProgress)

  const [showAddGoal, setShowAddGoal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [newGoal, setNewGoal] = useState<{
    title: string
    description: string
    type: Goal["type"]
    target: number
    period: Goal["period"]
    category: string
    points: number
  }>({
    title: "",
    description: "",
    type: "count" as const,
    target: 1,
    period: "month" as const,
    category: "Personal",
    points: 25,
  })

  const handleAddGoal = () => {
    if (!newGoal.title.trim()) return
    addGoal(newGoal)
    setNewGoal({ title: "", description: "", type: "count", target: 1, period: "month", category: "Personal", points: 25 })
    setShowAddGoal(false)
  }

  const getGoalsByPeriod = (period: Goal["period"]) => goals.filter((g) => g.period === period)

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
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {getGoalIcon(goal.category)}
            <CardTitle className="text-lg truncate">{goal.title}</CardTitle>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline">{goal.points} pts</Badge>
            <Badge className={getCategoryColor(goal.category)}>{goal.category}</Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingGoal(goal)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {goal.description && <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>}
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
          <Progress value={Math.min(100, (goal.current / Math.max(goal.target, 1)) * 100)} className="h-3" />
          {(goal.type === "count" || goal.type === "numerical") && !goal.completed && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setProgress(goal.id, Math.max(0, goal.current - 1))}>
                -1
              </Button>
              <Button size="sm" onClick={() => setProgress(goal.id, goal.current + 1)}>
                +1
              </Button>
              <Input
                type="number"
                className="h-8 w-20"
                value={goal.current}
                onChange={(e) => setProgress(goal.id, Number.parseInt(e.target.value) || 0)}
              />
            </div>
          )}
          {goal.type === "boolean" && !goal.completed && (
            <Button className="w-full" onClick={() => setProgress(goal.id, 1)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Complete (+{goal.points} pts)
            </Button>
          )}
          {goal.completed && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">Completed — {goal.points} points earned</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const goalForm = (
    fields: {
      title: string
      description: string
      type: Goal["type"]
      target: number
      period: Goal["period"]
      category: string
      points: number
    },
    onChange: (v: typeof fields) => void,
    onSubmit: () => void,
    submitLabel: string,
  ) => (
    <div className="space-y-4">
      <div>
        <Label>Goal Title</Label>
        <Input value={fields.title} onChange={(e) => onChange({ ...fields, title: e.target.value })} placeholder="e.g., Read 5 books" />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={fields.description} onChange={(e) => onChange({ ...fields, description: e.target.value })} rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type</Label>
          <Select value={fields.type} onValueChange={(v) => onChange({ ...fields, type: v as typeof fields.type })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Count</SelectItem>
              <SelectItem value="boolean">Yes/No</SelectItem>
              <SelectItem value="numerical">Numerical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Target</Label>
          <Input type="number" value={fields.target} onChange={(e) => onChange({ ...fields, target: Number.parseInt(e.target.value) || 1 })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Period</Label>
          <Select value={fields.period} onValueChange={(v) => onChange({ ...fields, period: v as typeof fields.period })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Category</Label>
          <Select value={fields.category} onValueChange={(v) => onChange({ ...fields, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Learning">Learning</SelectItem>
              <SelectItem value="Health">Health</SelectItem>
              <SelectItem value="Work">Work</SelectItem>
              <SelectItem value="Personal">Personal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Points reward</Label>
          <Input type="number" value={fields.points} onChange={(e) => onChange({ ...fields, points: Number.parseInt(e.target.value) || 0 })} />
        </div>
      </div>
      <Button onClick={onSubmit} className="w-full">{submitLabel}</Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Goals & Targets</h2>
          <p className="text-muted-foreground">Specific objectives with point rewards — saved automatically</p>
        </div>
        <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Goal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Goal</DialogTitle></DialogHeader>
            {goalForm(newGoal, setNewGoal, handleAddGoal, "Add Goal")}
          </DialogContent>
        </Dialog>
      </div>

      {editingGoal && (
        <Dialog open onOpenChange={() => setEditingGoal(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Goal</DialogTitle></DialogHeader>
            {goalForm(
              {
                title: editingGoal.title,
                description: editingGoal.description || "",
                type: editingGoal.type,
                target: editingGoal.target,
                period: editingGoal.period,
                category: editingGoal.category,
                points: editingGoal.points,
              },
              (v) => setEditingGoal({ ...editingGoal, ...v }),
              () => {
                updateGoal(editingGoal)
                setEditingGoal(null)
              },
              "Save Changes",
            )}
            <Button variant="destructive" className="w-full mt-2" onClick={() => { deleteGoal(editingGoal.id); setEditingGoal(null) }}>
              <Trash2 className="h-4 w-4 mr-2" />Delete Goal
            </Button>
          </DialogContent>
        </Dialog>
      )}

      <Tabs defaultValue="month" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="year">This Year</TabsTrigger>
        </TabsList>
        {(["week", "month", "year"] as const).map((period) => (
          <TabsContent key={period} value={period} className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getGoalsByPeriod(period).map(renderGoalCard)}
              {getGoalsByPeriod(period).length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No {period}ly goals set. Add one to get started!
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
