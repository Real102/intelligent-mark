import { RotateCcw, Trash2 } from 'lucide-react'

interface SnapshotCardProps {
  name: string
  bookmarkCount: number
  createdAt: number
  onRestore: (name: string) => void
  onDelete: (name: string) => void
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function formatDate(t: number): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function SnapshotCard({ name, bookmarkCount, createdAt, onRestore, onDelete }: SnapshotCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-gray-900">{name}</div>
        <div className="text-xs text-gray-500">
          {bookmarkCount} 个书签 · {formatDate(createdAt)}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRestore(name)}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
      >
        <RotateCcw size={12} />
        <span>恢复</span>
      </button>
      <button
        type="button"
        onClick={() => onDelete(name)}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
      >
        <Trash2 size={12} />
        <span>删除</span>
      </button>
    </div>
  )
}
