import { format } from 'date-fns'

/**
 * Converts a Firestore Timestamp, Date object, or date string into a JS Date object.
 */
export const toDate = (dateField) => {
  if (!dateField) return null
  if (typeof dateField.toDate === 'function') {
    return dateField.toDate()
  }
  return new Date(dateField)
}

/**
 * Formats a date into a clean format: e.g. "May 26, 2026 at 18:00"
 */
export const formatDueDate = (dateField) => {
  const date = toDate(dateField)
  if (!date) return ''
  return `${format(date, 'MMM dd, yyyy')} at ${format(date, 'HH:mm')}`
}

/**
 * Checks if a date is in the past.
 */
export const checkIsOverdue = (dateField) => {
  const date = toDate(dateField)
  if (!date) return false
  return date.getTime() < Date.now()
}

/**
 * Returns a human-readable countdown text (e.g. "2 hours remaining", "Overdue by 3 days")
 */
export const getCountdownText = (dateField, status) => {
  if (status === 'Completed') {
    return 'Completed'
  }

  const date = toDate(dateField)
  if (!date) return ''

  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const isOverdue = diffMs < 0
  const absDiffMs = Math.abs(diffMs)

  const diffMins = Math.floor(absDiffMs / (1000 * 60))
  const diffHrs = Math.floor(absDiffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(absDiffMs / (1000 * 60 * 60 * 24))

  if (isOverdue) {
    return 'Failed to submit'
  } else {
    if (diffMins < 1) {
      return 'Due in less than a min'
    } else if (diffHrs < 1) {
      return `${diffMins} min${diffMins > 1 ? 's' : ''} remaining`
    } else if (diffDays < 1) {
      return `${diffHrs} hr${diffHrs > 1 ? 's' : ''} remaining`
    } else {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`
    }
  }
}
