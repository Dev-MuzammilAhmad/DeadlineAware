import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import * as authService from '../services/authService'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Sync profile to firestore if it doesn't exist, returning the profile data
  const syncUserProfile = async (user) => {
    if (!user) return null

    try {
      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        return userSnap.data()
      } else {
        const defaultProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          theme: 'system',
          fcmToken: null,
          notificationPrefs: {
            push: true,
            email: true,
            inApp: true,
            dndStart: '22:00',
            dndEnd: '08:00',
          },
          createdAt: serverTimestamp(),
        }
        await setDoc(userRef, defaultProfile)
        return defaultProfile
      }
    } catch (error) {
      console.error('Error syncing user profile in Firestore:', error)
      return null
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Set user immediately so the app renders without waiting for Firestore
        // NOTE: Firebase User is a class instance — spread doesn't copy uid/email reliably.
        // We must explicitly extract the properties we need.
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          profile: null // profile will be enriched asynchronously
        })
        setLoading(false)

        // Enrich with Firestore profile data asynchronously (non-blocking)
        syncUserProfile(user).then((profileData) => {
          if (profileData) {
            setCurrentUser((prev) => {
              // Guard: if the user has logged out in the meantime, don't update
              if (!prev || prev.uid !== user.uid) return prev
              return {
                uid: user.uid,
                email: user.email,
                displayName: profileData.displayName || user.displayName,
                photoURL: user.photoURL,
                profile: profileData
              }
            })
          }
        })
      } else {
        setCurrentUser(null)
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  const value = {
    currentUser,
    loading,
    register: authService.registerWithEmail,
    login: authService.loginWithEmail,
    loginWithGoogle: authService.loginWithGoogle,
    logout: authService.logout,
    resetPassword: authService.resetPassword,
    refreshUser: async () => {
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid)
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) {
          const profileData = userSnap.data()
          setCurrentUser({
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            displayName: profileData.displayName || auth.currentUser.displayName,
            photoURL: auth.currentUser.photoURL,
            profile: profileData
          })
        }
      }
    }
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
