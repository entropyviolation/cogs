import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { resetAllStores } from "@/tests/test-utils"
import { useEventStore } from "@/lib/event-store"
import { EventDialog } from "./event-dialog"

describe("EventDialog", () => {
  const currentDate = new Date("2026-06-20T12:00:00")
  const baseNewEvent = {
    title: "",
    startTime: "09:00",
    endTime: "10:00",
    type: "event" as const,
    date: currentDate,
    endDate: undefined,
    isAllDay: false,
    location: "",
    description: "",
  }

  beforeEach(() => {
    resetAllStores()
  })

  it("renders create event dialog when open", () => {
    render(
      <EventDialog
        open
        onOpenChange={vi.fn()}
        editingEvent={null}
        setEditingEvent={vi.fn()}
        newEvent={baseNewEvent}
        setNewEvent={vi.fn()}
        events={[]}
        setEvents={vi.fn()}
      />,
    )
    expect(screen.getByText("Create New Event")).toBeInTheDocument()
    expect(screen.getByLabelText("Event Title")).toBeInTheDocument()
  })

  it("adds an event to the store when created", async () => {
    const user = userEvent.setup()
    const setNewEvent = vi.fn()
    render(
      <EventDialog
        open
        onOpenChange={vi.fn()}
        editingEvent={null}
        setEditingEvent={vi.fn()}
        newEvent={{ ...baseNewEvent, title: "Team sync" }}
        setNewEvent={setNewEvent}
        events={[]}
        setEvents={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Create Event" }))
    expect(useEventStore.getState().events).toHaveLength(1)
    expect(useEventStore.getState().events[0].title).toBe("Team sync")
  })
})
