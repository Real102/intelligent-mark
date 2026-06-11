import { describe, expect, it } from 'vitest'
import { detectDuplicates } from './dedupe'

const buildTree = (children: chrome.bookmarks.BookmarkTreeNode[]): chrome.bookmarks.BookmarkTreeNode[] => [
  { id: '1', title: '书签栏', children },
  { id: '2', title: '其他书签', children: [] },
]

describe('detectDuplicates', () => {
  it('空树返回空', () => {
    expect(detectDuplicates(buildTree([]))).toEqual([])
  })

  it('URL 完全相同（含末尾斜杠）→ URL 重复', () => {
    const tree = buildTree([
      { id: '8', title: '重复测试1', parentId: '1', url: 'https://example.com/page' },
      { id: '9', title: '重复测试2', parentId: '1', url: 'https://example.com/page/' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('url')
    expect(r[0].entries.map((e) => e.id).sort()).toEqual(['8', '9'])
  })

  it('URL 大小写 + 协议差异 → URL 重复', () => {
    const tree = buildTree([
      { id: 'a', title: 'A', parentId: '1', url: 'https://Example.com/Page' },
      { id: 'b', title: 'B', parentId: '1', url: 'HTTP://example.com/page' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('url')
  })

  it('同域名+一级路径 + title 含相同子串 → 疑似重复', () => {
    const tree = buildTree([
      { id: 'n1', title: 'GitHub', parentId: '1', url: 'https://github.com' },
      { id: 'n3', title: 'GitHub 项目', parentId: '1', url: 'https://github.com/user-a/project-x' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('similar')
    expect(r[0].entries.map((e) => e.id).sort()).toEqual(['n1', 'n3'])
  })

  it('多对疑似重复聚为一组', () => {
    const tree = buildTree([
      { id: 'n1', title: 'GitHub', parentId: '1', url: 'https://github.com' },
      { id: 'n2', title: '我的 GitHub', parentId: '1', url: 'https://github.com/user-a' },
      { id: 'n3', title: 'GitHub 项目', parentId: '1', url: 'https://github.com/user-a/project-x' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('similar')
    expect(r[0].entries).toHaveLength(3)
  })

  it('仅域名相同但 title 无公共子串 → 不展示', () => {
    const tree = buildTree([
      { id: 'a', title: 'apple', parentId: '1', url: 'https://google.com/x' },
      { id: 'b', title: 'banana', parentId: '1', url: 'https://google.com/y' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toEqual([])
  })

  it('排除"其他书签"子树', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      {
        id: '1',
        title: '书签栏',
        children: [{ id: 'a', title: 'A', parentId: '1', url: 'https://example.com/page' }],
      },
      {
        id: '2',
        title: '其他书签',
        children: [
          { id: 'b', title: 'B', parentId: '2', url: 'https://example.com/page/' },
          { id: 'c', title: 'C', parentId: '2', url: 'https://example.com/page' },
        ],
      },
    ]
    const r = detectDuplicates(tree)
    expect(r).toEqual([])
  })

  it('同时有 URL 重复和疑似重复', () => {
    const tree = buildTree([
      { id: '8', title: 'page1', parentId: '1', url: 'https://example.com/page' },
      { id: '9', title: 'page2', parentId: '1', url: 'https://example.com/page/' },
      { id: 'a', title: 'GitHub', parentId: '1', url: 'https://github.com' },
      { id: 'b', title: '我的 GitHub', parentId: '1', url: 'https://github.com/user-a' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toHaveLength(2)
    const types = r.map((g) => g.type).sort()
    expect(types).toEqual(['similar', 'url'])
  })

  it('Chrome 根节点空 title 不出现在 path 中', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      { id: '0', title: '', children: [
        { id: '1', title: '书签栏', children: [
          { id: '5', title: '收藏夹', children: [
            { id: '8', title: 'p1', parentId: '5', url: 'https://example.com/page' },
            { id: '9', title: 'p2', parentId: '5', url: 'https://example.com/page/' },
          ] },
        ] },
      ] },
    ]
    const r = detectDuplicates(tree)
    expect(r[0].entries.map((e) => e.path).sort()).toEqual([
      '书签栏 / 收藏夹 / p1',
      '书签栏 / 收藏夹 / p2',
    ])
  })

  it('path 正确反映完整路径', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      {
        id: '1',
        title: '书签栏',
        children: [
          { id: '5', title: '收藏夹', children: [
            { id: '8', title: 'p1', parentId: '5', url: 'https://example.com/page' },
            { id: '9', title: 'p2', parentId: '5', url: 'https://example.com/page/' },
          ] },
        ],
      },
    ]
    const r = detectDuplicates(tree)
    expect(r).toHaveLength(1)
    expect(r[0].entries.map((e) => e.path).sort()).toEqual([
      '书签栏 / 收藏夹 / p1',
      '书签栏 / 收藏夹 / p2',
    ])
  })

  it('文件夹内 URL 重复也算', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      {
        id: '1',
        title: '书签栏',
        children: [
          { id: '5', title: 'F', children: [
            { id: '8', title: 'p1', parentId: '5', url: 'https://example.com/page' },
          ] },
          { id: '9', title: 'p2', parentId: '1', url: 'https://example.com/page/' },
        ],
      },
    ]
    const r = detectDuplicates(tree)
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('url')
  })

  it('同 host 不同 path + title 含公共子串 → 疑似重复', () => {
    // 算法说明表格示例：github.com / github.com/user-a 同 host 一组
    const tree = buildTree([
      { id: 'a', title: 'google search', parentId: '1', url: 'https://google.com/search' },
      { id: 'b', title: 'google maps', parentId: '1', url: 'https://google.com/maps' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('similar')
    expect(r[0].entries.map((e) => e.id).sort()).toEqual(['a', 'b'])
  })

  it('不同 host + title 含公共子串 → 不算重复', () => {
    // google.com vs maps.google.com 是不同 host，不进同一组
    const tree = buildTree([
      { id: '5', title: 'Google', parentId: '1', url: 'https://google.com' },
      { id: '7', title: 'Google Maps', parentId: '1', url: 'https://maps.google.com' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toEqual([])
  })
})
