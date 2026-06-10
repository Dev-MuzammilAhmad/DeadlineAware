import { useState, useEffect } from 'react'
import { serverTimestamp } from 'firebase/firestore'
import useAuth from './useAuth'
import {
  addDeadline,
  updateDeadline,
  deleteDeadline,
  subscribeToDeadlines
} from '../services/firestoreService'

export default function useDeadlines() {
  const { currentUser } = useAuth()
  const [deadlines, setDeadlines] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let timer

    if (!currentUser) {
      timer = setTimeout(() => {
        if (active) {
          setDeadlines([])
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

    const unsubscribe = subscribeToDeadlines(
      currentUser.uid,
      (data) => {
        if (!active) return
        const processed = data.map(dl => {
          const dateObj = dl.dueDate?.toDate ? dl.dueDate.toDate() : new Date(dl.dueDate)
          const isPast = dateObj.getTime() < Date.now()
          if (isPast && dl.status !== 'Completed' && dl.status !== 'Overdue') {
            return { ...dl, status: 'Overdue' }
          }
          return dl
        })
        setDeadlines(processed)
        setLoading(false)
      },
      (error) => {
        if (!active) return
        console.error("useDeadlines subscription error:", error)
        setLoading(false)
      }
    )

    return () => {
      active = false
      if (timer) clearTimeout(timer)
      unsubscribe()
    }
  }, [currentUser])

  const createDeadline = async (deadline) => {
    if (!currentUser) throw new Error('User not authenticated')
    return addDeadline(currentUser.uid, deadline)
  }

  const editDeadline = async (deadlineId, updates) => {
    if (!currentUser) throw new Error('User not authenticated')
    return updateDeadline(currentUser.uid, deadlineId, updates)
  }

  const removeDeadline = async (deadlineId) => {
    if (!currentUser) throw new Error('User not authenticated')
    return deleteDeadline(currentUser.uid, deadlineId)
  }

  const updateStatus = async (deadlineId, status) => {
    if (!currentUser) throw new Error('User not authenticated')
    const updates = { status }
    if (status === 'Completed') {
      updates.completedAt = serverTimestamp()
    } else {
      updates.completedAt = null
    }
    return updateDeadline(currentUser.uid, deadlineId, updates)
  }

  return {
    deadlines,
    loading,
    createDeadline,
    editDeadline,
    removeDeadline,
    updateStatus
  }
}
