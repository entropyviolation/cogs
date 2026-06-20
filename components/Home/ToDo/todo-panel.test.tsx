import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { resetAllStores } from "@/tests/test-utils"
import { useTaskStore } from "@/lib/task-store"
import { TodoPanel } from "./todo-panel"

vi.mock("@/components/task-detail-popup", () => ({
  TaskDetailPopup: () => null,
}))

describe("TodoPanel", () => {
  const today = new Date("2026-06-20T12:00:00")

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(today)
    resetAllStores()
    useTaskStore.getState().setTasks([
      {
        id: "todo-1",
        description: "Finish slides",
        category: "work",
        createdAt: today,
        completed: false,
        scheduledDate: today,
        categories: [],
        urgency: 5,
        importance: 5,
        estimatedDuration: 60,
        cognitiveLoad: 3,
        dependencies: [],
        context: "@work",
        entropy: 0.5,
        rewardValue: 10,
        allowPartialCompletion: false,
        minimumChunkSize: 15,
      },
    ])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders todo panel header and day tab", () => {
    render(<TodoPanel />)
    expect(screen.getByText("To Do")).toBeInTheDocument()
    expect(screen.getByText("Today's Tasks")).toBeInTheDocument()
    expect(screen.getByText("Finish slides")).toBeInTheDocument()
  })

  it("marks a task complete when the complete action is clicked", () => {
    render(<TodoPanel />)
    screen.getByTitle("Mark complete").click()
    expect(useTaskStore.getState().tasks[0].completed).toBe(true)
  })
})
