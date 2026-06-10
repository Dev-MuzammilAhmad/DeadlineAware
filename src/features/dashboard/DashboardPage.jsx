import { useState, useEffect, useRef, useMemo } from 'react'
import { LayoutGrid, AlertCircle, CheckCircle2, Clock, Edit, Trash2, Plus, ListTodo } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import useDeadlines from '../../hooks/useDeadlines'
import useTheme from '../../hooks/useTheme'
import DeadlineFormModal from '../../components/DeadlineFormModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import Toast from '../../components/Toast'
import { formatDueDate, checkIsOverdue } from '../../utils/dateHelpers'
import { STATUSES, STATUS_LABELS } from '../../constants/deadlines'

// Helper: Generates last 7 months
const getLast7Months = () => {
  const months = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      name: d.toLocaleString('default', { month: 'short' }),
      count: 0
    })
  }
  return months
}

export default function DashboardPage() {
  const {
    deadlines,
    loading,
    createDeadline,
    editDeadline,
    removeDeadline
  } = useDeadlines()

  const { resolvedTheme } = useTheme()

  // Modal and action states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDeadline, setEditingDeadline] = useState(null)
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [idToDelete, setIdToDelete] = useState(null)

  // Undo delete states
  const [tempDeletedIds, setTempDeletedIds] = useState([])
  
  const visibleDeadlines = useMemo(() => {
    return deadlines.filter(dl => !tempDeletedIds.includes(dl.id))
  }, [deadlines, tempDeletedIds])
  
  const [toast, setToast] = useState(null)
  const deleteTimeouts = useRef({})
  const [isBannerDismissed, setIsBannerDismissed] = useState(false)

  const [approachingDeadlines, setApproachingDeadlines] = useState([])

  // Clear timeouts on unmount
  useEffect(() => {
    const timeouts = deleteTimeouts.current
    return () => {
      Object.values(timeouts).forEach(clearTimeout)
    }
  }, [])

  // Calculate approaching deadlines periodically to avoid impurity and synchronous setState warnings
  useEffect(() => {
    let active = true
    const checkApproaching = () => {
      const nowMs = Date.now()
      const list = visibleDeadlines.filter(dl => {
        if (dl.status === STATUSES.COMPLETED) return false
        const dateObj = dl.dueDate?.toDate ? dl.dueDate.toDate() : new Date(dl.dueDate)
        const diffMs = dateObj.getTime() - nowMs
        return diffMs > 0 && diffMs <= 1000 * 60 * 60
      })
      if (active) {
        setApproachingDeadlines(list)
      }
    }

    // Defer the initial run to prevent synchronous setState within effect
    const initTimer = setTimeout(checkApproaching, 0)
    const intervalTimer = setInterval(checkApproaching, 10000)

    return () => {
      active = false
      clearTimeout(initTimer)
      clearInterval(intervalTimer)
    }
  }, [visibleDeadlines])

  // Handlers for edit/create
  const handleOpenCreate = () => {
    setEditingDeadline(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (deadline) => {
    setEditingDeadline(deadline)
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (payload) => {
    try {
      if (editingDeadline) {
        await editDeadline(editingDeadline.id, payload)
      } else {
        await createDeadline(payload)
      }
    } catch (err) {
      console.error('Error saving deadline:', err)
      setToast({ message: `Failed to save deadline: ${err.message || 'Unknown error'}` })
      throw err // Re-throw so the modal knows it failed and stays open
    }
  }

  // Handlers for delete
  const handleDeleteClick = (id) => {
    setIdToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!idToDelete) return
    const targetId = idToDelete
    setIdToDelete(null)

    // Temporary hide in UI
    setTempDeletedIds((prev) => [...prev, targetId])

    const targetDeadline = deadlines.find((d) => d.id === targetId)
    const title = targetDeadline ? targetDeadline.title : 'Deadline'

    // Set 5s timeout to delete
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

  // Calculations for KPIs
  const completedCount = visibleDeadlines.filter(dl => dl.status === STATUSES.COMPLETED).length
  const failedCount = visibleDeadlines.filter(dl => dl.status !== STATUSES.COMPLETED && checkIsOverdue(dl.dueDate)).length
  const pendingCount = visibleDeadlines.filter(dl => dl.status === STATUSES.PENDING && !checkIsOverdue(dl.dueDate)).length
  
  const totalCount = visibleDeadlines.length
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Completion Trend Chart Data
  const completionTrendData = useMemo(() => {
    const trendMonths = getLast7Months()
    
    // Build a count map without mutating the original objects
    const countMap = {}
    visibleDeadlines.forEach(dl => {
      if (dl.status === STATUSES.COMPLETED && dl.completedAt) {
        const dateObj = dl.completedAt.toDate ? dl.completedAt.toDate() : new Date(dl.completedAt)
        if (dateObj) {
          const year = dateObj.getFullYear()
          const month = String(dateObj.getMonth() + 1).padStart(2, '0')
          const key = `${year}-${month}`
          countMap[key] = (countMap[key] || 0) + 1
        }
      }
    })
    
    return trendMonths.map(m => ({
      ...m,
      count: countMap[m.key] || 0
    }))
  }, [visibleDeadlines])

  // Donut Chart Data
  const statusData = useMemo(() => {
    let pending = 0
    let completed = 0
    let failed = 0

    visibleDeadlines.forEach(dl => {
      const isCompleted = dl.status === STATUSES.COMPLETED
      const isOverdue = checkIsOverdue(dl.dueDate) && !isCompleted

      if (isCompleted) {
        completed++
      } else if (isOverdue) {
        failed++
      } else {
        pending++
      }
    })

    return [
      { name: 'Pending', value: pending, color: '#9CA3AF' },
      { name: 'Completed', value: completed, color: '#34D399' },
      { name: 'Failed', value: failed, color: '#F87171' }
    ].filter(item => item.value > 0)
  }, [visibleDeadlines])

  // Recent Activity Table Data
  const recentActivity = useMemo(() => {
    return [...visibleDeadlines]
      .sort((a, b) => {
        const timeA = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : new Date(a.updatedAt || a.createdAt || a.dueDate).getTime()
        const timeB = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : new Date(b.updatedAt || b.createdAt || b.dueDate).getTime()
        return timeB - timeA
      })
      .slice(0, 10)
  }, [visibleDeadlines])

  // Status Badge Rendering Helper
  const renderStatusBadge = (status) => {
    const styles = {
      [STATUSES.PENDING]: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200 dark:border-gray-800',
      [STATUSES.IN_PROGRESS]: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border-sky-100 dark:border-sky-500/20',
      [STATUSES.COMPLETED]: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20',
      [STATUSES.OVERDUE]: 'bg-red-50 text-danger-main dark:bg-red-500/10 dark:text-danger-main border-red-100 dark:border-red-500/20',
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${styles[status] || ''}`}>
        {STATUS_LABELS[status] || status}
      </span>
    )
  }

  // Responsive styling helpers for charts
  const isDark = resolvedTheme === 'dark'
  const textFill = isDark ? '#9CA3AF' : '#6B7280'
  const gridStroke = isDark ? '#374151' : '#E5E7EB'
  const tooltipStyle = {
    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
    borderColor: isDark ? '#374151' : '#E5E7EB',
    color: isDark ? '#F9FAFB' : '#111827',
    borderRadius: '12px'
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-border-main rounded-lg" />
            <div className="h-4 w-72 bg-border-main rounded-md" />
          </div>
          <div className="h-10 w-32 bg-border-main rounded-lg" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-6 bg-bg-surface border border-border-main rounded-xl flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 w-20 bg-border-main rounded-md" />
                <div className="h-7 w-12 bg-border-main rounded-md" />
              </div>
              <div className="h-8 w-8 bg-border-main rounded-lg" />
            </div>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="p-6 bg-bg-surface border border-border-main rounded-xl h-72" />
          <div className="p-6 bg-bg-surface border border-border-main rounded-xl h-72" />
        </div>

        <div className="p-6 bg-bg-surface border border-border-main rounded-xl h-64" />
      </div>
    )
  }

  if (deadlines.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Dashboard</h1>
          <p className="mt-1 text-sm text-text-sub">
            Welcome back! Here's a summary of your upcoming deadlines.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border-main rounded-2xl bg-bg-surface text-center space-y-4 max-w-xl mx-auto mt-8">
          <div className="p-4 bg-primary/10 text-primary border border-primary/20 rounded-full">
            <ListTodo size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-text-main">Welcome to your Productivity Dashboard!</h3>
            <p className="text-sm text-text-sub max-w-sm">
              You don't have any deadlines set yet. Create your first deadline to view real-time KPIs, trends, and recent activities.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-opacity-90 transition cursor-pointer"
          >
            Create Your First Deadline
          </button>
        </div>

        <DeadlineFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
          initialData={null}
        />
      </div>
    )
  }

  const hasApproaching = approachingDeadlines.length > 0 && !isBannerDismissed

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-main">Dashboard</h1>
          <p className="mt-1 text-sm text-text-sub hidden sm:block">
            Welcome back! Here's a summary of your upcoming deadlines.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-1.5 p-2 sm:px-4 sm:py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 font-medium shadow-sm transition cursor-pointer"
        >
          <Plus size={18} />
          <span className="hidden sm:inline whitespace-nowrap">New Deadline</span>
        </button>
      </div>

      {/* Approaching Deadlines Banner */}
      {hasApproaching && (
        <div className="flex items-center justify-between p-4 bg-danger-main/10 border border-danger-main/20 text-danger-main rounded-2xl animate-pulse">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="stroke-[2.5]" />
            <div>
              <p className="font-bold text-sm">Approaching Deadline Warning</p>
              <p className="text-xs opacity-90 mt-0.5">
                {approachingDeadlines.length === 1
                  ? `"${approachingDeadlines[0].title}" is due in less than an hour!`
                  : `You have ${approachingDeadlines.length} deadlines due in less than an hour!`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsBannerDismissed(true)}
            className="px-2 py-1 text-xs font-semibold rounded-lg text-danger-main hover:bg-danger-main/10 transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Pending Deadlines', value: pendingCount, icon: Clock, color: 'text-primary bg-primary/10 border-primary/20' },
          { title: 'Completed', value: completedCount, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
          { title: 'Failed', value: failedCount, icon: AlertCircle, color: 'text-danger-main bg-danger-main/10 border-danger-main/20' },
          { title: 'Completion Rate', value: `${completionRate}%`, icon: LayoutGrid, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-6 bg-bg-surface border border-border-main rounded-2xl shadow-xs"
          >
            <div>
              <p className="text-sm font-medium text-text-sub">{kpi.title}</p>
              <h4 className="text-2xl font-bold tracking-tight text-text-main mt-1">
                {kpi.value}
              </h4>
            </div>
            <div className={`p-2.5 rounded-xl border ${kpi.color}`}>
              <kpi.icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Completion Trend Bar Chart */}
        <div className="p-6 bg-bg-surface border border-border-main rounded-2xl flex flex-col justify-between h-76">
          <h3 className="font-semibold text-text-main mb-4">Completion Trend</h3>
          <div className="flex-1 w-full text-xs min-h-0 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={completionTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" stroke={textFill} tickLine={false} />
                <YAxis stroke={textFill} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#16A34A" radius={[4, 4, 0, 0]} name="Completed Tasks" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Status Distribution Donut Chart */}
        <div className="p-6 bg-bg-surface border border-border-main rounded-2xl flex flex-col justify-between h-76">
          <h3 className="font-semibold text-text-main mb-4">Task Status Distribution</h3>
          <div className="flex-1 w-full flex items-center justify-center text-xs min-h-0 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="p-6 bg-bg-surface border border-border-main rounded-2xl space-y-4">
        <h3 className="font-semibold text-text-main text-lg">Recent Activity</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-main text-xs font-semibold text-text-sub uppercase tracking-wider">
                <th className="py-3 px-4">Task</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main/50 text-sm">
              {recentActivity.map((dl) => (
                <tr key={dl.id} className="hover:bg-bg-base/30 transition duration-150">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-text-main line-clamp-1">{dl.title}</p>
                    {dl.description && (
                      <p className="text-xs text-text-sub line-clamp-1 mt-0.5">{dl.description}</p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                      {dl.category}
                    </span>
                  </td>
                  <td className="py-3 px-4">{renderStatusBadge(dl.status)}</td>
                  <td className="py-3 px-4 text-text-sub font-semibold">
                    {formatDueDate(dl.dueDate)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {dl.status !== STATUSES.COMPLETED && !checkIsOverdue(dl.dueDate) && (
                        <button
                          onClick={() => handleOpenEdit(dl)}
                          className="p-1 border border-border-main rounded-lg text-text-sub hover:text-text-main hover:bg-bg-base transition cursor-pointer"
                          title="Edit Deadline"
                        >
                          <Edit size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteClick(dl.id)}
                        className="p-1 border border-danger-main/30 rounded-lg text-danger-main hover:bg-danger-main/10 transition cursor-pointer"
                        title="Delete Deadline"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals & Toasts */}
      <DeadlineFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingDeadline}
      />

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
