import { useEffect, useMemo, useState } from 'react'
import { Settings, History, Sparkles } from 'lucide-react'
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

  const searchResults = useMemo(() => {
    if (!tree || !trimmedQuery) return []
    return searchBookmarks(trimmedQuery, tree, counts)
  }, [tree, counts, trimmedQuery])

  const recommendations = useMemo(() => {
    if (!tree || trimmedQuery) return []
    return getRecommendations(tree, counts)
  }, [tree, counts, trimmedQuery])

  const isLoaded = tree !== null

  return (
    <div className="flex w-[375px] min-h-[600px] flex-col bg-white">
      <div className="border-b border-gray-100 p-3">
        <SearchBox value={query} onChange={setQuery} />
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-2">
        {trimmedQuery ? (
          <>
            <div className="px-2 pb-1 pt-1 text-xs font-medium text-gray-400">搜索结果</div>
            {!isLoaded ? null : searchResults.length === 0 ? (
              <EmptyState mode="no-results" query={trimmedQuery} />
            ) : (
              <div className="space-y-0.5">
                {searchResults.map((r) => (
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
        ) : (
          <>
            <div className="flex items-center gap-1 px-2 pb-1 pt-1 text-xs font-medium text-gray-400">
              <Sparkles size={12} />
              <span>推荐书签</span>
            </div>
            {!isLoaded ? null : recommendations.length === 0 ? (
              <EmptyState mode="no-recommendations" />
            ) : (
              <div className="space-y-0.5">
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

      <div className="flex border-t border-gray-100">
        <button
          type="button"
          onClick={openOptions}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          <Settings size={14} />
          <span>设置</span>
        </button>
        <div className="w-px bg-gray-100" />
        <button
          type="button"
          onClick={openOptions}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          <History size={14} />
          <span>快照</span>
        </button>
      </div>
    </div>
  )
}

export default App
