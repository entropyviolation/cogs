"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import type { CalendarEvent } from "@/lib/types"

interface EventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingEvent: CalendarEvent | null
  setEditingEvent: (event: CalendarEvent | null) => void
  newEvent: {
    title: string
    startTime: string
    endTime: string
    type: "event"
    date: Date
  }
  setNewEvent: (event: any) => void
  events: CalendarEvent[]
  setEvents: (events: CalendarEvent[]) => void
}

export function EventDialog({
  open,
  onOpenChange,
  editingEvent,
  setEditingEvent,
  newEvent,
  setNewEvent,
  events,
  setEvents,
}: EventDialogProps) {
  const handleAddEvent = () => {
    if (editingEvent) {
      // Update existing event
      setEvents(
        events.map((event) =>
          event.id === editingEvent.id ? { ...event, ...newEvent, color: event.color, isScheduled: true } : event,
        ),
      )
      setEditingEvent(null)
    } else {
      // Add new event
      const event: CalendarEvent = {
        id: Date.now().toString(),
        ...newEvent,
        color: "#6366f1",
        isScheduled: true,
      }
      setEvents([...events, event])
    }

    setNewEvent({
      title: "",
      startTime: "09:00",
      endTime: "10:00",
      type: "event",
      date: new Date(),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            {editingEvent ? "Edit Event" : "Add New Event"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <Label htmlFor="event-title" className="text-sm font-semibold text-slate-700">
              Title
            </Label>
            <Input
              id="event-title"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              placeholder="Event title"
              className="mt-2 border-slate-200 focus:border-blue-300 focus:ring-blue-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-time" className="text-sm font-semibold text-slate-700">
                Start Time
              </Label>
              <Input
                id="start-time"
                type="time"
                value={newEvent.startTime}
                onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                className="mt-2 border-slate-200 focus:border-blue-300 focus:ring-blue-200"
              />
            </div>
            <div>
              <Label htmlFor="end-time" className="text-sm font-semibold text-slate-700">
                End Time
              </Label>
              <Input
                id="end-time"
                type="time"
                value={newEvent.endTime}
                onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                className="mt-2 border-slate-200 focus:border-blue-300 focus:ring-blue-200"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="event-date" className="text-sm font-semibold text-slate-700">
              Date
            </Label>
            <Input
              id="event-date"
              type="date"
              value={format(newEvent.date, "yyyy-MM-dd")}
              onChange={(e) => setNewEvent({ ...newEvent, date: new Date(e.target.value) })}
              className="mt-2 border-slate-200 focus:border-blue-300 focus:ring-blue-200"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleAddEvent}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            >
              {editingEvent ? "Update Event" : "Add Event"}
            </Button>
            {editingEvent && (
              <Button
                variant="destructive"
                onClick={() => {
                  setEvents(events.filter((e) => e.id !== editingEvent.id))
                  onOpenChange(false)
                  setEditingEvent(null)
                }}
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
