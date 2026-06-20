import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { TaskForm } from "./daily-task-form"

describe("TaskForm", () => {
  it("renders the habit form fields", () => {
    render(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByLabelText("Habit Name")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add Task" })).toBeInTheDocument()
  })

  it("submits a new habit when name is provided", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<TaskForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText("Habit Name"), "Stretch daily")
    await user.click(screen.getByRole("button", { name: "Add Task" }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "Stretch daily" }))
  })
})
