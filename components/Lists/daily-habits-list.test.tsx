/**
 * DailyHabitsList — daily habits panel in Lists.
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { format } from "date-fns"
import { resetLocalStorage } from "@/tests/test-utils"
import { useHabitsStore } from "@/lib/habits-store"
import { TaskType } from "@/lib/types"
import { DailyHabitsList } from "./daily-habits-list"

vi.mock("@/components/Home/Habits/daily-task-form-dialog", () => ({
  TaskFormDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="habit-form">Habit form</div> : null,
}))

vi.mock("@/components/Home/Habits/settings-dialog", () => ({
  SettingsDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="habit-settings">Habit settings</div> : null,
}))

describe("DailyHabitsList", () => {
  beforeEach(() => {
    resetLocalStorage()
    useHabitsStore.getState().resetData()
    useHabitsStore.getState().addTask({
      id: "daily-bool",
      name: "Morning stretch",
      type: TaskType.BOOLEAN,
      rewardValue: 10,
      frequency: "daily",
    })
  })

  it("renders today's header and habit row", () => {
    render(<DailyHabitsList />)
    expect(screen.getByText(format(new Date(), "EEEE, MMMM d"))).toBeInTheDocument()
    expect(screen.getByText("Morning stretch")).toBeInTheDocument()
    expect(screen.getByText(/0\/1 done today/)).toBeInTheDocument()
  })

  it("opens the add-habit form when + Add Habit is clicked", async () => {
    const user = userEvent.setup()
    render(<DailyHabitsList />)
    await user.click(screen.getByRole("button", { name: /Add Habit/i }))
    expect(screen.getByTestId("habit-form")).toBeInTheDocument()
  })

  it("toggles boolean habit completion in the store", async () => {
    const user = userEvent.setup()
    render(<DailyHabitsList />)
    await user.click(screen.getByRole("button", { name: "Toggle" }))
    const dayKey = format(new Date(), "yyyy-MM-dd")
    expect(useHabitsStore.getState().weeklyData[dayKey]?.["daily-bool"]?.completed).toBe(true)
  })
})
