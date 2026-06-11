import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
      <div className="w-[360px] rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          {destructive && (
            <AlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-yellow-600" />
          )}
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="mt-1.5 whitespace-pre-line text-sm text-gray-600">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-3 py-1.5 text-sm text-white ${
              destructive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
