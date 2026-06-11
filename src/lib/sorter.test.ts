import { describe, expect, it } from 'vitest'
import { sortBookmarks } from './sorter'
import type { VisitCounts } from '@/types'

const vc = (counts: Record<string, number>): VisitCounts => {
  const result: VisitCounts = {}
  for (const [id, count] of Object.entries(counts)) {
    result[id] = { count, url_match_key: `${id}.com`, last_visit: 0 }
  }
  return result
}

const build = (
  children: chrome.bookmarks.BookmarkTreeNode[],
): chrome.bookmarks.BookmarkTreeNode => ({
  id: 'root',
  title: 'root',
  children,
})

describe('sortBookmarks', () => {
  it('空树返回空树', () => {
    expect(sortBookmarks([], {})).toEqual([])
  })

  it('排除"其他书签"内部不排序', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      {
        id: '1',
        title: '书签栏',
        children: [
          { id: 'a', title: 'A', parentId: '1', url: 'https://a.com' },
          { id: 'b', title: 'B', parentId: '1', url: 'https://b.com' },
        ],
      },
      {
        id: '2',
        title: '其他书签',
        children: [
          { id: 'c', title: 'C', parentId: '2', url: 'https://c.com' },
          { id: 'd', title: 'D', parentId: '2', url: 'https://d.com' },
        ],
      },
    ]
    const result = sortBookmarks(tree, vc({ d: 100, b: 50 }))
    // 书签栏下根级书签保原序
    expect(result[0].children?.[0].id).toBe('a')
    expect(result[0].children?.[1].id).toBe('b')
    // "其他书签"内部保原序
    expect(result[1].children?.[0].id).toBe('c')
    expect(result[1].children?.[1].id).toBe('d')
  })

  it('书签栏内部不排序', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      {
        id: '1',
        title: '书签栏',
        children: [
          { id: 'a', title: 'A', parentId: '1', url: 'https://a.com' },
          { id: 'b', title: 'B', parentId: '1', url: 'https://b.com' },
        ],
      },
    ]
    const result = sortBookmarks(tree, vc({ b: 100 }))
    // 书签栏内部不排序
    expect(result[0].children?.[0].id).toBe('a')
    expect(result[0].children?.[1].id).toBe('b')
  })

  it('文件在前、书签在后', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      build([
        { id: '5', title: 'Folder', children: [{ id: 'b', title: 'B', parentId: '5', url: 'https://b.com' }] },
        { id: 'a', title: 'A', parentId: 'root', url: 'https://a.com' },
      ]),
    ]
    const result = sortBookmarks(tree, vc({ a: 100 }))
    expect(result[0].children?.[0].id).toBe('5')
    expect(result[0].children?.[1].id).toBe('a')
  })

  it('未访问书签保持原顺序', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      build([
        { id: 'a', title: 'A', parentId: 'root', url: 'https://a.com' },
        { id: 'b', title: 'B', parentId: 'root', url: 'https://b.com' },
        { id: 'c', title: 'C', parentId: 'root', url: 'https://c.com' },
      ]),
    ]
    const result = sortBookmarks(tree, vc({}))
    const ch = result[0].children
    expect(ch?.[0].id).toBe('a')
    expect(ch?.[1].id).toBe('b')
    expect(ch?.[2].id).toBe('c')
  })

  it('已访问按 count 降序', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      build([
        { id: 'a', title: 'A', parentId: 'root', url: 'https://a.com' },
        { id: 'b', title: 'B', parentId: 'root', url: 'https://b.com' },
        { id: 'c', title: 'C', parentId: 'root', url: 'https://c.com' },
      ]),
    ]
    const result = sortBookmarks(tree, vc({ a: 5, b: 20, c: 10 }))
    const ch = result[0].children
    expect(ch?.[0].id).toBe('b')
    expect(ch?.[1].id).toBe('c')
    expect(ch?.[2].id).toBe('a')
  })

  it('混合：文件夹 + 已访问 + 未访问', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      build([
        { id: 'a', title: 'A', parentId: 'root', url: 'https://a.com' },
        { id: 'b', title: 'B', parentId: 'root', url: 'https://b.com' },
        { id: '5', title: 'Folder', children: [{ id: 'c', title: 'C', parentId: '5', url: 'https://c.com' }] },
      ]),
    ]
    const result = sortBookmarks(tree, vc({ b: 100 }))
    const ch = result[0].children
    expect(ch?.[0].id).toBe('5') // folder
    expect(ch?.[1].id).toBe('b') // visited
    expect(ch?.[2].id).toBe('a') // unvisited (原序)
  })

  it('同 count 保原顺序（稳定排序）', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      build([
        { id: 'a', title: 'A', parentId: 'root', url: 'https://a.com' },
        { id: 'b', title: 'B', parentId: 'root', url: 'https://b.com' },
      ]),
    ]
    const result = sortBookmarks(tree, vc({ a: 5, b: 5 }))
    expect(result[0].children?.[0].id).toBe('a')
    expect(result[0].children?.[1].id).toBe('b')
  })

  it('深拷贝不修改原树', () => {
    const original: chrome.bookmarks.BookmarkTreeNode[] = [
      build([
        { id: 'a', title: 'A', parentId: 'root', url: 'https://a.com' },
        { id: 'b', title: 'B', parentId: 'root', url: 'https://b.com' },
      ]),
    ]
    const originalJson = JSON.stringify(original)
    sortBookmarks(original, vc({ b: 100 }))
    expect(JSON.stringify(original)).toBe(originalJson)
  })
})
