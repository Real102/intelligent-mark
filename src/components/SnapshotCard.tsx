import { Camera } from 'lucide-react'

interface SnapshotCardProps {
  name: string
  bookmarkCount: number
  createdAt: number
  onRestore: (name: string) => void
}

function formatDate(t: number): string {
  const now = Date.now()
  const diff = now - t
  const day = 24 * 60 * 60 * 1000
  const d = new Date(t)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (diff < day) return `今天`
  if (diff < 2 * day) return `昨天`
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`
  return date
}

export function SnapshotCard({ name, bookmarkCount, createdAt, onRestore }: SnapshotCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
      <Camera size={16} className="flex-shrink-0 text-text-secondary" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text-primary">{name}</div>
        <div className="text-xs text-text-secondary">
          {bookmarkCount} 个书签 · {formatDate(createdAt)}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRestore(name)}
        className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/5"
      >
        恢复
      </button>
    </div>
  )
}
