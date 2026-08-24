import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Chrome 扩展环境下 crossorigin 会让 modulepreload 被视为跨世界资源，
 * 触发 "cross-world extension resource mismatch" 警告并使预加载失效。
 * 构建产物的 script/link 标签全部同源（chrome-extension://），无需 crossorigin。
 */
function removeCrossorigin(): Plugin {
  return {
    name: 'remove-crossorigin',
    enforce: 'post',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin(?=[\s>])/g, '')
    },
  }
}

export default defineConfig({
  plugins: [react(), crx({ manifest }), removeCrossorigin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
