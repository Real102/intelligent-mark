import { describe, expect, it } from 'vitest'
import { getBookmarkPath, getUrlMatchKey, normalizeUrl } from './bookmarks'

describe('normalizeUrl', () => {
  it('小写化', () => {
    expect(normalizeUrl('https://GitHub.com/User')).toBe('github.com/user')
  })

  it('去掉 https:// 前缀', () => {
    expect(normalizeUrl('https://example.com')).toBe('example.com')
  })

  it('去掉 http:// 前缀', () => {
    expect(normalizeUrl('http://example.com')).toBe('example.com')
  })

  it('去掉尾部斜杠', () => {
    expect(normalizeUrl('https://example.com/')).toBe('example.com')
  })

  it('保留路径中的斜杠', () => {
    expect(normalizeUrl('https://example.com/path/to/page')).toBe('example.com/path/to/page')
  })

  it('路径尾部斜杠也被去掉', () => {
    expect(normalizeUrl('https://example.com/path/')).toBe('example.com/path')
  })

  it('混合大小写 + http + 尾斜杠', () => {
    expect(normalizeUrl('HTTP://Example.COM/Path/')).toBe('example.com/path')
  })
})

describe('getUrlMatchKey', () => {
  it('域名 + 路径', () => {
    expect(getUrlMatchKey('https://github.com/user/repo')).toBe('github.com/user/repo')
  })

  it('去掉尾斜杠', () => {
    expect(getUrlMatchKey('https://github.com/user/repo/')).toBe('github.com/user/repo')
  })

  it('只有域名', () => {
    expect(getUrlMatchKey('https://example.com/')).toBe('example.com')
  })

  it('忽略 query 和 hash', () => {
    expect(getUrlMatchKey('https://example.com/path?query=1#hash')).toBe('example.com/path')
  })

  it('非法 URL 回退到 normalizeUrl', () => {
    expect(getUrlMatchKey('not a url')).toBe('not a url')
  })

  it('端口号保留', () => {
    expect(getUrlMatchKey('http://localhost:3000/api/users')).toBe('localhost:3000/api/users')
  })
})

describe('getBookmarkPath', () => {
  it('一层嵌套返回顶层文件夹名', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      {
        id: '1',
        title: '书签栏',
        children: [{ id: 'a', title: 'A', parentId: '1', url: 'https://a.com' }],
      },
    ]
    expect(getBookmarkPath('a', tree)).toBe('书签栏')
  })

  it('多层嵌套用 " / " 拼接', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      {
        id: '1',
        title: '书签栏',
        children: [
          {
            id: '2',
            title: '开发工具',
            parentId: '1',
            children: [
              { id: 'a', title: 'React', parentId: '2', url: 'https://react.dev' },
            ],
          },
        ],
      },
    ]
    expect(getBookmarkPath('a', tree)).toBe('书签栏 / 开发工具')
  })

  it('跳过根节点 "0"', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      {
        id: '0',
        title: '',
        children: [
          {
            id: '1',
            title: '书签栏',
            children: [{ id: 'a', title: 'A', parentId: '1', url: 'https://a.com' }],
          },
        ],
      },
    ]
    expect(getBookmarkPath('a', tree)).toBe('书签栏')
  })

  it('找不到节点返回空串', () => {
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      { id: '1', title: '书签栏', children: [] },
    ]
    expect(getBookmarkPath('nope', tree)).toBe('')
  })

  it('parentId 形成环时不无限循环', () => {
    // 手动构造一个 A↔B 互指的畸形树
    const tree: chrome.bookmarks.BookmarkTreeNode[] = [
      { id: 'A', title: 'TA', parentId: 'B', url: 'https://a.com' },
      { id: 'B', title: 'TB', parentId: 'A', url: 'https://b.com' },
    ]
    // 关键断言：函数不死循环、能在合理时间返回
    const start = Date.now()
    const result = getBookmarkPath('A', tree)
    expect(Date.now() - start).toBeLessThan(100)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
