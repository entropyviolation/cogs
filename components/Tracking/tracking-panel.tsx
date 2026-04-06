"use client"

import { useState, useCallback, useMemo } from "react"
import { useTrackingStore, type TrackingEntry } from "@/lib/tracking-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Save,
  Trash,
  Edit,
  MapPin,
  Activity,
  Settings,
  Smile,
  Zap,
} from "lucide-react"

type TrackingView = "activity" | "location" | "mood" | "energy"

export function TrackingPanel() {
  const {
    entries,
    customFactors,
    currentCognitiveState,
    addEntry,
    updateEntry,
    deleteEntry,
    addCustomFactor,
    updateCustomFactor,
    deleteCustomFactor,
    getEntriesForDate,
  } = useTrackingStore()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedEntry, setSelectedEntry] = useState<TrackingEntry | null>(null)
  const [isAddingEntry, setIsAddingEntry] = useState(false)
  const [isManagingFactors, setIsManagingFactors] = useState(false)
  const [viewMode, setViewMode] = useState<"timeline" | "grid">("timeline")
  const [trackingView, setTrackingView] = useState<TrackingView>("activity")

  // Form state for new/editing entries
  const [formData, setFormData] = useState<Partial<TrackingEntry>>({
    type: "actual",
    activity: "",
    location: "",
    mentalState: {
      energy: currentCognitiveState.energy,
      focus: currentCognitiveState.focus,
      mood: currentCognitiveState.mood,
      stress: currentCognitiveState.stress,
      motivation: currentCognitiveState.motivation,
    },
    physicalState: {
      sleepHours: currentCognitiveState.sleepHours,
      hydration: currentCognitiveState.hydration,
      nutrition: currentCognitiveState.nutrition,
      exercise: currentCognitiveState.exercise,
    },
    customFactors: {},
    notes: "",
    duration: 15,
  })

  // Get entries for selected date
  const dayEntries = useMemo(() => {
    return getEntriesForDate(selectedDate).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
  }, [selectedDate, entries, getEntriesForDate])

  // Filter entries by type for current view
  const plannedEntries = useMemo(() => dayEntries.filter((e) => e.type === "planned"), [dayEntries])
  const actualEntries = useMemo(() => dayEntries.filter((e) => e.type === "actual"), [dayEntries])

  // Generate time slots for grid view
  const timeSlots = useMemo(() => {
    return Array.from({ length: 96 }, (_, i) => {
      const hour = Math.floor(i / 4) + 6
      const minute = (i % 4) * 15
      return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
    })
  }, [])

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
  }, [])

  const navigateDay = useCallback(
    (direction: "prev" | "next") => {
      const newDate = new Date(selectedDate)
      if (direction === "prev") {
        newDate.setDate(newDate.getDate() - 1)
      } else {
        newDate.setDate(newDate.getDate() + 1)
      }
      setSelectedDate(newDate)
    },
    [selectedDate],
  )

  const handleSaveEntry = useCallback(() => {
    if (!formData.activity || !formData.location) return

    const entry: TrackingEntry = {
      id: selectedEntry?.id || `entry-${Date.now()}`,
      timestamp: formData.timestamp || new Date(),
      type: formData.type || "actual",
      activity: formData.activity,
      location: formData.location,
      mentalState: formData.mentalState || {
        energy: 3,
        focus: 3,
        mood: 3,
        stress: 3,
        motivation: 3,
      },
      physicalState: formData.physicalState || {
        sleepHours: 7,
        hydration: 3,
        nutrition: 3,
        exercise: false,
      },
      customFactors: formData.customFactors || {},
      notes: formData.notes,
      duration: formData.duration,
      effectiveness: formData.effectiveness,
      satisfaction: formData.satisfaction,
      taskId: formData.taskId,
    }

    if (selectedEntry) {
      updateEntry(entry)
    } else {
      addEntry(entry)
    }

    setSelectedEntry(null)
    setIsAddingEntry(false)
    setFormData({
      type: "actual",
      activity: "",
      location: "",
      mentalState: {
        energy: currentCognitiveState.energy,
        focus: currentCognitiveState.focus,
        mood: currentCognitiveState.mood,
        stress: currentCognitiveState.stress,
        motivation: currentCognitiveState.motivation,
      },
      physicalState: {
        sleepHours: currentCognitiveState.sleepHours,
        hydration: currentCognitiveState.hydration,
        nutrition: currentCognitiveState.nutrition,
        exercise: currentCognitiveState.exercise,
      },
      customFactors: {},
      notes: "",
      duration: 15,
    })
  }, [formData, selectedEntry, addEntry, updateEntry, currentCognitiveState])

  const startNewEntry = useCallback(
    (timestamp?: Date, type?: "planned" | "actual") => {
      setFormData({
        ...formData,
        timestamp: timestamp || new Date(),
        type: type || "actual",
      })
      setSelectedEntry(null)
      setIsAddingEntry(true)
    },
    [formData],
  )

  const editEntry = useCallback((entry: TrackingEntry) => {
    setFormData(entry)
    setSelectedEntry(entry)
    setIsAddingEntry(true)
  }, [])

  const getEntryForTimeSlot = useCallback(
    (timeSlot: string, type: "planned" | "actual") => {
      const [hours, minutes] = timeSlot.split(":").map(Number)
      const slotTime = new Date(selectedDate)
      slotTime.setHours(hours, minutes, 0, 0)

      const relevantEntries = type === "planned" ? plannedEntries : actualEntries

      return relevantEntries.find((entry) => {
        const entryTime = new Date(entry.timestamp)
        const entryEnd = new Date(entryTime.getTime() + (entry.duration || 15) * 60000)
        return slotTime >= entryTime && slotTime < entryEnd
      })
    },
    [plannedEntries, actualEntries, selectedDate],
  )

  const getMoodColor = useCallback((mood: number) => {
    const colors = [
      "bg-red-100 border-red-300 text-red-800",
      "bg-orange-100 border-orange-300 text-orange-800",
      "bg-yellow-100 border-yellow-300 text-yellow-800",
      "bg-green-100 border-green-300 text-green-800",
      "bg-blue-100 border-blue-300 text-blue-800",
    ]
    return colors[mood - 1] || colors[2]
  }, [])

  const getEnergyColor = useCallback((energy: number) => {
    const colors = [
      "bg-gray-100 border-gray-300 text-gray-800",
      "bg-red-100 border-red-300 text-red-800",
      "bg-yellow-100 border-yellow-300 text-yellow-800",
      "bg-green-100 border-green-300 text-green-800",
      "bg-emerald-100 border-emerald-300 text-emerald-800",
    ]
    return colors[energy - 1] || colors[2]
  }, [])

  const getValueForView = useCallback((entry: TrackingEntry, view: TrackingView) => {
    switch (view) {
      case "activity":
        return entry.activity
      case "location":
        return entry.location
      case "mood":
        return entry.mentalState.mood.toString()
      case "energy":
        return entry.mentalState.energy.toString()
      default:
        return ""
    }
  }, [])

  const getColorForView = useCallback(
    (entry: TrackingEntry, view: TrackingView) => {
      switch (view) {
        case "mood":
          return getMoodColor(entry.mentalState.mood)
        case "energy":
          return getEnergyColor(entry.mentalState.energy)
        default:
          return "bg-blue-50 border-blue-200 text-blue-800"
      }
    },
    [getMoodColor, getEnergyColor],
  )

  const renderTrackingViewContent = (view: TrackingView, entries: TrackingEntry[], type: "planned" | "actual") => {
    if (viewMode === "timeline") {
      return (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {entries.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground text-sm">
              No {type} {view} entries for this day.
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className={`p-2 border rounded-md text-sm ${getColorForView(entry, view)}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3 w-3" />
                      <span className="font-medium text-xs">
                        {new Date(entry.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {entry.duration && <span className="text-xs text-muted-foreground">({entry.duration}m)</span>}
                    </div>

                    <div className="font-medium">{getValueForView(entry, view)}</div>

                    {view === "activity" && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        {entry.location}
                      </div>
                    )}

                    {(view === "mood" || view === "energy") && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <Activity className="h-3 w-3 inline mr-1" />
                        {entry.activity}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => editEntry(entry)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteEntry(entry.id)}>
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )
    } else {
      return (
        <div className="grid grid-cols-8 gap-1 max-h-[400px] overflow-y-auto">
          {timeSlots.map((timeSlot) => {
            const entry = getEntryForTimeSlot(timeSlot, type)
            return (
              <div
                key={timeSlot}
                className={`h-12 border rounded-md p-1 text-xs cursor-pointer ${
                  entry ? getColorForView(entry, view) : "hover:bg-gray-50"
                }`}
                onClick={() => {
                  if (entry) {
                    editEntry(entry)
                  } else {
                    const [hours, minutes] = timeSlot.split(":").map(Number)
                    const timestamp = new Date(selectedDate)
                    timestamp.setHours(hours, minutes, 0, 0)
                    startNewEntry(timestamp, type)
                  }
                }}
              >
                <div className="font-medium text-xs">{timeSlot}</div>
                {entry && <div className="mt-1 truncate text-xs">{getValueForView(entry, view)}</div>}
              </div>
            )
          })}
        </div>
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDay("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatDate(selectedDate)}</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateDay("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "timeline" | "grid")}>
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="grid">Grid</TabsTrigger>
            </TabsList>
          </Tabs>

          <Dialog open={isManagingFactors} onOpenChange={setIsManagingFactors}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Factors
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Custom Factors</DialogTitle>
                <DialogDescription>Add or edit custom tracking factors</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {customFactors.map((factor) => (
                  <div key={factor.id} className="flex items-center justify-between p-2 border rounded">
                    <span>
                      {factor.name} ({factor.type})
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => deleteCustomFactor(factor.id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={() => startNewEntry()}>
            <Plus className="h-4 w-4 mr-1" />
            Add Entry
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Current State</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Energy: {currentCognitiveState.energy}/5</div>
                <div>Focus: {currentCognitiveState.focus}/5</div>
                <div>Mood: {currentCognitiveState.mood}/5</div>
                <div>Stress: {currentCognitiveState.stress}/5</div>
                <div>Sleep: {currentCognitiveState.sleepHours}h</div>
                <div>Hydration: {currentCognitiveState.hydration}/5</div>
              </div>
              <div className="text-xs text-muted-foreground">
                Last updated: {new Date(currentCognitiveState.lastUpdated).toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Day Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>Total Entries: {dayEntries.length}</div>
                <div>Planned: {plannedEntries.length}</div>
                <div>Actual: {actualEntries.length}</div>
                <div>
                  Avg Mood:{" "}
                  {dayEntries.length > 0
                    ? (dayEntries.reduce((sum, e) => sum + e.mentalState.mood, 0) / dayEntries.length).toFixed(1)
                    : "N/A"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Tracking States</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={trackingView} onValueChange={(value) => setTrackingView(value as TrackingView)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="activity" className="flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    Activity
                  </TabsTrigger>
                  <TabsTrigger value="location" className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Location
                  </TabsTrigger>
                  <TabsTrigger value="mood" className="flex items-center gap-1">
                    <Smile className="h-4 w-4" />
                    Mood
                  </TabsTrigger>
                  <TabsTrigger value="energy" className="flex items-center gap-1">
                    <Zap className="h-4 w-4" />
                    Energy
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={trackingView} className="mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">Planned</h4>
                        <Button variant="outline" size="sm" onClick={() => startNewEntry(undefined, "planned")}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Planned
                        </Button>
                      </div>
                      {renderTrackingViewContent(trackingView, plannedEntries, "planned")}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">Actual</h4>
                        <Button variant="outline" size="sm" onClick={() => startNewEntry(undefined, "actual")}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Actual
                        </Button>
                      </div>
                      {renderTrackingViewContent(trackingView, actualEntries, "actual")}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Entry Form Dialog */}
      <Dialog open={isAddingEntry} onOpenChange={setIsAddingEntry}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEntry ? "Edit Entry" : "Add New Entry"}</DialogTitle>
            <DialogDescription>
              Record your cognitive state and activity for minute-by-minute tracking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as "planned" | "actual" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="actual">Actual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration || 15}
                  onChange={(e) => setFormData({ ...formData, duration: Number.parseInt(e.target.value) || 15 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Activity</Label>
                <Input
                  value={formData.activity || ""}
                  onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                  placeholder="What are you doing?"
                />
              </div>

              <div>
                <Label>Location</Label>
                <Input
                  value={formData.location || ""}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Where are you?"
                />
              </div>
            </div>

            <div>
              <Label>Mental State</Label>
              <div className="grid grid-cols-5 gap-4 mt-2">
                {["energy", "focus", "mood", "stress", "motivation"].map((factor) => (
                  <div key={factor} className="space-y-2">
                    <Label className="text-xs capitalize">{factor}</Label>
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={[formData.mentalState?.[factor as keyof typeof formData.mentalState] || 3]}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          mentalState: {
                            ...formData.mentalState!,
                            [factor]: value[0],
                          },
                        })
                      }
                    />
                    <div className="text-xs text-center">
                      {formData.mentalState?.[factor as keyof typeof formData.mentalState] || 3}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Effectiveness (1-10)</Label>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[formData.effectiveness || 5]}
                  onValueChange={(value) => setFormData({ ...formData, effectiveness: value[0] })}
                />
              </div>

              <div>
                <Label>Satisfaction (1-10)</Label>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[formData.satisfaction || 5]}
                  onValueChange={(value) => setFormData({ ...formData, satisfaction: value[0] })}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddingEntry(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEntry}>
                <Save className="h-4 w-4 mr-1" />
                Save Entry
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
