import { getBookmarkTree } from './bookmarks'
import { getSnapshots, getVisitCounts, setSnapshots, setVisitCounts } from './storage'
import { gzip, gunzip } from './pako'
import type { Snapshot, Snapshots } from '@/types'

const MAX_SNAPSHOTS = 7
const ROOT_IDS = new Set(['0', '1', '2'])

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function todayName(now: Date = new Date()): string {
  return `快照_${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

function countBookmarks(nodes: chrome.bookmarks.BookmarkTreeNode[]): number {
  let n = 0
  const walk = (arr: chrome.bookmarks.BookmarkTreeNode[]): void => {
    for (const node of arr) {
      if (node.url) n++
      if (node.children) walk(node.children)
    }
  }
  walk(nodes)
  return n
}

function collectAllIds(nodes: chrome.bookmarks.BookmarkTreeNode[]): Set<string> {
  const ids = new Set<string>()
  const walk = (arr: chrome.bookmarks.BookmarkTreeNode[]): void => {
    for (const node of arr) {
      ids.add(node.id)
      if (node.children) walk(node.children)
    }
  }
  walk(nodes)
  return ids
}

function snapshotFromTree(
  tree: chrome.bookmarks.BookmarkTreeNode[],
  name: string,
  createdAt: number,
): Snapshot {
  return {
    name,
    created_at: createdAt,
    bookmark_count: countBookmarks(tree),
    data: gzip(JSON.stringify(tree)),
  }
}

function trimToMax(snapshots: Snapshots): Snapshots {
  return [...snapshots].sort((a, b) => a.created_at - b.created_at).slice(-MAX_SNAPSHOTS)
}

/**
 * 创建（或覆盖当天）快照；保留最近 MAX_SNAPSHOTS 份。
 */
export async function createSnapshot(): Promise<Snapshot> {
  const tree = await getBookmarkTree()
  const snap = snapshotFromTree(tree, todayName(), Date.now())
  const existing = await getSnapshots()
  const without = existing.filter((s) => s.name !== snap.name)
  await setSnapshots(trimToMax([...without, snap]))
  return snap
}

export async function listSnapshots(): Promise<Snapshot[]> {
  const snapshots = await getSnapshots()
  return [...snapshots].sort((a, b) => b.created_at - a.created_at)
}

export async function deleteSnapshot(name: string): Promise<void> {
  const snapshots = await getSnapshots()
  await setSnapshots(snapshots.filter((s) => s.name !== name))
}

interface RestoreResult {
  ok: boolean
  error?: string
}

/**
 * 恢复快照。失败时回滚到恢复前的状态。
 * - 恢复前备份当前书签树
 * - 删除当前所有非 root 节点
 * - 按快照重建
 * - 清理已不存在的 visit_counts
 * - 失败：用备份回滚
 */
export async function restoreSnapshot(name: string): Promise<RestoreResult> {
  const snapshots = await getSnapshots()
  const target = snapshots.find((s) => s.name === name)
  if (!target) return { ok: false, error: '快照不存在' }

  const backupTree = await getBookmarkTree()
  let targetTree: chrome.bookmarks.BookmarkTreeNode[]
  try {
    targetTree = JSON.parse(gunzip(target.data))
  } catch {
    return { ok: false, error: '快照数据已损坏' }
  }

  try {
    await replaceBookmarks(backupTree, targetTree)
    await cleanupOrphanVisits(targetTree)
    return { ok: true }
  } catch (e) {
    try {
      const currentTree = await getBookmarkTree()
      await replaceBookmarks(currentTree, backupTree)
    } catch {
      // 实在回滚不了，告知用户当前树可能不完整
    }
    return { ok: false, error: e instanceof Error ? e.message : '恢复失败' }
  }
}

async function replaceBookmarks(
  current: chrome.bookmarks.BookmarkTreeNode[],
  target: chrome.bookmarks.BookmarkTreeNode[],
): Promise<void> {
  await deleteNonRoot(current)
  await rebuildRootContainers(target)
}

async function deleteNonRoot(nodes: chrome.bookmarks.BookmarkTreeNode[]): Promise<void> {
  for (const node of nodes) {
    if (!ROOT_IDS.has(node.id)) {
      await new Promise<void>((resolve, reject) => {
        chrome.bookmarks.remove(node.id, () => {
          const err = chrome.runtime.lastError
          if (err) reject(new Error(err.message))
          else resolve()
        })
      })
    } else if (node.children) {
      await deleteNonRoot(node.children)
    }
  }
}

async function rebuildRootContainers(nodes: chrome.bookmarks.BookmarkTreeNode[]): Promise<void> {
  for (const node of nodes) {
    if (ROOT_IDS.has(node.id) && node.children) {
      await rebuildInto(node.children, node.id)
    }
  }
}

async function rebuildInto(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  parentId: string,
): Promise<void> {
  for (const node of nodes) {
    if (node.children) {
      const created = await new Promise<chrome.bookmarks.BookmarkTreeNode>((resolve, reject) => {
        chrome.bookmarks.create({ parentId, title: node.title }, (res) => {
          const err = chrome.runtime.lastError
          if (err) reject(new Error(err.message))
          else resolve(res)
        })
      })
      await rebuildInto(node.children, created.id)
    } else if (node.url) {
      await new Promise<void>((resolve, reject) => {
        chrome.bookmarks.create(
          { parentId, title: node.title, url: node.url },
          () => {
            const err = chrome.runtime.lastError
            if (err) reject(new Error(err.message))
            else resolve()
          },
        )
      })
    }
  }
}

async function cleanupOrphanVisits(tree: chrome.bookmarks.BookmarkTreeNode[]): Promise<void> {
  const ids = collectAllIds(tree)
  const counts = await getVisitCounts()
  const next: typeof counts = {}
  let changed = false
  for (const [id, vc] of Object.entries(counts)) {
    if (ids.has(id)) {
      next[id] = vc
    } else {
      changed = true
    }
  }
  if (changed) await setVisitCounts(next)
}

export const __testing = {
  pad2,
  todayName,
  countBookmarks,
  collectAllIds,
  snapshotFromTree,
  trimToMax,
}
