import { getBookmarkTree, moveBookmark } from '@/lib/bookmarks'
import { getSettings, getVisitCounts } from '@/lib/storage'
import { sortBookmarks } from '@/lib/sorter'

interface Move {
  id: string
  parentId: string
  index: number
}

export function setup(): void {
  chrome.runtime.onInstalled.addListener(() => {
    void runIfAutoSort()
  })
  chrome.runtime.onStartup.addListener(() => {
    void runIfAutoSort()
  })
}

async function runIfAutoSort(): Promise<void> {
  const settings = await getSettings()
  if (!settings.auto_sort) return
  await runSort()
}

export async function runSort(): Promise<void> {
  const tree = await getBookmarkTree()
  const visitCounts = await getVisitCounts()
  const sorted = sortBookmarks(tree, visitCounts)
  const moves = collectMoves(tree, sorted)
  for (const move of moves) {
    await moveBookmark(move.id, move.parentId, move.index)
  }
}

function collectMoves(
  original: chrome.bookmarks.BookmarkTreeNode[],
  sorted: chrome.bookmarks.BookmarkTreeNode[],
  moves: Move[] = [],
): Move[] {
  for (let i = 0; i < sorted.length; i++) {
    const newNode = sorted[i]
    const origIdx = original.findIndex((n) => n.id === newNode.id)
    if (origIdx !== i && newNode.parentId) {
      moves.push({ id: newNode.id, parentId: newNode.parentId, index: i })
    }
    if (newNode.children && origIdx >= 0) {
      const origChildren = original[origIdx].children ?? []
      collectMoves(origChildren, newNode.children, moves)
    }
  }
  return moves
}
