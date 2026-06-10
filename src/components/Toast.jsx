import { useEffect, useState, useRef, useCallback } from 'react'
import { X, RotateCcw } from 'lucide-react'

export default function Toast({ message, actionLabel, onAction, duration = 5000, onClose }) {
  const [progress, setProgress] = useState(100)
  const onCloseRef = useRef(onClose)

  // Keep the ref in sync without re-triggering the effect
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      
      if (elapsed >= duration) {
        clearInterval(interval)
        onCloseRef.current()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [duration])

  const handleAction = useCallback(() => {
    if (onAction) onAction()
    onCloseRef.current()
  }, [onAction])

  return (
    <div
      className="fixed bottom-5 right-5 z-50 w-full max-w-sm overflow-hidden bg-bg-surface/90 backdrop-blur-md border border-border-main rounded-xl shadow-lg animate-toast-slide-in"
    >
      <div className="p-4 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-text-main flex-1">{message}</p>
        
        {onAction && (
          <button
            onClick={handleAction}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition rounded-lg text-xs font-bold cursor-pointer"
          >
            <RotateCcw size={12} />
            {actionLabel || 'Undo'}
          </button>
        )}
        
        <button
          onClick={onClose}
          className="p-1 text-text-sub hover:text-text-main transition rounded-md hover:bg-bg-base cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-border-main/50">
        <div
          className="h-full bg-primary transition-all duration-[50ms]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
