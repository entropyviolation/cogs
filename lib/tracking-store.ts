"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface TrackingEntry {
  id: string
  timestamp: Date
  type: "planned" | "actual"
  // Core tracking data
  activity: string
  location: string
  mentalState: {
    energy: number // 1-5
    focus: number // 1-5
    mood: number // 1-5
    stress: number // 1-5
    motivation: number // 1-5
  }
  // Physical state
  physicalState: {
    sleepHours: number
    hydration: number // 1-5
    nutrition: number // 1-5
    exercise: boolean
  }
  // Custom factors
  customFactors: Record<string, string | number | boolean>
  // Optional fields
  notes?: string
  taskId?: string // if related to a specific task
  duration?: number // minutes
  effectiveness?: number // 1-10 (how effective was this time)
  satisfaction?: number // 1-10 (how satisfied with this time)
}

export interface CustomFactor {
  id: string
  name: string
  type: "text" | "number" | "boolean" | "scale" // scale is 1-10
  defaultValue?: string | number | boolean
  scaleMin?: number
  scaleMax?: number
  options?: string[] // for select-type factors
}

interface TrackingState {
  entries: TrackingEntry[]
  customFactors: CustomFactor[]
  currentCognitiveState: {
    energy: number
    focus: number
    mood: number
    stress: number
    motivation: number
    sleepHours: number
    hydration: number
    nutrition: number
    exercise: boolean
    lastUpdated: Date
  }
  addEntry: (entry: TrackingEntry) => void
  updateEntry: (entry: TrackingEntry) => void
  deleteEntry: (id: string) => void
  addCustomFactor: (factor: CustomFactor) => void
  updateCustomFactor: (factor: CustomFactor) => void
  deleteCustomFactor: (id: string) => void
  updateCurrentCognitiveState: (state: Partial<TrackingState["currentCognitiveState"]>) => void
  getEntriesForDate: (date: Date) => TrackingEntry[]
  getEntriesForTimeRange: (start: Date, end: Date) => TrackingEntry[]
}

// Default custom factors
const defaultCustomFactors: CustomFactor[] = [
  {
    id: "caffeine",
    name: "Caffeine Intake",
    type: "scale",
    scaleMin: 0,
    scaleMax: 5,
    defaultValue: 0,
  },
  {
    id: "social-interaction",
    name: "Social Interaction",
    type: "scale",
    scaleMin: 1,
    scaleMax: 5,
    defaultValue: 3,
  },
  {
    id: "environment-noise",
    name: "Environment Noise Level",
    type: "scale",
    scaleMin: 1,
    scaleMax: 5,
    defaultValue: 3,
  },
  {
    id: "interruptions",
    name: "Interruptions",
    type: "number",
    defaultValue: 0,
  },
]

export const useTrackingStore = create<TrackingState>()(
  persist(
    (set, get) => ({
      entries: [],
      customFactors: defaultCustomFactors,
      currentCognitiveState: {
        energy: 3,
        focus: 3,
        mood: 3,
        stress: 3,
        motivation: 3,
        sleepHours: 7,
        hydration: 3,
        nutrition: 3,
        exercise: false,
        lastUpdated: new Date(),
      },

      addEntry: (entry) =>
        set((state) => ({
          entries: [
            ...state.entries,
            {
              ...entry,
              timestamp: entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp),
            },
          ],
        })),

      updateEntry: (updatedEntry) =>
        set((state) => {
          const index = state.entries.findIndex((e) => e.id === updatedEntry.id)
          if (index !== -1) {
            const newEntries = [...state.entries]
            newEntries[index] = {
              ...updatedEntry,
              timestamp:
                updatedEntry.timestamp instanceof Date ? updatedEntry.timestamp : new Date(updatedEntry.timestamp),
            }
            return { entries: newEntries }
          }
          return state
        }),

      deleteEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== id),
        })),

      addCustomFactor: (factor) =>
        set((state) => ({
          customFactors: [...state.customFactors, factor],
        })),

      updateCustomFactor: (updatedFactor) =>
        set((state) => {
          const index = state.customFactors.findIndex((f) => f.id === updatedFactor.id)
          if (index !== -1) {
            const newFactors = [...state.customFactors]
            newFactors[index] = updatedFactor
            return { customFactors: newFactors }
          }
          return state
        }),

      deleteCustomFactor: (id) =>
        set((state) => ({
          customFactors: state.customFactors.filter((factor) => factor.id !== id),
        })),

      updateCurrentCognitiveState: (newState) =>
        set((state) => ({
          currentCognitiveState: {
            ...state.currentCognitiveState,
            ...newState,
            lastUpdated: new Date(),
          },
        })),

      getEntriesForDate: (date) => {
        const entries = get().entries
        const targetDate = new Date(date)
        targetDate.setHours(0, 0, 0, 0)
        const nextDate = new Date(targetDate)
        nextDate.setDate(nextDate.getDate() + 1)

        return entries.filter((entry) => {
          const entryDate = new Date(entry.timestamp)
          return entryDate >= targetDate && entryDate < nextDate
        })
      },

      getEntriesForTimeRange: (start, end) => {
        const entries = get().entries
        return entries.filter((entry) => {
          const entryDate = new Date(entry.timestamp)
          return entryDate >= start && entryDate <= end
        })
      },
    }),
    {
      name: "cogs-tracking-storage",
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
