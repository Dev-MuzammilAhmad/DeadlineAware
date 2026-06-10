export const CATEGORIES = {
  ACADEMIC: 'Academic',
  WORK: 'Work',
  PERSONAL: 'Personal',
  FREELANCE: 'Freelance',
  OTHER: 'Other',
}

export const CATEGORIES_LIST = Object.values(CATEGORIES)

export const PRIORITIES = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}

export const PRIORITIES_LIST = Object.values(PRIORITIES)

export const STATUSES = {
  PENDING: 'Pending',
  IN_PROGRESS: 'InProgress',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
}

export const STATUSES_LIST = Object.values(STATUSES)

// For mapping status values to user friendly names
export const STATUS_LABELS = {
  [STATUSES.PENDING]: 'Pending',
  [STATUSES.IN_PROGRESS]: 'In Progress',
  [STATUSES.COMPLETED]: 'Completed',
  [STATUSES.OVERDUE]: 'Failed',
}
