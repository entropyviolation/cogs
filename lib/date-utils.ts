export function safeDateFormat(date: Date | string | undefined): string {
  if (!date) return "Not set"

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return "Invalid date"
    return dateObj.toLocaleDateString()
  } catch {
    return "Invalid date"
  }
}

export function safeISODateString(date: Date | string | undefined): string {
  if (!date) return ""

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return ""
    return dateObj.toISOString().split("T")[0]
  } catch {
    return ""
  }
}

export function safeToDate(date: Date | string | undefined): Date | null {
  if (!date) return null

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return null
    return dateObj
  } catch {
    return null
  }
}

export function formatWeekRange(startDate: Date): string {
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)

  const startMonth = startDate.getMonth() + 1
  const startDay = startDate.getDate()
  const endMonth = endDate.getMonth() + 1
  const endDay = endDate.getDate()

  return `${startMonth}/${startDay}-${endMonth}/${endDay}`
}

export function getWeekString(date: Date): string {
  const startOfWeek = new Date(date)
  startOfWeek.setDate(date.getDate() - date.getDay())
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  return `${startOfWeek.toISOString().slice(0, 10)}_${endOfWeek.toISOString().slice(0, 10)}`
}

export function parseWeekString(weekString: string): { start: Date; end: Date } | null {
  try {
    const [startStr, endStr] = weekString.split("_")
    return {
      start: new Date(startStr),
      end: new Date(endStr),
    }
  } catch {
    return null
  }
}

/**
 * Gets the Monday of the week containing the given date
 */
export function getWeekStartDate(date: Date): Date {
  const day = date.getDay()
  // Convert Sunday (0) to 7 to make Monday (1) the first day of the week
  const diff = date.getDate() - (day === 0 ? 6 : day - 1)
  const monday = new Date(date)
  monday.setDate(diff)
  // Reset time to start of day
  monday.setHours(0, 0, 0, 0)
  return monday
}

/**
 * Gets an array of 7 dates for the week starting with the given date
 */
export function getWeekDates(startDate: Date): Date[] {
  const dates: Date[] = []
  const currentDate = new Date(startDate)

  for (let i = 0; i < 7; i++) {
    dates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dates
}

/**
 * Formats a date as YYYY-MM-DD for use as a key in the data structure
 */
export function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0]
}

/**
 * Formats a date for display in the UI (e.g., "Mon 5/16")
 */
export function formatDateDisplay(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const day = days[date.getDay()]
  const month = date.getMonth() + 1
  const dayOfMonth = date.getDate()

  return `${day} ${month}/${dayOfMonth}`
}

/**
 * Formats a date range for display (e.g., "May 15 - May 21, 2023")
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: startDate.getFullYear() !== endDate.getFullYear() ? "numeric" : undefined,
  }

  const start = startDate.toLocaleDateString("en-US", options)
  const end = endDate.toLocaleDateString("en-US", {
    ...options,
    year: "numeric", // Always show year for end date
  })

  return `${start} - ${end}`
}

/**
 * Gets the day of week name for a date
 */
export function getDayOfWeek(date: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  return days[date.getDay()]
}

/**
 * Checks if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}
