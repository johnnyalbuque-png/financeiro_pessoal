import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  loading?: boolean
}

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Excluir',
  loading = false,
}: ConfirmDialogProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <p className="text-gray-600 text-sm">{message}</p>
        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn-danger flex-1"
          >
            {loading ? 'Excluindo...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
