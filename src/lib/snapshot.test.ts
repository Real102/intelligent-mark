import { describe, expect, it } from 'vitest'
import { gzip, gunzip } from './pako'
import { __testing } from './snapshot'

const {
  pad2,
  todayName,
  countBookmarks,
  collectAllIds,
  snapshotFromTree,
  trimToMax,
} = __testing

const buildTree = (
  children: chrome.bookmarks.BookmarkTreeNode[],
): chrome.bookmarks.BookmarkTreeNode[] => [
  { id: '1', title: '书签栏', children },
  { id: '2', title: '其他书签', children: [] },
]

describe('snapshot utils', () => {
  it('pad2 补零', () => {
    expect(pad2(3)).toBe('03')
    expect(pad2(10)).toBe('10')
  })

  it('todayName 格式 快照_YYYY-MM-DD', () => {
    const d = new Date(2026, 4, 8) // 月份 0-indexed → 5月
    expect(todayName(d)).toBe('快照_2026-05-08')
  })

  it('countBookmarks 只算有 url 的节点', () => {
    const tree = buildTree([
      { id: '5', title: 'Folder', children: [
        { id: 'a', title: 'A', parentId: '5', url: 'https://a.com' },
        { id: 'b', title: 'B', parentId: '5', url: 'https://b.com' },
      ] },
      { id: 'c', title: 'C', parentId: '1', url: 'https://c.com' },
    ])
    expect(countBookmarks(tree)).toBe(3)
  })

  it('collectAllIds 收集所有节点 id', () => {
    const tree = buildTree([
      { id: '5', title: 'Folder', children: [{ id: 'a', title: 'A', parentId: '5' }] },
      { id: 'c', title: 'C', parentId: '1' },
    ])
    const ids = collectAllIds(tree)
    expect(ids).toEqual(new Set(['1', '2', '5', 'a', 'c']))
  })

  it('snapshotFromTree 序列化 + gzip + 计数正确', () => {
    const tree = buildTree([{ id: 'a', title: 'A', parentId: '1', url: 'https://a.com' }])
    const snap = snapshotFromTree(tree, '快照_2026-05-28', 1748400000000)
    expect(snap.name).toBe('快照_2026-05-28')
    expect(snap.created_at).toBe(1748400000000)
    expect(snap.bookmark_count).toBe(1)
    expect(typeof snap.data).toBe('string')
    // gzip + gunzip round-trip
    const json = gunzip(snap.data)
    expect(JSON.parse(json)).toEqual(tree)
  })

  it('trimToMax 保留最新 MAX_SNAPSHOTS 份（按 created_at）', () => {
    const make = (name: string, t: number) => ({
      name,
      created_at: t,
      bookmark_count: 0,
      data: 'x',
    })
    const arr = [
      make('a', 1),
      make('b', 2),
      make('c', 3),
      make('d', 4),
      make('e', 5),
      make('f', 6),
      make('g', 7),
      make('h', 8),
    ]
    const trimmed = trimToMax(arr)
    expect(trimmed).toHaveLength(7)
    expect(trimmed[0].name).toBe('b')
    expect(trimmed[6].name).toBe('h')
  })
})

describe('gzip round-trip', () => {
  it('snapshot 的 data 字段能解出来', () => {
    const original = JSON.stringify([{ id: '1', children: [{ id: 'a', url: 'https://a.com' }] }])
    const compressed = gzip(original)
    expect(gunzip(compressed)).toBe(original)
  })
})
