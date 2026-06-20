import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { resetAllStores } from "@/tests/test-utils"
import { useTimeTrackingStore } from "@/lib/time-tracking-store"
import { TimeGrid } from "./time-grid"

describe("TimeGrid", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-20T12:00:00"))
    resetAllStores()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders scope tabs and pen palette", () => {
    render(<TimeGrid />)
    expect(screen.getByRole("button", { name: "Activity" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Work" })).toBeInTheDocument()
    expect(screen.getByText("Clear day")).toBeInTheDocument()
  })

  it("clears painted slots for the current day", () => {
    const store = useTimeTrackingStore.getState()
    store.setSelectedPen("act-work")
    store.paintRange("2026-06-20", "activity", 36, 39, "act-work")

    render(<TimeGrid />)
    screen.getByRole("button", { name: "Clear day" }).click()

    const slots = useTimeTrackingStore.getState().data["2026-06-20"]?.activity ?? []
    expect(slots.every((slot) => slot === null)).toBe(true)
  })
})
