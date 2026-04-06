"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Brain, Bell } from "lucide-react"
import { useTrackingStore } from "@/lib/tracking-store"

export function CognitiveState() {
  const [open, setOpen] = useState(false)

  const currentState = useTrackingStore((state) => state.currentCognitiveState)
  const updateCurrentState = useTrackingStore((state) => state.updateCurrentCognitiveState)
  const addEntry = useTrackingStore((state) => state.addEntry)

  // Form state
  const [selectedMetrics, setSelectedMetrics] = useState<Record<string, boolean>>({})
  const [formValues, setFormValues] = useState({
    energy: currentState.energy,
    sleep: currentState.sleepHours,
    mood: currentState.mood,
    focus: currentState.focus,
    stress: currentState.stress,
    motivation: currentState.motivation,
    hydration: currentState.hydration,
    nutrition: currentState.nutrition,
    exercise: currentState.exercise,
    activity: "",
    location: "",
  })

  // Notification permission and reminder setup
  useEffect(() => {
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }

    // Set up hourly reminder
    const setupReminder = () => {
      const now = new Date()
      const nextHour = new Date(now)
      nextHour.setHours(now.getHours() + 1, 0, 0, 0)
      const timeUntilNextHour = nextHour.getTime() - now.getTime()

      setTimeout(() => {
        if (Notification.permission === "granted") {
          new Notification("Cognitive State Update", {
            body: "Time to update your cognitive state and track your current activity!",
            icon: "/favicon.ico",
          })
        }

        // Set up recurring hourly reminders
        setInterval(
          () => {
            if (Notification.permission === "granted") {
              new Notification("Cognitive State Update", {
                body: "Time to update your cognitive state and track your current activity!",
                icon: "/favicon.ico",
              })
            }
          },
          60 * 60 * 1000,
        ) // Every hour
      }, timeUntilNextHour)
    }

    setupReminder()
  }, [])

  useEffect(() => {
    setFormValues({
      energy: currentState.energy,
      sleep: currentState.sleepHours,
      mood: currentState.mood,
      focus: currentState.focus,
      stress: currentState.stress,
      motivation: currentState.motivation,
      hydration: currentState.hydration,
      nutrition: currentState.nutrition,
      exercise: currentState.exercise,
      activity: "",
      location: "",
    })
  }, [currentState])

  const handleMetricToggle = (metric: string, checked: boolean) => {
    setSelectedMetrics((prev) => ({
      ...prev,
      [metric]: checked,
    }))
  }

  const handleSave = () => {
    // Update only selected cognitive state metrics
    const updates: any = {}

    if (selectedMetrics.energy) updates.energy = formValues.energy
    if (selectedMetrics.sleep) updates.sleepHours = formValues.sleep
    if (selectedMetrics.mood) updates.mood = formValues.mood
    if (selectedMetrics.focus) updates.focus = formValues.focus
    if (selectedMetrics.stress) updates.stress = formValues.stress
    if (selectedMetrics.motivation) updates.motivation = formValues.motivation
    if (selectedMetrics.hydration) updates.hydration = formValues.hydration
    if (selectedMetrics.nutrition) updates.nutrition = formValues.nutrition
    if (selectedMetrics.exercise) updates.exercise = formValues.exercise

    if (Object.keys(updates).length > 0) {
      updateCurrentState(updates)
    }

    // Create tracking entry if activity or location is provided
    if (formValues.activity || formValues.location) {
      const entry = {
        id: `entry-${Date.now()}`,
        timestamp: new Date(),
        type: "actual" as const,
        activity: formValues.activity || "Unknown Activity",
        location: formValues.location || "Unknown Location",
        mentalState: {
          energy: formValues.energy,
          focus: formValues.focus,
          mood: formValues.mood,
          stress: formValues.stress,
          motivation: formValues.motivation,
        },
        physicalState: {
          sleepHours: formValues.sleep,
          hydration: formValues.hydration,
          nutrition: formValues.nutrition,
          exercise: formValues.exercise,
        },
        customFactors: {},
        notes: "Auto-created from cognitive state update",
        duration: 15,
      }
      addEntry(entry)
    }

    // Reset form
    setSelectedMetrics({})
    setFormValues((prev) => ({
      ...prev,
      activity: "",
      location: "",
    }))
    setOpen(false)
  }

  const metrics = [
    { key: "energy", label: "Energy Level", value: formValues.energy, min: 1, max: 5, step: 1 },
    { key: "sleep", label: "Hours of Sleep", value: formValues.sleep, min: 0, max: 12, step: 0.5 },
    { key: "mood", label: "Mood", value: formValues.mood, min: 1, max: 5, step: 1 },
    { key: "focus", label: "Focus Level", value: formValues.focus, min: 1, max: 5, step: 1 },
    { key: "stress", label: "Stress Level", value: formValues.stress, min: 1, max: 5, step: 1 },
    { key: "motivation", label: "Motivation", value: formValues.motivation, min: 1, max: 5, step: 1 },
    { key: "hydration", label: "Hydration", value: formValues.hydration, min: 1, max: 5, step: 1 },
    { key: "nutrition", label: "Nutrition", value: formValues.nutrition, min: 1, max: 5, step: 1 },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Brain className="h-4 w-4" />
          <span>Cognitive State</span>
          <Bell className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Cognitive State</DialogTitle>
          <DialogDescription>
            Select which metrics to update. Providing activity/location will create a tracking entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Activity and Location */}
          <div className="space-y-4">
            <h4 className="font-medium">Current Activity (Optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Activity</Label>
                <Input
                  value={formValues.activity}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, activity: e.target.value }))}
                  placeholder="What are you doing?"
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={formValues.location}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Where are you?"
                />
              </div>
            </div>
          </div>

          {/* Cognitive Metrics */}
          <div className="space-y-4">
            <h4 className="font-medium">Cognitive Metrics</h4>
            <div className="space-y-4">
              {metrics.map((metric) => (
                <div key={metric.key} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={metric.key}
                      checked={selectedMetrics[metric.key] || false}
                      onCheckedChange={(checked) => handleMetricToggle(metric.key, checked as boolean)}
                    />
                    <Label htmlFor={metric.key} className="font-medium">
                      {metric.label}
                    </Label>
                  </div>

                  {selectedMetrics[metric.key] && (
                    <div className="ml-6 space-y-2">
                      <Slider
                        min={metric.min}
                        max={metric.max}
                        step={metric.step}
                        value={[metric.value]}
                        onValueChange={(value) => {
                          const key = metric.key === "sleep" ? "sleep" : (metric.key as keyof typeof formValues)
                          setFormValues((prev) => ({ ...prev, [key]: value[0] }))
                        }}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{metric.min}</span>
                        <span className="font-medium">{metric.value}</span>
                        <span>{metric.max}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Exercise checkbox */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="exercise"
                    checked={selectedMetrics.exercise || false}
                    onCheckedChange={(checked) => handleMetricToggle("exercise", checked as boolean)}
                  />
                  <Label htmlFor="exercise" className="font-medium">
                    Exercise Today
                  </Label>
                </div>

                {selectedMetrics.exercise && (
                  <div className="ml-6">
                    <Checkbox
                      checked={formValues.exercise}
                      onCheckedChange={(checked) =>
                        setFormValues((prev) => ({ ...prev, exercise: checked as boolean }))
                      }
                    />
                    <Label className="ml-2">Yes, I exercised today</Label>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Selected Updates</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
