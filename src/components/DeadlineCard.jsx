import { useState, useEffect } from 'react'
import { Calendar, Tag, AlertTriangle, Edit, Trash2, Clock } from 'lucide-react'
import { formatDueDate, getCountdownText, checkIsOverdue } from '../utils/dateHelpers'
import { PRIORITIES, STATUSES, STATUS_LABELS } from '../constants/deadlines'
import ConfirmDialog from './ConfirmDialog'

export default function DeadlineCard({ deadline, onEdit, onDelete, onStatusChange }) {
  const { id, title, description, category, priority, dueDate, status } = deadline

  // Force re-render every 60 seconds so the countdown text stays live
  const [, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(timer)
  }, [])

  // Confirm Complete states
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false)

  const handleChangeStatus = (e) => {
    const value = e.target.value
    if (value === STATUSES.COMPLETED) {
      setConfirmCompleteOpen(true)
    } else {
      onStatusChange(id, value)
    }
  }

  const handleConfirmComplete = () => {
    setConfirmCompleteOpen(false)
    onStatusChange(id, STATUSES.COMPLETED)
  }

  // Style helper for Priority badges
  const priorityColors = {
    [PRIORITIES.CRITICAL]: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    [PRIORITIES.HIGH]: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    [PRIORITIES.MEDIUM]: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    [PRIORITIES.LOW]: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  }

  // Style helper for Status indicators/select
  const statusSelectStyles = {
    [STATUSES.PENDING]: 'border-border-main text-text-sub focus:ring-text-sub/30',
    [STATUSES.IN_PROGRESS]: 'border-sky-300 dark:border-sky-700/50 text-sky-600 dark:text-sky-400 focus:ring-sky-500/30 bg-sky-500/[0.03]',
    [STATUSES.COMPLETED]: 'border-emerald-300 dark:border-emerald-700/50 text-emerald-600 dark:text-emerald-400 focus:ring-emerald-500/30 bg-emerald-500/[0.03]',
    [STATUSES.OVERDUE]: 'border-red-300 dark:border-red-700/50 text-danger-main focus:ring-danger-main/30 bg-danger-main/[0.03]',
  }

  const isOverdue = checkIsOverdue(dueDate) && status !== STATUSES.COMPLETED
  const activeStatus = isOverdue ? STATUSES.OVERDUE : status

  // The select value should use the active status (to show Overdue/Failed when overdue)
  const selectValue = activeStatus === STATUSES.OVERDUE ? STATUSES.OVERDUE : status

  // Color logic for countdown text
  const getCountdownColor = () => {
    if (activeStatus === STATUSES.COMPLETED) {
      return 'text-emerald-600 dark:text-emerald-400 font-medium'
    }
    if (activeStatus === STATUSES.OVERDUE) {
      return 'text-danger-main font-bold animate-pulse'
    }
    
    // Check how many hours left
    const now = new Date()
    const dueTime = dueDate?.toDate ? dueDate.toDate() : new Date(dueDate)
    const hoursLeft = (dueTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursLeft <= 24) {
      return 'text-amber-600 dark:text-amber-400 font-bold'
    }
    return 'text-text-sub'
  }

  return (
    <div className={`p-5 bg-bg-surface border rounded-2xl flex flex-col justify-between space-y-4 hover:shadow-md transition-all duration-200 ${
      activeStatus === STATUSES.COMPLETED ? 'border-emerald-500/30 shadow-emerald-500/2 bg-emerald-500/[0.01]' : 'border-border-main'
    }`}>
      {/* Top Header Row (Category and Priority) */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-lg">
          <Tag size={12} />
          {category}
        </span>
        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 border rounded-lg ${priorityColors[priority] || 'border-border-main'}`}>
          <AlertTriangle size={12} />
          {priority}
        </span>
      </div>

      {/* Main Title & Description */}
      <div className="space-y-1.5 flex-1">
        <h3 className={`font-bold text-text-main text-lg tracking-tight leading-snug line-clamp-1 ${
          activeStatus === STATUSES.COMPLETED ? 'line-through opacity-70' : ''
        }`}>
          {title}
        </h3>
        {description ? (
          <p className={`text-sm text-text-sub line-clamp-2 leading-relaxed ${
            activeStatus === STATUSES.COMPLETED ? 'opacity-50' : ''
          }`}>
            {description}
          </p>
        ) : (
          <p className="text-sm text-text-sub/40 italic">No description provided</p>
        )}
      </div>

      {/* Countdown Area */}
      <div className="flex items-center gap-2 py-1.5 px-3 bg-bg-base/40 rounded-xl border border-border-main/40">
        <Clock size={14} className={getCountdownColor()} />
        <span className={`text-xs ${getCountdownColor()}`}>
          {getCountdownText(dueDate, activeStatus)}
        </span>
      </div>

      {/* Footer Info & Actions */}
      <div className="flex items-center justify-between border-t border-border-main/50 pt-4 mt-2">
        {/* Due Date & Time Info */}
        <div className="flex flex-col space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-text-sub/80 tracking-wider flex items-center gap-1">
            <Calendar size={10} />
            Due Date
          </span>
          <span className={`text-xs font-semibold text-text-main ${
            activeStatus === STATUSES.COMPLETED ? 'opacity-65' : ''
          }`}>
            {formatDueDate(dueDate)}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick status dropdown */}
          <div className="relative flex items-center shrink-0">
            <select
              value={selectValue}
              onChange={handleChangeStatus}
              disabled={activeStatus === STATUSES.COMPLETED || activeStatus === STATUSES.OVERDUE}
              className={`appearance-none pr-7 pl-3 py-1 bg-bg-base border rounded-lg text-xs font-bold transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-opacity-50 cursor-pointer ${
                statusSelectStyles[activeStatus] || ''
              } ${(activeStatus === STATUSES.COMPLETED || activeStatus === STATUSES.OVERDUE) ? 'opacity-60 cursor-not-allowed' : ''}`}
              aria-label="Change status"
            >
              <option value={STATUSES.PENDING}>{STATUS_LABELS[STATUSES.PENDING]}</option>
              <option value={STATUSES.COMPLETED}>{STATUS_LABELS[STATUSES.COMPLETED]}</option>
              {activeStatus === STATUSES.OVERDUE && (
                <option value={STATUSES.OVERDUE}>{STATUS_LABELS[STATUSES.OVERDUE]}</option>
              )}
            </select>
            <div className={`absolute right-2 pointer-events-none flex items-center justify-center ${
              (activeStatus === STATUSES.COMPLETED || activeStatus === STATUSES.OVERDUE) ? 'opacity-40' : ''
            } ${
              activeStatus === STATUSES.PENDING ? 'text-text-sub' :
              activeStatus === STATUSES.IN_PROGRESS ? 'text-sky-500 dark:text-sky-400' :
              activeStatus === STATUSES.COMPLETED ? 'text-emerald-500' : 'text-danger-main'
            }`}>
              <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Edit action */}
          {activeStatus !== STATUSES.COMPLETED && activeStatus !== STATUSES.OVERDUE && (
            <button
              onClick={() => onEdit(deadline)}
              className="p-1.5 border border-border-main rounded-lg text-text-sub hover:text-text-main hover:bg-bg-base transition cursor-pointer"
              title="Edit Deadline"
              aria-label="Edit deadline"
            >
              <Edit size={14} />
            </button>
          )}

          {/* Delete action */}
          <button
            onClick={() => onDelete(id)}
            className="p-1.5 border border-danger-main/30 rounded-lg text-danger-main hover:bg-danger-main/10 transition cursor-pointer"
            title="Delete Deadline"
            aria-label="Delete deadline"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Confirmation dialog for marking completed */}
      <ConfirmDialog
        isOpen={confirmCompleteOpen}
        onClose={() => setConfirmCompleteOpen(false)}
        onConfirm={handleConfirmComplete}
        title="Complete Task"
        message="Are you sure you want to mark this task as completed? Once completed, the task will be locked and cannot be edited or changed back."
        confirmText="Complete"
        cancelText="Cancel"
        isDanger={false}
      />
    </div>
  )
}
