const OTHER_BOOKMARKS_TITLES = new Set(['其他书签', 'Other bookmarks'])
const BOOKMARKS_BAR_TITLES = new Set(['书签栏', 'Bookmarks bar'])

export function isFolder(node: chrome.bookmarks.BookmarkTreeNode): boolean {
  return !node.url
}

export function isOtherBookmarks(node: chrome.bookmarks.BookmarkTreeNode): boolean {
  if (node.id === '2') return true
  return OTHER_BOOKMARKS_TITLES.has(node.title)
}

export function isBookmarksBar(node: chrome.bookmarks.BookmarkTreeNode): boolean {
  if (node.id === '1') return true
  return BOOKMARKS_BAR_TITLES.has(node.title)
}

function findNode(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  id: string,
): chrome.bookmarks.BookmarkTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

export function isRootLevel(
  node: chrome.bookmarks.BookmarkTreeNode,
  tree: chrome.bookmarks.BookmarkTreeNode[],
): boolean {
  if (!node.parentId) return false
  const parent = findNode(tree, node.parentId)
  if (!parent) return false
  return isBookmarksBar(parent)
}

export function shouldExcludeFromSearch(node: chrome.bookmarks.BookmarkTreeNode): boolean {
  if (isFolder(node)) return true
  if (isOtherBookmarks(node)) return true
  return false
}
