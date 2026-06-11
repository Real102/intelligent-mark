import { getSettings } from '@/lib/storage'
import { createSnapshot } from '@/lib/snapshot'

export function setup(): void {
  chrome.runtime.onInstalled.addListener(() => {
    void runIfAutoSnapshot()
  })
  chrome.runtime.onStartup.addListener(() => {
    void runIfAutoSnapshot()
  })
}

async function runIfAutoSnapshot(): Promise<void> {
  const settings = await getSettings()
  if (!settings.auto_snapshot) return
  try {
    await createSnapshot()
  } catch (e) {
    console.error('[智能书签] 自动快照失败', e)
  }
}
