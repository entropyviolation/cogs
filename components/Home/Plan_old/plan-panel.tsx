"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TaskDetailPopup } from "../../task-detail-popup"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { CalendarEvent } from "@/lib/types"
import { addDays } from "date-fns"
import { MonthView } from "./month-view"
import { WeekView } from "./week-view"
import { DayView } from "@/components/Home/Plan/day-view"
import { EventDialog } from "./event-dialog"

export function PlanPanel() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: "1",
      title: "Product Strategy Hike",
      startTime: "02:00",
      endTime: "10:20",
      date: new Date(),
      type: "event",
      color: "#6366f1",
      isScheduled: true,
    },
    {
      id: "2",
      title: "Kayaking Workshop",
      startTime: "01:00",
      endTime: "03:00",
      date: addDays(new Date(), 2),
      type: "event",
      color: "#8b5cf6",
      isScheduled: true,
    },
  ])
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [newEvent, setNewEvent] = useState({
    title: "",
    startTime: "09:00",
    endTime: "10:00",
    type: "event" as const,
    date: currentDate,
  })

  const handleCreateEvent = (date: Date, hour?: number) => {
    if (hour !== undefined) {
      setNewEvent({
        title: "",
        startTime: `${hour.toString().padStart(2, "0")}:00`,
        endTime: `${(hour + 1).toString().padStart(2, "0")}:00`,
        type: "event",
        date: date,
      })
    } else {
      setNewEvent({
        title: "",
        startTime: "09:00",
        endTime: "10:00",
        type: "event",
        date: date,
      })
    }
    setEditingEvent(null)
    setShowEventDialog(true)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setEditingEvent(event)
    setNewEvent({
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      type: event.type,
      date: event.date,
    })
    setShowEventDialog(true)
  }

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId)
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-white">
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Plan
            </h2>
            <p className="text-slate-600 mt-1">Schedule and organize your time</p>
          </div>

          <Button
            onClick={() => setShowEventDialog(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>

        <Tabs defaultValue="month" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm border border-slate-200">
            <TabsTrigger
              value="month"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              Month View
            </TabsTrigger>
            <TabsTrigger
              value="week"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              Week View
            </TabsTrigger>
            <TabsTrigger
              value="day"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              Day View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="month" className="mt-6">
            <MonthView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              events={events}
              setEvents={setEvents}
              onTaskClick={handleTaskClick}
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateEvent}
            />
          </TabsContent>

          <TabsContent value="week" className="mt-6">
            <WeekView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              events={events}
              setEvents={setEvents}
              onTaskClick={handleTaskClick}
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateEvent}
            />
          </TabsContent>

          <TabsContent value="day" className="mt-6">
            <DayView
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              events={events}
              setEvents={setEvents}
              onTaskClick={handleTaskClick}
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateEvent}
            />
          </TabsContent>
        </Tabs>

        <EventDialog
          open={showEventDialog}
          onOpenChange={setShowEventDialog}
          editingEvent={editingEvent}
          setEditingEvent={setEditingEvent}
          newEvent={newEvent}
          setNewEvent={setNewEvent}
          events={events}
          setEvents={setEvents}
        />

        <TaskDetailPopup taskId={selectedTaskId} open={!!selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      </div>
    </div>
  )
}
