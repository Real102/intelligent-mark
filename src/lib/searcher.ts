import { isFolder, isOtherBookmarks } from './filter'
import type { VisitCounts } from '@/types'

export interface SearchResult {
  id: string
  title: string
  url: string
  score: number
  count: number
}

const SEARCH_TOP_N = 5
const DEFAULT_RECOMMENDATION_LIMIT = 3

/**
 * 排除 "其他书签" 子树后，收集所有书签节点。
 * 为什么不用 walkBookmarks：它会把"其他书签"内部节点也 yield，而 PRD 要求"其他书签"完全过滤。
 */
function collectAll(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  out: chrome.bookmarks.BookmarkTreeNode[],
): void {
  for (const node of nodes) {
    if (isOtherBookmarks(node)) continue
    out.push(node)
    if (node.children) {
      collectAll(node.children, out)
    }
  }
}

function computeScore(lowerQuery: string, title: string, url: string): number {
  const lowerTitle = title.toLowerCase()
  const lowerUrl = url.toLowerCase()
  if (lowerTitle === lowerQuery) return 1.0
  if (lowerTitle.includes(lowerQuery)) return 0.5
  if (lowerUrl.includes(lowerQuery)) return 0.3
  return 0
}

/**
 * 模糊搜索书签。
 * - query 为空（含纯空格）返回空
 * - 匹配 title/URL（includes，大小写不敏感）
 * - 得分：title 全匹配=1.0，title 部分=0.5，URL=0.3（取最高）
 * - 排序：score 降序 → count 降序
 * - 最多返回 5 条
 */
export function searchBookmarks(
  query: string,
  tree: chrome.bookmarks.BookmarkTreeNode[],
  visitCounts: VisitCounts,
): SearchResult[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const lowerQuery = trimmed.toLowerCase()
  const all: chrome.bookmarks.BookmarkTreeNode[] = []
  collectAll(tree, all)

  const results: SearchResult[] = []
  for (const node of all) {
    if (isFolder(node) || !node.url) continue
    const score = computeScore(lowerQuery, node.title, node.url)
    if (score === 0) continue
    const count = visitCounts[node.id]?.count ?? 0
    results.push({ id: node.id, title: node.title, url: node.url, score, count })
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.count - a.count
  })

  return results.slice(0, SEARCH_TOP_N)
}

/**
 * 推荐书签：按 count 降序，最多 limit 条。
 * - count=0 不展示
 * - 排除文件夹和"其他书签"子树
 */
export function getRecommendations(
  tree: chrome.bookmarks.BookmarkTreeNode[],
  visitCounts: VisitCounts,
  limit: number = DEFAULT_RECOMMENDATION_LIMIT,
): SearchResult[] {
  const all: chrome.bookmarks.BookmarkTreeNode[] = []
  collectAll(tree, all)

  const candidates: SearchResult[] = []
  for (const node of all) {
    if (isFolder(node) || !node.url) continue
    const count = visitCounts[node.id]?.count ?? 0
    if (count === 0) continue
    candidates.push({ id: node.id, title: node.title, url: node.url, score: 0, count })
  }
  candidates.sort((a, b) => b.count - a.count)
  return candidates.slice(0, limit)
}
