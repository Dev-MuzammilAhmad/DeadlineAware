import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import app, { db } from './firebase'
import { doc, updateDoc } from 'firebase/firestore'

/**
 * Request notification permissions and register the FCM token in the user's document.
 * This is completely non-blocking and will never throw — all errors are silently caught.
 */
export const requestNotificationPermission = async (uid) => {
  if (typeof window === 'undefined') return null

  try {
    const supported = await isSupported()
    if (!supported) {
      console.info('FCM is not supported in this browser environment.')
      return null
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.info('Browser notification permission was denied.')
      return null
    }

    // Load VAPID key from environment — if missing, skip FCM token registration entirely
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''
    if (!vapidKey) {
      console.info('VITE_FIREBASE_VAPID_KEY is not set. Skipping FCM token registration.')
      return null
    }

    const messagingInstance = getMessaging(app)
    const token = await getToken(messagingInstance, { vapidKey })
    
    if (token) {
      const userRef = doc(db, 'users', uid)
      await updateDoc(userRef, { fcmToken: token })
      return token
    }
  } catch (error) {
    // Silently catch — FCM is optional functionality
    console.warn('FCM token registration skipped:', error.message || error)
  }
  return null
}
