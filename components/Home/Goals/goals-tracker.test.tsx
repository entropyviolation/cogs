import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import { resetAllStores } from "@/tests/test-utils"
import { useGoalsStore } from "@/lib/goals-store"
import { GoalsTracker } from "./goals-tracker"

describe("GoalsTracker", () => {
  beforeEach(() => {
    resetAllStores()
    useGoalsStore.setState({
      goals: [
        {
          id: "goal-test",
          title: "Read 3 books",
          description: "",
          type: "count",
          target: 3,
          current: 1,
          period: "month",
          category: "Learning",
          points: 25,
          completed: false,
          createdAt: new Date("2026-06-01"),
        },
      ],
    })
  })

  it("renders goals header and period tabs", () => {
    render(<GoalsTracker />)
    expect(screen.getByText("Goals & Targets")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "This Month" })).toBeInTheDocument()
    expect(screen.getByText("Read 3 books")).toBeInTheDocument()
  })

  it("increments goal progress when +1 is clicked", async () => {
    const user = userEvent.setup()
    render(<GoalsTracker />)

    await user.click(screen.getByRole("button", { name: "+1" }))
    expect(screen.getByText("2 / 3 items")).toBeInTheDocument()
  })
})
