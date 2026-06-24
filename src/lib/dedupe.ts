import { isOtherBookmarks } from './filter'

export type DuplicateType = 'url' | 'similar'

export interface DuplicateEntry {
  id: string
  title: string
  url: string
  path: string
}

export interface DuplicateGroup {
  type: DuplicateType
  entries: DuplicateEntry[]
}

const MIN_SUBSTRING_LEN = 3
const MIN_SUBSTRING_FRACTION = 0.7

function normalizeUrl(url: string): string {
  return url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
}

/**
 * 域名 + 一级路径前缀（PRD 重复检测算法说明 line 58-62）
 * - https://github.com             → "github.com/"
 * - https://github.com/            → "github.com/"
 * - https://github.com/user-a/repo → "github.com/user-a"
 *
 * 不去尾斜杠，否则 "github.com" 和 "github.com/user-a" 在无 path 边界上
 * 行为不对称。带不带尾斜杠的同 URL 必须映射到同一 key。
 */
function extractDomainWithPrefix(url: string): string {
  const parts = url.replace(/^https?:\/\//, '').split('/')
  return parts[0] + '/' + (parts[1] || '')
}

/**
 * 同组内两 title 的最长公共子串（连续片段）长度。
 * 复杂度 O(n*m)，n 和 m 都很小（title 长度），可接受。
 */
function longestCommonSubstring(a: string, b: string): number {
  const la = a.length
  const lb = b.length
  if (la === 0 || lb === 0) return 0
  let max = 0
  let prev = new Uint32Array(lb + 1)
  let curr = new Uint32Array(lb + 1)
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : 0
      if (curr[j] > max) max = curr[j]
    }
    const tmp = prev
    prev = curr
    curr = tmp
    curr.fill(0)
  }
  return max
}

const SPLIT_PATTERN = /\s+[\-—–]\s+|\s*[|:·]\s*/

export function splitTitle(title: string): string[] {
  return title
    .split(SPLIT_PATTERN)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

const FREQUENT_SEGMENT_THRESHOLD = 3

/**
 * 同 firstPath 组内做 title 清洗：
 * 1. 拆段（按 |、前后空格的 -/—/–、:、·）
 * 2. 统计每段出现次数
 * 3. 出现 ≥ 3 次的段视为"高频段"（网站名/通用后缀），剔除
 * 4. 剩下的段 join 成"清洗后 title"用于相似比较
 *
 * 设计要点：
 * - 不依赖品牌词白名单，自适应用户书签内容
 * - 组内样本 < 3 条不洗（识别不了"高频"）
 * - 单段 title（无分隔符）不拆，自然不会进高频集合
 * - 全段被剔除时回退原 title，避免空串误判
 *
 * 返回 Map<entryId, cleanedTitle>，调用方用 cleaned ?? entry.title。
 */
function cleanTitlesInGroup(entries: DuplicateEntry[]): Map<string, string> {
  const cleaned = new Map<string, string>()
  if (entries.length < FREQUENT_SEGMENT_THRESHOLD) return cleaned

  const segmentsByEntry = new Map<string, string[]>()
  const segmentCounts = new Map<string, number>()
  for (const e of entries) {
    const segs = splitTitle(e.title)
    segmentsByEntry.set(e.id, segs)
    for (const s of segs) {
      segmentCounts.set(s, (segmentCounts.get(s) ?? 0) + 1)
    }
  }

  const frequent = new Set<string>()
  for (const [seg, count] of segmentCounts) {
    if (count >= FREQUENT_SEGMENT_THRESHOLD) frequent.add(seg)
  }
  if (frequent.size === 0) return cleaned

  for (const e of entries) {
    const segs = segmentsByEntry.get(e.id) ?? []
    const kept = segs.filter((s) => !frequent.has(s))
    cleaned.set(e.id, kept.length > 0 ? kept.join(' ') : e.title)
  }
  return cleaned
}

function collectEntries(
  node: chrome.bookmarks.BookmarkTreeNode,
  parentPath: string[],
  out: DuplicateEntry[],
): void {
  if (isOtherBookmarks(node)) return
  const path = parentPath.length === 0 && node.title === '' ? parentPath : [...parentPath, node.title]
  if (node.url) {
    out.push({
      id: node.id,
      title: node.title,
      url: node.url,
      path: path.join(' / '),
    })
  }
  if (node.children) {
    for (const c of node.children) {
      collectEntries(c, path, out)
    }
  }
}

/**
 * 并查集：合并 title 相似的条目。
 * 仅用于同一域名+一级路径组内的条目。
 */
function clusterByTitleSimilarity(entries: DuplicateEntry[]): DuplicateEntry[][] {
  const parent = entries.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const union = (i: number, j: number): void => {
    parent[find(i)] = find(j)
  }

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i].title
      const b = entries[j].title
      const common = longestCommonSubstring(a, b)
      if (common < MIN_SUBSTRING_LEN) continue
      const minLen = Math.min(a.length, b.length)
      if (common / minLen < MIN_SUBSTRING_FRACTION) continue
      union(i, j)
    }
  }

  const clusters = new Map<number, DuplicateEntry[]>()
  for (let i = 0; i < entries.length; i++) {
    const r = find(i)
    const arr = clusters.get(r) ?? []
    arr.push(entries[i])
    clusters.set(r, arr)
  }
  return [...clusters.values()]
}

