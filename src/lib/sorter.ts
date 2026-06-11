import { isFolder, isOtherBookmarks } from './filter'
import type { VisitCounts } from '@/types'

/**
 * 返回排序后的书签树（深拷贝，原树不变）。
 * 规则：
 * - "其他书签"子树完全保原序
 * - 同级：文件夹在前
 * - 根级书签（parentId 是书签栏）保原序，不参与 count 排序
 * - 非根级书签：已访问按 count 降序，未访问保原序
 */
export function sortBookmarks(
  tree: chrome.bookmarks.BookmarkTreeNode[],
  visitCounts: VisitCounts,
): chrome.bookmarks.BookmarkTreeNode[] {
  return tree.map((node) => processNode(node, visitCounts, false))
}

function processNode(
  node: chrome.bookmarks.BookmarkTreeNode,
  visitCounts: VisitCounts,
  inOtherBookmarks: boolean,
): chrome.bookmarks.BookmarkTreeNode {
  const exclude = inOtherBookmarks || isOtherBookmarks(node)

  const children = node.children?.map((c) => processNode(c, visitCounts, exclude))

  const sortedChildren = exclude || !children ? children : sortSiblings(children, node.id, visitCounts)

  return { ...node, children: sortedChildren }
}

function sortSiblings(
  siblings: chrome.bookmarks.BookmarkTreeNode[],
  parentId: string,
  visitCounts: VisitCounts,
): chrome.bookmarks.BookmarkTreeNode[] {
  const folders: chrome.bookmarks.BookmarkTreeNode[] = []
  const rootBookmarks: chrome.bookmarks.BookmarkTreeNode[] = []
  const visited: chrome.bookmarks.BookmarkTreeNode[] = []
  const unvisited: chrome.bookmarks.BookmarkTreeNode[] = []

  const parentIsBookmarksBar = parentId === '1'

  for (const c of siblings) {
    if (isFolder(c)) {
      folders.push(c)
    } else if (parentIsBookmarksBar) {
      rootBookmarks.push(c)
    } else if ((visitCounts[c.id]?.count ?? 0) > 0) {
      visited.push(c)
    } else {
      unvisited.push(c)
    }
  }

  visited.sort((a, b) => (visitCounts[b.id]?.count ?? 0) - (visitCounts[a.id]?.count ?? 0))

  return [...folders, ...visited, ...unvisited, ...rootBookmarks]
}
