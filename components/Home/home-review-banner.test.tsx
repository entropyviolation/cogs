import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { resetAllStores } from "@/tests/test-utils"
import * as pendingReviews from "@/lib/pending-reviews"
import { HomeReviewBanner } from "./home-review-banner"

describe("HomeReviewBanner", () => {
  const currentDate = new Date("2026-06-20T12:00:00")

  beforeEach(() => {
    resetAllStores()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders nothing when no reviews are pending", () => {
    vi.spyOn(pendingReviews, "countPendingReviews").mockReturnValue(0)

    render(<HomeReviewBanner currentDate={currentDate} />)
    expect(screen.queryByText("Review due")).not.toBeInTheDocument()
  })

  it("shows review banner and calls onStartReview when clicked", async () => {
    const user = userEvent.setup()
    const onStartReview = vi.fn()
    render(<HomeReviewBanner currentDate={currentDate} onStartReview={onStartReview} />)

    expect(screen.getByText("Review due")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Start review" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Start review" }))
    expect(onStartReview).toHaveBeenCalledOnce()
    expect(onStartReview.mock.calls[0][0]).toBe("day")
  })

  it("hides the banner when dismissed", async () => {
    const user = userEvent.setup()
    render(<HomeReviewBanner currentDate={currentDate} />)

    await user.click(screen.getByRole("button", { name: "Dismiss" }))
    expect(screen.queryByText("Review due")).not.toBeInTheDocument()
  })
})
