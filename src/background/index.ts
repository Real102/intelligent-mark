import { setup as setupVisitCount } from './handlers/visitCount'
import { setup as setupSort } from './handlers/sort'
import { setup as setupSnapshot } from './handlers/snapshot'

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[智能书签] installed', details.reason)
})

setupVisitCount()
setupSort()
setupSnapshot()

console.log('[智能书签] service worker started')
