import { useState, useEffect } from 'react'
import { User, Bell, Monitor, Key, Download, Trash2, Clock, Loader2 } from 'lucide-react'
import { doc, updateDoc, getDoc, getDocs, collection, writeBatch } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { db, auth } from '../../services/firebase'
import useAuth from '../../hooks/useAuth'
import useTheme from '../../hooks/useTheme'
import Toast from '../../components/Toast'
import ConfirmDialog from '../../components/ConfirmDialog'

export default function SettingsPage() {
  const { currentUser, refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()

  const [displayName, setDisplayName] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [prefs, setPrefs] = useState({
    push: true,
    email: true,
    inApp: true,
    dndStart: '22:00',
    dndEnd: '08:00'
  })
  
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState(null)
  
  const navigate = useNavigate()
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // Load preferences from profile
  useEffect(() => {
    let active = true
    let timer

    if (currentUser?.profile) {
      const nameVal = currentUser.profile.displayName || currentUser.displayName || ''
      const tzVal = currentUser.profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const p = currentUser.profile.notificationPrefs || {}
      const prefsVal = {
        push: p.push !== false,
        email: p.email !== false,
        inApp: p.inApp !== false,
        dndStart: p.dndStart || '22:00',
        dndEnd: p.dndEnd || '08:00'
      }

      timer = setTimeout(() => {
        if (active) {
          setDisplayName(nameVal)
          setTimezone(tzVal)
          setPrefs(prefsVal)
        }
      }, 0)
    }

    return () => {
      active = false
      if (timer) clearTimeout(timer)
    }
  }, [currentUser])

  // Save profile and notification configs
  const handleSaveSettings = async () => {
    if (!currentUser) return
    setIsSaving(true)
    try {
      const userRef = doc(db, 'users', currentUser.uid)
      await updateDoc(userRef, {
        displayName,
        timezone,
        notificationPrefs: prefs
      })
      await refreshUser()
      setToast({ message: 'Settings saved successfully!' })
    } catch (err) {
      console.error('Failed to save settings:', err)
      setToast({ message: 'Failed to save settings. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  // Cross-device theme sync trigger
  const handleThemeChange = async (themeName) => {
    const val = themeName.toLowerCase()
    setTheme(val)
    if (!currentUser) return
    try {
      const userRef = doc(db, 'users', currentUser.uid)
      await updateDoc(userRef, { theme: val })
      await refreshUser()
    } catch (err) {
      console.error('Failed to sync theme to Firestore:', err)
    }
  }

  const serializeFirestoreData = (data) => {
    if (data === null || data === undefined) return data
    if (typeof data.toDate === 'function') {
      return data.toDate().toISOString()
    }
    if (Array.isArray(data)) {
      return data.map(serializeFirestoreData)
    }
    if (typeof data === 'object') {
      const serialized = {}
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          serialized[key] = serializeFirestoreData(data[key])
        }
      }
      return serialized
    }
    return data
  }

  const handleExportData = async () => {
    if (!currentUser) return
    setIsExporting(true)
    try {
      setToast({ message: 'Preparing your data export...' })
      
      // Fetch profile
      const userRef = doc(db, 'users', currentUser.uid)
      const userSnap = await getDoc(userRef)
      const profile = userSnap.exists() ? userSnap.data() : {}

      // Fetch deadlines
      const deadlinesCol = collection(db, 'users', currentUser.uid, 'deadlines')
      const deadlinesSnap = await getDocs(deadlinesCol)
      const deadlines = []
      deadlinesSnap.forEach(docSnap => {
        deadlines.push({ id: docSnap.id, ...docSnap.data() })
      })

      // Fetch notifications
      const notificationsCol = collection(db, 'users', currentUser.uid, 'notifications')
      const notificationsSnap = await getDocs(notificationsCol)
      const notifications = []
      notificationsSnap.forEach(docSnap => {
        notifications.push({ id: docSnap.id, ...docSnap.data() })
      })

      // Combine data and serialize Firestore objects
      const exportData = serializeFirestoreData({
        profile,
        deadlines,
        notifications,
        exportedAt: new Date().toISOString()
      })

      // Convert to JSON and download
      const jsonString = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `deadlineaware_export_${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setToast({ message: 'Data export downloaded successfully!' })
    } catch (err) {
      console.error('Failed to export data:', err)
      setToast({ message: 'Failed to export data. Please try again.' })
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return
    setIsDeleting(true)
    try {
      // 1. Proactive check for stale login session
      const lastSignIn = auth.currentUser.metadata?.lastSignInTime
        ? new Date(auth.currentUser.metadata.lastSignInTime).getTime()
        : 0
      const now = Date.now()
      const ageInMinutes = (now - lastSignIn) / (1000 * 60)
      
      if (ageInMinutes > 5) {
        setToast({ message: 'For security, please sign out and log back in before deleting your account.' })
        setIsDeleting(false)
        return
      }

      const uid = auth.currentUser.uid

      // 2. Fetch and delete user's deadlines
      const deadlinesCol = collection(db, 'users', uid, 'deadlines')
      const deadlinesSnap = await getDocs(deadlinesCol)
      
      // 3. Fetch and delete user's notifications
      const notificationsCol = collection(db, 'users', uid, 'notifications')
      const notificationsSnap = await getDocs(notificationsCol)

      // 4. Batch delete
      const batch = writeBatch(db)
      deadlinesSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref)
      })
      notificationsSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref)
      })
      
      // 5. Delete profile document
      const userRef = doc(db, 'users', uid)
      batch.delete(userRef)

      await batch.commit()

      // 6. Delete Auth user
      await auth.currentUser.delete()

      // 7. Redirect to registration
      navigate('/register', { replace: true })
    } catch (err) {
      console.error('Failed during delete account:', err)
      if (err.code === 'auth/requires-recent-login') {
        setToast({ message: 'For security, please sign out and log back in before deleting your account.' })
      } else {
        setToast({ message: `Error deleting account: ${err.message || err}` })
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const commonTimezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Dubai',
    'Asia/Karachi',
    'Asia/Kolkata',
    'Asia/Tokyo',
    'Australia/Sydney'
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-main">Settings</h1>
        <p className="mt-1 text-sm text-text-sub">
          Manage your account preferences, themes, and notification triggers.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className="p-6 bg-bg-surface border border-border-main rounded-xl space-y-4">
          <h3 className="font-semibold text-text-main flex items-center gap-2">
            <User size={18} className="text-primary" />
            Profile Information
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-text-sub mb-1.5">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 bg-bg-base border border-border-main rounded-lg text-sm text-text-main focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-sub mb-1.5">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 bg-bg-base border border-border-main rounded-lg text-sm text-text-main focus:outline-none focus:border-primary cursor-pointer"
              >
                {commonTimezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notifications & Themes */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Notifications Card */}
          <div className="p-6 bg-bg-surface border border-border-main rounded-xl space-y-4">
            <h3 className="font-semibold text-text-main flex items-center gap-2">
              <Bell size={18} className="text-primary" />
              Notifications
            </h3>
            <div className="space-y-3.5">
              {/* Push */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-main">Browser Push Notifications</p>
                  <p className="text-xs text-text-sub">Alerts directly in your browser</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.push}
                  onChange={(e) => setPrefs(prev => ({ ...prev, push: e.target.checked }))}
                  className="h-4 w-4 text-primary border-border-main rounded focus:ring-primary cursor-pointer accent-primary"
                />
              </div>
              {/* Email */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-main">Email Reminders</p>
                  <p className="text-xs text-text-sub">Daily digests and urgent updates</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.email}
                  onChange={(e) => setPrefs(prev => ({ ...prev, email: e.target.checked }))}
                  className="h-4 w-4 text-primary border-border-main rounded focus:ring-primary cursor-pointer accent-primary"
                />
              </div>
              {/* In-App */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-main">In-App Alerts</p>
                  <p className="text-xs text-text-sub">Dashboard banners</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.inApp}
                  onChange={(e) => setPrefs(prev => ({ ...prev, inApp: e.target.checked }))}
                  className="h-4 w-4 text-primary border-border-main rounded focus:ring-primary cursor-pointer accent-primary"
                />
              </div>

              {/* Do Not Disturb (DND) window */}
              <div className="border-t border-border-main/50 pt-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main">
                  <Clock size={12} className="text-primary" />
                  Do Not Disturb Window (DND)
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-text-sub mb-1">Start Time</label>
                    <input
                      type="time"
                      value={prefs.dndStart}
                      onChange={(e) => setPrefs(prev => ({ ...prev, dndStart: e.target.value }))}
                      className="w-full px-2 py-1 bg-bg-base border border-border-main rounded-lg text-xs text-text-main focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-text-sub mb-1">End Time</label>
                    <input
                      type="time"
                      value={prefs.dndEnd}
                      onChange={(e) => setPrefs(prev => ({ ...prev, dndEnd: e.target.value }))}
                      className="w-full px-2 py-1 bg-bg-base border border-border-main rounded-lg text-xs text-text-main focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="p-6 bg-bg-surface border border-border-main rounded-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-semibold text-text-main flex items-center gap-2">
                <Monitor size={18} className="text-primary" />
                Appearance
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {['light', 'dark'].map((tName) => {
                  const isSelected = theme === tName
                  return (
                    <button
                      key={tName}
                      onClick={() => handleThemeChange(tName)}
                      className={`px-3 py-2 border rounded-lg text-xs font-semibold capitalize cursor-pointer transition ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary shadow-xs'
                          : 'border-border-main text-text-main hover:bg-bg-base'
                      }`}
                    >
                      {tName}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Save Preferences Button */}
            <div className="pt-6 border-t border-border-main/50 flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-opacity-90 transition disabled:opacity-50 cursor-pointer shadow-sm shadow-primary/10"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Preferences'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Account Management */}
        <div className="p-6 bg-bg-surface border border-border-main rounded-xl space-y-4">
          <h3 className="font-semibold text-text-main flex items-center gap-2 text-red-500">
            <Key size={18} />
            Security & Data
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportData}
              disabled={isExporting || isDeleting}
              className="flex items-center gap-2 px-4 py-2 border border-border-main text-sm font-medium text-text-main rounded-lg hover:bg-bg-base transition cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Export Data (JSON)
                </>
              )}
            </button>
            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={isExporting || isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-sm font-medium rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete Account
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to delete your account? This will permanently delete your profile, deadlines, and notifications history. This action cannot be undone."
        confirmText="Delete Permanently"
        cancelText="Cancel"
        isDanger={true}
      />

      {toast && (
        <Toast
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