/**
 * 三层重复检测：
 * 1. URL 标准化分组：完全相同（含末尾斜杠差异、协议、大小写）→ URL 重复
 * 2. 域名+一级路径分组：作为第三层 title 比较的范围
 * 3. 同组内 title 最长公共子串 ≥ 3 → 疑似重复
 *    同组 ≥ 3 条时，先做"title 清洗"：组内出现 ≥ 3 次的段视为网站名/通用后缀剔除
 *    覆盖"xxx | 微信开放社区"批量收藏、docs.qq.com 大量文档等场景
 *
 * 排除"其他书签"整个子树。
 * 域名相同但一级路径不同，或一级路径相同但 title 无公共子串 → 不展示。
 */
export function detectDuplicates(
  tree: chrome.bookmarks.BookmarkTreeNode[],
): DuplicateGroup[] {
  const all: DuplicateEntry[] = []
  for (const node of tree) {
    collectEntries(node, [], all)
  }

  const normalizedGroups = new Map<string, DuplicateEntry[]>()
  for (const entry of all) {
    const key = normalizeUrl(entry.url)
    const arr = normalizedGroups.get(key) ?? []
    arr.push(entry)
    normalizedGroups.set(key, arr)
  }
  const urlGroupEntryIds = new Set<string>()
  const urlGroups: DuplicateGroup[] = []
  for (const arr of normalizedGroups.values()) {
    if (arr.length < 2) continue
    urlGroups.push({ type: 'url', entries: arr })
    for (const e of arr) urlGroupEntryIds.add(e.id)
  }

  const prefixGroups = new Map<string, DuplicateEntry[]>()
  for (const entry of all) {
    if (urlGroupEntryIds.has(entry.id)) continue
    const key = extractDomainWithPrefix(entry.url)
    const arr = prefixGroups.get(key) ?? []
    arr.push(entry)
    prefixGroups.set(key, arr)
  }

  const similarGroups: DuplicateGroup[] = []
  for (const arr of prefixGroups.values()) {
    if (arr.length < 2) continue
    const cleaned = cleanTitlesInGroup(arr)
    const arrWithCleanedTitle = cleaned.size === 0
      ? arr
      : arr.map((e) => ({ ...e, title: cleaned.get(e.id) ?? e.title }))
    for (const cluster of clusterByTitleSimilarity(arrWithCleanedTitle)) {
      if (cluster.length >= 2) {
        similarGroups.push({ type: 'similar', entries: cluster })
      }
    }
  }

  return [...urlGroups, ...similarGroups]
}
