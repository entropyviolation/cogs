import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { resetAllStores } from "@/tests/test-utils"
import { usePointsStore } from "@/lib/points-store"
import { PointsStats } from "./points-stats"

describe("PointsStats", () => {
  const currentDate = new Date("2026-06-20T12:00:00")

  beforeEach(() => {
    resetAllStores()
    usePointsStore.getState().addPoints("task-1", 42, "Test task", currentDate)
  })

  it("renders all four points summary cards", () => {
    render(<PointsStats currentDate={currentDate} />)
    expect(screen.getByText("All Time Points")).toBeInTheDocument()
    expect(screen.getByText("Today's Points")).toBeInTheDocument()
    expect(screen.getByText("This Week")).toBeInTheDocument()
    expect(screen.getByText("This Month")).toBeInTheDocument()
  })

  it("shows earned points after mount", async () => {
    render(<PointsStats currentDate={currentDate} />)
    const values = await screen.findAllByText("42")
    expect(values).toHaveLength(4)
  })
})
