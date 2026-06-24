import { useEffect, useRef, useState } from 'react'
import { Search, AlertTriangle, Trash2, Camera, ChevronDown } from 'lucide-react'
import {
  ConfirmDialog,
  Section,
  SnapshotCard,
  SortMethod,
  StorageBanner,
  Switch,
  Toast,
} from '@/components'
import type { ToastMessage } from '@/components'
import { getBookmarkTree } from '@/lib/bookmarks'
import { getBytesInUse, getSettings, setSettings } from '@/lib/storage'
import {
  createSnapshot,
  deleteSnapshot,
  listSnapshots,
  restoreSnapshot,
} from '@/lib/snapshot'
import { detectDuplicates, type DuplicateGroup } from '@/lib/dedupe'
import { isOtherBookmarks } from '@/lib/filter'
import { runSort } from '@/background/handlers/sort'
import type { Settings, Snapshot } from '@/types'

const STORAGE_QUOTA_BYTES = chrome.storage.local.QUOTA_BYTES ?? 10 * 1024 * 1024

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

function relativeDate(t: number): string {
  const day = 24 * 60 * 60 * 1000
  const diff = Date.now() - t
  if (diff < day) return '今天'
  if (diff < 2 * day) return '昨天'
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`
  return new Date(t).toLocaleDateString('zh-CN')
}

function App() {
  const [settings, setSettingsState] = useState<Settings | null>(null)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [bytesInUse, setBytesInUse] = useState(0)
  const [bookmarkCount, setBookmarkCount] = useState(0)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [confirm, setConfirm] = useState<{
    title: string
    message: string
    destructive?: boolean
    onConfirm: () => void
  } | null>(null)
  const [pendingRestore, setPendingRestore] = useState<{ name: string } | null>(null)
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[] | null>(null)
  const [duplicatesOpen, setDuplicatesOpen] = useState(false)
  const [sortMethod, setSortMethod] = useState<'visit-count'>('visit-count')
  const toastIdRef = useRef(0)

  const showToast = (kind: ToastMessage['kind'], text: string): void => {
    toastIdRef.current += 1
    setToast({ id: toastIdRef.current, kind, text })
  }

  const reload = async (): Promise<void> => {
    const [s, list, bytes, tree] = await Promise.all([
      getSettings(),
      listSnapshots(),
      getBytesInUse(),
      getBookmarkTree(),
    ])
    setSettingsState(s)
    setSnapshots(list)
    setBytesInUse(bytes)
    setBookmarkCount(countBookmarks(tree))
  }

  useEffect(() => {
    void reload()
  }, [])

  const updateSetting = async (patch: Partial<Settings>): Promise<void> => {
    const next = await setSettings(patch)
    setSettingsState(next)
    if (patch.auto_sort === true && pendingRestore) {
      setPendingRestore(null)
    }
  }

  const handleCreate = async (): Promise<void> => {
    try {
      const snap = await createSnapshot()
      showToast('success', `已创建 ${snap.name}`)
      await reload()
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '创建快照失败')
    }
  }

  const handleRestore = (name: string): void => {
    setConfirm({
      title: '恢复快照',
      message: `确认恢复到 "${name}"？\n当前书签将被覆盖，自动排序会暂时关闭。`,
      destructive: true,
      onConfirm: async () => {
        setConfirm(null)
        try {
          const r = await restoreSnapshot(name)
          if (!r.ok) {
            showToast('error', r.error ?? '恢复失败')
            return
          }
          setPendingRestore({ name })
          if (settings?.auto_sort) {
            await updateSetting({ auto_sort: false })
          }
          showToast(
            'success',
            `已恢复到 ${name}，自动排序已禁用，可在设置中重新开启`,
          )
          await reload()
        } catch (e) {
          showToast('error', e instanceof Error ? e.message : '恢复失败')
        }
      },
    })
  }

  const handleDeleteAll = (): void => {
    if (snapshots.length === 0) return
    setConfirm({
      title: '删除所有快照',
      message: `确认删除全部 ${snapshots.length} 份快照？此操作不可恢复。`,
      destructive: true,
      onConfirm: async () => {
        setConfirm(null)
        try {
          for (const s of snapshots) {
            await deleteSnapshot(s.name)
          }
          showToast('success', '已删除全部快照')
          await reload()
        } catch (e) {
          showToast('error', e instanceof Error ? e.message : '删除失败')
        }
      },
    })
  }

  const handleDetectDuplicates = async (): Promise<void> => {
    try {
      const tree = await getBookmarkTree()
      const groups = detectDuplicates(tree)
      setDuplicateGroups(groups)
      setDuplicatesOpen(true)
      if (groups.length === 0) {
        showToast('info', '未发现重复书签')
      }
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '检测失败')
    }
  }

  const handleOpenUrl = (url: string): void => {
    void chrome.tabs.create({ url })
  }

  const handleRunSort = async (): Promise<void> => {
    try {
      await runSort()
      showToast('success', '排序完成')
      await reload()
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '排序失败')
    }
  }

  if (!settings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-sm text-text-secondary">
        加载中…
      </div>
    )
  }

  const confirmedCount = duplicateGroups?.filter((g) => g.type === 'url').length ?? 0
  const similarCount = duplicateGroups?.filter((g) => g.type === 'similar').length ?? 0
  const hasDetected = duplicateGroups !== null

  return (
    <div className="min-h-screen bg-surface py-6">
      <div className="mx-auto w-[800px]">
        <div className="mb-3 px-1">
          <h1 className="text-lg font-semibold text-text-primary">智能书签·设置</h1>
        </div>
        <div className="mb-4 h-px bg-border" />

        <StorageBanner bytesInUse={bytesInUse} quotaBytes={STORAGE_QUOTA_BYTES} />

        <Section title="排序设置">
          <div className="divide-y divide-border">
            <Switch
              checked={settings.auto_sort}
              onChange={(v) => void updateSetting({ auto_sort: v })}
              label="自动排序"
              description="浏览器启动时按访问频次重新排序书签"
            />
            <div className="pt-2">
              <SortMethod
                value={sortMethod}
                onChange={setSortMethod}
                options={[{ value: 'visit-count', label: '访问频率' }]}
                label="排序方式"
              />
            </div>
            {settings.auto_sort && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => void handleRunSort()}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  立即按访问频次排序 →
                </button>
              </div>
            )}
            {pendingRestore && (
              <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span className="flex-1">恢复 {pendingRestore.name} 后自动排序已临时关闭</span>
                <button
                  type="button"
                  onClick={() => setPendingRestore(null)}
                  aria-label="关闭提示"
                  className="text-amber-800/60 hover:text-amber-900"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </Section>

        <Section title="快照管理">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md bg-primary/10 px-2 py-1 font-medium text-primary">
              {snapshots.length} 个快照
            </span>
            <span className="rounded-md bg-warning/10 px-2 py-1 font-medium text-warning-dark">
              {bookmarkCount} 个书签
            </span>
            <span className="rounded-md bg-surface px-2 py-1 text-text-secondary">
              最近: {snapshots[0] ? relativeDate(snapshots[0].created_at) : '—'}
            </span>
          </div>
          <div className="divide-y divide-border">
            <Switch
              checked={settings.auto_snapshot}
              onChange={(v) => void updateSetting({ auto_snapshot: v })}
              label="浏览器启动时自动快照"
            />
          </div>
          <p className="mt-2 text-xs text-text-secondary">最多保留 7 个快照，超出将自动清理最早的</p>
          <div className="mt-3 space-y-2">
            {snapshots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-4 text-center text-xs text-text-secondary">
                暂无快照
              </div>
            ) : (
              snapshots.map((s) => (
                <SnapshotCard
                  key={s.name}
                  name={s.name}
                  bookmarkCount={s.bookmark_count}
                  createdAt={s.created_at}
                  onRestore={handleRestore}
                />
              ))
            )}
            <button
              type="button"
              onClick={() => void handleCreate()}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-xs text-text-secondary hover:border-primary hover:text-primary"
            >
              <Camera size={12} />
              <span>手动创建快照</span>
            </button>
          </div>
        </Section>

        <Section title="重复检测">
          <button
            type="button"
            onClick={() => void handleDetectDuplicates()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-white hover:bg-primary-dark"
          >
            <Search size={14} />
            <span>检测重复书签</span>
          </button>
          {hasDetected && (
            <div className="mt-3 overflow-hidden rounded-md border border-border bg-surface">
              {duplicateGroups!.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs text-text-secondary">
                  未发现重复书签
                </div>
              ) : (
                <>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setDuplicatesOpen(!duplicatesOpen)}
                      className="flex flex-1 items-center justify-between px-3 py-3 text-left"
                    >
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          共发现 {duplicateGroups!.length} 个重复
                        </div>
                        <div className="mt-0.5 text-xs text-text-secondary">
                          确认 {confirmedCount} · 疑似 {similarCount}
                        </div>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`text-text-secondary transition-transform ${
                          duplicatesOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDuplicateGroups(null)
                        setDuplicatesOpen(false)
                      }}
                      aria-label="关闭检测结果"
                      className="mr-2 rounded px-2 py-1 text-sm text-text-secondary hover:bg-border hover:text-text-primary"
                    >
                      ×
                    </button>
                  </div>
                  {duplicatesOpen && (
                    <div className="border-t border-border bg-white p-3">
                      <div className="space-y-3">
                        {duplicateGroups!.map((group, gi) => (
                          <div key={gi}>
                            <h4
                              className={`mb-1.5 text-xs font-semibold ${
                                group.type === 'url' ? 'text-danger' : 'text-warning-dark'
                              }`}
                            >
                              {group.type === 'url' ? '确认重复' : '疑似重复'}
                            </h4>
                            <div className="space-y-1.5">
                              {group.entries.map((e, ei) => (
                                <button
                                  key={e.id}
                                  type="button"
                                  onClick={() => handleOpenUrl(e.url)}
                                  className={`flex w-full flex-col gap-0.5 rounded-md border p-2.5 text-left ${
                                    group.type === 'url'
                                      ? 'border-red-200 bg-red-50 hover:border-red-300'
                                      : 'border-amber-200 bg-amber-50 hover:border-amber-300'
                                  }`}
                                >
                                  <div
                                    className={`text-xs font-medium ${
                                      group.type === 'url' ? 'text-red-900' : 'text-amber-900'
                                    }`}
                                  >
                                    原书签：{e.title}
                                  </div>
                                  <div
                                    className={`text-[11px] ${
                                      group.type === 'url' ? 'text-red-700' : 'text-amber-700'
                                    }`}
                                  >
                                    {ei === 0 ? '重复于' : '疑似于'}：{e.path}
                                  </div>
                                  <div
                                    className={`truncate text-[11px] ${
                                      group.type === 'url'
                                        ? 'text-red-600/70'
                                        : 'text-amber-600/70'
                                    }`}
                                  >
                                    {e.url}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </Section>

        <Section title="数据管理">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm font-medium text-text-primary">存储占用</span>
            <span className="text-sm text-text-secondary">
              {formatBytes(bytesInUse)} / {formatBytes(STORAGE_QUOTA_BYTES)}
            </span>
          </div>
          <div className="my-2 h-px bg-border" />
          <button
            type="button"
            onClick={handleDeleteAll}
            disabled={snapshots.length === 0}
            className="flex w-full items-center justify-center gap-1.5 py-1.5 text-sm font-medium text-danger hover:underline disabled:cursor-not-allowed disabled:text-text-secondary disabled:no-underline"
          >
            <Trash2 size={12} />
            <span>删除所有快照（不可恢复）</span>
          </button>
        </Section>
      </div>

      <Toast message={toast} onDismiss={() => setToast(null)} />

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        destructive={confirm?.destructive}
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

function countBookmarks(nodes: chrome.bookmarks.BookmarkTreeNode[]): number {
  let n = 0
  const walk = (arr: chrome.bookmarks.BookmarkTreeNode[]): void => {
    for (const node of arr) {
      if (isOtherBookmarks(node)) continue
      if (node.url) n++
      if (node.children) walk(node.children)
    }
  }
  walk(nodes)
  return n
}

export default App
