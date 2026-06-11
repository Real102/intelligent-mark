import { SearchX, BookmarkPlus } from 'lucide-react'

type EmptyStateMode = 'no-recommendations' | 'no-results'

interface EmptyStateProps {
  mode: EmptyStateMode
  query?: string
}

export function EmptyState({ mode, query }: EmptyStateProps) {
  if (mode === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <SearchX size={32} className="text-gray-300" />
        <p className="mt-3 text-sm text-gray-500">未找到匹配 &quot;{query}&quot; 的书签</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <BookmarkPlus size={32} className="text-gray-300" />
      <p className="mt-3 text-sm text-gray-500">暂无推荐</p>
      <p className="mt-1 text-xs text-gray-400">访问书签后将自动推荐最常访问的页面</p>
    </div>
  )
}
