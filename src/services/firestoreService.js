import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore'
import { db } from './firebase'

// Create a new deadline under users/{uid}/deadlines/{deadlineId}
export const addDeadline = async (uid, deadline) => {
  const deadlinesCol = collection(db, 'users', uid, 'deadlines')
  return addDoc(deadlinesCol, {
    ...deadline,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// Update an existing deadline
export const updateDeadline = async (uid, deadlineId, updates) => {
  const deadlineDocRef = doc(db, 'users', uid, 'deadlines', deadlineId)
  return updateDoc(deadlineDocRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

// Delete a deadline
export const deleteDeadline = async (uid, deadlineId) => {
  const deadlineDocRef = doc(db, 'users', uid, 'deadlines', deadlineId)
  return deleteDoc(deadlineDocRef)
}

// Subscribe to real-time deadline updates for a user, sorted by due date
export const subscribeToDeadlines = (uid, callback, onError) => {
  const deadlinesCol = collection(db, 'users', uid, 'deadlines')
  const q = query(deadlinesCol, orderBy('dueDate', 'asc'))
  
  return onSnapshot(q, (snapshot) => {
    const deadlinesList = []
    snapshot.forEach((doc) => {
      deadlinesList.push({
        id: doc.id,
        ...doc.data()
      })
    })
    callback(deadlinesList)
  }, (error) => {
    console.error("Error subscribing to deadlines: ", error)
    if (onError) onError(error)
  })
}

// Create a new notification for a user
export const createNotification = async (uid, notification) => {
  const notificationsCol = collection(db, 'users', uid, 'notifications')
  return addDoc(notificationsCol, {
    ...notification,
    timestamp: serverTimestamp()
  })
}

// Mark a reminder interval as sent to prevent duplicates
export const markReminderAsSent = async (uid, deadlineId, minutesBefore) => {
  const deadlineDocRef = doc(db, 'users', uid, 'deadlines', deadlineId)
  return updateDoc(deadlineDocRef, {
    sentReminders: arrayUnion(minutesBefore),
    updatedAt: serverTimestamp()
  })
}

