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
