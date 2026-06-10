/* global process */
process.env.TZ = 'UTC'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toDate, formatDueDate, checkIsOverdue, getCountdownText } from './dateHelpers'

describe('dateHelpers.js unit tests', () => {
  beforeEach(() => {
    // Freeze system time to a fixed date: May 24, 2026, 12:00:00 UTC
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-24T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('toDate', () => {
    it('should return null if input is falsy', () => {
      expect(toDate(null)).toBeNull()
      expect(toDate(undefined)).toBeNull()
      expect(toDate('')).toBeNull()
    })

    it('should convert Firestore Timestamp (with toDate method) to Date', () => {
      const mockTimestamp = {
        toDate: () => new Date('2026-05-25T15:00:00Z')
      }
      const result = toDate(mockTimestamp)
      expect(result).toBeInstanceOf(Date)
      expect(result.toISOString()).toBe('2026-05-25T15:00:00.000Z')
    })

    it('should pass through Date objects', () => {
      const date = new Date('2026-05-24T10:00:00Z')
      const result = toDate(date)
      expect(result).toBeInstanceOf(Date)
      expect(result.getTime()).toBe(date.getTime())
    })

    it('should convert date strings to Date objects', () => {
      const dateStr = '2026-05-24T18:00:00.000Z'
      const result = toDate(dateStr)
      expect(result).toBeInstanceOf(Date)
      expect(result.toISOString()).toBe(dateStr)
    })
  })

  describe('formatDueDate', () => {
    it('should return empty string if input is falsy', () => {
      expect(formatDueDate(null)).toBe('')
    })

    it('should format date string into human-friendly format', () => {
      const date = '2026-05-26T18:30:00Z'
      // UTC time (since TZ=UTC): May 26, 2026 at 18:30
      expect(formatDueDate(date)).toContain('May 26, 2026')
      expect(formatDueDate(date)).toContain('at 18:30')
    })
  })

  describe('checkIsOverdue', () => {
    it('should return false if input is falsy', () => {
      expect(checkIsOverdue(null)).toBe(false)
    })

    it('should return true if date is in the past compared to system time', () => {
      const pastDate = '2026-05-24T11:59:00Z' // 1 minute in the past
      expect(checkIsOverdue(pastDate)).toBe(true)
    })

    it('should return false if date is in the future compared to system time', () => {
      const futureDate = '2026-05-24T12:01:00Z' // 1 minute in the future
      expect(checkIsOverdue(futureDate)).toBe(false)
    })
  })

  describe('getCountdownText', () => {
    it('should return "Completed" if status is Completed', () => {
      const date = '2026-05-24T13:00:00Z'
      expect(getCountdownText(date, 'Completed')).toBe('Completed')
    })

    it('should return empty string if date input is falsy and status is not Completed', () => {
      expect(getCountdownText(null, 'Pending')).toBe('')
    })

    it('should calculate due time correctly for future deadlines', () => {
      const dueIn30Mins = '2026-05-24T12:30:00Z'
      expect(getCountdownText(dueIn30Mins, 'Pending')).toBe('30 mins remaining')

      const dueIn5Hrs = '2026-05-24T17:00:00Z'
      expect(getCountdownText(dueIn5Hrs, 'Pending')).toBe('5 hrs remaining')

      const dueIn3Days = '2026-05-27T12:00:00Z'
      expect(getCountdownText(dueIn3Days, 'Pending')).toBe('3 days remaining')
    })

    it('should calculate overdue time correctly for past deadlines', () => {
      const overdueBy15Mins = '2026-05-24T11:45:00Z'
      expect(getCountdownText(overdueBy15Mins, 'Pending')).toBe('Failed to submit')

      const overdueBy4Hrs = '2026-05-24T08:00:00Z'
      expect(getCountdownText(overdueBy4Hrs, 'Pending')).toBe('Failed to submit')

      const overdueBy2Days = '2026-05-22T12:00:00Z'
      expect(getCountdownText(overdueBy2Days, 'Pending')).toBe('Failed to submit')
    })
  })
})
