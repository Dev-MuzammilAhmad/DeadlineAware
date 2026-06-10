import { useEffect, useRef } from 'react'
import useAuth from '../hooks/useAuth'
import { subscribeToDeadlines, createNotification, markReminderAsSent } from '../services/firestoreService'
import { sendReminderEmail } from '../services/emailService'

export default function ReminderManager() {
  const { currentUser } = useAuth()
  const deadlinesRef = useRef([])

  useEffect(() => {
    if (!currentUser) return

    const unsubscribe = subscribeToDeadlines(
      currentUser.uid,
      (list) => {
        deadlinesRef.current = list
        // Run initial check on load
        checkReminders(list)
      },
      (error) => {
        console.error('ReminderManager subscription error:', error)
      }
    )

    const intervalId = setInterval(() => {
      checkReminders(deadlinesRef.current)
    }, 30000) // check every 30 seconds

    return () => {
      unsubscribe()
      clearInterval(intervalId)
    }
  }, [currentUser])

  const checkReminders = async (deadlinesList) => {
    if (!currentUser || !deadlinesList || deadlinesList.length === 0) return

    const now = Date.now()

    for (const deadline of deadlinesList) {
      // Skip completed deadlines
      if (deadline.status === 'Completed') continue

      // Parse due date
      const dueDateObj = deadline.dueDate?.toDate ? deadline.dueDate.toDate() : new Date(deadline.dueDate)
      const dueDateMs = dueDateObj.getTime()
      if (isNaN(dueDateMs)) continue

      const intervals = deadline.reminderIntervals || []
      const sentReminders = deadline.sentReminders || []

      for (const minutesBefore of intervals) {
        const triggerTimeMs = dueDateMs - minutesBefore * 60 * 1000

        // Check if now has passed the trigger time
        // To avoid triggering very old notifications, we set a sanity window of 30 minutes
        const isTriggered = now >= triggerTimeMs && now < dueDateMs
        const isRecent = (now - triggerTimeMs) <= 30 * 60 * 1000 // within last 30 minutes

        if (isTriggered && isRecent && !sentReminders.includes(minutesBefore)) {
          // Send reminder!
          await triggerReminder(deadline, minutesBefore)
        }
      }
    }
  }

  const triggerReminder = async (deadline, minutesBefore) => {
    try {
      // 1. Immediately mark reminder as sent in Firestore to prevent duplicate triggers
      await markReminderAsSent(currentUser.uid, deadline.id, minutesBefore)

      const title = `Reminder: ${deadline.title}`
      const intervalLabel = minutesBefore >= 1440 
        ? `${Math.round(minutesBefore / 1440)} day(s)` 
        : minutesBefore >= 60 
          ? `${Math.round(minutesBefore / 60)} hour(s)` 
          : `${minutesBefore} min(s)`
      
      const body = `"${deadline.title}" (Priority: ${deadline.priority}) is due in ${intervalLabel}!`

      // 2. Write in-app notification doc to Firestore
      await createNotification(currentUser.uid, {
        title,
        body,
        deadlineId: deadline.id,
        type: 'alert',
        read: false
      })

      // 3. Show native browser notification if granted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.svg'
        })
      }

      // 4. Send email notification if user has email enabled
      const userEmail = currentUser.email
      const emailEnabled = currentUser.profile?.notificationPrefs?.email !== false
      if (emailEnabled && userEmail) {
        const dueDateObj = deadline.dueDate?.toDate ? deadline.dueDate.toDate() : new Date(deadline.dueDate)
        const formattedDueDate = dueDateObj.toLocaleString(undefined, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        await sendReminderEmail(userEmail, deadline.title, deadline.priority, intervalLabel, formattedDueDate)
      }
      
      console.info(`Successfully triggered client-side reminder for "${deadline.title}" at ${intervalLabel}`)
    } catch (error) {
      console.error('Error triggering client-side reminder:', error)
    }
  }

  return null // Background only component
}
