import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import useNotifications from '../hooks/useNotifications'
import { requestNotificationPermission } from '../services/fcmService'
import ReminderManager from './ReminderManager'
import {
  LayoutDashboard,
  Calendar,
  ListTodo,
  Settings,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  User,
  ChevronDown,
  LogOut,
  Clock
} from 'lucide-react'
import useTheme from '../hooks/useTheme'
import useAuth from '../hooks/useAuth'

export default function Layout() {
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const { currentUser, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  } = useNotifications()

  // Request FCM permission in a fire-and-forget manner — never blocks UI
  useEffect(() => {
    if (currentUser) {
      requestNotificationPermission(currentUser.uid).catch(() => {
        // Silently ignore — FCM is optional
      })
    }
  }, [currentUser])

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const profileDropdownRef = useRef(null)
  const notificationsRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileDropdownOpen && profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false)
      }
      if (notificationsOpen && notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileDropdownOpen, notificationsOpen])

  const getInitials = () => {
    if (!currentUser) return 'U'
    const name = currentUser.displayName || currentUser.email
    return name ? name.substring(0, 2).toUpperCase() : 'U'
  }

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Deadlines', path: '/deadlines', icon: ListTodo },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Settings', path: '/settings', icon: Settings },
  ]


  return (
    <div className="min-h-screen bg-bg-base text-text-main flex transition-colors duration-200">
      <ReminderManager />
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-bg-surface border-r border-border-main flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static lg:flex-shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header / Logo */}
        <div className="h-16 px-6 border-b border-border-main flex items-center justify-between">
          <Link to="/" className="flex items-center" onClick={() => setSidebarOpen(false)}>
            <img src="/DeadlineAware-logo.png" alt="DeadlineAware" className="h-14 w-14 object-contain -mr-1" style={{ filter: 'contrast(1.6) brightness(0.85) drop-shadow(0px 0px 1px rgba(0,0,0,0.3))' }} />
            <span className="font-extrabold text-lg tracking-tight text-text-main">
              Deadline<span className="text-primary">Aware</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 border border-border-main rounded-md text-text-sub hover:text-text-main lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition duration-150 ${
                  isActive
                    ? 'bg-primary text-white shadow-sm shadow-primary/20'
                    : 'text-text-sub hover:text-text-main hover:bg-bg-base border border-transparent'
                }`}
              >
                <link.icon size={18} />
                {link.name}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border-main bg-bg-base/30">
          <div className="flex items-center gap-3 p-2 rounded-xl">
            <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-semibold text-sm">
              {getInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-main truncate">
                {currentUser?.displayName || 'User'}
              </p>
              <p className="text-xs text-text-sub truncate">{currentUser?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border-main bg-bg-surface/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30 transition-colors duration-200">
          {/* Header Left: Sidebar Trigger */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 border border-border-main rounded-lg text-text-sub hover:text-text-main lg:hidden cursor-pointer bg-bg-base"
              aria-label="Open sidebar"
            >
              <Menu size={18} />
            </button>
          </div>

          {/* Header Right: Actions & User Dropdown */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <div className="flex items-center bg-bg-base border border-border-main rounded-xl p-1 gap-0.5">
              {[
                { name: 'light', icon: Sun },
                { name: 'dark', icon: Moon },
              ].map((t) => {
                const isSelected = theme === t.name
                return (
                  <button
                    key={t.name}
                    onClick={() => setTheme(t.name)}
                    title={`Use ${t.name} theme`}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-text-sub hover:text-text-main'
                    }`}
                  >
                    <t.icon size={15} />
                  </button>
                )
              })}
            </div>

            {/* Notifications Bell */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen)
                  setProfileDropdownOpen(false)
                }}
                className="p-2 border border-border-main rounded-xl text-text-sub hover:text-text-main bg-bg-base cursor-pointer relative"
                aria-label="Open notifications menu"
                aria-haspopup="true"
                aria-expanded={notificationsOpen}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-danger-main text-[9px] font-bold text-white ring-2 ring-bg-surface">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-bg-surface border border-border-main rounded-xl shadow-lg p-4 space-y-3 z-50">
                  <div className="flex items-center justify-between border-b border-border-main pb-2">
                    <h4 className="font-semibold text-sm text-text-main">Notifications</h4>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-primary font-semibold hover:underline cursor-pointer bg-transparent border-none p-0"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-text-sub/50 text-center py-4 italic">No notifications yet</p>
                    ) : (
                      notifications.map((notif) => {
                        const dateObj = notif.timestamp?.toDate ? notif.timestamp.toDate() : notif.timestamp ? new Date(notif.timestamp) : null
                        const timeStr = dateObj ? dateObj.toLocaleDateString() + ' at ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                        return (
                          <div
                            key={notif.id}
                            onClick={() => !notif.read && markAsRead(notif.id)}
                            className={`flex gap-2 p-2 hover:bg-bg-base rounded-lg text-xs transition cursor-pointer ${
                              !notif.read ? 'bg-primary/5' : ''
                            }`}
                          >
                            <div className={`h-1.5 w-1.5 mt-1.5 rounded-full flex-shrink-0 ${!notif.read ? 'bg-primary' : 'bg-transparent'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-text-main font-semibold ${!notif.read ? 'font-bold' : 'font-normal'}`}>{notif.title}</p>
                              <p className="text-text-sub mt-0.5 line-clamp-2">{notif.body}</p>
                              <p className="text-[10px] text-text-sub/70 mt-1">{timeStr}</p>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div className="border-t border-border-main/50 pt-2 text-center">
                    <Link
                      to="/notifications"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => {
                  setProfileDropdownOpen(!profileDropdownOpen)
                  setNotificationsOpen(false)
                }}
                className="flex items-center gap-2 p-1.5 border border-border-main rounded-xl hover:bg-bg-base transition cursor-pointer bg-bg-base"
                aria-label="User profile menu"
                aria-haspopup="true"
                aria-expanded={profileDropdownOpen}
              >
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                  {getInitials()}
                </div>
                <ChevronDown size={14} className="text-text-sub" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-bg-surface border border-border-main rounded-xl shadow-lg py-1.5 z-50 overflow-hidden">
                  <div className="px-4 py-2 border-b border-border-main">
                    <p className="text-xs text-text-sub">Signed in as</p>
                    <p className="text-sm font-semibold text-text-main truncate">
                      {currentUser?.displayName || 'User'}
                    </p>
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-bg-base transition"
                  >
                    <User size={16} className="text-text-sub" />
                    My Profile
                  </Link>
                  <button
                    onClick={async () => {
                      setProfileDropdownOpen(false)
                      try {
                        await logout()
                      } catch (e) {
                        console.error('Logout error:', e)
                      }
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 transition cursor-pointer text-left"
                  >
                    <LogOut size={16} />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
