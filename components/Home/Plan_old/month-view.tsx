"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, ChevronRight, Clock, Edit3, Sparkles } from "lucide-react"
import { useTaskStore } from "@/lib/task-store"
import { formatDateKey } from "@/lib/date-utils"
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addDays,
} from "date-fns"
import type { CalendarEvent } from "@/lib/types"
import { PlannedTasksSidebar } from "./planned-tasks-sidebar"

interface MonthViewProps {
  currentDate: Date
  setCurrentDate: (date: Date) => void
  events: CalendarEvent[]
  setEvents: (events: CalendarEvent[]) => void
  onTaskClick: (taskId: string) => void
  onEventClick: (event: CalendarEvent) => void
  onCreateEvent: (date: Date, hour?: number) => void
}

export function MonthView({
  currentDate,
  setCurrentDate,
  events,
  setEvents,
  onTaskClick,
  onEventClick,
  onCreateEvent,
}: MonthViewProps) {
  const { tasks, updateTask } = useTaskStore()
  const [monthPlan, setMonthPlan] = useState("")

  // Load month plan from localStorage
  useEffect(() => {
    const monthKey = format(currentDate, "yyyy-MM")
    const savedPlan = localStorage.getItem(`monthPlan-${monthKey}`)
    if (savedPlan !== null && savedPlan !== monthPlan) {
      setMonthPlan(savedPlan)
    } else if (savedPlan === null && monthPlan !== "") {
      setMonthPlan("")
    }
  }, [currentDate])

  // Save month plan to localStorage
  useEffect(() => {
    const monthKey = format(currentDate, "yyyy-MM")
    localStorage.setItem(`monthPlan-${monthKey}`, monthPlan)
  }, [monthPlan, currentDate])

  const getScheduledTasks = (date: Date) => {
    return tasks.filter(
      (task) => task.scheduledDate && formatDateKey(new Date(task.scheduledDate)) === formatDateKey(date),
    )
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDate = addDays(monthStart, -monthStart.getDay())
  const endDate = addDays(monthEnd, 6 - monthEnd.getDay())
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>, date: Date) => {
    const taskId = e.dataTransfer.getData("taskId")
    const eventId = e.dataTransfer.getData("eventId")

    if (taskId) {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        updateTask({ ...task, scheduledDate: date })
      }
    } else if (eventId) {
      setEvents(events.map((event) => (event.id === eventId ? { ...event, date } : event)))
    }
  }

  return (
    <div className="flex gap-6 h-full">
      <PlannedTasksSidebar onTaskClick={onTaskClick} />

      <div className="flex-1 space-y-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="hover:bg-blue-50 hover:border-blue-200 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              {format(currentDate, "MMMM yyyy")}
            </h3>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="hover:bg-blue-50 hover:border-blue-200 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={() => setCurrentDate(new Date())}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md"
          >
            Today
          </Button>
        </div>

        {/* Calendar grid */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b border-slate-200">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="p-4 text-center font-semibold text-slate-700 bg-gradient-to-b from-slate-50 to-white border-r border-slate-200 last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarDays.map((date, index) => {
                const dayEvents = events.filter((event) => formatDateKey(event.date) === formatDateKey(date))
                const dayTasks = getScheduledTasks(date)
                const isCurrentMonth = isSameMonth(date, currentDate)
                const isCurrentDay = isToday(date)

                return (
                  <div
                    key={index}
                    className={`min-h-[140px] border-r border-b border-slate-200 last:border-r-0 p-3 transition-all duration-200 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 cursor-pointer group ${
                      !isCurrentMonth ? "bg-slate-50/50 text-slate-400" : "bg-white"
                    } ${isCurrentDay ? "bg-gradient-to-br from-blue-100 to-purple-100 border-blue-300 shadow-inner" : ""}`}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, date)}
                    onClick={() => onCreateEvent(date)}
                  >
                    <div
                      className={`text-sm font-semibold mb-3 flex items-center justify-between ${
                        isCurrentDay ? "text-blue-700" : isCurrentMonth ? "text-slate-700" : "text-slate-400"
                      }`}
                    >
                      <span>{format(date, "d")}</span>
                      {isCurrentDay && <Sparkles className="h-3 w-3 text-blue-500" />}
                    </div>

                    <div className="space-y-1">
                      {/* Events */}
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="text-xs p-2 rounded-md text-white cursor-pointer truncate shadow-sm hover:shadow-md transition-shadow"
                          style={{ backgroundColor: event.color }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick(event)
                          }}
                        >
                          <div className="font-medium">{event.startTime}</div>
                          <div className="opacity-90">{event.title}</div>
                        </div>
                      ))}

                      {/* Tasks */}
                      {dayTasks.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          className="text-xs p-2 rounded-md bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 cursor-pointer truncate border border-emerald-200 hover:shadow-sm transition-shadow"
                          onClick={(e) => {
                            e.stopPropagation()
                            onTaskClick(task.id)
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="font-medium truncate">{task.description}</span>
                          </div>
                        </div>
                      ))}

                      {/* Show more indicator */}
                      {dayEvents.length + dayTasks.length > 4 && (
                        <div className="text-xs text-slate-500 font-medium">
                          +{dayEvents.length + dayTasks.length - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Month plan */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
              <Edit3 className="h-5 w-5 text-blue-500" />
              Month Plan - {format(currentDate, "MMMM yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Write your month plan, goals, and objectives..."
              value={monthPlan}
              onChange={(e) => setMonthPlan(e.target.value)}
              rows={6}
              className="resize-none border-slate-200 focus:border-blue-300 focus:ring-blue-200 bg-white/50"
            />
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Auto-saved to local storage
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
