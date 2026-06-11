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

const MIN_SUBSTRING_LEN = 2

function normalizeUrl(url: string): string {
  return url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function extractHost(url: string): string {
  const stripped = url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const slashIdx = stripped.indexOf('/')
  return slashIdx === -1 ? stripped : stripped.slice(0, slashIdx)
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
      if (
        longestCommonSubstring(entries[i].title, entries[j].title) >= MIN_SUBSTRING_LEN
      ) {
        union(i, j)
      }
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
 * 3. 同组内 title 最长公共子串 ≥ 2 → 疑似重复
 *
 * 排除"其他书签"整个子树。
 * 仅域名相同但 title 无公共子串 → 不展示。
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
    const key = extractHost(entry.url)
    const arr = prefixGroups.get(key) ?? []
    arr.push(entry)
    prefixGroups.set(key, arr)
  }

  const similarGroups: DuplicateGroup[] = []
  for (const arr of prefixGroups.values()) {
    if (arr.length < 2) continue
    for (const cluster of clusterByTitleSimilarity(arr)) {
      if (cluster.length >= 2) {
        similarGroups.push({ type: 'similar', entries: cluster })
      }
    }
  }

  return [...urlGroups, ...similarGroups]
}
