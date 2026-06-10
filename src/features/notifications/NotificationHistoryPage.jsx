import { Bell, Trash2, CheckSquare, Square, Inbox, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import useNotifications from '../../hooks/useNotifications'

export default function NotificationHistoryPage() {
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  } = useNotifications()

  // Format timestamps cleanly
  const formatTime = (timestamp) => {
    const dateObj = timestamp?.toDate ? timestamp.toDate() : timestamp ? new Date(timestamp) : null
    if (!dateObj) return ''
    return dateObj.toLocaleDateString() + ' at ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-border-main rounded-lg" />
          <div className="h-8 w-48 bg-border-main rounded-lg" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 bg-bg-surface border border-border-main rounded-xl h-20" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-2 border border-border-main rounded-lg text-text-sub hover:text-text-main bg-bg-surface transition cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-text-main flex items-center gap-2">
              <Bell size={24} className="text-primary" />
              Notification History
            </h1>
            <p className="mt-1 text-sm text-text-sub">
              Review sent alerts, digests, and push triggers from the last 30 days.
            </p>
          </div>
        </div>

        {/* Global Controls */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border-main rounded-lg text-xs font-semibold text-text-main hover:bg-bg-base transition cursor-pointer bg-bg-surface"
            >
              <CheckSquare size={14} />
              Mark all read
            </button>
            <button
              onClick={clearAllNotifications}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition cursor-pointer"
            >
              <Trash2 size={14} />
              Clear history
            </button>
          </div>
        )}
      </div>

      {/* History List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border-main rounded-2xl bg-bg-surface text-center space-y-4">
          <div className="p-4 bg-primary/10 text-primary border border-primary/20 rounded-full">
            <Inbox size={32} />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="text-lg font-bold text-text-main">No notifications</h3>
            <p className="text-sm text-text-sub">
              Your notification history logs are clean! You will see push alerts and email records listed here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 bg-bg-surface border rounded-xl flex items-start justify-between gap-4 transition duration-150 ${
                !notif.read ? 'border-primary/30 shadow-primary/2 bg-primary/[0.005]' : 'border-border-main'
              }`}
            >
              <div className="flex gap-3">
                <button
                  onClick={() => !notif.read && markAsRead(notif.id)}
                  className={`mt-1 text-text-sub hover:text-text-main transition cursor-pointer ${
                    !notif.read ? 'text-primary' : 'opacity-50'
                  }`}
                  title={notif.read ? 'Read' : 'Mark as read'}
                >
                  {notif.read ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
                <div className="space-y-1 min-w-0">
                  <p className={`text-sm text-text-main font-semibold ${!notif.read ? 'font-bold' : 'font-normal'}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-text-sub leading-relaxed">{notif.body}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] text-text-sub/70 font-semibold">
                      {formatTime(notif.timestamp)}
                    </span>
                    {notif.type && (
                      <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md bg-bg-base border border-border-main text-text-sub">
                        {notif.type}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Row Action */}
              <button
                onClick={() => deleteNotification(notif.id)}
                className="p-1 border border-border-main/50 rounded-lg text-text-sub hover:text-danger-main hover:border-danger-main/30 transition cursor-pointer bg-bg-base/30 self-center"
                title="Delete record"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
