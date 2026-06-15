import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Settings } from 'lucide-react'
import { getBookmarkTree } from '@/lib/bookmarks'
import { getVisitCounts } from '@/lib/storage'
import { getRecommendations, searchBookmarks } from '@/lib/searcher'
import { BookmarkItem, EmptyState, SearchBox } from '@/components'
import type { VisitCounts } from '@/types'

function openBookmark(url: string): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id
    if (tabId !== undefined) {
      chrome.tabs.update(tabId, { url, active: true })
    }
    window.close()
  })
}

function openOptions(): void {
  chrome.runtime.openOptionsPage()
  window.close()
}

function App() {
  const [tree, setTree] = useState<chrome.bookmarks.BookmarkTreeNode[] | null>(null)
  const [counts, setCounts] = useState<VisitCounts>({})
  const [query, setQuery] = useState('')

  useEffect(() => {
    void (async () => {
      const [t, c] = await Promise.all([getBookmarkTree(), getVisitCounts()])
      setTree(t)
      setCounts(c)
    })()
  }, [])

  const trimmedQuery = query.trim()
  const isSearching = trimmedQuery.length > 0

  const searchResults = useMemo(() => {
    if (!tree || !trimmedQuery) return []
    return searchBookmarks(trimmedQuery, tree, counts)
  }, [tree, counts, trimmedQuery])

  const recommendations = useMemo(() => {
    if (!tree || isSearching) return []
    return getRecommendations(tree, counts)
  }, [tree, counts, isSearching])

  const isLoaded = tree !== null

  return (
    <div className="flex w-[375px] min-h-[600px] flex-col bg-white">
      {isSearching ? (
        <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="返回"
            className="flex items-center gap-1 text-sm font-semibold text-primary"
          >
            <ArrowLeft size={16} />
            <span>返回</span>
          </button>
          <div className="flex-1 text-right text-sm font-semibold text-text-primary">搜索</div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <h1 className="text-lg font-semibold text-text-primary">智能书签</h1>
          <button
            type="button"
            onClick={openOptions}
            aria-label="设置"
            className="rounded p-1 text-text-secondary hover:bg-white"
          >
            <Settings size={18} />
          </button>
        </div>
      )}

      <div className="border-b border-border bg-surface px-4 pb-3 pt-3">
        <SearchBox value={query} onChange={setQuery} autoFocus={isSearching} />
      </div>

      <div className="flex-1 overflow-y-auto bg-surface px-4 py-3">
        {isSearching ? (
          <>
            <div className="mb-2 flex items-center justify-between text-xs text-text-secondary">
              <span>找到 {searchResults.length} 个结果</span>
            </div>
            <div className="h-px bg-border" />
            {!isLoaded ? null : searchResults.length === 0 ? (
              <EmptyState mode="no-results" query={trimmedQuery} />
            ) : (
              <div className="mt-2 space-y-2">
                {searchResults.map((r) => (
                  <BookmarkItem
                    key={r.id}
                    id={r.id}
                    title={r.title}
                    url={r.url}
                    count={r.count}
                    path={r.path}
                    onClick={(_id, url) => openBookmark(url)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="mb-2 text-sm font-semibold text-text-primary">推荐书签</h2>
            {!isLoaded ? null : recommendations.length === 0 ? (
              <EmptyState mode="no-recommendations" />
            ) : (
              <div className="space-y-2">
                {recommendations.map((r) => (
                  <BookmarkItem
                    key={r.id}
                    id={r.id}
                    title={r.title}
                    url={r.url}
                    count={r.count}
                    onClick={(_id, url) => openBookmark(url)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App
