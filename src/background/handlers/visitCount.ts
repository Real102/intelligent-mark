import { getBookmarkTree, getUrlMatchKey, walkBookmarks } from '@/lib/bookmarks'
import { getVisitCounts, setVisitCounts } from '@/lib/storage'

const VALID_TRANSITIONS = new Set(['link', 'typed', 'auto_bookmark'])
const DEBOUNCE_MS = 500

// 同一 url_match_key 500ms 内只写一次 chrome.storage.local，避免连续刷新刷爆 IO
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function setup(): void {
  // 用 onCommitted 而非 onCompleted：onCompleted 没有 transitionType,
  // PRD 要求按 transition 过滤 (link/typed/auto_bookmark) 必须用 onCommitted
  chrome.webNavigation.onCommitted.addListener(handleNavigation)
}

async function handleNavigation(details: chrome.webNavigation.WebNavigationTransitionCallbackDetails): Promise<void> {
  if (details.frameId !== 0) return
  if (!VALID_TRANSITIONS.has(details.transitionType)) return
  if (!details.url.startsWith('http://') && !details.url.startsWith('https://')) return

  const key = getUrlMatchKey(details.url)

  if (pendingTimers.has(key)) return
  const timer = setTimeout(() => {
    void flushKey(key)
  }, DEBOUNCE_MS)
  pendingTimers.set(key, timer)
}

async function flushKey(key: string): Promise<void> {
  pendingTimers.delete(key)

  const tree = await getBookmarkTree()
  let matchedId: string | null = null
  for (const node of walkBookmarks(tree)) {
    if (node.url && getUrlMatchKey(node.url) === key) {
      matchedId = node.id
      break
    }
  }
  if (!matchedId) return

  const visitCounts = await getVisitCounts()
  const existing = visitCounts[matchedId]
  visitCounts[matchedId] = {
    count: (existing?.count ?? 0) + 1,
    url_match_key: key,
    last_visit: Date.now(),
  }
  await setVisitCounts(visitCounts)
}
