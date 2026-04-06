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

  const plannedTasks = tasks.filter((task) => !task.completed && !task.scheduledDate && task.category !== "completed")

  const onTaskDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId)
  }

  return (
    <Card className="w-80 bg-gradient-to-br from-gray-800/80 via-gray-900/80 to-black/80 border border-gray-700 shadow-2xl backdrop-blur-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-gray-200">
          <Zap className="h-5 w-5 text-[#8cd4a5] animate-pulse" />
          Planned Tasks
          <Badge className="ml-auto bg-gradient-to-r from-[#8cd4a5] to-[#9fc2a5] text-black font-semibold">
            {plannedTasks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {plannedTasks.slice(0, 15).map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-700/50 to-gray-800/50 rounded-lg cursor-move hover:from-[#8cd4a5]/20 hover:to-[#b89fbf]/20 border border-gray-600 hover:border-[#8cd4a5] transition-all duration-300 shadow-sm hover:shadow-lg transform hover:scale-105"
              onClick={() => onTaskClick(task.id)}
              draggable
              onDragStart={(e) => onTaskDragStart(e, task.id)}
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-200 truncate block">{task.description}</span>
                {task.context && <span className="text-xs text-gray-400 mt-1 block">{task.context}</span>}
              </div>
              <Badge className="text-xs bg-gradient-to-r from-[#5f756d] to-[#adc29f] text-white border-none">
                {task.estimatedDuration || 30}m
              </Badge>
            </div>
          ))}
          {plannedTasks.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Zap className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm">No planned tasks</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
