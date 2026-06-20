/**
 * components/Home/Tracking/actual-day-view.tsx — Log what you actually did vs plan
 */
"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, Clock, MapPin, CheckCircle2, Calendar } from "lucide-react"
import { useTaskStore } from "@/lib/task-store"
import { useEventStore } from "@/lib/event-store"
import { formatDateKey } from "@/lib/date-utils"
import { format, addDays, subDays } from "date-fns"
import type { Task, TimeLogEntry } from "@/lib/types"
import { AgendaGrid } from "@/components/Home/Plan/agenda-grid"

function rid() {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function ActualDayView({
  currentDate: controlledDate,
  setCurrentDate: setControlledDate,
}: {
  currentDate?: Date
  setCurrentDate?: (date: Date) => void
} = {}) {
  const [internalDate, setInternalDate] = useState(new Date())
  const currentDate = controlledDate ?? internalDate
  const setCurrentDate = setControlledDate ?? setInternalDate
  const tasks = useTaskStore((s) => s.tasks)
  const updateTask = useTaskStore((s) => s.updateTask)
  const events = useEventStore((s) => s.events)
  const dayKey = formatDateKey(currentDate)

  const plannedTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (!t.scheduledDate || t.completed) return false
        const d = t.scheduledDate instanceof Date ? t.scheduledDate : new Date(t.scheduledDate)
        return formatDateKey(d) === dayKey
      }),
    [tasks, dayKey],
  )

  const dayEvents = useMemo(
    () =>
      events.filter((e) => {
        const d = e.date instanceof Date ? e.date : new Date(e.date)
        return formatDateKey(d) === dayKey
      }),
    [events, dayKey],
  )

  const allDayLogs = useMemo(() => {
    const logs: { task: Task; log: TimeLogEntry }[] = []
    for (const task of tasks) {
      for (const log of task.timeLogs || []) {
        if (log.date === dayKey) logs.push({ task, log })
      }
    }
    return logs.sort((a, b) => (a.log.startTime || "").localeCompare(b.log.startTime || ""))
  }, [tasks, dayKey])

  const [loggingTaskId, setLoggingTaskId] = useState<string | null>(null)
  const [logMinutes, setLogMinutes] = useState("30")
  const [logLocation, setLogLocation] = useState("")
  const [logNotes, setLogNotes] = useState("")

  const logActualTime = (task: Task) => {
    const mins = Number.parseInt(logMinutes) || 0
    if (mins <= 0) return
    const entry: TimeLogEntry = {
      id: rid(),
      date: dayKey,
      durationMinutes: mins,
      notes: logNotes.trim() || undefined,
      location: logLocation.trim() || undefined,
      taskId: task.id,
      activityLabel: task.description,
    }
    const logs = [...(task.timeLogs || []), entry]
    const totalActual = logs.reduce((s, l) => s + l.durationMinutes, 0)
    updateTask({ ...task, timeLogs: logs, actualDuration: totalActual })
    setLoggingTaskId(null)
    setLogMinutes("30")
    setLogLocation("")
    setLogNotes("")
  }

  const handleCreateTimeLog = (taskId: string, hour: number, minute: number) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const duration = task.estimatedDuration ?? 30
    const startTotal = hour * 60 + minute
    const endTotal = startTotal + duration
    const fmt = (m: number) =>
      `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`
    const entry: TimeLogEntry = {
      id: rid(),
      date: dayKey,
      startTime: fmt(startTotal),
      endTime: fmt(endTotal),
      durationMinutes: duration,
      taskId: task.id,
      activityLabel: task.description,
    }
    const logs = [...(task.timeLogs || []), entry]
    const totalActual = logs.reduce((s, l) => s + l.durationMinutes, 0)
    updateTask({ ...task, timeLogs: logs, actualDuration: totalActual })
  }

  const handleUpdateTimeLog = (taskId: string, logId: string, updates: Partial<TimeLogEntry>) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const logs = (task.timeLogs || []).map((l) => (l.id === logId ? { ...l, ...updates } : l))
    const totalActual = logs.reduce((s, l) => s + l.durationMinutes, 0)
    updateTask({ ...task, timeLogs: logs, actualDuration: totalActual })
  }

  const totalLogged = plannedTasks.reduce((s, t) => s + (t.actualDuration || 0), 0)
  const totalEstimated = plannedTasks.reduce((s, t) => s + (t.estimatedDuration || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
          Today
        </Button>
        <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="font-semibold">{format(currentDate, "EEEE, MMM d")}</span>
      </div>

      <div className="text-sm text-muted-foreground">
        Planned: {totalEstimated}m estimated · Logged: {totalLogged}m actual
      </div>

      <Tabs defaultValue="agenda">
        <TabsList>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Interactive day log — drag to set actual times
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AgendaGrid
                date={currentDate}
                events={dayEvents}
                tasks={plannedTasks}
                mode="log"
                maxHeight="max-h-[600px]"
                onTaskClick={(id) => setLoggingTaskId(id)}
                onCreateTimeLog={handleCreateTimeLog}
                onUpdateTimeLog={handleUpdateTimeLog}
                showCurrentTimeIndicator
              />
              <p className="text-xs text-muted-foreground mt-3">
                Drop a planned task onto a time slot to log it. Drag logged blocks to adjust start time. Ghost items show the plan.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Activity log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-[480px] overflow-y-auto">
              {Array.from({ length: 24 }, (_, hour) => {
                const hourTasks = plannedTasks.filter((t) => {
                  if (!t.scheduledTime) return false
                  return Number.parseInt(t.scheduledTime.split(":")[0]) === hour
                })
                const hourEvents = dayEvents.filter((e) => !e.isAllDay && Number.parseInt(e.startTime.split(":")[0]) === hour)
                if (hourTasks.length === 0 && hourEvents.length === 0) return null
                return (
                  <div key={hour} className="flex border-b py-2 gap-3">
                    <div className="w-14 text-xs text-muted-foreground shrink-0 pt-1">{hour.toString().padStart(2, "0")}:00</div>
                    <div className="flex-1 space-y-2">
                      {hourEvents.map((ev) => (
                        <div key={ev.id} className="text-sm p-2 rounded border bg-muted/30">
                          <span className="font-medium">{ev.title}</span>
                          <span className="text-muted-foreground ml-2">{ev.startTime}–{ev.endTime}</span>
                          {ev.location && (
                            <span className="text-xs flex items-center gap-1 mt-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" /> Planned: {ev.location}
                            </span>
                          )}
                        </div>
                      ))}
                      {hourTasks.map((task) => (
                        <div key={task.id} className="p-2 rounded border">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="font-medium text-sm">{task.description}</p>
                              <p className="text-xs text-muted-foreground">
                                Planned {task.estimatedDuration ?? "?"}m
                                {task.scheduledTime && ` at ${task.scheduledTime}`}
                                {(task.actualDuration ?? 0) > 0 && ` · Logged ${task.actualDuration}m`}
                              </p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setLoggingTaskId(task.id)}>
                              Log time
                            </Button>
                          </div>
                          {(task.timeLogs?.length ?? 0) > 0 && (
                            <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                              {task.timeLogs!.map((l) => (
                                <li key={l.id} className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  {l.startTime && `${l.startTime} · `}{l.durationMinutes}m{l.location ? ` @ ${l.location}` : ""}{l.notes ? ` — ${l.notes}` : ""}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {allDayLogs.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">All logged entries</p>
                  {allDayLogs.map(({ task, log }) => (
                    <div key={log.id} className="text-sm py-1 flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                      <span className="font-medium">{log.activityLabel || task.description}</span>
                      <span className="text-muted-foreground text-xs">
                        {log.startTime && `${log.startTime}–${log.endTime || ""} · `}{log.durationMinutes}m
                        {log.notes && ` — ${log.notes}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {plannedTasks.length === 0 && dayEvents.length === 0 && allDayLogs.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">Nothing planned or logged for this day.</p>
              )}

              {plannedTasks.filter((t) => !t.scheduledTime).map((task) => (
                <div key={task.id} className="p-2 rounded border mt-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{task.description} (unscheduled time)</span>
                    <Button size="sm" variant="outline" onClick={() => setLoggingTaskId(task.id)}>Log time</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {loggingTaskId && (() => {
        const task = plannedTasks.find((t) => t.id === loggingTaskId) || tasks.find((t) => t.id === loggingTaskId)
        if (!task) return null
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Log actual time — {task.description}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Actual duration (minutes)</Label>
                <Input type="number" value={logMinutes} onChange={(e) => setLogMinutes(e.target.value)} />
              </div>
              <div>
                <Label>Location (at time of activity — not assumed from plan)</Label>
                <Input value={logLocation} onChange={(e) => setLogLocation(e.target.value)} placeholder="Where were you?" />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={logNotes} onChange={(e) => setLogNotes(e.target.value)} rows={2} />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => logActualTime(task)}>Confirm log</Button>
                <Button variant="outline" onClick={() => setLoggingTaskId(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )
      })()}
    </div>
  )
}
