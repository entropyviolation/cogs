"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TaskForm } from "@/components/Home/Habits/daily-task-form"
import type { Task, Category } from "@/lib/types"

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (task: Task) => void
  initialTask: Task | null
  categories: Category[]
}

export function TaskFormDialog({ open, onOpenChange, onSubmit, initialTask, categories }: TaskFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 rounded-xl overflow-hidden border-none card-glass">
        <div className="h-1.5 bg-gradient-primary"></div>
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl">{initialTask ? "Edit Task" : "Add New Task"}</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          <TaskForm
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            initialTask={initialTask}
            categories={categories}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
