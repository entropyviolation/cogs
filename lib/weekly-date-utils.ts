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
