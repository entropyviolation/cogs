"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, ChevronRight, Clock, Edit3, Calendar, Sparkles, MapPin } from "lucide-react"
import { useTaskStore } from "@/lib/task-store"
import { useEventStore } from "@/lib/event-store"
import { formatDateKey } from "@/lib/date-utils"
import { format, addDays, subDays } from "date-fns"
import type { CalendarEvent } from "@/lib/types"
import { PlannedTasksSidebar } from "./planned-tasks-sidebar"

interface DayViewProps {
  currentDate: Date
  setCurrentDate: (date: Date) => void
  events: CalendarEvent[]
  setEvents: (events: CalendarEvent[]) => void
  onTaskClick: (taskId: string) => void
  onEventClick: (event: CalendarEvent) => void
  onCreateEvent: (date: Date, hour?: number) => void
}

export function DayView({
  currentDate,
  setCurrentDate,
  events,
  setEvents,
  onTaskClick,
  onEventClick,
  onCreateEvent,
}: DayViewProps) {
  const { tasks, updateTask } = useTaskStore()
  const { updateEvent } = useEventStore()
  const [dayPlan, setDayPlan] = useState("")

  // Load day plan from localStorage on currentDate change
  useEffect(() => {
    const dayKey = formatDateKey(currentDate)
    const savedPlan = localStorage.getItem(`dayPlan-${dayKey}`)
    if (savedPlan !== null && savedPlan !== dayPlan) {
      setDayPlan(savedPlan)
      console.log("savedPlan :", savedPlan)
    } else if (savedPlan === null && dayPlan !== "") {
      setDayPlan("")
      console.log("savedPlan null")
    }
  }, [currentDate])

  // Save day plan to localStorage whenever dayPlan or currentDate changes
  useEffect(() => {
    const dayKey = formatDateKey(currentDate)
    console.log("DAYPLAN OR CURRENT DATE CHANGED \n dayPlan :", dayPlan, "\n current date :", currentDate)
    localStorage.setItem(`dayPlan-${dayKey}`, dayPlan)
  }, [dayPlan, currentDate])

  const getScheduledTasks = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.scheduledDate) return false

      try {
        const taskDate = task.scheduledDate instanceof Date ? task.scheduledDate : new Date(task.scheduledDate)
        if (isNaN(taskDate.getTime())) return false

        return formatDateKey(taskDate) === formatDateKey(date)
      } catch {
        return false
      }
    })
  }

  const dayEvents = events.filter((event) => {
    try {
      const eventDate = event.date instanceof Date ? event.date : new Date(event.date)
      if (isNaN(eventDate.getTime())) return false

      return formatDateKey(eventDate) === formatDateKey(currentDate)
    } catch {
      return false
    }
  })
  const dayTasks = getScheduledTasks(currentDate)
  const allDayEvents = dayEvents.filter((event) => event.isAllDay)
  const timedEvents = dayEvents.filter((event) => !event.isAllDay)

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>, hour: number) => {
    const taskId = e.dataTransfer.getData("taskId")
    const eventId = e.dataTransfer.getData("eventId")

    if (taskId) {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        const scheduledDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hour)
        updateTask({ ...task, scheduledDate, scheduledTime: `${hour.toString().padStart(2, "0")}:00` })
      }
    } else if (eventId) {
      const event = events.find((e) => e.id === eventId)
      if (event && !event.isAllDay) {
        const updatedEvent = {
          ...event,
          date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
          startTime: `${hour.toString().padStart(2, "0")}:00`,
          endTime: `${(hour + Math.ceil(getEventDurationMinutes(event) / 60)).toString().padStart(2, "0")}:00`,
        }
        updateEvent(updatedEvent)
      }
    }
  }

  const onTaskDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId)
  }

  const onEventDragStart = (e: React.DragEvent<HTMLDivElement>, eventId: string) => {
    e.dataTransfer.setData("eventId", eventId)
  }

  const getEventDurationMinutes = (event: CalendarEvent): number => {
    const [startHour, startMin] = event.startTime.split(":").map(Number)
    const [endHour, endMin] = event.endTime.split(":").map(Number)
    return endHour * 60 + endMin - (startHour * 60 + startMin)
  }

  const getEventHeight = (event: CalendarEvent): number => {
    const durationMinutes = getEventDurationMinutes(event)
    return Math.max(60, (durationMinutes / 60) * 70) // 70px per hour
  }

  const getTaskHeight = (task: any): number => {
    return Math.max(60, (task.estimatedDuration / 60) * 70) // 70px per hour
  }

  return (
    <div className="flex gap-6 h-full">
      <PlannedTasksSidebar onTaskClick={onTaskClick} />

      <div className="space-y-6 flex-1">
        {/* Day navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subDays(currentDate, 1))}
              className="hover:bg-blue-50 hover:border-blue-200 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              {format(currentDate, "EEEE, MMMM d, yyyy")}
            </h3>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
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

        {/* All-day events banner */}
        {allDayEvents.length > 0 && (
          <Card className="shadow-lg border-0 bg-gradient-to-r from-purple-100 to-blue-100">
            <CardContent className="p-4">
              <div className="space-y-2">
                {allDayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 bg-white/80 rounded-lg cursor-pointer hover:bg-white/90 transition-colors"
                    onClick={() => onEventClick(event)}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color }} />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800">{event.title}</div>
                      {event.location && (
                        <div className="text-sm text-slate-600 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">All Day</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schedule */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
              <Calendar className="h-5 w-5 text-blue-500" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {Array.from({ length: 24 }, (_, hour) => (
                <div
                  key={hour}
                  className="flex border-b border-slate-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 rounded-lg"
                >
                  <div className="w-20 text-sm text-slate-500 p-4 border-r border-slate-100 font-medium">
                    {hour.toString().padStart(2, "0")}:00
                  </div>
                  <div
                    className="flex-1 min-h-[70px] relative cursor-pointer p-2"
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, hour)}
                    onClick={() => onCreateEvent(currentDate, hour)}
                  >
                    {/* Events */}
                    {timedEvents
                      .filter((event) => Number.parseInt(event.startTime.split(":")[0]) === hour)
                      .map((event) => (
                        <div
                          key={event.id}
                          className="absolute inset-2 rounded-lg text-sm text-white p-3 cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
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
                          {event.location && (
                            <div className="opacity-80 text-xs flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      ))}

                    {/* Tasks */}
                    {dayTasks
                      .filter(
                        (task) => task.scheduledTime && Number.parseInt(task.scheduledTime.split(":")[0]) === hour,
                      )
                      .map((task) => (
                        <div
                          key={task.id}
                          className="absolute inset-2 rounded-lg text-sm bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 p-3 cursor-pointer border border-emerald-200 shadow-lg hover:shadow-xl transition-shadow"
                          style={{
                            height: `${getTaskHeight(task)}px`,
                            top: `${timedEvents.filter((e) => Number.parseInt(e.startTime.split(":")[0]) === hour).length * 80 + 8}px`,
                          }}
                          draggable
                          onDragStart={(e) => onTaskDragStart(e, task.id)}
                          onClick={(e) => {
                            e.stopPropagation()
                            onTaskClick(task.id)
                          }}
                        >
                          <div className="font-semibold truncate flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            {task.description}
                          </div>
                          <div className="opacity-75 text-xs mt-1">{task.estimatedDuration}m</div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Day plan text */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
              <Edit3 className="h-5 w-5 text-blue-500" />
              Day Plan - {format(currentDate, "MMMM dd, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Write your day plan, goals, and objectives..."
              value={dayPlan}
              onChange={(e) => setDayPlan(e.target.value)}
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
