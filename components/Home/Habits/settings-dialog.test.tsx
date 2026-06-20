import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { SettingsDialog } from "./settings-dialog"

describe("SettingsDialog (Habits)", () => {
  it("renders settings dialog when open", () => {
    render(
      <SettingsDialog
        open
        onOpenChange={vi.fn()}
        tasks={[]}
        weeklyData={{}}
        onImportData={vi.fn()}
        onResetData={vi.fn()}
      />,
    )
    expect(screen.getByText("Settings")).toBeInTheDocument()
    expect(screen.getByText("Theme colors")).toBeInTheDocument()
    expect(screen.getByText("Backup & restore")).toBeInTheDocument()
  })

  it("calls onResetData when reset is confirmed", async () => {
    const user = userEvent.setup()
    const onResetData = vi.fn()
    vi.spyOn(window, "confirm").mockReturnValue(true)

    render(
      <SettingsDialog
        open
        onOpenChange={vi.fn()}
        tasks={[]}
        weeklyData={{}}
        onImportData={vi.fn()}
        onResetData={onResetData}
      />,
    )

    await user.click(screen.getByRole("button", { name: /Reset habits/i }))
    expect(onResetData).toHaveBeenCalledOnce()
  })
})
