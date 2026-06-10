import { useState, useEffect, useRef } from 'react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks, 
  isToday, 
  isSameMonth 
} from 'date-fns'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Edit, 
  Trash2, 
  Inbox,
  AlertCircle
} from 'lucide-react'
import useDeadlines from '../../hooks/useDeadlines'
import DeadlineFormModal from '../../components/DeadlineFormModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import Toast from '../../components/Toast'
import { STATUSES, PRIORITIES, STATUS_LABELS } from '../../constants/deadlines'
import { checkIsOverdue } from '../../utils/dateHelpers'

export default function CalendarPage() {
  const {
    deadlines,
    loading,
    createDeadline,
    editDeadline,
    removeDeadline,
    updateStatus
  } = useDeadlines()

  // Navigation and Selection States
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month') // 'month' | 'week'

  // Modal and Form States
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDeadline, setEditingDeadline] = useState(null)
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [idToDelete, setIdToDelete] = useState(null)
  const [toast, setToast] = useState(null)
  const [createForDate, setCreateForDate] = useState(null)

  // Undo delete states
  const [tempDeletedIds, setTempDeletedIds] = useState([])
  const deleteTimeouts = useRef({})

  // Clear timeouts on unmount
  useEffect(() => {
    const timeouts = deleteTimeouts.current
    return () => {
      Object.values(timeouts).forEach(clearTimeout)
    }
  }, [])

  // Get deadlines for a specific day
  const getDeadlinesForDate = (date) => {
    return deadlines
      .filter((dl) => !tempDeletedIds.includes(dl.id))
      .filter((dl) => {
        const dDate = dl.dueDate?.toDate ? dl.dueDate.toDate() : new Date(dl.dueDate)
        return isSameDay(dDate, date)
      })
  }

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1))
    } else {
      setCurrentDate(subWeeks(currentDate, 1))
    }
  }

  // Next and Today
  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1))
    } else {
      setCurrentDate(addWeeks(currentDate, 1))
    }
  }

  const handleToday = () => {
    const now = new Date()
    setCurrentDate(now)
    setSelectedDate(now)
  }

  // Create/Edit triggers
  const handleOpenCreate = (date) => {
    setEditingDeadline(null)
    setCreateForDate(date || selectedDate)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (deadline) => {
    setEditingDeadline(deadline)
    setCreateForDate(null)
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (payload) => {
    try {
      if (editingDeadline && editingDeadline.id) {
        await editDeadline(editingDeadline.id, payload)
      } else {
        // For calendar creates, override the due date with the selected calendar date's time
        await createDeadline(payload)
      }
    } catch (err) {
      console.error('Error saving deadline from calendar:', err)
      setToast({ message: `Failed to save deadline: ${err.message || 'Unknown error'}` })
      throw err
    }
  }

  // Delete flow
  const handleDeleteClick = (id) => {
    setIdToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!idToDelete) return
    const targetId = idToDelete
    setIdToDelete(null)

    // Hide immediately in UI
    setTempDeletedIds((prev) => [...prev, targetId])

    const targetDeadline = deadlines.find((d) => d.id === targetId)
    const title = targetDeadline ? targetDeadline.title : 'Deadline'

    const timeoutId = setTimeout(async () => {
      try {
        await removeDeadline(targetId)
        setTempDeletedIds((prev) => prev.filter((id) => id !== targetId))
        delete deleteTimeouts.current[targetId]
      } catch (err) {
        console.error('Failed to delete deadline:', err)
      }
    }, 5000)

    deleteTimeouts.current[targetId] = timeoutId

    setToast({
      message: `Deleted "${title}"`,
      actionLabel: 'Undo',
      onAction: () => {
        clearTimeout(timeoutId)
        delete deleteTimeouts.current[targetId]
        setTempDeletedIds((prev) => prev.filter((id) => id !== targetId))
      }
    })
  }

  // Generate days based on month/week view mode
  const getCalendarDays = () => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(monthStart)
      const startDate = startOfWeek(monthStart)
      const endDate = endOfWeek(monthEnd)
      return eachDayOfInterval({ start: startDate, end: endDate })
    } else {
      const weekStart = startOfWeek(currentDate)
      const weekEnd = endOfWeek(weekStart)
      return eachDayOfInterval({ start: weekStart, end: weekEnd })
    }
  }

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const calendarDays = getCalendarDays()
  const selectedDayDeadlines = getDeadlinesForDate(selectedDate)

  // Priority color styling helpers
  const priorityTheme = {
    [PRIORITIES.CRITICAL]: {
      bg: 'bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30',
      dot: 'bg-red-500'
    },
    [PRIORITIES.HIGH]: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30',
      dot: 'bg-amber-500'
    },
    [PRIORITIES.MEDIUM]: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-500'
    },
    [PRIORITIES.LOW]: {
      bg: 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400 border-sky-500/30',
      dot: 'bg-sky-500'
    }
  }

  const getCalendarPillStyle = (dl) => {
    const isCompleted = dl.status === STATUSES.COMPLETED
    const isOverdue = checkIsOverdue(dl.dueDate) && !isCompleted

    if (isCompleted) {
      return 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30'
    }
    if (isOverdue) {
      return 'bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/20 dark:border-red-500/30'
    }
    return 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-500/20 dark:border-indigo-500/30'
  }

  const getCalendarDotStyle = (dl) => {
    const isCompleted = dl.status === STATUSES.COMPLETED
    const isOverdue = checkIsOverdue(dl.dueDate) && !isCompleted

    if (isCompleted) return 'bg-emerald-500'
    if (isOverdue) return 'bg-red-500'
    return 'bg-indigo-500'
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-border-main rounded-lg" />
            <div className="h-4 w-72 bg-border-main rounded-md" />
          </div>
          <div className="h-10 w-44 bg-border-main rounded-lg" />
        </div>
        <div className="h-16 bg-bg-surface border border-border-main rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-[500px] bg-bg-surface border border-border-main rounded-xl" />
          <div className="h-[500px] bg-bg-surface border border-border-main rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Calendar</h1>
          <p className="mt-1 text-sm text-text-sub">
            Visualize and manage your deadlines in a visual schedule layout.
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => handleOpenCreate(selectedDate)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus size={16} />
            Add Deadline
          </button>
        </div>
      </div>

      {/* View Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-bg-surface border border-border-main rounded-xl">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
            <CalendarIcon className="text-primary" size={20} />
            {viewMode === 'month' 
              ? format(currentDate, 'MMMM yyyy') 
              : `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`}
          </h2>
          <div className="flex items-center gap-1 border border-border-main rounded-lg bg-bg-base/50 p-0.5">
            <button
              onClick={handlePrev}
              className="p-1.5 hover:bg-bg-base rounded-md text-text-sub hover:text-text-main transition cursor-pointer"
              title={viewMode === 'month' ? 'Previous Month' : 'Previous Week'}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold hover:bg-bg-base rounded-md text-text-main transition cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 hover:bg-bg-base rounded-md text-text-sub hover:text-text-main transition cursor-pointer"
              title={viewMode === 'month' ? 'Next Month' : 'Next Week'}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* View Switcher Pill */}
        <div className="flex items-center bg-bg-base border border-border-main rounded-lg p-0.5 self-stretch sm:self-auto justify-center">
          <button
            onClick={() => setViewMode('month')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              viewMode === 'month'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-sub hover:text-text-main'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              viewMode === 'week'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-sub hover:text-text-main'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Main Grid & Side Detail Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Calendar Grid Container */}
        <div className="lg:col-span-2 border border-border-main rounded-2xl overflow-hidden bg-bg-surface shadow-xs">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-border-main bg-bg-base/30">
            {daysOfWeek.map((day) => (
              <div key={day} className="py-2.5 text-center text-xs font-bold uppercase tracking-wider text-text-sub">
                {day}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border-main border-collapse">
            {calendarDays.map((day, idx) => {
              const isSelected = isSameDay(day, selectedDate)
              const isTodayDay = isToday(day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const dayDeadlines = getDeadlinesForDate(day)

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  onDoubleClick={() => handleOpenCreate(day)}
                  className={`min-h-[96px] sm:min-h-[110px] p-1.5 flex flex-col justify-between transition cursor-pointer select-none group relative ${
                    isSelected 
                      ? 'ring-2 ring-primary ring-inset bg-primary/2' 
                      : 'hover:bg-bg-base/20'
                  } ${!isCurrentMonth && viewMode === 'month' ? 'bg-bg-base/10 opacity-40' : 'bg-bg-surface'}`}
                >
                  {/* Cell Header: Day Number */}
                  <div className="flex items-center justify-between">
                    <span 
                      className={`text-xs font-bold h-6 w-6 flex items-center justify-center rounded-full ${
                        isTodayDay 
                          ? 'bg-primary text-white' 
                          : isSelected 
                            ? 'text-primary' 
                            : 'text-text-main'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    
                    {/* Hover indicator to quickly add deadline */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenCreate(day)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-bg-base rounded-md text-text-sub hover:text-text-main transition"
                      title="Add deadline for this day"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Deadline Indicators inside cell */}
                  <div className="flex-1 flex flex-col justify-end gap-1 mt-1.5 overflow-hidden">
                    {/* Desktop View: Mini pills */}
                    <div className="hidden sm:flex flex-col gap-0.5 w-full">
                      {dayDeadlines.slice(0, 2).map((dl) => {
                        const isCompleted = dl.status === STATUSES.COMPLETED
                        return (
                          <div
                            key={dl.id}
                            className={`px-1.5 py-0.5 text-[10px] font-semibold border rounded-sm truncate transition cursor-default ${getCalendarPillStyle(dl)} ${
                              isCompleted ? 'line-through opacity-75' : ''
                            }`}
                            title={`${dl.title} (${STATUS_LABELS[dl.status] || dl.status})`}
                          >
                            {dl.title}
                          </div>
                        )
                      })}
                      {dayDeadlines.length > 2 && (
                        <div className="text-[9px] text-text-sub font-bold px-1 py-0.2">
                          + {dayDeadlines.length - 2} more
                        </div>
                      )}
                    </div>

                    {/* Mobile View: Priority indicator dots */}
                    <div className="flex sm:hidden items-center justify-center gap-1 flex-wrap pt-1">
                      {dayDeadlines.slice(0, 4).map((dl) => {
                        const isCompleted = dl.status === STATUSES.COMPLETED
                        return (
                          <span
                            key={dl.id}
                            className={`h-1.5 w-1.5 rounded-full ${getCalendarDotStyle(dl)} ${
                              isCompleted ? 'opacity-30' : ''
                            }`}
                            title={dl.title}
                          />
                        )
                      })}
                      {dayDeadlines.length > 4 && (
                        <span className="text-[8px] leading-none text-text-sub font-bold">
                          +
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Side Detail Drawer Panel */}
        <div className="border border-border-main rounded-2xl p-6 bg-bg-surface shadow-xs flex flex-col gap-4 self-stretch min-h-[400px]">
          <div className="border-b border-border-main pb-3">
            <h3 className="text-base font-bold text-text-main">
              Schedule for {format(selectedDate, 'MMMM d, yyyy')}
            </h3>
            <p className="text-xs text-text-sub mt-0.5">
              {selectedDayDeadlines.length === 1 
                ? '1 deadline set' 
                : `${selectedDayDeadlines.length} deadlines set`}
            </p>
          </div>

          {/* List Section */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[500px]">
            {selectedDayDeadlines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <div className="p-3.5 bg-bg-base border border-border-main rounded-full text-text-sub/50">
                  <Inbox size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-text-main">No deadlines today</p>
                  <p className="text-xs text-text-sub max-w-[200px]">
                    Enjoy your day or create a deadline for this date.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenCreate(selectedDate)}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Create Deadline
                </button>
              </div>
            ) : (
              selectedDayDeadlines.map((dl) => {
                const style = priorityTheme[dl.priority] || priorityTheme.Medium
                const isCompleted = dl.status === STATUSES.COMPLETED
                const isOverdue = checkIsOverdue(dl.dueDate) && !isCompleted

                return (
                  <div
                    key={dl.id}
                    className={`p-3.5 bg-bg-base/30 border border-border-main rounded-xl flex items-start gap-3 transition hover:bg-bg-base/50 ${
                      isCompleted ? 'opacity-70' : ''
                    }`}
                  >
                    {/* Complete Status Toggle Checkbox */}
                    {isCompleted ? (
                      <span className="mt-0.5 text-primary/70 flex-shrink-0 cursor-not-allowed" title="Completed (Locked)">
                        <CheckCircle2 size={17} className="text-primary/70 fill-primary/5" />
                      </span>
                    ) : isOverdue ? (
                      <span className="mt-0.5 text-danger-main flex-shrink-0 cursor-not-allowed" title="Overdue (Locked)">
                        <AlertCircle size={17} />
                      </span>
                    ) : (
                      <button
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to mark "${dl.title}" as completed? Once completed, the task will be locked and cannot be edited or changed back.`)) {
                            try {
                              await updateStatus(dl.id, STATUSES.COMPLETED)
                            } catch (err) {
                              console.error('Failed to quick update status:', err)
                            }
                          }
                        }}
                        className="mt-0.5 text-text-sub hover:text-primary transition cursor-pointer flex-shrink-0"
                        title="Mark as Completed"
                      >
                        <Circle size={17} />
                      </button>
                    )}

                    {/* Text Details */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 border rounded-md uppercase tracking-wider ${style.bg}`}>
                          {dl.priority}
                        </span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-bg-base border border-border-main text-text-sub rounded-md">
                          {dl.category}
                        </span>
                      </div>

                      <h4 className={`text-sm font-semibold text-text-main truncate ${
                        isCompleted ? 'line-through text-text-sub' : ''
                      }`}>
                        {dl.title}
                      </h4>

                      {dl.description && (
                        <p className="text-xs text-text-sub line-clamp-2 leading-relaxed">
                          {dl.description}
                        </p>
                      )}

                      <div className="flex items-center gap-1 text-[10px] text-text-sub/80 font-semibold">
                        <Clock size={11} className="text-primary" />
                        {dl.dueDate?.toDate 
                          ? format(dl.dueDate.toDate(), 'h:mm a') 
                          : format(new Date(dl.dueDate), 'h:mm a')}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 self-center">
                      {!isCompleted && !isOverdue && (
                        <button
                          onClick={() => handleOpenEdit(dl)}
                          className="p-1 border border-border-main rounded-lg text-text-sub hover:text-text-main hover:bg-bg-base transition cursor-pointer"
                          title="Edit Deadline"
                        >
                          <Edit size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteClick(dl.id)}
                        className="p-1 border border-danger-main/30 rounded-lg text-danger-main hover:bg-danger-main/10 transition cursor-pointer"
                        title="Delete Deadline"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Modals & Dialogs */}
      {isFormOpen && (
        <DeadlineFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
          initialData={editingDeadline}
          defaultDate={createForDate}
        />
      )}

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Deadline"
        message="Are you sure you want to delete this deadline? You will have 5 seconds to undo this action."
        confirmText="Delete"
        isDanger={true}
      />

      {toast && (
        <Toast
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
