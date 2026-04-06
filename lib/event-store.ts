"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CalendarEvent } from "./types"

interface EventState {
  events: CalendarEvent[]
  addEvent: (event: CalendarEvent) => void
  updateEvent: (event: CalendarEvent) => void
  deleteEvent: (id: string) => void
  setEvents: (events: CalendarEvent[]) => void
}

export const useEventStore = create<EventState>()(
  persist(
    (set, get) => ({
      events: [
        {
          id: "1",
          title: "Product Strategy Hike",
          startTime: "02:00",
          endTime: "10:20",
          date: new Date(),
          type: "event",
          color: "#6366f1",
          isScheduled: true,
          isAllDay: false,
          location: "",
          description: "",
        },
        {
          id: "2",
          title: "Kayaking Workshop",
          startTime: "01:00",
          endTime: "03:00",
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          type: "event",
          color: "#8b5cf6",
          isScheduled: true,
          isAllDay: false,
          location: "",
          description: "",
        },
      ],

      addEvent: (event) =>
        set((state) => {
          if (!state.events.some((e) => e.id === event.id)) {
            const eventWithDates = {
              ...event,
              date: event.date instanceof Date ? event.date : new Date(event.date),
              endDate: event.endDate
                ? event.endDate instanceof Date
                  ? event.endDate
                  : new Date(event.endDate)
                : undefined,
            }
            return { events: [...state.events, eventWithDates] }
          }
          return state
        }),

      updateEvent: (updatedEvent) =>
        set((state) => {
          const index = state.events.findIndex((e) => e.id === updatedEvent.id)
          if (index !== -1) {
            const eventWithDates = {
              ...updatedEvent,
              date: updatedEvent.date instanceof Date ? updatedEvent.date : new Date(updatedEvent.date),
              endDate: updatedEvent.endDate
                ? updatedEvent.endDate instanceof Date
                  ? updatedEvent.endDate
                  : new Date(updatedEvent.endDate)
                : undefined,
            }
            const newEvents = [...state.events]
            newEvents[index] = eventWithDates
            return { events: newEvents }
          }
          return state
        }),

      deleteEvent: (id) =>
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
        })),

      setEvents: (events) => set(() => ({ events })),
    }),
    {
      name: "cogs-event-storage",
      serialize: (state) => {
        return JSON.stringify(state, (key, value) => {
          if (value instanceof Date) {
            return { __type: "Date", value: value.toISOString() }
          }
          return value
        })
      },
      deserialize: (str) => {
        return JSON.parse(str, (key, value) => {
          if (value && typeof value === "object" && value.__type === "Date") {
            return new Date(value.value)
          }
          return value
        })
      },
      version: 1,
    },
  ),
)
