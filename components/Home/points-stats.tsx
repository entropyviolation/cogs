"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Trophy, Target, Calendar, TrendingUp } from "lucide-react"
import { usePointsStore } from "@/lib/points-store"
import { useTaskStore } from "@/lib/task-store"

interface PointsStatsProps {
  currentDate: Date
}

export function PointsStats({ currentDate }: PointsStatsProps) {
  const { tasks } = useTaskStore()
  const {
    getTotalPoints,
    getDayPoints,
    getWeekPoints,
    getMonthPoints,
    getPossibleDayPoints,
    getPossibleWeekPoints,
    getPossibleMonthPoints,
  } = usePointsStore()

  const totalPoints = getTotalPoints()
  const dayPoints = getDayPoints(currentDate)
  const weekPoints = getWeekPoints(currentDate)
  const monthPoints = getMonthPoints(currentDate)

  const possibleDayPoints = getPossibleDayPoints(currentDate, tasks)
  const possibleWeekPoints = getPossibleWeekPoints(currentDate, tasks)
  const possibleMonthPoints = getPossibleMonthPoints(currentDate, tasks)

  const dayProgress = possibleDayPoints > 0 ? (dayPoints / (dayPoints + possibleDayPoints)) * 100 : 0
  const weekProgress = possibleWeekPoints > 0 ? (weekPoints / (weekPoints + possibleWeekPoints)) * 100 : 0
  const monthProgress = possibleMonthPoints > 0 ? (monthPoints / (monthPoints + possibleMonthPoints)) * 100 : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="card-hover">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-600" />
            All Time Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{totalPoints.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">Total earned</p>
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-green-600" />
            Today's Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{dayPoints}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {possibleDayPoints > 0 && `+${possibleDayPoints} possible`}
          </div>
          {possibleDayPoints > 0 && <Progress value={dayProgress} className="mt-2 h-2" />}
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{weekPoints}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {possibleWeekPoints > 0 && `+${possibleWeekPoints} possible`}
          </div>
          {possibleWeekPoints > 0 && <Progress value={weekProgress} className="mt-2 h-2" />}
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{monthPoints}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {possibleMonthPoints > 0 && `+${possibleMonthPoints} possible`}
          </div>
          {possibleMonthPoints > 0 && <Progress value={monthProgress} className="mt-2 h-2" />}
        </CardContent>
      </Card>
    </div>
  )
}
