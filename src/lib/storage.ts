import type { Settings, Snapshots, StorageData, VisitCounts } from '@/types'

const STORAGE_KEYS = ['visit_counts', 'snapshots', 'settings'] as const

const DEFAULT_SETTINGS: Settings = {
  auto_sort: true,
  auto_snapshot: true,
}

function pickStorageData(raw: Record<string, unknown>): StorageData {
  return {
    visit_counts: (raw.visit_counts as VisitCounts | undefined) ?? {},
    snapshots: (raw.snapshots as Snapshots | undefined) ?? [],
    settings: { ...DEFAULT_SETTINGS, ...((raw.settings as Partial<Settings> | undefined) ?? {}) },
  }
}

export function getStorageData(): Promise<StorageData> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(STORAGE_KEYS as unknown as string[], (result) => {
      const err = chrome.runtime.lastError
      if (err) {
        reject(new Error(err.message))
        return
      }
      resolve(pickStorageData(result as Record<string, unknown>))
    })
  })
}

export function getVisitCounts(): Promise<VisitCounts> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('visit_counts', (result) => {
      const err = chrome.runtime.lastError
      if (err) {
        reject(new Error(err.message))
        return
      }
      resolve((result.visit_counts as VisitCounts | undefined) ?? {})
    })
  })
}

export function setVisitCounts(visit_counts: VisitCounts): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ visit_counts }, () => {
      const err = chrome.runtime.lastError
      if (err) {
        reject(new Error(err.message))
        return
      }
      resolve()
    })
  })
}

export function getSnapshots(): Promise<Snapshots> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('snapshots', (result) => {
      const err = chrome.runtime.lastError
      if (err) {
        reject(new Error(err.message))
        return
      }
      resolve((result.snapshots as Snapshots | undefined) ?? [])
    })
  })
}

export function setSnapshots(snapshots: Snapshots): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ snapshots }, () => {
      const err = chrome.runtime.lastError
      if (err) {
        reject(new Error(err.message))
        return
      }
      resolve()
    })
  })
}

export function getSettings(): Promise<Settings> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('settings', (result) => {
      const err = chrome.runtime.lastError
      if (err) {
        reject(new Error(err.message))
        return
      }
      resolve({ ...DEFAULT_SETTINGS, ...((result.settings as Partial<Settings> | undefined) ?? {}) })
    })
  })
}

export function setSettings(patch: Partial<Settings>): Promise<Settings> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('settings', (result) => {
      const err = chrome.runtime.lastError
      if (err) {
        reject(new Error(err.message))
        return
      }
      const merged: Settings = {
        ...DEFAULT_SETTINGS,
        ...((result.settings as Partial<Settings> | undefined) ?? {}),
        ...patch,
      }
      chrome.storage.local.set({ settings: merged }, () => {
        const err2 = chrome.runtime.lastError
        if (err2) {
          reject(new Error(err2.message))
          return
        }
        resolve(merged)
      })
    })
  })
}

export function getBytesInUse(): Promise<number> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.getBytesInUse(null, (bytes) => {
      const err = chrome.runtime.lastError
      if (err) {
        reject(new Error(err.message))
        return
      }
      resolve(bytes)
    })
  })
}
