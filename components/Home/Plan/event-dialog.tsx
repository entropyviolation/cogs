"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
    endDate?: Date
    isAllDay?: boolean
    location?: string
    description?: string
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
        color: "#8cd4a5",
        isScheduled: true,
        isAllDay: newEvent.isAllDay || false,
        location: newEvent.location || "",
        description: newEvent.description || "",
      }
      setEvents([...events, event])
    }

    setNewEvent({
      title: "",
      startTime: "09:00",
      endTime: "10:00",
      type: "event",
      date: new Date(),
      endDate: undefined,
      isAllDay: false,
      location: "",
      description: "",
    })
    onOpenChange(false)
  }

  const handleAllDayToggle = (checked: boolean) => {
    setNewEvent({
      ...newEvent,
      isAllDay: checked,
      startTime: checked ? "00:00" : "09:00",
      endTime: checked ? "23:59" : "10:00",
      endDate: checked ? newEvent.endDate : undefined, // Clear end date if not all-day
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#8cd4a5] via-[#b89fbf] to-[#8b7ecc] bg-clip-text text-transparent">
            {editingEvent ? "Edit Event" : "Create New Event"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {editingEvent ? "Modify your event details" : "Add a new event to your calendar"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="event-title" className="text-sm font-semibold text-gray-200">
              Event Title
            </Label>
            <Input
              id="event-title"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              placeholder="Enter event title..."
              className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#8cd4a5] focus:ring-[#8cd4a5]/20 transition-all duration-300"
            />
          </div>

          <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-800/30 to-gray-700/30 rounded-lg border border-gray-600">
            <Switch
              id="all-day"
              checked={newEvent.isAllDay || false}
              onCheckedChange={handleAllDayToggle}
              className="data-[state=checked]:bg-[#8cd4a5]"
            />
            <Label htmlFor="all-day" className="text-sm font-semibold text-gray-200 cursor-pointer">
              All Day Event
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-sm font-semibold text-gray-200">
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={format(newEvent.date, "yyyy-MM-dd")}
                onChange={(e) => setNewEvent({ ...newEvent, date: new Date(e.target.value) })}
                className="bg-gray-800/50 border-gray-600 text-white focus:border-[#8cd4a5] focus:ring-[#8cd4a5]/20 transition-all duration-300"
              />
            </div>
            {newEvent.isAllDay && (
              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-sm font-semibold text-gray-200">
                  End Date (Optional)
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={newEvent.endDate ? format(newEvent.endDate, "yyyy-MM-dd") : ""}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      endDate: e.target.value ? new Date(e.target.value) : undefined,
                    })
                  }
                  className="bg-gray-800/50 border-gray-600 text-white focus:border-[#8cd4a5] focus:ring-[#8cd4a5]/20 transition-all duration-300"
                />
              </div>
            )}
          </div>

          {!newEvent.isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time" className="text-sm font-semibold text-gray-200">
                  Start Time
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                  className="bg-gray-800/50 border-gray-600 text-white focus:border-[#8cd4a5] focus:ring-[#8cd4a5]/20 transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time" className="text-sm font-semibold text-gray-200">
                  End Time
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                  className="bg-gray-800/50 border-gray-600 text-white focus:border-[#8cd4a5] focus:ring-[#8cd4a5]/20 transition-all duration-300"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-semibold text-gray-200">
              Location
            </Label>
            <Input
              id="location"
              value={newEvent.location || ""}
              onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
              placeholder="Enter location..."
              className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#8cd4a5] focus:ring-[#8cd4a5]/20 transition-all duration-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold text-gray-200">
              Description
            </Label>
            <Textarea
              id="description"
              value={newEvent.description || ""}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              placeholder="Add event description..."
              rows={3}
              className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#8cd4a5] focus:ring-[#8cd4a5]/20 transition-all duration-300 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-6">
            <Button
              onClick={handleAddEvent}
              className="flex-1 bg-gradient-to-r from-[#8cd4a5] via-[#9fc2a5] to-[#adc29f] hover:from-[#7bc394] hover:via-[#8eb194] hover:to-[#9cb18e] text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              {editingEvent ? "Update Event" : "Create Event"}
            </Button>
            {editingEvent && (
              <Button
                variant="destructive"
                onClick={() => {
                  setEvents(events.filter((e) => e.id !== editingEvent.id))
                  onOpenChange(false)
                  setEditingEvent(null)
                }}
                className="bg-gradient-to-r from-[#571833] to-red-600 hover:from-[#461426] hover:to-red-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Delete Event
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
