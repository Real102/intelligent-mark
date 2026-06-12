type EmptyStateMode = 'no-recommendations' | 'no-results'

interface EmptyStateProps {
  mode: EmptyStateMode
  query?: string
}

export function EmptyState({ mode, query }: EmptyStateProps) {
  if (mode === 'no-results') {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-semibold text-text-primary">未找到匹配书签</p>
        <p className="mt-1 text-xs text-text-secondary">没有包含 &quot;{query}&quot; 的书签</p>
      </div>
    )
  }
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold text-text-primary">暂无推荐</p>
      <p className="mt-1 text-xs text-text-secondary">访问书签后将自动显示推荐</p>
    </div>
  )
}
