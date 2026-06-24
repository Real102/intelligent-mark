import { isFolder, isOtherBookmarks } from './filter'
import { getBookmarkPath } from './bookmarks'
import type { VisitCounts } from '@/types'

export interface SearchResult {
  id: string
  title: string
  url: string
  score: number
  count: number
  path: string
}

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
  if (isSubsequence(lowerQuery, lowerTitle)) return 0.4
  if (lowerUrl.includes(lowerQuery)) return 0.3
  return 0
}

/**
 * query 字符按顺序在 text 里出现（中间允许其他字符）。
 * - 大小写不敏感（要求调用方已转小写）
 * - query 长度 < 2 视为不命中（单字符太宽，会匹配几乎所有含该字的 title）
 */
function isSubsequence(query: string, text: string): boolean {
  if (query.length < 2) return false
  let qi = 0
  for (let i = 0; i < text.length && qi < query.length; i++) {
    if (text[i] === query[qi]) qi++
  }
  return qi === query.length
}

/**
 * 模糊搜索书签。
 * - query 为空（含纯空格）返回空
 * - 匹配 title/URL（includes，大小写不敏感）
 * - 兜底：query 长度 ≥ 2 时，title 字符子序列也命中
 * - 得分：title 全匹配=1.0，title 部分=0.5，title 子序列=0.4，URL=0.3（取最高）
 * - 排序：score 降序 → count 降序
 * - 返回所有命中（不限制条数）
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
    results.push({
      id: node.id,
      title: node.title,
      url: node.url,
      score,
      count,
      path: getBookmarkPath(node.id, tree),
    })
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.count - a.count
  })

  return results
}

/**
 * 推荐书签：按 count 降序，最多 limit 条（默认 3）。
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
    candidates.push({
      id: node.id,
      title: node.title,
      url: node.url,
      score: 0,
      count,
      path: getBookmarkPath(node.id, tree),
    })
  }
  candidates.sort((a, b) => b.count - a.count)
  return candidates.slice(0, limit)
}
