import { useEffect, useRef, useState } from 'react'
import { History, Search, Camera, RefreshCw, HardDrive, AlertTriangle, ExternalLink, X } from 'lucide-react'
import {
  ConfirmDialog,
  Section,
  SnapshotCard,
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
import { runSort } from '@/background/handlers/sort'
import type { Settings, Snapshot } from '@/types'

const STORAGE_QUOTA_BYTES = chrome.storage.local.QUOTA_BYTES ?? 10 * 1024 * 1024

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
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
  const [pendingRestore, setPendingRestore] = useState<{ name: string; autoSortOff: boolean } | null>(null)
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[] | null>(null)
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

  const handleDelete = (name: string): void => {
    setConfirm({
      title: '删除快照',
      message: `确认删除 "${name}"？此操作不可恢复。`,
      destructive: true,
      onConfirm: async () => {
        setConfirm(null)
        try {
          await deleteSnapshot(name)
          showToast('success', '已删除')
          await reload()
        } catch (e) {
          showToast('error', e instanceof Error ? e.message : '删除失败')
        }
      },
    })
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
          setPendingRestore({ name, autoSortOff: settings?.auto_sort ?? false })
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

  const handleDetectDuplicates = async (): Promise<void> => {
    try {
      const tree = await getBookmarkTree()
      const groups = detectDuplicates(tree)
      setDuplicateGroups(groups)
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        加载中…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto w-[800px]">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">智能书签 · 设置</h1>
          <p className="mt-1 text-sm text-gray-500">v0.1.0</p>
        </div>

        <StorageBanner bytesInUse={bytesInUse} quotaBytes={STORAGE_QUOTA_BYTES} />

        <Section title="自动化">
          <div className="space-y-4">
            <Switch
              checked={settings.auto_sort}
              onChange={(v) => void updateSetting({ auto_sort: v })}
              label="自动按访问频次排序"
              description="每次打开浏览器时自动按访问次数重新排序书签"
            />
            <Switch
              checked={settings.auto_snapshot}
              onChange={(v) => void updateSetting({ auto_snapshot: v })}
              label="自动创建快照"
              description="每次打开浏览器时创建当天快照，最多保留 7 份"
            />
            {pendingRestore?.autoSortOff && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  恢复后自动排序已临时关闭（恢复 {pendingRestore.name}），如需重新开启请勾选上方开关
                </span>
              </div>
            )}
          </div>
        </Section>

        <Section title="手动操作">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleRunSort()}
              className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw size={14} />
              立即按访问频次排序
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Camera size={14} />
              立即创建快照
            </button>
            <button
              type="button"
              onClick={() => void handleDetectDuplicates()}
              className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Search size={14} />
              检测重复书签
            </button>
          </div>
        </Section>

        {duplicateGroups !== null && (
          <Section
            title={`重复检测结果（${duplicateGroups.length} 组）`}
            action={
              <button
                type="button"
                onClick={() => setDuplicateGroups(null)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={12} />
                关闭
              </button>
            }
          >
            {duplicateGroups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-500">
                未发现重复书签
              </div>
            ) : (
              <div className="space-y-2">
                {duplicateGroups.map((group, gi) => (
                  <div
                    key={gi}
                    className="rounded-lg border border-gray-200 bg-white"
                  >
                    <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          group.type === 'url'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {group.type === 'url' ? 'URL 重复' : '疑似重复'}
                      </span>
                      <span className="text-gray-500">{group.entries.length} 条</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {group.entries.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => handleOpenUrl(e.url)}
                          className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-gray-50"
                        >
                          <ExternalLink size={12} className="mt-0.5 flex-shrink-0 text-gray-400" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm text-gray-900">{e.title}</div>
                            <div className="truncate text-xs text-gray-500">{e.url}</div>
                            <div className="truncate text-[11px] text-gray-400">{e.path}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        <Section title="快照管理">
          <div className="mb-3 flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <History size={12} />
              <span>共 {snapshots.length} 份快照</span>
            </span>
            <span className="flex items-center gap-1">
              <HardDrive size={12} />
              <span>
                存储占用 {formatBytes(bytesInUse)} / {formatBytes(STORAGE_QUOTA_BYTES)}
              </span>
            </span>
            <span>当前书签 {bookmarkCount} 条</span>
          </div>
          {snapshots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-500">
              暂无快照
            </div>
          ) : (
            <div className="space-y-2">
              {snapshots.map((s) => (
                <SnapshotCard
                  key={s.name}
                  name={s.name}
                  bookmarkCount={s.bookmark_count}
                  createdAt={s.created_at}
                  onRestore={handleRestore}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
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
      if (node.url) n++
      if (node.children) walk(node.children)
    }
  }
  walk(nodes)
  return n
}

export default App
