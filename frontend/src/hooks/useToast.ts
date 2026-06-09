import { useState, useCallback } from 'react'
import { ToastMessage } from '../components/Toast'

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = useCallback(
    (message: string) => addToast('success', message),
    [addToast],
  )

  const error = useCallback(
    (message: string) => addToast('error', message),
    [addToast],
  )

  return { toasts, removeToast, success, error }
}
