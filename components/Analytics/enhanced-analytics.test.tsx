/**
 * EnhancedAnalytics — smoke + tab navigation tests.
 */
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { resetLocalStorage } from "@/tests/test-utils"
import { useTaskStore } from "@/lib/task-store"
import { usePointsStore } from "@/lib/points-store"
import { useHabitsStore } from "@/lib/habits-store"
import { useReviewsStore } from "@/lib/reviews-store"
import { useTimeTrackingStore } from "@/lib/time-tracking-store"
import { EnhancedAnalytics } from "./enhanced-analytics"

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="chart">{children}</div>,
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Line: () => null,
  PieChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}))

describe("EnhancedAnalytics", () => {
  beforeEach(() => {
    resetLocalStorage()
    useTaskStore.setState({ tasks: [], categories: [], folders: [] })
    usePointsStore.setState({ pointsHistory: [] })
    useHabitsStore.setState({ tasks: [], weeklyData: {}, categories: [] })
    useReviewsStore.setState({ reviews: [] })
    useTimeTrackingStore.setState((state) => ({
      ...state,
      scopes: state.scopes.length ? state.scopes : [{ id: "activity", name: "Activity", pens: [] }],
      data: {},
    }))
  })

  it("renders headline metrics", () => {
    render(<EnhancedAnalytics />)

    expect(screen.getByRole("heading", { name: "Analytics & Insights" })).toBeInTheDocument()
    expect(screen.getByText("Total points")).toBeInTheDocument()
    expect(screen.getByText("Tasks completed")).toBeInTheDocument()
    expect(screen.getByText("Completion rate")).toBeInTheDocument()
    expect(screen.getByText("Active habits")).toBeInTheDocument()
    expect(screen.getByText("Daily habit completion heatmap")).toBeInTheDocument()
  })

  it("switches to the Points tab and shows points sections", async () => {
    const user = userEvent.setup()
    render(<EnhancedAnalytics />)

    await user.click(screen.getByRole("tab", { name: "Points" }))

    expect(screen.getByText("Points (last 14 days)")).toBeInTheDocument()
    expect(screen.getByText("Cumulative points")).toBeInTheDocument()
    expect(screen.getByText("Top point earners")).toBeInTheDocument()
    expect(screen.getByText("Complete tasks to earn points.")).toBeInTheDocument()
  })
})
