import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { X, Calendar, Clock, Tag, AlertTriangle, FileText, Loader2, Bell } from 'lucide-react'
import { format } from 'date-fns'
import { CATEGORIES_LIST, PRIORITIES_LIST, STATUSES } from '../constants/deadlines'

const deadlineSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(120, 'Title must be 120 characters or less'),
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .or(z.literal('')),
  category: z.string().min(1, 'Category is required'),
  priority: z.string().min(1, 'Priority is required'),
  dueDateStr: z.string().min(1, 'Due date is required'),
  dueTimeStr: z.string().min(1, 'Due time is required'),
})

export default function DeadlineFormModal({ isOpen, onClose, onSubmit, initialData, defaultDate }) {
  const [selectedIntervals, setSelectedIntervals] = useState([1440, 360, 60])
  const [formError, setFormError] = useState(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(deadlineSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'Work',
      priority: 'Medium',
      dueDateStr: '',
      dueTimeStr: '',
    }
  })

  // Prepopulate form if in edit mode, or use defaultDate for calendar creates
  useEffect(() => {
    let active = true
    let timer

    setFormError(null)

    if (initialData) {
      // Check if dueDate is a firestore timestamp or raw date/string
      const dateObj = initialData.dueDate?.toDate 
        ? initialData.dueDate.toDate() 
        : new Date(initialData.dueDate)
      
      reset({
        title: initialData.title || '',
        description: initialData.description || '',
        category: initialData.category || 'Work',
        priority: initialData.priority || 'Medium',
        dueDateStr: dateObj ? format(dateObj, 'yyyy-MM-dd') : '',
        dueTimeStr: dateObj ? format(dateObj, 'HH:mm') : '',
      })
      timer = setTimeout(() => {
        if (active) {
          setSelectedIntervals(initialData.reminderIntervals || [1440, 360, 60])
        }
      }, 0)
    } else {
      // Create mode — optionally pre-fill date from defaultDate (e.g. calendar selection)
      const prefillDate = defaultDate ? new Date(defaultDate) : null
      reset({
        title: '',
        description: '',
        category: 'Work',
        priority: 'Medium',
        dueDateStr: prefillDate ? format(prefillDate, 'yyyy-MM-dd') : '',
        dueTimeStr: '',
      })
      timer = setTimeout(() => {
        if (active) {
          setSelectedIntervals([1440, 360, 60])
        }
      }, 0)
    }
    return () => {
      active = false
      if (timer) clearTimeout(timer)
    }
  }, [initialData, defaultDate, reset, isOpen])

  const handleFormSubmit = async (data) => {
    // Combine Date and Time inputs into a single JS Date object
    const [year, month, day] = data.dueDateStr.split('-').map(Number)
    const [hours, minutes] = data.dueTimeStr.split(':').map(Number)
    const combinedDate = new Date(year, month - 1, day, hours, minutes)

    const now = new Date()
    if (combinedDate <= now) {
      const errorMessage = 'Due date and time must be in the future. Please choose a correct date and time.'
      setFormError(errorMessage)
      alert(errorMessage)
      return
    }

    const payload = {
      title: data.title,
      description: data.description || null,
      category: data.category,
      priority: data.priority,
      dueDate: combinedDate,
      status: (initialData && initialData.id) ? initialData.status : STATUSES.PENDING,
      reminderIntervals: selectedIntervals,
      completedAt: (initialData && initialData.id) ? initialData.completedAt : null,
      // Reset sent reminders on edit so they fire again for the new due date
      sentReminders: [],
    }

    try {
      setFormError(null)
      await onSubmit(payload)
      reset()
      onClose()
    } catch (e) {
      // Display the error in the modal instead of silently swallowing it
      setFormError(e.message || 'Failed to save deadline. Please try again.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-lg overflow-hidden bg-bg-surface border border-border-main rounded-2xl shadow-xl z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-main bg-bg-base/30">
          <h3 className="text-lg font-bold text-text-main">
            {(initialData && initialData.id) ? 'Edit Deadline' : 'Create New Deadline'}
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-text-sub hover:text-text-main hover:bg-bg-base transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Error Banner */}
          {formError && (
            <div className="p-3 bg-danger-main/10 border border-danger-main/20 text-danger-main text-xs font-semibold rounded-lg">
              {formError}
            </div>
          )}
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-text-main flex items-center gap-1.5 mb-1.5">
              <AlertTriangle size={14} className="text-primary" />
              Title <span className="text-danger-main">*</span>
            </label>
            <input
              type="text"
              {...register('title')}
              placeholder="e.g. Submit CS101 Assignment"
              className={`w-full px-3 py-2 bg-bg-base border rounded-xl text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition ${
                errors.title ? 'border-danger-main' : 'border-border-main'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-danger-main font-semibold">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-text-main flex items-center gap-1.5 mb-1.5">
              <FileText size={14} className="text-primary" />
              Description
            </label>
            <textarea
              {...register('description')}
              placeholder="Provide a detailed description of the deliverables (optional)..."
              rows={3}
              className="w-full px-3 py-2 bg-bg-base border border-border-main rounded-xl text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition resize-none"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-danger-main font-semibold">{errors.description.message}</p>
            )}
          </div>

          {/* Due Date & Time */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-text-main flex items-center gap-1.5 mb-1.5">
                <Calendar size={14} className="text-primary" />
                Due Date <span className="text-danger-main">*</span>
              </label>
              <input
                type="date"
                {...register('dueDateStr')}
                className={`w-full px-3 py-2 bg-bg-base border rounded-xl text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition ${
                  errors.dueDateStr ? 'border-danger-main' : 'border-border-main'
                }`}
              />
              {errors.dueDateStr && (
                <p className="mt-1 text-xs text-danger-main font-semibold">{errors.dueDateStr.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-main flex items-center gap-1.5 mb-1.5">
                <Clock size={14} className="text-primary" />
                Due Time <span className="text-danger-main">*</span>
              </label>
              <input
                type="time"
                {...register('dueTimeStr')}
                className={`w-full px-3 py-2 bg-bg-base border rounded-xl text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition ${
                  errors.dueTimeStr ? 'border-danger-main' : 'border-border-main'
                }`}
              />
              {errors.dueTimeStr && (
                <p className="mt-1 text-xs text-danger-main font-semibold">{errors.dueTimeStr.message}</p>
              )}
            </div>
          </div>

          {/* Category & Priority */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-text-main flex items-center gap-1.5 mb-1.5">
                <Tag size={14} className="text-primary" />
                Category
              </label>
              <select
                {...register('category')}
                className="w-full px-3 py-2 bg-bg-base border border-border-main rounded-xl text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition cursor-pointer"
              >
                {CATEGORIES_LIST.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-main flex items-center gap-1.5 mb-1.5">
                <AlertTriangle size={14} className="text-primary" />
                Priority
              </label>
              <select
                {...register('priority')}
                className="w-full px-3 py-2 bg-bg-base border border-border-main rounded-xl text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition cursor-pointer"
              >
                {PRIORITIES_LIST.map((prio) => (
                  <option key={prio} value={prio}>
                    {prio}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reminder Intervals */}
          <div>
            <label className="block text-sm font-semibold text-text-main flex items-center gap-1.5 mb-1.5">
              <Bell size={14} className="text-primary" />
              Reminders
            </label>
            <p className="text-xs text-text-sub mb-2.5">
              Choose when to receive notifications before the deadline.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '30 mins', value: 30 },
                { label: '1 hour', value: 60 },
                { label: '6 hours', value: 360 },
                { label: '1 day', value: 1440 },
                { label: '1 week', value: 10080 },
              ].map((interval) => {
                const isSelected = selectedIntervals.includes(interval.value)
                return (
                  <button
                    key={interval.value}
                    type="button"
                    onClick={() => {
                      setSelectedIntervals((prev) =>
                        prev.includes(interval.value)
                          ? prev.filter((v) => v !== interval.value)
                          : [...prev, interval.value].sort((a, b) => a - b)
                      )
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-bg-base text-text-sub border-border-main hover:text-text-main hover:bg-bg-base/70'
                    }`}
                  >
                    {interval.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-border-main pt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border-main text-sm font-semibold text-text-main rounded-xl hover:bg-bg-base transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-opacity-90 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Deadline'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
