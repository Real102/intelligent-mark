import { Copy } from 'lucide-react'
import type { MouseEvent } from 'react'

interface BookmarkItemProps {
  id: string
  title: string
  url: string
  count?: number
  path?: string
  onClick?: (id: string, url: string) => void
  onCopy?: (url: string) => void
}

export function BookmarkItem({ id, title, url, count, path, onClick, onCopy }: BookmarkItemProps) {
  const handleCopy = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onCopy?.(url)
  }

  return (
    <button
      type="button"
      onClick={() => onClick?.(id, url)}
      className="group flex w-full items-center gap-3 rounded-lg border border-border bg-white p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary-light/5 focus:border-primary/30 focus:outline-none"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <span className="text-xs font-semibold text-primary">
          {[...title][0]?.toUpperCase() ?? ''}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-text-primary">{title}</div>
        {path && (
          <div className="truncate text-xs text-text-secondary">{path}</div>
        )}
        <div className="truncate text-xs text-text-secondary">{url}</div>
      </div>
      {count !== undefined && count > 0 && (
        <div className="flex-shrink-0 text-xs text-text-secondary group-hover:hidden">{count}次</div>
      )}
      <div
        role="button"
        tabIndex={-1}
        onClick={handleCopy}
        aria-label="复制链接"
        className="hidden h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-white text-text-secondary transition-colors hover:border-primary hover:bg-primary-light/10 hover:text-primary group-hover:flex"
      >
        <Copy size={14} />
      </div>
    </button>
  )
}
