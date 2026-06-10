import { useState, useEffect, useRef } from 'react'
import { Plus, ArrowUpDown, Search, ListTodo } from 'lucide-react'
import useDeadlines from '../../hooks/useDeadlines'
import DeadlineCard from '../../components/DeadlineCard'
import ConfirmDialog from '../../components/ConfirmDialog'
import DeadlineFormModal from '../../components/DeadlineFormModal'
import Toast from '../../components/Toast'
import { CATEGORIES_LIST, PRIORITIES_LIST, STATUSES, STATUS_LABELS } from '../../constants/deadlines'

export default function DeadlinesPage() {
  const {
    deadlines,
    loading,
    createDeadline,
    editDeadline,
    removeDeadline,
    updateStatus
  } = useDeadlines()

  // Modal and action states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDeadline, setEditingDeadline] = useState(null)
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [idToDelete, setIdToDelete] = useState(null)

  // Filters, search, and sorting states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedPriority, setSelectedPriority] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [sortBy, setSortBy] = useState('dueDate')

  // Undo delete states
  const [tempDeletedIds, setTempDeletedIds] = useState([])
  const [toast, setToast] = useState(null)
  const deleteTimeouts = useRef({})

  // Clear timeouts on unmount
  useEffect(() => {
    const timeouts = deleteTimeouts.current
    return () => {
      Object.values(timeouts).forEach(clearTimeout)
    }
  }, [])

  // Open Create modal
  const handleOpenCreate = () => {
    setEditingDeadline(null)
    setIsFormOpen(true)
  }

  // Open Edit modal
  const handleOpenEdit = (deadline) => {
    setEditingDeadline(deadline)
    setIsFormOpen(true)
  }

  // Handle Create / Edit Submission
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

  // Initiate Delete flow
  const handleDeleteClick = (id) => {
    setIdToDelete(id)
    setDeleteConfirmOpen(true)
  }

  // Confirm delete and start the 5s undo timer
  const handleConfirmDelete = () => {
    if (!idToDelete) return
    const targetId = idToDelete
    setIdToDelete(null)

    // Add to temp deleted list to hide immediately
    setTempDeletedIds((prev) => [...prev, targetId])

    const targetDeadline = deadlines.find((d) => d.id === targetId)
    const title = targetDeadline ? targetDeadline.title : 'Deadline'

    // Set 5s timeout to delete from Firestore
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

    // Trigger toast
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

  // Quick change status dropdown handler
  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateStatus(id, newStatus)
    } catch (err) {
      console.error('Failed to update status:', err)
      setToast({ message: `Failed to update status: ${err.message || 'Unknown error'}` })
    }
  }

  // Filter and sort computation
  const filteredDeadlines = deadlines
    .filter((dl) => !tempDeletedIds.includes(dl.id))
    .filter((dl) => {
      const matchesSearch =
        dl.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dl.description && dl.description.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesCategory = selectedCategory === 'All' || dl.category === selectedCategory
      const matchesPriority = selectedPriority === 'All' || dl.priority === selectedPriority
      
      const matchesStatus = selectedStatus === 'All' || dl.status === selectedStatus

      return matchesSearch && matchesCategory && matchesPriority && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'dueDate') {
        const dateA = a.dueDate?.toDate ? a.dueDate.toDate() : new Date(a.dueDate)
        const dateB = b.dueDate?.toDate ? b.dueDate.toDate() : new Date(b.dueDate)
        return dateA - dateB
      }
      if (sortBy === 'priority') {
        const priorityRanks = { Critical: 4, High: 3, Medium: 2, Low: 1 }
        const rankA = priorityRanks[a.priority] || 0
        const rankB = priorityRanks[b.priority] || 0
        return rankB - rankA
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title)
      }
      if (sortBy === 'newest') {
        const createA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
        const createB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
        return createB - createA
      }
      return 0
    })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-main">My Deadlines</h1>
          <p className="mt-1 text-sm text-text-sub hidden sm:block">
            Manage, organize, and monitor all your project deadlines.
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 p-4 bg-bg-surface border border-border-main rounded-xl lg:flex-row lg:items-center lg:justify-between lg:gap-2">
        
        {/* Search & Sort Panel - Renders on top for mobile, right side for desktop */}
        <div className="flex flex-row items-center justify-between gap-2 lg:order-2 w-full lg:w-auto">
          {/* Search Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.target.querySelector('input')?.blur()
            }}
            className="relative flex-1 max-w-[160px] sm:max-w-xs sm:w-48 md:w-64"
          >
            <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-text-sub pointer-events-none">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="pl-7 pr-2 py-1 bg-bg-base border border-border-main rounded-lg text-xs text-text-main placeholder-text-sub/70 focus:outline-none focus:border-primary w-full"
            />
          </form>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-text-sub font-semibold flex items-center gap-1 shrink-0" title="Sort deadlines">
              <ArrowUpDown size={14} />
              <span className="hidden sm:inline">Sort:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 py-1 bg-bg-base border border-border-main rounded-lg text-xs text-text-main focus:outline-none cursor-pointer"
            >
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="title">Title (A-Z)</option>
              <option value="newest">Newest Added</option>
            </select>
          </div>
        </div>

        {/* Filters Row - Renders below search & sort for mobile, left side for desktop */}
        <div className="flex flex-wrap items-center gap-2 lg:order-1 flex-1 w-full lg:w-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-bg-base border border-border-main rounded-lg text-sm text-text-main focus:outline-none cursor-pointer"
          >
            <option value="All">All Categories</option>
            {CATEGORIES_LIST.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-1.5 bg-bg-base border border-border-main rounded-lg text-sm text-text-main focus:outline-none cursor-pointer"
          >
            <option value="All">All Priorities</option>
            {PRIORITIES_LIST.map((prio) => (
              <option key={prio} value={prio}>
                {prio}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-bg-base border border-border-main rounded-lg text-sm text-text-main focus:outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value={STATUSES.PENDING}>{STATUS_LABELS[STATUSES.PENDING]}</option>
            <option value={STATUSES.COMPLETED}>{STATUS_LABELS[STATUSES.COMPLETED]}</option>
            <option value={STATUSES.OVERDUE}>{STATUS_LABELS[STATUSES.OVERDUE]}</option>
          </select>
        </div>
      </div>

      {/* Main List Rendering */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-5 bg-bg-surface border border-border-main rounded-2xl space-y-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-5 w-16 bg-border-main rounded-lg" />
                <div className="h-5 w-16 bg-border-main rounded-lg" />
              </div>
              <div className="space-y-2">
                <div className="h-6 w-3/4 bg-border-main rounded-md" />
                <div className="h-4 w-5/6 bg-border-main rounded-md" />
              </div>
              <div className="h-8 w-full bg-border-main rounded-xl" />
              <div className="flex justify-between pt-4 border-t border-border-main/50">
                <div className="space-y-1">
                  <div className="h-3 w-10 bg-border-main rounded-md" />
                  <div className="h-4 w-24 bg-border-main rounded-md" />
                </div>
                <div className="h-8 w-24 bg-border-main rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredDeadlines.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border-main rounded-2xl bg-bg-surface text-center space-y-4">
          <div className="p-4 bg-primary/10 text-primary border border-primary/20 rounded-full">
            <ListTodo size={32} />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="text-lg font-bold text-text-main">No deadlines found</h3>
            <p className="text-sm text-text-sub">
              Try adjusting your search query, clearing filters, or create a new deadline to get started.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-opacity-90 transition cursor-pointer"
          >
            Create Deadline
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDeadlines.map((dl) => (
            <DeadlineCard
              key={dl.id}
              deadline={dl}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteClick}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Modals and Toasts */}
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
