/**
 * SQL-backed cache for Frame Codex client-side data.
 *
 * @remarks
 * - Uses @framers/sql-storage-adapter with IndexedDB/sql.js in the browser.
 * - Falls back to in-memory storage for SSR / unsupported environments.
 * - Stores only public Codex content (no tokens, no secrets, no PATs).
 */

import type { StorageAdapter } from '@framers/sql-storage-adapter'
import { createDatabase as createDatabaseExport } from '@framers/sql-storage-adapter'

const TABLE_NAME = 'codex_strands_cache'

type CachedRow = {
  path: string
  content: string
  updated_at: string
}

export type CodexCacheStats = {
  /** Total cached strands */
  totalItems: number
  /** Approximate total size in bytes (character length) */
  totalBytes: number
}

const createDatabaseFn = typeof createDatabaseExport === 'function' ? createDatabaseExport : null

let adapterPromise: Promise<StorageAdapter | null> | null = null
let schemaPromise: Promise<void> | null = null
let adapterWarningLogged = false

const isBrowser = typeof window !== 'undefined'

/**
 * In-memory fallback cache used when SQL adapter is unavailable.
 * This never persists across reloads and is purely ephemeral.
 */
const memoryCache = new Map<string, CachedRow>()

async function getAdapter(): Promise<StorageAdapter | null> {
  if (!isBrowser) return null

  if (!createDatabaseFn) {
    if (!adapterWarningLogged) {
      console.warn('[CodexCache] SQL storage adapter missing — falling back to memory cache only.')
      adapterWarningLogged = true
    }
    return null
  }

  if (!adapterPromise) {
    adapterPromise = createDatabaseFn({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      priority: ['indexeddb', 'sqljs', 'memory'] as any,
      type: typeof window === 'undefined' ? 'memory' : undefined,
    }).catch((error) => {
      if (!adapterWarningLogged) {
        console.warn('[CodexCache] Failed to initialize SQL adapter, using memory cache.', error)
        adapterWarningLogged = true
      }
      return null
    })
  }

  const adapter = await adapterPromise
  if (!adapter) return null

  if (!schemaPromise) {
    schemaPromise =
      adapter.exec?.(
        `
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          path TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `
      ) ?? Promise.resolve()
  }

  await schemaPromise
  return adapter
}

/**
 * Get cached strand content by path.
 *
 * @param path - GitHub path (weaves/…)
 */
export async function getCachedStrand(path: string): Promise<string | null> {
  if (!path) return null

  const adapter = await getAdapter()
  if (!adapter) {
    const row = memoryCache.get(path)
    return row?.content ?? null
  }

  try {
    const row = await adapter.get<CachedRow>(
      `SELECT path, content, updated_at FROM ${TABLE_NAME} WHERE path = ?`,
      [path]
    )
    return row?.content ?? null
  } catch (error) {
    console.warn('[CodexCache] getCachedStrand failed, falling back to memory', error)
    const row = memoryCache.get(path)
    return row?.content ?? null
  }
}

/**
 * Store strand content in cache.
 *
 * @param path - GitHub path (weaves/…)
 * @param content - Raw markdown content
 */
export async function setCachedStrand(path: string, content: string): Promise<void> {
  if (!path) return

  const adapter = await getAdapter()
  const row: CachedRow = {
    path,
    content,
    updated_at: new Date().toISOString(),
  }

  if (!adapter) {
    memoryCache.set(path, row)
    return
  }

  try {
    await adapter.run(
      `
      INSERT INTO ${TABLE_NAME} (path, content, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        content = excluded.content,
        updated_at = excluded.updated_at
    `,
      [row.path, row.content, row.updated_at]
    )
  } catch (error) {
    console.warn('[CodexCache] setCachedStrand failed, falling back to memory', error)
    memoryCache.set(path, row)
  }
}

/**
 * Get approximate cache statistics for display in Preferences.
 */
export async function getCodexCacheStats(): Promise<CodexCacheStats> {
  const adapter = await getAdapter()

  if (!adapter) {
    let totalBytes = 0
    memoryCache.forEach((row) => {
      totalBytes += row.content.length
    })
    return {
      totalItems: memoryCache.size,
      totalBytes,
    }
  }

  try {
    const row = await adapter.get<{ totalItems: number; totalBytes: number }>(
      `
      SELECT
        COUNT(*) as totalItems,
        COALESCE(SUM(LENGTH(content)), 0) as totalBytes
      FROM ${TABLE_NAME}
    `
    )

    return {
      totalItems: row?.totalItems ?? 0,
      totalBytes: row?.totalBytes ?? 0,
    }
  } catch (error) {
    console.warn('[CodexCache] getCodexCacheStats failed, falling back to memory', error)
    let totalBytes = 0
    memoryCache.forEach((row) => {
      totalBytes += row.content.length
    })
    return {
      totalItems: memoryCache.size,
      totalBytes,
    }
  }
}

/**
 * Clear all cached strands.
 */
export async function clearCodexCache(): Promise<void> {
  const adapter = await getAdapter()

  if (!adapter) {
    memoryCache.clear()
    return
  }

  try {
    await adapter.run(`DELETE FROM ${TABLE_NAME}`)
  } catch (error) {
    console.warn('[CodexCache] clearCodexCache failed, clearing memory cache only', error)
  } finally {
    memoryCache.clear()
  }
}

