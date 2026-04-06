"use client"

import { Button } from "@/components/ui/button"
import { formatDateRange } from "@/lib/date-utils"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

interface WeekNavigationProps {
  currentWeekStart: Date
  weekEndDate: Date
  onPreviousWeek: () => void
  onNextWeek: () => void
  onCurrentWeek: () => void
}

export function WeekNavigation({
  currentWeekStart,
  weekEndDate,
  onPreviousWeek,
  onNextWeek,
  onCurrentWeek,
}: WeekNavigationProps) {
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-3 rounded-full shadow-sm border border-gray-100 dark:border-gray-800">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPreviousWeek}
        className="h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <ChevronLeft className="h-5 w-5" />
        <span className="sr-only">Previous Week</span>
      </Button>

      <Button
        variant="outline"
        onClick={onCurrentWeek}
        className="h-9 px-4 text-xs rounded-full border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Calendar className="h-3.5 w-3.5 mr-2" />
        Today
      </Button>

      <span className="px-3 font-medium text-sm">{formatDateRange(currentWeekStart, weekEndDate)}</span>

      <Button
        variant="ghost"
        size="icon"
        onClick={onNextWeek}
        className="h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <ChevronRight className="h-5 w-5" />
        <span className="sr-only">Next Week</span>
      </Button>
    </div>
  )
}
