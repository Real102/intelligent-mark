import { describe, expect, it } from 'vitest'
import { getRecommendations, searchBookmarks } from './searcher'
import type { VisitCounts } from '@/types'

const vc = (counts: Record<string, number>): VisitCounts => {
  const result: VisitCounts = {}
  for (const [id, count] of Object.entries(counts)) {
    result[id] = { count, url_match_key: `${id}.com`, last_visit: 0 }
  }
  return result
}

const buildTree = (children: chrome.bookmarks.BookmarkTreeNode[]): chrome.bookmarks.BookmarkTreeNode[] => [
  {
    id: '1',
    title: '书签栏',
    children,
  },
  {
    id: '2',
    title: '其他书签',
    children: [
      { id: 'x', title: 'X', parentId: '2', url: 'https://x.com' },
    ],
  },
]

describe('searchBookmarks', () => {
  it('空 query 返回空', () => {
    const tree = buildTree([{ id: 'a', title: 'A', parentId: '1', url: 'https://a.com' }])
    expect(searchBookmarks('', tree, {})).toEqual([])
    expect(searchBookmarks('   ', tree, {})).toEqual([])
  })

  it('title 全匹配得分 1.0', () => {
    const tree = buildTree([{ id: 'a', title: 'GitHub', parentId: '1', url: 'https://github.com' }])
    const r = searchBookmarks('GitHub', tree, {})
    expect(r).toHaveLength(1)
    expect(r[0].score).toBe(1.0)
  })

  it('title 部分匹配得分 0.5', () => {
    const tree = buildTree([{ id: 'a', title: 'GitHub Homepage', parentId: '1', url: 'https://github.com' }])
    const r = searchBookmarks('home', tree, {})
    expect(r).toHaveLength(1)
    expect(r[0].score).toBe(0.5)
  })

  it('URL 匹配得分 0.3', () => {
    const tree = buildTree([{ id: 'a', title: 'Foo', parentId: '1', url: 'https://github.com/user/repo' }])
    const r = searchBookmarks('github', tree, {})
    expect(r).toHaveLength(1)
    expect(r[0].score).toBe(0.3)
  })

  it('大小写不敏感', () => {
    const tree = buildTree([{ id: 'a', title: 'GitHub', parentId: '1', url: 'https://github.com' }])
    const r = searchBookmarks('github', tree, {})
    expect(r).toHaveLength(1)
    expect(r[0].score).toBe(1.0)
  })

  it('跳过文件夹', () => {
    const tree = buildTree([
      { id: '5', title: 'GitHub Folder', children: [] },
      { id: 'a', title: 'GitHub', parentId: '1', url: 'https://github.com' },
    ])
    const r = searchBookmarks('github', tree, {})
    expect(r).toHaveLength(1)
    expect(r[0].id).toBe('a')
  })

  it('排除"其他书签"子树', () => {
    const tree = buildTree([{ id: 'a', title: 'GitHub', parentId: '1', url: 'https://github.com' }])
    const r = searchBookmarks('x', tree, {})
    expect(r).toEqual([])
  })

  it('按 score 降序', () => {
    const tree = buildTree([
      { id: 'a', title: 'Foo', parentId: '1', url: 'https://github.com' },
      { id: 'b', title: 'github', parentId: '1', url: 'https://example.com' },
    ])
    const r = searchBookmarks('github', tree, {})
    expect(r[0].id).toBe('b') // title 全匹配 1.0
    expect(r[1].id).toBe('a') // URL 匹配 0.3
  })

  it('同 score 按 count 降序', () => {
    const tree = buildTree([
      { id: 'a', title: 'GitHub A', parentId: '1', url: 'https://a.com' },
      { id: 'b', title: 'GitHub B', parentId: '1', url: 'https://b.com' },
    ])
    const r = searchBookmarks('github', tree, vc({ a: 5, b: 20 }))
    expect(r[0].id).toBe('b')
    expect(r[1].id).toBe('a')
  })

  it('最多返回 5 条', () => {
    const tree = buildTree(
      Array.from({ length: 8 }, (_, i) => ({
        id: `n${i}`,
        title: `GitHub ${i}`,
        parentId: '1',
        url: `https://example.com/${i}`,
      })),
    )
    const r = searchBookmarks('github', tree, {})
    expect(r).toHaveLength(5)
  })

  it('不匹配返回空', () => {
    const tree = buildTree([{ id: 'a', title: 'GitHub', parentId: '1', url: 'https://github.com' }])
    expect(searchBookmarks('notfound', tree, {})).toEqual([])
  })
})

describe('getRecommendations', () => {
  it('count=0 的书签不出现', () => {
    const tree = buildTree([{ id: 'a', title: 'A', parentId: '1', url: 'https://a.com' }])
    const r = getRecommendations(tree, vc({ a: 0 }))
    expect(r).toEqual([])
  })

  it('按 count 降序', () => {
    const tree = buildTree([
      { id: 'a', title: 'A', parentId: '1', url: 'https://a.com' },
      { id: 'b', title: 'B', parentId: '1', url: 'https://b.com' },
      { id: 'c', title: 'C', parentId: '1', url: 'https://c.com' },
    ])
    const r = getRecommendations(tree, vc({ a: 5, b: 20, c: 10 }))
    expect(r.map((x) => x.id)).toEqual(['b', 'c', 'a'])
  })

  it('默认返回 3 条', () => {
    const tree = buildTree(
      Array.from({ length: 5 }, (_, i) => ({
        id: `n${i}`,
        title: `N${i}`,
        parentId: '1',
        url: `https://example.com/${i}`,
      })),
    )
    const counts = Object.fromEntries(
      Array.from({ length: 5 }, (_, i) => [`n${i}`, i + 1]),
    )
    const r = getRecommendations(tree, vc(counts))
    expect(r).toHaveLength(3)
  })

  it('排除"其他书签"子树', () => {
    const tree = buildTree([{ id: 'a', title: 'A', parentId: '1', url: 'https://a.com' }])
    const r = getRecommendations(tree, vc({ a: 5, x: 100 }))
    expect(r.map((x) => x.id)).toEqual(['a'])
  })

  it('排除文件夹', () => {
    const tree = buildTree([
      { id: '5', title: 'Folder', children: [] },
      { id: 'a', title: 'A', parentId: '1', url: 'https://a.com' },
    ])
    const r = getRecommendations(tree, vc({ a: 5 }))
    expect(r.map((x) => x.id)).toEqual(['a'])
  })
})
