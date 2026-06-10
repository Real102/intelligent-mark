import * as pako from 'pako'

const CHUNK_SIZE = 0x8000

function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < arr.length; i += CHUNK_SIZE) {
    const chunk = arr.subarray(i, i + CHUNK_SIZE)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

export function gzip(data: string): string {
  const compressed = pako.gzip(data)
  return uint8ArrayToBase64(compressed)
}

export function gunzip(base64: string): string {
  const compressed = base64ToUint8Array(base64)
  return pako.ungzip(compressed, { to: 'string' })
}
