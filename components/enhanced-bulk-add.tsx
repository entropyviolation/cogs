"use client"

import type React from "react"
import { useState } from "react"
import { ListPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useTaskStore } from "@/lib/task-store"
import type { TaskCategory } from "@/lib/types"

export function EnhancedBulkAdd() {
  const [open, setOpen] = useState(false)
  const [tasksText, setTasksText] = useState("")
  const addTask = useTaskStore((state) => state.addTask)
  const addCategory = useTaskStore((state) => state.addCategory)
  const categories = useTaskStore((state) => state.categories)

  const parseTasksWithCategories = (text: string) => {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    const result: { [categoryName: string]: string[] } = {}
    let currentCategory = "General"

    for (const line of lines) {
      // Check if line ends with ':' - it's a category
      if (line.endsWith(":")) {
        currentCategory = line.slice(0, -1).trim()
        if (!result[currentCategory]) {
          result[currentCategory] = []
        }
      } else {
        // It's a task
        if (!result[currentCategory]) {
          result[currentCategory] = []
        }
        result[currentCategory].push(line)
      }
    }

    return result
  }

  const getRandomColor = () => {
    const colors = [
      "#3B82F6",
      "#EF4444",
      "#10B981",
      "#8B5CF6",
      "#F59E0B",
      "#06B6D4",
      "#EC4899",
      "#6366F1",
      "#84CC16",
      "#1F2937",
      "#DC2626",
      "#059669",
      "#7C3AED",
      "#D97706",
      "#0891B2",
      "#BE185D",
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (tasksText.trim()) {
      const parsedTasks = parseTasksWithCategories(tasksText)

      Object.entries(parsedTasks).forEach(([categoryName, taskDescriptions]) => {
        // Find or create category
        let category = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase())

        if (!category) {
          // Create new category
          const newCategory: TaskCategory = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name: categoryName,
            color: getRandomColor(),
            description: `Auto-created category for ${categoryName}`,
            createdAt: new Date(),
          }
          addCategory(newCategory)
          category = newCategory
        }

        // Add tasks to this category
        taskDescriptions.forEach((description) => {
          addTask({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            description,
            category: "inbox", // Send to inbox instead of clarified
            createdAt: new Date(),
            categories: [category.id],
            // Remove all default assumptions - let user clarify these values
            completed: false,
            subtasks: [],
            dependencies: [],
          })
        })
      })

      setTasksText("")
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <ListPlus className="h-4 w-4" />
          <span>Bulk Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Add Tasks with Categories</DialogTitle>
          <DialogDescription>
            Add multiple tasks at once. Use category names followed by ':' to organize tasks, or just list tasks without
            categories.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
            <Label htmlFor="tasks">Tasks and Categories</Label>
            <Textarea
              id="tasks"
              placeholder="Writing:
100% human generated content
Something else (zine)
Fuck This Shit (pamphlet)

Literally actually most important:
Quit vaping
Win Perplexity Hackathon
Elijah vinyl

Or just list tasks without categories:
Buy groceries
Call dentist
Review project proposal"
              value={tasksText}
              onChange={(e) => setTasksText(e.target.value)}
              className="flex-1 resize-none font-mono text-sm"
              autoFocus
            />
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Category Mode:</strong> Lines ending with ':' create categories for tasks listed below them.
            </p>
            <p>
              <strong>Simple Mode:</strong> Just list tasks line by line - they'll go to "General" category.
            </p>
            <p>All tasks will be sent to your inbox for clarification.</p>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {tasksText.split("\n").filter((line) => line.trim() && !line.trim().endsWith(":")).length} tasks ready to
              add
            </div>
            <Button type="submit" disabled={!tasksText.trim()}>
              Add Tasks to Inbox
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
