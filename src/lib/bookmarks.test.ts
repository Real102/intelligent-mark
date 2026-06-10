import { describe, expect, it } from 'vitest'
import { getUrlMatchKey, normalizeUrl } from './bookmarks'

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
