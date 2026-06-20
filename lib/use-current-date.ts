/**
 * lib/use-current-date.ts — Shared "today" with midnight rollover
 *
 * Used by Home dashboard header, points, progress, Plan, and Day Log so they
 * stay on the same calendar day and advance at local midnight.
 */
"use client"

import { useCallback, useEffect, useState } from "react"

export function msUntilLocalMidnight(from = new Date()): number {
  const next = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1)
  return Math.max(0, next.getTime() - from.getTime())
}

export function useCurrentDate() {
  const [currentDate, setCurrentDate] = useState(() => new Date())

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    const scheduleNextMidnight = () => {
      timeoutId = setTimeout(() => {
        setCurrentDate(new Date())
      }, msUntilLocalMidnight())
    }

    scheduleNextMidnight()
    return () => clearTimeout(timeoutId)
  }, [currentDate])

  const goToToday = useCallback(() => setCurrentDate(new Date()), [])

  return { currentDate, setCurrentDate, goToToday }
}
