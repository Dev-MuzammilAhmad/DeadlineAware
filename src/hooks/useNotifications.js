import { useState, useEffect } from 'react'
import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  writeBatch,
  deleteDoc
} from 'firebase/firestore'
import { db } from '../services/firebase'
import useAuth from './useAuth'

export default function useNotifications() {
  const { currentUser } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let timer

    if (!currentUser) {
      timer = setTimeout(() => {
        if (active) {
          setNotifications([])
          setLoading(false)
        }
      }, 0)
      return () => {
        active = false
        if (timer) clearTimeout(timer)
      }
    }

    timer = setTimeout(() => {
      if (active) {
        setLoading(true)
      }
    }, 0)

    // Listen to real-time notification records in Firestore
    const notificationsCol = collection(db, 'users', currentUser.uid, 'notifications')
    const q = query(notificationsCol, orderBy('timestamp', 'desc'), limit(50))

    const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      if (!active) return
      const list = []
      snapshot.forEach((doc) => {
        list.push({
          id: doc.id,
          ...doc.data()
        })
      })
      setNotifications(list)
      setLoading(false)
    }, (error) => {
      console.error('Error fetching notifications:', error)
      if (active) setLoading(false)
    })

    // FCM foreground listener removed — it was causing crashes due to missing
    // service worker and VAPID key. Notifications are already handled via
    // Firestore real-time listener above, which is sufficient.

    return () => {
      active = false
      if (timer) clearTimeout(timer)
      unsubscribeFirestore()
    }
  }, [currentUser])

  // Mark single notification as read
  const markAsRead = async (notificationId) => {
    if (!currentUser) return
    const docRef = doc(db, 'users', currentUser.uid, 'notifications', notificationId)
    return updateDoc(docRef, { read: true })
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!currentUser || notifications.length === 0) return
    const unread = notifications.filter((n) => !n.read)
    if (unread.length === 0) return

    const batch = writeBatch(db)
    unread.forEach((n) => {
      const docRef = doc(db, 'users', currentUser.uid, 'notifications', n.id)
      batch.update(docRef, { read: true })
    })
    return batch.commit()
  }

  // Delete a notification record
  const deleteNotification = async (notificationId) => {
    if (!currentUser) return
    const docRef = doc(db, 'users', currentUser.uid, 'notifications', notificationId)
    return deleteDoc(docRef)
  }

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!currentUser || notifications.length === 0) return
    const batch = writeBatch(db)
    notifications.forEach((n) => {
      const docRef = doc(db, 'users', currentUser.uid, 'notifications', n.id)
      batch.delete(docRef)
    })
    return batch.commit()
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  }
}
