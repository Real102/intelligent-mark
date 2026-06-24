import { describe, expect, it } from 'vitest'
import { detectDuplicates, splitTitle } from './dedupe'

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

  it('同 host + 同 firstPath + title 含公共子串 → 疑似重复', () => {
    const tree = buildTree([
      { id: 'n1', title: 'GitHub', parentId: '1', url: 'https://github.com/user-a' },
      { id: 'n3', title: 'GitHub 项目', parentId: '1', url: 'https://github.com/user-a/project-x' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('similar')
    expect(r[0].entries.map((e) => e.id).sort()).toEqual(['n1', 'n3'])
  })

  it('多对疑似重复聚为一组', () => {
    const tree = buildTree([
      { id: 'n1', title: 'GitHub', parentId: '1', url: 'https://github.com/user-a' },
      { id: 'n2', title: '我的 GitHub', parentId: '1', url: 'https://github.com/user-a/repo-2' },
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
      { id: 'a', title: 'GitHub', parentId: '1', url: 'https://github.com/user-a' },
      { id: 'b', title: '我的 GitHub', parentId: '1', url: 'https://github.com/user-a/repo' },
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

  it('同 firstPath + title 含公共子串 → 疑似重复', () => {
    const tree = buildTree([
      { id: 'a', title: 'google search', parentId: '1', url: 'https://google.com/search' },
      { id: 'b', title: 'google search more', parentId: '1', url: 'https://google.com/search/maps' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('similar')
    expect(r[0].entries.map((e) => e.id).sort()).toEqual(['a', 'b'])
  })

  it('同 host 不同 firstPath + title 含公共子串 → 不算相似', () => {
    // host 相同但一级路径不同 → 不进同一组，避免 github.com/* 大杂烩
    const tree = buildTree([
      { id: 'a', title: 'GitHub', parentId: '1', url: 'https://github.com/user-a' },
      { id: 'b', title: 'GitHub 项目', parentId: '1', url: 'https://github.com/user-b/project-x' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toEqual([])
  })

  it('host + 同 firstPath 但 title 公共子串 < 3 → 不算相似', () => {
    // MIN_SUBSTRING_LEN 提到 3 后，"JS" vs "JS 教程" 公共子串 "JS" 长度 2，不再误判
    const tree = buildTree([
      { id: 'a', title: 'JS', parentId: '1', url: 'https://example.com/search' },
      { id: 'b', title: 'JS 教程', parentId: '1', url: 'https://example.com/search/page' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toEqual([])
  })

  it('同 firstPath 3+ 条带 " | 微信开放社区" → 高频段剔除，不判相似', () => {
    // 模拟 docs.qq.com 大量收藏：每个文档 title 都带" | 微信开放社区"
    // 拆段后"微信开放社区"出现 3+ 次 → 视为网站名剔除
    // 主标题彼此无公共子串 → 不再误判
    const tree = buildTree([
      { id: 'a', title: '产品需求 v1 | 微信开放社区', parentId: '1', url: 'https://docs.qq.com/sheet/abc' },
      { id: 'b', title: '周会记录 | 微信开放社区', parentId: '1', url: 'https://docs.qq.com/sheet/def' },
      { id: 'c', title: 'OKR 模板 | 微信开放社区', parentId: '1', url: 'https://docs.qq.com/sheet/ghi' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toEqual([])
  })

  it('同 firstPath 2 条带 " | xxx" → 样本不够不洗，且 3 字公共占比不够，也不判相似', () => {
    // 只有 2 条样本，"xxx" 出现 2 次 < 3 → 不视为高频段（不洗）
    // 同时 公共子串 "xxx" 长度 3 / 较短标题 10 字 = 30% < 50% → 也不算疑似
    // 这是"中移项目 docs.qq.com"误判问题的同源 case：
    //   短公共词 + 长标题 → 不应判相似
    const tree = buildTree([
      { id: 'a', title: 'API 文档 | xxx', parentId: '1', url: 'https://example.com/search/page' },
      { id: 'b', title: '登录流程 | xxx', parentId: '1', url: 'https://example.com/search/page2' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toEqual([])
  })

  it('同 firstPath 3+ 条单段 title → 不拆不洗，走原逻辑', () => {
    // title 没分隔符 → splitTitle 返回单段 → 不会形成高频段 → 不洗
    // 主标题公共子串 "产品需求文档" 长度 6 → 判相似
    const tree = buildTree([
      { id: 'a', title: '产品需求文档 v1', parentId: '1', url: 'https://example.com/search/page-a' },
      { id: 'b', title: '产品需求文档 v2', parentId: '1', url: 'https://example.com/search/page-b' },
      { id: 'c', title: '产品需求文档 v3', parentId: '1', url: 'https://example.com/search/page-c' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('similar')
    expect(r[0].entries).toHaveLength(3)
  })

  it('同 firstPath 3+ 条带相同后缀，但主标题有公共子串 → 仍判相似', () => {
    // 清洗掉" | 微信公众号"后，剩下"产品需求"是公共子串 → 仍判相似
    // 这是清洗的预期行为：只去掉通用后缀，剩下真正相似的内容继续判
    const tree = buildTree([
      { id: 'a', title: '产品需求 A | 微信公众号', parentId: '1', url: 'https://example.com/search/page-a' },
      { id: 'b', title: '产品需求 B | 微信公众号', parentId: '1', url: 'https://example.com/search/page-b' },
      { id: 'c', title: '周会记录 | 微信公众号', parentId: '1', url: 'https://example.com/search/page-c' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('similar')
    // a 和 b 在"产品需求"组里（清洗后公共子串"产品需求"长度 4）
    // c 单独（清洗后"周会记录"无公共）
    expect(r[0].entries.map((e) => e.id).sort()).toEqual(['a', 'b'])
  })

  it('docs.qq.com 中移项目实战：短公共词不算疑似', () => {
    // 实战 case：5 条 docs.qq.com/sheet/* 标题里都含"建设室""ODC""人员信息"等 3-4 字短词
    // 之前 LCS ≥ 3 规则误判为疑似；加 MIN_SUBSTRING_FRACTION=0.5 后：
    // 公共子串"人员信息"(4) / 较短标题(14) = 28% < 50% → 不再判相似
    const tree = buildTree([
      { id: 'a', title: '建设室-2023-2024年ODC人员信息', parentId: '1', url: 'https://docs.qq.com/sheet/DUW9wd3dibHROTHFP' },
      { id: 'b', title: 'ODC人员信息表-平台建设室', parentId: '1', url: 'https://docs.qq.com/sheet/DV1ROVFZYQ1VJd1BH' },
      { id: 'c', title: '5G消息业务产品组专利', parentId: '1', url: 'https://docs.qq.com/sheet/DUVpZanpJZHpFcUlh' },
      { id: 'd', title: '需求管理和跟进表格', parentId: '1', url: 'https://docs.qq.com/sheet/DTIRobUdhUkp3YnZt' },
      { id: 'e', title: '平台室周报2026', parentId: '1', url: 'https://docs.qq.com/sheet/DUVVsZHR0enZiZ1hz' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toEqual([])
  })

  it('公共子串 ≥ 3 字但占比 ≥ 50% 仍判相似', () => {
    // 边界 case：占 50% 应该判相似
    const tree = buildTree([
      { id: 'a', title: '需求文档 v1', parentId: '1', url: 'https://example.com/search/page-a' },
      { id: 'b', title: '需求文档 v2', parentId: '1', url: 'https://example.com/search/page-b' },
    ])
    const r = detectDuplicates(tree)
    expect(r).toHaveLength(1)
    expect(r[0].type).toBe('similar')
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

describe('splitTitle', () => {
  it('管道符拆分', () => {
    expect(splitTitle('Vue.js 教程 | 掘金')).toEqual(['Vue.js 教程', '掘金'])
  })

  it('前后空格的短横线拆分（不误拆 Vue.js 里的 .）', () => {
    expect(splitTitle('GitHub - Where the world builds software')).toEqual([
      'GitHub',
      'Where the world builds software',
    ])
    // Vue.js 里的 . 和 j 相邻无空格，不是分隔符
    expect(splitTitle('Vue.js 教程')).toEqual(['Vue.js 教程'])
  })

  it('长破折号 / 短破折号 / 冒号 / 中点', () => {
    expect(splitTitle('a — b')).toEqual(['a', 'b'])
    expect(splitTitle('a – b')).toEqual(['a', 'b'])
    expect(splitTitle('a: b')).toEqual(['a', 'b'])
    expect(splitTitle('a · b')).toEqual(['a', 'b'])
  })

  it('不带空格的 - 不拆', () => {
    expect(splitTitle('a-b')).toEqual(['a-b'])
  })

  it('过滤空段（尾空、多分隔符）', () => {
    expect(splitTitle('xxx | ')).toEqual(['xxx'])
    expect(splitTitle(' | xxx | yyy')).toEqual(['xxx', 'yyy'])
  })

  it('无分隔符单段', () => {
    expect(splitTitle('产品需求文档 v1')).toEqual(['产品需求文档 v1'])
  })

  it('trim 每段', () => {
    expect(splitTitle('  xxx  |  yyy  ')).toEqual(['xxx', 'yyy'])
  })
})
