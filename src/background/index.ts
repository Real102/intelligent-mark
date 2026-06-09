chrome.runtime.onInstalled.addListener((details) => {
  console.log('[智能书签] installed', details.reason)
})

console.log('[智能书签] service worker started')
