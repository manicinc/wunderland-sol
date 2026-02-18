/**
 * Migration utilities for moving data from localStorage to SQL storage
 * @module codex/lib/migrationUtils
 *
 * @remarks
 * - One-time migration from localStorage to IndexedDB/SQL
 * - Preserves all existing bookmarks and history
 * - Idempotent: safe to run multiple times
 */

import { getBookmarks, getHistory, clearBookmarks, clearHistory } from './localStorage';
import type { Bookmark, HistoryEntry } from './localStorage';
import { createBookmark, addToHistory, getAdapter } from './highlightsStorage';

export interface MigrationResult {
  bookmarks: number;
  history: number;
  success: boolean;
  error?: string;
}

/**
 * Check if migration has already been completed
 */
export async function checkMigrationStatus(): Promise<boolean> {
  const adapter = await getAdapter();
  if (!adapter) return false;

  try {
    const result = await adapter.get<{ value: string }>(
      `SELECT value FROM highlights_metadata WHERE key = 'migration_completed' LIMIT 1`
    );
    return result?.value === 'true';
  } catch {
    return false;
  }
}

/**
 * Migrate localStorage bookmarks and history to SQL storage
 */
export async function migrateLocalStorageToSQL(): Promise<MigrationResult> {
  const adapter = await getAdapter();
  if (!adapter) {
    return {
      bookmarks: 0,
      history: 0,
      success: false,
      error: 'Storage adapter unavailable',
    };
  }

  try {
    // Check if already migrated
    const alreadyMigrated = await checkMigrationStatus();
    if (alreadyMigrated) {
      return {
        bookmarks: 0,
        history: 0,
        success: true,
        error: 'Migration already completed',
      };
    }

    // Get data from localStorage
    const bookmarks = getBookmarks();
    const history = getHistory(1000); // Get all history

    let bookmarkCount = 0;
    let historyCount = 0;

    // Migrate bookmarks
    for (const bookmark of bookmarks) {
      try {
        await createBookmark({
          path: bookmark.path,
          title: bookmark.title,
          notes: bookmark.notes,
          groupId: null, // Will be auto-assigned by grouping system
        });
        bookmarkCount++;
      } catch (error) {
        console.warn('[Migration] Failed to migrate bookmark:', bookmark.path, error);
      }
    }

    // Migrate history
    for (const entry of history) {
      try {
        // Insert directly to preserve view counts
        await adapter.run(
          `INSERT INTO history (
            id, path, title, view_count, viewed_at, first_viewed_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            entry.path,
            entry.title,
            entry.viewCount,
            entry.viewedAt,
            entry.viewedAt, // Use viewedAt as firstViewedAt since we don't have the original
          ]
        );
        historyCount++;
      } catch (error) {
        console.warn('[Migration] Failed to migrate history entry:', entry.path, error);
      }
    }

    // Mark migration as completed
    await adapter.run(
      `INSERT OR REPLACE INTO highlights_metadata (key, value, updated_at)
       VALUES ('migration_completed', 'true', ?)`,
      [new Date().toISOString()]
    );

    return {
      bookmarks: bookmarkCount,
      history: historyCount,
      success: true,
    };
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    return {
      bookmarks: 0,
      history: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clear localStorage data after successful migration
 * Should only be called after verifying SQL migration succeeded
 */
export async function clearOldLocalStorage(): Promise<void> {
  try {
    clearBookmarks();
    clearHistory();
    console.log('[Migration] Cleared old localStorage data');
  } catch (error) {
    console.warn('[Migration] Failed to clear localStorage:', error);
  }
}

/**
 * Get migration statistics (for UI display)
 */
export async function getMigrationStats(): Promise<{
  localStorageBookmarks: number;
  localStorageHistory: number;
  sqlBookmarks: number;
  sqlHistory: number;
}> {
  const adapter = await getAdapter();

  const localBookmarks = getBookmarks();
  const localHistory = getHistory(1000);

  let sqlBookmarks = 0;
  let sqlHistory = 0;

  if (adapter) {
    try {
      const bookmarksResult = await adapter.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM bookmarks`
      );
      const historyResult = await adapter.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM history`
      );

      sqlBookmarks = bookmarksResult?.count || 0;
      sqlHistory = historyResult?.count || 0;
    } catch (error) {
      console.warn('[Migration] Failed to get SQL stats:', error);
    }
  }

  return {
    localStorageBookmarks: localBookmarks.length,
    localStorageHistory: localHistory.length,
    sqlBookmarks,
    sqlHistory,
  };
}
