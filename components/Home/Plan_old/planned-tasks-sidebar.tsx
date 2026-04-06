"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GripVertical, Zap } from "lucide-react"
import { useTaskStore } from "@/lib/task-store"

interface PlannedTasksSidebarProps {
  onTaskClick: (taskId: string) => void
}

export function PlannedTasksSidebar({ onTaskClick }: PlannedTasksSidebarProps) {
  const { tasks } = useTaskStore()

  const plannedTasks = tasks.filter(
    (task) => !task.completed && !task.scheduledDate && task.category !== "completed",
  )

  const onTaskDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId)
  }

  return (
    <Card className="w-80 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
          <Zap className="h-5 w-5 text-amber-500" />
          Planned Tasks
          <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700">
            {plannedTasks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {plannedTasks.slice(0, 15).map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-white rounded-lg cursor-move hover:from-blue-50 hover:to-purple-50 border border-slate-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
              onClick={() => onTaskClick(task.id)}
              draggable
              onDragStart={(e) => onTaskDragStart(e, task.id)}
            >
              <GripVertical className="h-4 w-4 text-slate-400" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-700 truncate block">{task.description}</span>
                {task.context && <span className="text-xs text-slate-500 mt-1 block">{task.context}</span>}
              </div>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                {task.estimatedDuration || 30}m
              </Badge>
            </div>
          ))}
          {plannedTasks.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Zap className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No planned tasks</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
