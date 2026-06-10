import { describe, expect, it } from 'vitest'
import { gzip, gunzip } from './pako'

describe('gzip / gunzip', () => {
  it('往返一致（ASCII）', () => {
    const original = 'Hello, world!'
    expect(gunzip(gzip(original))).toBe(original)
  })

  it('往返一致（中文 + 特殊字符）', () => {
    const original = 'Hello, 世界！这是一个测试字符串。'
    expect(gunzip(gzip(original))).toBe(original)
  })

  it('返回 base64 字符串', () => {
    const result = gzip('test')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('空字符串往返', () => {
    const compressed = gzip('')
    expect(typeof compressed).toBe('string')
    expect(gunzip(compressed)).toBe('')
  })

  it('长字符串压缩比应该较小', () => {
    const longText = 'a'.repeat(10000)
    const compressed = gzip(longText)
    expect(compressed.length).toBeLessThan(10000)
  })

  it('JSON 书签数据往返', () => {
    const original = JSON.stringify({
      bookmarks: [
        { id: '1', title: '百度', url: 'https://baidu.com' },
        { id: '2', title: 'GitHub', url: 'https://github.com' },
        { id: '3', title: '知乎', url: 'https://zhihu.com' },
      ],
    })
    expect(gunzip(gzip(original))).toBe(original)
  })
})
