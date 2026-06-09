import { useEffect } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'
import clsx from 'clsx'

export interface ToastMessage {
  id: string
  type: 'success' | 'error'
  message: string
}

interface ToastProps {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
}

const Toast = ({ toasts, onRemove }: ToastProps) => {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

const ToastItem = ({
  toast,
  onRemove,
}: {
  toast: ToastMessage
  onRemove: (id: string) => void
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id)
    }, 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg min-w-[280px] max-w-sm',
        'animate-in slide-in-from-right-5 duration-300',
        toast.type === 'success'
          ? 'bg-green-50 border border-green-200'
          : 'bg-red-50 border border-red-200',
      )}
    >
      {toast.type === 'success' ? (
        <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-red-600 shrink-0" />
      )}
      <p
        className={clsx(
          'text-sm font-medium flex-1',
          toast.type === 'success' ? 'text-green-800' : 'text-red-800',
        )}
      >
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        className={clsx(
          'p-0.5 rounded transition-colors',
          toast.type === 'success'
            ? 'text-green-500 hover:text-green-700'
            : 'text-red-500 hover:text-red-700',
        )}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default Toast
