import { API_ENDPOINTS } from '@/components/quarry/constants'
import type { CodexSearchIndex } from './types'

let searchIndexPromise: Promise<CodexSearchIndex | null> | null = null

/**
 * Fetch and memoize the Codex search index.
 */
export function loadCodexSearchIndex(): Promise<CodexSearchIndex | null> {
  if (!searchIndexPromise) {
    searchIndexPromise = fetch(API_ENDPOINTS.raw('codex-search.json'))
      .then((response) => {
        if (!response.ok) {
          console.warn('Codex search index not available:', response.statusText)
          return null
        }
        return response.json() as Promise<CodexSearchIndex>
      })
      .catch((error) => {
        console.warn('Failed to load Codex search index:', error)
        return null
      })
  }
  return searchIndexPromise
}

/**
 * Decode base64-encoded Float32 embeddings into a typed array.
 */
export function decodeEmbeddings(encoded: CodexSearchIndex['embeddings'], docCount: number): Float32Array | null {
  if (!encoded?.data || !encoded.size) return null

  try {
    const binary = base64ToUint8(encoded.data)
    const floatArray = new Float32Array(binary.buffer)

    if (floatArray.length < docCount * encoded.size) {
      console.warn('Embeddings array shorter than expected, skipping semantic search.')
      return null
    }

    return floatArray
  } catch (error) {
    console.warn('Failed to decode semantic embeddings:', error)
    return null
  }
}

const base64ToUint8 = (base64: string): Uint8Array => {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}


