/**
 * 智能书签插件 · 类型定义
 *
 * 这是 Phase 1 定下的接口契约，Phase 2-5 都会按此契约实现，不可中途改签名。
 */

export type UrlMatchKey = string

export interface VisitCount {
  count: number
  url_match_key: UrlMatchKey
  last_visit: number
}

export type VisitCounts = Record<string, VisitCount>

export interface Snapshot {
  name: string
  created_at: number
  bookmark_count: number
  data: string
}

export type Snapshots = Snapshot[]

export interface Settings {
  auto_sort: boolean
  auto_snapshot: boolean
}

export interface StorageData {
  visit_counts: VisitCounts
  snapshots: Snapshots
  settings: Settings
}

export interface NormalizedBookmark {
  id: string
  parentId: string
  title: string
  url: string
  url_match_key: UrlMatchKey
  normalized_url: string
  dateAdded: number
}

export interface SnapshotBookmarkPayload {
  bookmarks: chrome.bookmarks.BookmarkTreeNode[]
  visit_counts: VisitCounts
}
