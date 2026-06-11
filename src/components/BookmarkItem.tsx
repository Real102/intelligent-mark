import { Globe } from 'lucide-react'
import { useState } from 'react'

interface BookmarkItemProps {
  id: string
  title: string
  url: string
  count?: number
  onClick?: (id: string, url: string) => void
}

function getFaviconUrl(url: string): string {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`
  } catch {
    return ''
  }
}

export function BookmarkItem({ id, title, url, count, onClick }: BookmarkItemProps) {
  const [imgError, setImgError] = useState(false)
  const faviconUrl = getFaviconUrl(url)

  return (
    <button
      type="button"
      onClick={() => onClick?.(id, url)}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
    >
      <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
        {faviconUrl && !imgError ? (
          <img
            src={faviconUrl}
            alt=""
            className="h-4 w-4"
            onError={() => setImgError(true)}
          />
        ) : (
          <Globe size={16} className="text-gray-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-gray-900">{title}</div>
        <div className="truncate text-xs text-gray-500">{url}</div>
      </div>
      {count !== undefined && count > 0 && (
        <div className="flex-shrink-0 text-xs text-gray-400">{count}</div>
      )}
    </button>
  )
}
