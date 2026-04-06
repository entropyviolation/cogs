"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Target, Plus, Clock, TrendingUp, Star } from "lucide-react"
import { WeeklyTaskTracker } from "@/components/Home/Habits/habit-tracker"
import { PlanPanel } from "@/components/Home/Plan/plan-panel"
import { TodoPanel } from "@/components/Home/ToDo/todo-panel"
import { GoalsTracker } from "@/components/Home/Goals/goals-tracker"
import { PointsStats } from "@/components/Home/points-stats"
import { format } from "date-fns"

export function HomeDashboard() {
  const [currentDate] = useState(new Date())

  return (
    <div className="space-y-6">
      {/* Header with date and points stats */}
      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="flex-1 card-hover">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">{format(currentDate, "EEEE, MMMM d")}</CardTitle>
                <p className="text-muted-foreground">{format(currentDate, "yyyy")}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <PointsStats currentDate={currentDate} />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:w-80 card-hover">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              Plan Day
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Star className="h-4 w-4 mr-2" />
              Set Goal
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Review Progress
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main dashboard tabs */}
      <Tabs defaultValue="habits" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="habits">Daily Habits</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="todo">To Do</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>

        <TabsContent value="habits" className="mt-6">
          <WeeklyTaskTracker />
        </TabsContent>

        <TabsContent value="plan" className="mt-6">
          <PlanPanel />
        </TabsContent>

        <TabsContent value="todo" className="mt-6">
          <TodoPanel />
        </TabsContent>

        <TabsContent value="goals" className="mt-6">
          <GoalsTracker />
        </TabsContent>


      </Tabs>
    </div>
  )
}
