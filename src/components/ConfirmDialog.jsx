import { X, AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to perform this action? This cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = true
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Dialog Content */}
      <div className="relative w-full max-w-md overflow-hidden bg-bg-surface border border-border-main rounded-2xl shadow-xl z-10 flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-text-sub hover:text-text-main hover:bg-bg-base transition cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex gap-4">
          {/* Icon */}
          <div className={`p-3 rounded-full flex-shrink-0 self-start ${
            isDanger ? 'bg-danger-main/10 text-danger-main border border-danger-main/20' : 'bg-primary/10 text-primary border border-primary/20'
          }`}>
            <AlertTriangle size={20} />
          </div>

          {/* Text content */}
          <div className="space-y-2 flex-1">
            <h3 className="text-lg font-bold text-text-main pr-6 leading-6">
              {title}
            </h3>
            <p className="text-sm text-text-sub leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 border-t border-border-main/50 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border-main text-sm font-semibold text-text-main rounded-xl hover:bg-bg-base transition cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`px-4 py-2 font-semibold text-sm rounded-xl transition hover:bg-opacity-90 cursor-pointer ${
              isDanger 
                ? 'bg-danger-main text-white shadow-sm shadow-danger-main/20' 
                : 'bg-primary text-white shadow-sm shadow-primary/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
