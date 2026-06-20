import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { format } from "date-fns"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { resetAllStores } from "@/tests/test-utils"
import { ActualDayView } from "./actual-day-view"

vi.mock("@/components/Home/Plan/agenda-grid", () => ({
  AgendaGrid: () => <div data-testid="agenda-grid">Agenda Grid</div>,
}))

describe("ActualDayView", () => {
  const currentDate = new Date("2026-06-20T12:00:00")

  beforeEach(() => {
    resetAllStores()
  })

  it("renders date navigation and agenda tab", () => {
    render(<ActualDayView currentDate={currentDate} />)
    expect(screen.getByText(format(currentDate, "EEEE, MMM d"))).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Agenda" })).toBeInTheDocument()
    expect(screen.getByTestId("agenda-grid")).toBeInTheDocument()
  })

  it("switches to activity log tab", async () => {
    const user = userEvent.setup()
    render(<ActualDayView currentDate={currentDate} />)

    await user.click(screen.getByRole("tab", { name: "Activity Log" }))
    expect(screen.getByText("Activity log")).toBeInTheDocument()
  })
})
