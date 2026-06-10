const functions = require('firebase-functions')
const admin = require('firebase-admin')
const sgMail = require('@sendgrid/mail')

admin.initializeApp()

// Initialize SendGrid with environment API key
const sendgridApiKey = process.env.SENDGRID_API_KEY || ''
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey)
}

/**
 * Check if the current time falls inside the user's DND window.
 */
const isUserInDND = (prefs, timezone = 'UTC') => {
  if (!prefs || !prefs.dndStart || !prefs.dndEnd) return false

  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    
    const timeParts = formatter.format(now).split(':')
    const currentHour = parseInt(timeParts[0], 10)
    const currentMin = parseInt(timeParts[1], 10)
    const currentMinutes = currentHour * 60 + currentMin

    const [startH, startM] = prefs.dndStart.split(':').map(Number)
    const [endH, endM] = prefs.dndEnd.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    if (startMinutes === endMinutes) return false

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes
    } else {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes
    }
  } catch (error) {
    console.error('Error checking DND window:', error)
    return false
  }
}

/**
 * Scheduled Cloud Function running every 15 minutes.
 * Scans active deadlines and dispatches FCM and Email alerts.
 */
exports.checkAndSendReminders = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    const db = admin.firestore()
    const nowMs = Date.now()
    const windowStart = nowMs - 16 * 60 * 1000 // 16 min ago to catch any scheduled delay
    const windowEnd = nowMs

    console.log(`Running checkAndSendReminders at ${new Date().toISOString()}`)

    try {
      // Query all deadlines across all users using Collection Group
      const deadlinesSnapshot = await db.collectionGroup('deadlines')
        .where('status', 'in', ['Pending', 'InProgress', 'Overdue'])
        .get()

      if (deadlinesSnapshot.empty) {
        console.log('No active deadlines found.')
        return null
      }

      console.log(`Analyzing ${deadlinesSnapshot.size} active deadlines...`)

      const promises = []

      deadlinesSnapshot.forEach((deadlineDoc) => {
        const deadline = deadlineDoc.data()
        const deadlineId = deadlineDoc.id
        
        // Extract parent user UID: /users/{uid}/deadlines/{deadlineId}
        const pathParts = deadlineDoc.ref.path.split('/')
        const uid = pathParts[1]

        if (!uid || !deadline.dueDate) return

        const dueDateObj = deadline.dueDate.toDate ? deadline.dueDate.toDate() : new Date(deadline.dueDate)
        const dueDateMs = dueDateObj.getTime()
        const intervals = deadline.reminderIntervals || []
        const sentReminders = deadline.sentReminders || []

        intervals.forEach((minutesBefore) => {
          const triggerTimeMs = dueDateMs - minutesBefore * 60 * 1000

          // Check if this interval is in the active 15m trigger window and has not been dispatched yet
          if (triggerTimeMs >= windowStart && triggerTimeMs <= windowEnd && !sentReminders.includes(minutesBefore)) {
            
            // Queue reminder dispatch promise
            promises.push(
              dispatchReminder(db, uid, deadlineId, deadline, minutesBefore)
            )
          }
        })
      })

      if (promises.length > 0) {
        await Promise.all(promises)
        console.log(`Successfully dispatched ${promises.length} reminders.`)
      } else {
        console.log('No reminders due in this window.')
      }
    } catch (error) {
      console.error('Error running checkAndSendReminders function:', error)
    }

    return null
  })

/**
 * Dispatch FCM push and email notifications for a matching user and deadline.
 */
async function dispatchReminder(db, uid, deadlineId, deadline, minutesBefore) {
  const userRef = db.collection('users').doc(uid)
  const userDoc = await userRef.get()

  if (!userDoc.exists) {
    console.warn(`User ${uid} doc does not exist. Skipping reminder.`)
    return
  }

  const user = userDoc.data()
  const prefs = user.notificationPrefs || { push: true, email: true, inApp: true }
  const timezone = user.timezone || 'UTC'
  const email = user.email

  const title = `Reminder: ${deadline.title}`
  const intervalLabel = minutesBefore >= 1440 
    ? `${Math.round(minutesBefore / 1440)} day(s)` 
    : minutesBefore >= 60 
      ? `${Math.round(minutesBefore / 60)} hour(s)` 
      : `${minutesBefore} min(s)`
  
  const body = `"${deadline.title}" (Priority: ${deadline.priority}) is due in ${intervalLabel}!`

  // 1. Write notification history record to Firestore users/{uid}/notifications
  const notifRef = userRef.collection('notifications').doc()
  await notifRef.set({
    title,
    body,
    deadlineId,
    type: 'alert',
    read: false,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  })

  // 2. Dispatch Browser Push Notification (FCM) if enabled & not in DND
  if (prefs.push !== false && user.fcmToken) {
    if (isUserInDND(prefs, timezone)) {
      console.log(`User ${uid} is in DND. Skipping push notification.`)
    } else {
      try {
        const message = {
          token: user.fcmToken,
          notification: {
            title,
            body
          },
          data: {
            deadlineId,
            click_action: '/dashboard'
          }
        }
        await admin.messaging().send(message)
        console.log(`Push notification sent successfully to user ${uid}`)
      } catch (err) {
        console.error(`Error sending push notification to user ${uid}:`, err)
      }
    }
  }

  // 3. Dispatch Email Notification if enabled
  if (prefs.email !== false && email && sendgridApiKey) {
    try {
      const msg = {
        to: email,
        from: 'no-reply@deadlineaware.com', // Must be verified in SendGrid
        subject: title,
        text: body,
        html: `<p>${body}</p>`
      }
      await sgMail.send(msg)
      console.log(`Email reminder sent successfully to ${email}`)
    } catch (err) {
      console.error(`Error sending email to ${email}:`, err)
    }
  }

  // 4. Update the deadline document to include this interval in sentReminders
  const deadlineRef = userRef.collection('deadlines').doc(deadlineId)
  await deadlineRef.update({
    sentReminders: admin.firestore.FieldValue.arrayUnion(minutesBefore)
  })
}
