import { describe, expect, it } from 'vitest'
import { isBookmarksBar, isFolder, isOtherBookmarks, isRootLevel, shouldExcludeFromSearch } from './filter'

const makeNode = (overrides: Partial<chrome.bookmarks.BookmarkTreeNode> = {}): chrome.bookmarks.BookmarkTreeNode => ({
  id: '100',
  title: 'Test',
  ...overrides,
})

describe('isFolder', () => {
  it('无 url 字段则为文件夹', () => {
    expect(isFolder(makeNode())).toBe(true)
  })

  it('有 url 字段则为书签', () => {
    expect(isFolder(makeNode({ url: 'https://example.com' }))).toBe(false)
  })
})

describe('isOtherBookmarks', () => {
  it('id 为 "2" 是其他书签', () => {
    expect(isOtherBookmarks(makeNode({ id: '2' }))).toBe(true)
  })

  it('title 为"其他书签"', () => {
    expect(isOtherBookmarks(makeNode({ title: '其他书签' }))).toBe(true)
  })

  it('title 为"Other bookmarks"', () => {
    expect(isOtherBookmarks(makeNode({ title: 'Other bookmarks' }))).toBe(true)
  })

  it('其他节点不是', () => {
    expect(isOtherBookmarks(makeNode({ id: '1', title: '书签栏' }))).toBe(false)
  })
})

describe('isBookmarksBar', () => {
  it('id 为 "1" 是书签栏', () => {
    expect(isBookmarksBar(makeNode({ id: '1' }))).toBe(true)
  })

  it('title 为"书签栏"', () => {
    expect(isBookmarksBar(makeNode({ title: '书签栏' }))).toBe(true)
  })

  it('title 为"Bookmarks bar"', () => {
    expect(isBookmarksBar(makeNode({ title: 'Bookmarks bar' }))).toBe(true)
  })

  it('id 为 "2" 不是书签栏', () => {
    expect(isBookmarksBar(makeNode({ id: '2' }))).toBe(false)
  })
})

describe('isRootLevel', () => {
  const tree: chrome.bookmarks.BookmarkTreeNode[] = [
    {
      id: '1',
      title: '书签栏',
      children: [
        { id: '100', title: 'RootBookmark', parentId: '1', url: 'https://example.com' },
        {
          id: '10',
          title: 'SubFolder',
          parentId: '1',
          children: [
            { id: '200', title: 'NestedBookmark', parentId: '10', url: 'https://nested.com' },
          ],
        },
      ],
    },
  ]

  it('parentId 是书签栏的 id', () => {
    expect(isRootLevel(makeNode({ id: '100', parentId: '1' }), tree)).toBe(true)
  })

  it('parentId 是子文件夹', () => {
    expect(isRootLevel(makeNode({ id: '200', parentId: '10' }), tree)).toBe(false)
  })

  it('没有 parentId', () => {
    expect(isRootLevel(makeNode({ id: '100' }), tree)).toBe(false)
  })

  it('parent 不存在', () => {
    expect(isRootLevel(makeNode({ id: '300', parentId: '999' }), tree)).toBe(false)
  })
})

describe('shouldExcludeFromSearch', () => {
  it('文件夹排除', () => {
    expect(shouldExcludeFromSearch(makeNode())).toBe(true)
  })

  it('"其他书签"文件夹排除', () => {
    expect(shouldExcludeFromSearch(makeNode({ id: '2' }))).toBe(true)
  })

  it('普通书签不排除', () => {
    expect(shouldExcludeFromSearch(makeNode({ url: 'https://example.com' }))).toBe(false)
  })
})
