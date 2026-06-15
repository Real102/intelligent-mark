import type { UrlMatchKey } from '@/types'

export function normalizeUrl(url: string): string {
  return url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
}

export function getUrlMatchKey(url: string): UrlMatchKey {
  try {
    const parsed = new URL(url)
    let pathname = parsed.pathname || ''
    if (pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1)
    }
    return parsed.host + pathname
  } catch {
    return normalizeUrl(url)
  }
}

export function getBookmarkTree(): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree((tree) => {
      const err = chrome.runtime.lastError
      if (err) {
        reject(new Error(err.message))
        return
      }
      resolve(tree)
    })
  })
}

export function getBookmarkChildren(parentId: string): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getChildren(parentId, (children) => {
      const err = chrome.runtime.lastError
      if (err) {
        reject(new Error(err.message))
        return
      }
      resolve(children)
    })
  })
}

export function moveBookmark(
  id: string,
  parentId: string,
  index?: number,
): Promise<chrome.bookmarks.BookmarkTreeNode> {
  return new Promise((resolve, reject) => {
    const destination: { parentId: string; index?: number } = { parentId }
    if (index !== undefined) destination.index = index
    chrome.bookmarks.move(id, destination, (node) => {
      const err = chrome.runtime.lastError
      if (err) {
        reject(new Error(err.message))
        return
      }
      resolve(node)
    })
  })
}

export function* walkBookmarks(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
): Generator<chrome.bookmarks.BookmarkTreeNode> {
  for (const node of nodes) {
    yield node
    if (node.children && node.children.length > 0) {
      yield* walkBookmarks(node.children)
    }
  }
}

function buildNodeMap(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  map: Map<string, chrome.bookmarks.BookmarkTreeNode>,
): void {
  for (const node of nodes) {
    map.set(node.id, node)
    if (node.children) buildNodeMap(node.children, map)
  }
}

/**
 * 返回书签的父级路径，例如 "书签栏 / 开发工具"。
 * - 不包含节点自身的 title，只到直接父级
 * - 跳过根节点 "0"
 * - 找不到节点 / 已在根下时返回空串
 * - 用 Set 防 parentId 循环引用导致的死循环
 */
export function getBookmarkPath(
  id: string,
  tree: chrome.bookmarks.BookmarkTreeNode[],
): string {
  const map = new Map<string, chrome.bookmarks.BookmarkTreeNode>()
  buildNodeMap(tree, map)
  const node = map.get(id)
  if (!node) return ''

  const segments: string[] = []
  const visited = new Set<string>()
  let parentId = node.parentId
  while (parentId) {
    if (visited.has(parentId)) break
    visited.add(parentId)
    if (parentId === '0') break
    const parent = map.get(parentId)
    if (!parent) break
    segments.unshift(parent.title)
    parentId = parent.parentId
  }
  return segments.join(' / ')
}
