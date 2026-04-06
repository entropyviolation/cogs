"use client"

import type React from "react"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTaskStore } from "@/lib/task-store"

export function QuickAdd() {
  const [open, setOpen] = useState(false)
  const [taskText, setTaskText] = useState("")
  const addTask = useTaskStore((state) => state.addTask)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (taskText.trim()) {
      addTask({
        id: Date.now().toString(),
        description: taskText,
        category: "inbox",
        createdAt: new Date(), // Ensure this is always a Date object
        estimatedDuration: 1,
        cognitiveLoad: 1,
        urgency: 3,
        importance: 3,
        dependencies: [],
        context: "@inbox",
        entropy: 0.5,
        rewardValue: 5,
        completed: false,
        categories: [],
        allowPartialCompletion: false,
        minimumChunkSize: 15,
      })
      setTaskText("")
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          <span>Quick Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription>Quickly capture a task without interrupting your flow.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task">Task Description</Label>
            <Input
              id="task"
              placeholder="What needs to be done?"
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit">Add to Inbox</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
