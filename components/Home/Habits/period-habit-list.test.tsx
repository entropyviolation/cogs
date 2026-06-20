import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { TaskType } from "@/lib/types"
import { PeriodHabitList } from "./period-habit-list"

describe("PeriodHabitList", () => {
  const tasks = [
    { id: "h1", name: "Weekly review", type: TaskType.BOOLEAN, rewardValue: 15, frequency: "weekly" as const },
  ]

  it("renders habit names for the period", () => {
    render(
      <PeriodHabitList
        tasks={tasks}
        periodKey="2026-W25"
        data={{}}
        periodLabel="This week"
        onUpdate={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByText("Weekly review")).toBeInTheDocument()
    expect(screen.getByText("This week")).toBeInTheDocument()
  })

  it("calls onUpdate when a boolean habit is checked", async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(
      <PeriodHabitList
        tasks={tasks}
        periodKey="2026-W25"
        data={{}}
        periodLabel="This week"
        onUpdate={onUpdate}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("checkbox"))
    expect(onUpdate).toHaveBeenCalledWith("h1", { completed: true })
  })
})
