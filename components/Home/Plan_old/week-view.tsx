"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, ChevronRight, Clock, Edit3, Sparkles } from "lucide-react"
import { useTaskStore } from "@/lib/task-store"
import { formatDateKey, getWeekStartDate, getWeekDates } from "@/lib/date-utils"
import { format, addWeeks, subWeeks, isToday } from "date-fns"
import type { CalendarEvent } from "@/lib/types"
import { PlannedTasksSidebar } from "./planned-tasks-sidebar"

interface WeekViewProps {
  currentDate: Date
  setCurrentDate: (date: Date) => void
  events: CalendarEvent[]
  setEvents: (events: CalendarEvent[]) => void
  onTaskClick: (taskId: string) => void
  onEventClick: (event: CalendarEvent) => void
  onCreateEvent: (date: Date, hour?: number) => void
}

export function WeekView({
  currentDate,
  setCurrentDate,
  events,
  setEvents,
  onTaskClick,
  onEventClick,
  onCreateEvent,
}: WeekViewProps) {
  const { tasks, updateTask } = useTaskStore()
  const [weekPlan, setWeekPlan] = useState("")
  const isUserEditing = useRef(false)
  const weekStartRef = useRef("")

  const weekStart = getWeekStartDate(currentDate)
  const weekDates = getWeekDates(weekStart)
  const weekKey = format(weekStart, "yyyy-'W'ww")

  // Only load from localStorage when the week changes, not when typing
  useEffect(() => {
    // Update the ref to track the current week
    if (weekStartRef.current !== weekKey) {
      weekStartRef.current = weekKey

      // Only load from localStorage if user is not actively editing
      if (!isUserEditing.current) {
        const savedPlan = localStorage.getItem(`weekPlan-${weekKey}`)
        console.log("Loading week plan from localStorage:", savedPlan)

        if (savedPlan !== null) {
          setWeekPlan(savedPlan)
        } else {
          setWeekPlan("")
        }
      }
    }
  }, [weekKey])

  // Save to localStorage when weekPlan changes, but don't trigger a re-render
  useEffect(() => {
    console.log("Saving week plan to localStorage:", weekPlan)
    localStorage.setItem(`weekPlan-${weekKey}`, weekPlan)
  }, [weekPlan, weekKey])

  const handleWeekPlanChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    isUserEditing.current = true
    setWeekPlan(e.target.value)
    // Reset the editing flag after a short delay
    setTimeout(() => {
      isUserEditing.current = false
    }, 500)
  }

  const getScheduledTasks = (date: Date) => {
    return tasks.filter(
      (task) => task.scheduledDate && formatDateKey(new Date(task.scheduledDate)) === formatDateKey(date),
    )
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>, date: Date, hour: number) => {
    const taskId = e.dataTransfer.getData("taskId")
    const eventId = e.dataTransfer.getData("eventId")

    if (taskId) {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        const scheduledDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour)
        updateTask({
          ...task,
          scheduledDate,
          scheduledTime: `${hour.toString().padStart(2, "0")}:00`,
        })
      }
    } else if (eventId) {
      setEvents(
        events.map((event) =>
          event.id === eventId
            ? {
                ...event,
                date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                startTime: `${hour.toString().padStart(2, "0")}:00`,
                endTime: `${(hour + 1).toString().padStart(2, "0")}:00`,
              }
            : event,
        ),
      )
    }
  }

  const onTaskDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId)
  }

  const onEventDragStart = (e: React.DragEvent<HTMLDivElement>, eventId: string) => {
    e.dataTransfer.setData("eventId", eventId)
  }

  const getEventHeight = (event: CalendarEvent) => {
    const startHour = Number.parseInt(event.startTime.split(":")[0])
    const endHour = Number.parseInt(event.endTime.split(":")[0])
    const duration = endHour - startHour || 1
    return duration * 60
  }

  const getTaskHeight = (task: any) => {
    return Math.max(60, (task.estimatedDuration / 60) * 60)
  }

  return (
    <div className="flex gap-6 h-1/2">
      <PlannedTasksSidebar onTaskClick={onTaskClick} />

      <div className="space-y-6 flex-1">
        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
              className="hover:bg-blue-50 hover:border-blue-200 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              {format(weekStart, "MMM d")} - {format(weekDates[6], "MMM d, yyyy")}
            </h3>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
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

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm h-1/2 overflow-auto">
          <CardContent className="p-0">
            <div className="grid grid-cols-8 gap-0 border rounded-lg overflow-hidden">
              {/* Time column header */}
              <div className="bg-gradient-to-b from-slate-50 to-white p-4 border-r border-slate-200">
                <span className="text-sm font-semibold text-slate-700">Time</span>
              </div>

              {/* Day headers */}
              {weekDates.map((date, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-b from-slate-50 to-white p-4 border-r border-slate-200 last:border-r-0 text-center"
                >
                  <div className="text-sm font-semibold text-slate-700">{format(date, "EEE")}</div>
                  <div
                    className={`text-xl font-bold mt-1 ${
                      isToday(date)
                        ? "text-blue-600 bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                        : "text-slate-700"
                    }`}
                  >
                    {format(date, "d")}
                  </div>
                </div>
              ))}

              {/* Time slots */}
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className="contents">
                  {/* Time label */}
                  <div className="p-3 border-r border-b border-slate-200 text-xs text-slate-500 bg-gradient-to-r from-slate-50 to-white">
                    {hour.toString().padStart(2, "0")}:00
                  </div>

                  {/* Day columns */}
                  {weekDates.map((date, dayIndex) => {
                    const dayEvents = events.filter(
                      (event) =>
                        formatDateKey(event.date) === formatDateKey(date) &&
                        Number.parseInt(event.startTime.split(":")[0]) === hour,
                    )

                    const dayTasks = getScheduledTasks(date).filter(
                      (task) => task.scheduledTime && Number.parseInt(task.scheduledTime.split(":")[0]) === hour,
                    )

                    return (
                      <div
                        key={`${hour}-${dayIndex}`}
                        className={`min-h-[60px] border-r border-b border-slate-200 last:border-r-0 p-1 relative hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 cursor-pointer transition-all duration-200 ${
                          isToday(date) ? "bg-blue-50/30" : ""
                        }`}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, date, hour)}
                        onClick={() => onCreateEvent(date, hour)}
                      >
                        {/* Events */}
                        {dayEvents.map((event) => (
                          <div
                            key={event.id}
                            className="absolute inset-1 rounded-lg text-xs text-white p-2 cursor-pointer shadow-md hover:shadow-lg transition-shadow"
                            style={{
                              backgroundColor: event.color,
                              height: `${getEventHeight(event)}px`,
                            }}
                            draggable
                            onDragStart={(e) => onEventDragStart(e, event.id)}
                            onClick={(e) => {
                              e.stopPropagation()
                              onEventClick(event)
                            }}
                          >
                            <div className="font-semibold truncate">{event.title}</div>
                            <div className="opacity-90 text-xs">
                              {event.startTime} - {event.endTime}
                            </div>
                          </div>
                        ))}

                        {/* Tasks */}
                        {dayTasks.map((task) => (
                          <div
                            key={task.id}
                            className="absolute inset-1 rounded-lg text-xs bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 p-2 cursor-pointer border border-emerald-200 shadow-md hover:shadow-lg transition-shadow"
                            style={{
                              height: `${getTaskHeight(task)}px`,
                              top: `${dayEvents.length * 60 + 4}px`,
                            }}
                            draggable
                            onDragStart={(e) => onTaskDragStart(e, task.id)}
                            onClick={(e) => {
                              e.stopPropagation()
                              onTaskClick(task.id)
                            }}
                          >
                            <div className="font-semibold truncate flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {task.description}
                            </div>
                            <div className="opacity-75 text-xs">{task.estimatedDuration}m</div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Week plan */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
              <Edit3 className="h-5 w-5 text-blue-500" />
              Week Plan - {format(weekStart, "MMM d")} to {format(weekDates[6], "MMM d")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Write your week plan, priorities, and focus areas..."
              value={weekPlan}
              onChange={handleWeekPlanChange}
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
