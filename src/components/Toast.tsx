import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { useEffect } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: number
  kind: ToastKind
  text: string
}

interface ToastProps {
  message: ToastMessage | null
  onDismiss: () => void
}

const AUTO_DISMISS_MS = 3000

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [message, onDismiss])

  if (!message) return null

  const palette = {
    success: 'border-green-200 bg-green-50 text-green-900',
    error: 'border-red-200 bg-red-50 text-red-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
  }[message.kind]

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  }[message.kind]

  return (
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 transform">
      <div
        role="status"
        className={`flex items-center gap-2 rounded-lg border px-4 py-2 shadow-lg ${palette}`}
      >
        <Icon size={16} />
        <span className="text-sm">{message.text}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="ml-1 text-current opacity-60 hover:opacity-100"
          aria-label="关闭"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
