// Date utilities for HustleDesk

/**
 * Get current date in Kenya timezone (EAT - UTC+3)
 */
export function getCurrentDateKE(): Date {
  const now = new Date()
  // Kenya is UTC+3
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const kenya = new Date(utc + (3 * 3600000))
  return kenya
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format datetime for display
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function formatDateInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

/**
 * Get start of day in Kenya timezone
 */
export function getStartOfDayKE(date?: Date): Date {
  const d = date || getCurrentDateKE()
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  return start
}

/**
 * Get end of day in Kenya timezone
 */
export function getEndOfDayKE(date?: Date): Date {
  const d = date || getCurrentDateKE()
  const end = new Date(d)
  end.setHours(23, 59, 59, 999)
  return end
}

/**
 * Get date range for today
 */
export function getTodayRange(): { from: Date; to: Date } {
  const today = getCurrentDateKE()
  return {
    from: getStartOfDayKE(today),
    to: getEndOfDayKE(today),
  }
}

/**
 * Get date range for yesterday
 */
export function getYesterdayRange(): { from: Date; to: Date } {
  const yesterday = new Date(getCurrentDateKE())
  yesterday.setDate(yesterday.getDate() - 1)
  return {
    from: getStartOfDayKE(yesterday),
    to: getEndOfDayKE(yesterday),
  }
}

/**
 * Get date range for this week (Monday to Sunday)
 */
export function getThisWeekRange(): { from: Date; to: Date } {
  const today = getCurrentDateKE()
  const dayOfWeek = today.getDay()
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust for Sunday
  
  const monday = new Date(today)
  monday.setDate(diff)
  
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  
  return {
    from: getStartOfDayKE(monday),
    to: getEndOfDayKE(sunday),
  }
}

/**
 * Get date range for this month
 */
export function getThisMonthRange(): { from: Date; to: Date } {
  const today = getCurrentDateKE()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  
  return {
    from: getStartOfDayKE(firstDay),
    to: getEndOfDayKE(lastDay),
  }
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = getCurrentDateKE()
  return d.toDateString() === today.toDateString()
}

/**
 * Check if date is overdue
 */
export function isOverdue(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = getCurrentDateKE()
  return d < today
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = getCurrentDateKE()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (Math.abs(diffDays) >= 1) {
    if (diffDays > 0) {
      return `in ${diffDays} day${diffDays === 1 ? '' : 's'}`
    } else {
      return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`
    }
  } else if (Math.abs(diffHours) >= 1) {
    if (diffHours > 0) {
      return `in ${diffHours} hour${diffHours === 1 ? '' : 's'}`
    } else {
      return `${Math.abs(diffHours)} hour${Math.abs(diffHours) === 1 ? '' : 's'} ago`
    }
  } else if (Math.abs(diffMinutes) >= 1) {
    if (diffMinutes > 0) {
      return `in ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}`
    } else {
      return `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) === 1 ? '' : 's'} ago`
    }
  } else {
    return 'just now'
  }
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}
