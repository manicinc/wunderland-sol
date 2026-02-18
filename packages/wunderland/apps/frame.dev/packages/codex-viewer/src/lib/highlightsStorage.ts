/**
 * Storage adapter for Quarry Codex highlights, bookmarks, and groupings
 * @module codex/lib/highlightsStorage
 *
 * @remarks
 * - Uses IndexedDB (preferred) → sql.js (fallback) → memory (last resort)
 * - Pattern follows codexCache.ts for consistency
 * - All operations are async and handle adapter unavailability gracefully
 */

import type { StorageAdapter } from '@framers/sql-storage-adapter';
import { createDatabase } from '@framers/sql-storage-adapter';
import { HIGHLIGHTS_SCHEMA, FTS_SCHEMA, METADATA_SCHEMA, SCHEMA_VERSION } from './highlightsSchema';
import type {
  Highlight,
  CodexBookmark,
  CodexHistory,
  HighlightGroup,
  HighlightConnection,
  CreateHighlightData,
  UpdateHighlightData,
  CreateBookmarkData,
  UpdateBookmarkData,
  CreateGroupData,
  UpdateGroupData,
  StorageStats,
} from './highlightTypes';

const DB_NAME = 'codex_highlights';
const isBrowser = typeof window !== 'undefined';

let adapterPromise: Promise<StorageAdapter | null> | null = null;
let schemaPromise: Promise<void> | null = null;

/**
 * Initialize and return the storage adapter
 * Lazily creates the database and applies schema on first access
 */
async function getAdapter(): Promise<StorageAdapter | null> {
  if (!isBrowser) return null;

  if (!adapterPromise) {
    adapterPromise = createDatabase({
      priority: ['indexeddb', 'sqljs', 'memory'] as any,
      type: typeof window === 'undefined' ? 'memory' : undefined,
      dbName: DB_NAME,
    }).catch((error) => {
      console.warn('[HighlightsStorage] Failed to initialize adapter:', error);
      return null;
    });
  }

  const adapter = await adapterPromise;
  if (!adapter) return null;

  // Initialize schema on first access
  if (!schemaPromise) {
    schemaPromise = (async () => {
      try {
        // Apply main schema
        await adapter.exec?.(HIGHLIGHTS_SCHEMA);
        await adapter.exec?.(METADATA_SCHEMA);

        // Try to apply FTS schema (may not be supported by all adapters)
        try {
          await adapter.exec?.(FTS_SCHEMA);
        } catch (error) {
          console.warn('[HighlightsStorage] FTS5 not supported, falling back to basic search');
        }

        // Record schema version
        await adapter.run(
          `INSERT OR REPLACE INTO highlights_metadata (key, value, updated_at)
           VALUES ('schema_version', ?, ?)`,
          [SCHEMA_VERSION, new Date().toISOString()]
        );
      } catch (error) {
        console.error('[HighlightsStorage] Schema initialization failed:', error);
        throw error;
      }
    })();
  }

  await schemaPromise;
  return adapter;
}

/**
 * Generate a unique ID (UUID v4)
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =====================================================
// HIGHLIGHT OPERATIONS
// =====================================================

/**
 * Create a new highlight
 */
export async function createHighlight(data: CreateHighlightData): Promise<Highlight> {
  const adapter = await getAdapter();
  if (!adapter) throw new Error('Storage adapter unavailable');

  const id = generateId();
  const now = new Date().toISOString();

  const highlight: Highlight = {
    id,
    filePath: data.filePath,
    content: data.content,
    selectionType: data.selectionType,
    startOffset: data.startOffset,
    endOffset: data.endOffset,
    blockId: data.blockId,
    color: data.color || 'yellow',
    categoryTag: data.categoryTag,
    userNotes: data.userNotes,
    groupId: data.groupId || null,
    createdAt: now,
    updatedAt: now,
  };

  await adapter.run(
    `INSERT INTO highlights (
      id, file_path, content, selection_type, start_offset, end_offset, block_id,
      color, category_tag, user_notes, created_at, updated_at, group_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      highlight.id,
      highlight.filePath,
      highlight.content,
      highlight.selectionType,
      highlight.startOffset || null,
      highlight.endOffset || null,
      highlight.blockId || null,
      highlight.color,
      highlight.categoryTag || null,
      highlight.userNotes || null,
      highlight.createdAt,
      highlight.updatedAt,
      highlight.groupId,
    ]
  );

  return highlight;
}

/**
 * Get a single highlight by ID
 */
export async function getHighlight(id: string): Promise<Highlight | null> {
  const adapter = await getAdapter();
  if (!adapter) return null;

  const row = await adapter.get<any>(
    `SELECT * FROM highlights WHERE id = ? LIMIT 1`,
    [id]
  );

  return row ? mapRowToHighlight(row) : null;
}

/**
 * Get all highlights for a specific file
 */
export async function getHighlightsByFile(filePath: string): Promise<Highlight[]> {
  const adapter = await getAdapter();
  if (!adapter) return [];

  const rows = await adapter.all<any>(
    `SELECT * FROM highlights WHERE file_path = ? ORDER BY created_at DESC`,
    [filePath]
  );

  return rows.map(mapRowToHighlight);
}

/**
 * Get all highlights (with optional pagination)
 */
export async function getAllHighlights(limit?: number, offset?: number): Promise<Highlight[]> {
  const adapter = await getAdapter();
  if (!adapter) return [];

  const query = `SELECT * FROM highlights ORDER BY created_at DESC ${
    limit ? `LIMIT ${limit} OFFSET ${offset || 0}` : ''
  }`;

  const rows = await adapter.all<any>(query);
  return rows.map(mapRowToHighlight);
}

/**
 * Search highlights by content, notes, or category
 */
export async function searchHighlights(query: string, limit: number = 50): Promise<Highlight[]> {
  const adapter = await getAdapter();
  if (!adapter) return [];

  const searchTerm = `%${query}%`;

  try {
    // Try FTS5 search first (faster)
    const rows = await adapter.all<any>(
      `SELECT h.* FROM highlights h
       INNER JOIN highlights_fts fts ON h.id = fts.id
       WHERE highlights_fts MATCH ?
       ORDER BY rank
       LIMIT ?`,
      [query, limit]
    );
    return rows.map(mapRowToHighlight);
  } catch {
    // Fallback to LIKE search
    const rows = await adapter.all<any>(
      `SELECT * FROM highlights
       WHERE content LIKE ? OR user_notes LIKE ? OR category_tag LIKE ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [searchTerm, searchTerm, searchTerm, limit]
    );
    return rows.map(mapRowToHighlight);
  }
}

/**
 * Update an existing highlight
 */
export async function updateHighlight(id: string, updates: UpdateHighlightData): Promise<void> {
  const adapter = await getAdapter();
  if (!adapter) throw new Error('Storage adapter unavailable');

  const sets: string[] = [];
  const values: any[] = [];

  if (updates.content !== undefined) {
    sets.push('content = ?');
    values.push(updates.content);
  }
  if (updates.color !== undefined) {
    sets.push('color = ?');
    values.push(updates.color);
  }
  if (updates.categoryTag !== undefined) {
    sets.push('category_tag = ?');
    values.push(updates.categoryTag);
  }
  if (updates.userNotes !== undefined) {
    sets.push('user_notes = ?');
    values.push(updates.userNotes);
  }
  if (updates.groupId !== undefined) {
    sets.push('group_id = ?');
    values.push(updates.groupId);
  }

  sets.push('updated_at = ?');
  values.push(new Date().toISOString());

  values.push(id);

  await adapter.run(
    `UPDATE highlights SET ${sets.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Delete a highlight
 */
export async function deleteHighlight(id: string): Promise<void> {
  const adapter = await getAdapter();
  if (!adapter) throw new Error('Storage adapter unavailable');

  await adapter.run(`DELETE FROM highlights WHERE id = ?`, [id]);
}

// =====================================================
// BOOKMARK OPERATIONS
// =====================================================

/**
 * Create a new bookmark
 */
export async function createBookmark(data: CreateBookmarkData): Promise<CodexBookmark> {
  const adapter = await getAdapter();
  if (!adapter) throw new Error('Storage adapter unavailable');

  const id = generateId();
  const now = new Date().toISOString();

  const bookmark: CodexBookmark = {
    id,
    path: data.path,
    title: data.title,
    notes: data.notes,
    groupId: data.groupId || null,
    addedAt: now,
    updatedAt: now,
  };

  await adapter.run(
    `INSERT INTO bookmarks (id, path, title, notes, added_at, updated_at, group_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [bookmark.id, bookmark.path, bookmark.title, bookmark.notes || null, bookmark.addedAt, bookmark.updatedAt, bookmark.groupId]
  );

  return bookmark;
}

/**
 * Get all bookmarks (with optional pagination)
 */
export async function getBookmarks(limit?: number, offset?: number): Promise<CodexBookmark[]> {
  const adapter = await getAdapter();
  if (!adapter) return [];

  const query = `SELECT * FROM bookmarks ORDER BY added_at DESC ${
    limit ? `LIMIT ${limit} OFFSET ${offset || 0}` : ''
  }`;

  const rows = await adapter.all<any>(query);
  return rows.map(mapRowToBookmark);
}

/**
 * Get a bookmark by path
 */
export async function getBookmarkByPath(path: string): Promise<CodexBookmark | null> {
  const adapter = await getAdapter();
  if (!adapter) return null;

  const row = await adapter.get<any>(
    `SELECT * FROM bookmarks WHERE path = ? LIMIT 1`,
    [path]
  );

  return row ? mapRowToBookmark(row) : null;
}

/**
 * Check if a path is bookmarked
 */
export async function isBookmarked(path: string): Promise<boolean> {
  const bookmark = await getBookmarkByPath(path);
  return bookmark !== null;
}

/**
 * Search bookmarks by title or notes
 */
export async function searchBookmarks(query: string, limit: number = 50): Promise<CodexBookmark[]> {
  const adapter = await getAdapter();
  if (!adapter) return [];

  const searchTerm = `%${query}%`;

  try {
    // Try FTS5 search first
    const rows = await adapter.all<any>(
      `SELECT b.* FROM bookmarks b
       INNER JOIN bookmarks_fts fts ON b.id = fts.id
       WHERE bookmarks_fts MATCH ?
       ORDER BY rank
       LIMIT ?`,
      [query, limit]
    );
    return rows.map(mapRowToBookmark);
  } catch {
    // Fallback to LIKE search
    const rows = await adapter.all<any>(
      `SELECT * FROM bookmarks
       WHERE title LIKE ? OR notes LIKE ?
       ORDER BY added_at DESC
       LIMIT ?`,
      [searchTerm, searchTerm, limit]
    );
    return rows.map(mapRowToBookmark);
  }
}

/**
 * Update a bookmark
 */
export async function updateBookmark(id: string, updates: UpdateBookmarkData): Promise<void> {
  const adapter = await getAdapter();
  if (!adapter) throw new Error('Storage adapter unavailable');

  const sets: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) {
    sets.push('title = ?');
    values.push(updates.title);
  }
  if (updates.notes !== undefined) {
    sets.push('notes = ?');
    values.push(updates.notes);
  }
  if (updates.groupId !== undefined) {
    sets.push('group_id = ?');
    values.push(updates.groupId);
  }

  sets.push('updated_at = ?');
  values.push(new Date().toISOString());

  values.push(id);

  await adapter.run(
    `UPDATE bookmarks SET ${sets.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Delete a bookmark
 */
export async function deleteBookmark(id: string): Promise<void> {
  const adapter = await getAdapter();
  if (!adapter) throw new Error('Storage adapter unavailable');

  await adapter.run(`DELETE FROM bookmarks WHERE id = ?`, [id]);
}

/**
 * Delete a bookmark by path
 */
export async function deleteBookmarkByPath(path: string): Promise<void> {
  const adapter = await getAdapter();
  if (!adapter) throw new Error('Storage adapter unavailable');

  await adapter.run(`DELETE FROM bookmarks WHERE path = ?`, [path]);
}

// =====================================================
// HISTORY OPERATIONS
// =====================================================

/**
 * Add to reading history or increment view count
 */
export async function addToHistory(path: string, title: string): Promise<void> {
  const adapter = await getAdapter();
  if (!adapter) return;

  const existing = await adapter.get<CodexHistory>(
    `SELECT * FROM history WHERE path = ? LIMIT 1`,
    [path]
  );

  const now = new Date().toISOString();

  if (existing) {
    await adapter.run(
      `UPDATE history SET view_count = view_count + 1, viewed_at = ? WHERE path = ?`,
      [now, path]
    );
  } else {
    await adapter.run(
      `INSERT INTO history (id, path, title, view_count, viewed_at, first_viewed_at)
       VALUES (?, ?, ?, 1, ?, ?)`,
      [generateId(), path, title, now, now]
    );
  }
}

/**
 * Get reading history (most recent first)
 */
export async function getHistory(limit: number = 50): Promise<CodexHistory[]> {
  const adapter = await getAdapter();
  if (!adapter) return [];

  const rows = await adapter.all<any>(
    `SELECT * FROM history ORDER BY viewed_at DESC LIMIT ?`,
    [limit]
  );

  return rows.map(mapRowToHistory);
}

/**
 * Clear all reading history
 */
export async function clearHistory(): Promise<void> {
  const adapter = await getAdapter();
  if (!adapter) return;

  await adapter.run(`DELETE FROM history`);
}

// =====================================================
// GROUP OPERATIONS
// =====================================================

/**
 * Create a new group
 */
export async function createGroup(data: CreateGroupData): Promise<HighlightGroup> {
  const adapter = await getAdapter();
  if (!adapter) throw new Error('Storage adapter unavailable');

  const id = generateId();
  const now = new Date().toISOString();

  const group: HighlightGroup = {
    id,
    name: data.name,
    description: data.description,
    type: data.type,
    weavePath: data.weavePath,
    loomPath: data.loomPath,
    color: data.color,
    isEditable: true,
    displayOrder: 0,
    createdAt: now,
    updatedAt: now,
  };

  await adapter.run(
    `INSERT INTO highlight_groups (
      id, name, description, type, weave_path, loom_path, color,
      is_editable, display_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      group.id,
      group.name,
      group.description || null,
      group.type,
      group.weavePath || null,
      group.loomPath || null,
      group.color || null,
      group.isEditable ? 1 : 0,
      group.displayOrder,
      group.createdAt,
      group.updatedAt,
    ]
  );

  return group;
}

/**
 * Get all groups
 */
export async function getGroups(): Promise<HighlightGroup[]> {
  const adapter = await getAdapter();
  if (!adapter) return [];

  const rows = await adapter.all<any>(
    `SELECT * FROM highlight_groups ORDER BY display_order, created_at`
  );

  return rows.map(mapRowToGroup);
}

/**
 * Get a single group by ID
 */
export async function getGroup(id: string): Promise<HighlightGroup | null> {
  const adapter = await getAdapter();
  if (!adapter) return null;

  const row = await adapter.get<any>(
    `SELECT * FROM highlight_groups WHERE id = ? LIMIT 1`,
    [id]
  );

  return row ? mapRowToGroup(row) : null;
}

/**
 * Update a group
 */
export async function updateGroup(id: string, updates: UpdateGroupData): Promise<void> {
  const adapter = await getAdapter();
  if (!adapter) throw new Error('Storage adapter unavailable');

  const sets: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    sets.push('name = ?');
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    sets.push('description = ?');
    values.push(updates.description);
  }
  if (updates.color !== undefined) {
    sets.push('color = ?');
    values.push(updates.color);
  }
  if (updates.displayOrder !== undefined) {
    sets.push('display_order = ?');
    values.push(updates.displayOrder);
  }

  sets.push('updated_at = ?');
  values.push(new Date().toISOString());

  values.push(id);

  await adapter.run(
    `UPDATE highlight_groups SET ${sets.join(', ')} WHERE id = ?`,
    values
  );
}

/**
 * Delete a group
 */
export async function deleteGroup(id: string): Promise<void> {
  const adapter = await getAdapter();
  if (!adapter) throw new Error('Storage adapter unavailable');

  await adapter.run(`DELETE FROM highlight_groups WHERE id = ?`, [id]);
}

// =====================================================
// CONNECTION OPERATIONS
// =====================================================

/**
 * Create a connection between two highlights
 */
export async function createConnection(
  sourceId: string,
  targetId: string,
  type: 'auto' | 'manual',
  similarityScore?: number
): Promise<void> {
  const adapter = await getAdapter();
  if (!adapter) throw new Error('Storage adapter unavailable');

  const id = generateId();
  const now = new Date().toISOString();

  await adapter.run(
    `INSERT OR IGNORE INTO highlight_connections (
      id, source_highlight_id, target_highlight_id, connection_type, similarity_score, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, sourceId, targetId, type, similarityScore || null, now]
  );
}

/**
 * Get all connections for a highlight (both source and target)
 */
export async function getConnections(highlightId: string): Promise<HighlightConnection[]> {
  const adapter = await getAdapter();
  if (!adapter) return [];

  const rows = await adapter.all<any>(
    `SELECT * FROM highlight_connections
     WHERE source_highlight_id = ? OR target_highlight_id = ?
     ORDER BY similarity_score DESC, created_at DESC`,
    [highlightId, highlightId]
  );

  return rows.map(mapRowToConnection);
}

/**
 * Delete a connection
 */
export async function deleteConnection(id: string): Promise<void> {
  const adapter = await getAdapter();
  if (!adapter) throw new Error('Storage adapter unavailable');

  await adapter.run(`DELETE FROM highlight_connections WHERE id = ?`, [id]);
}

// =====================================================
// UTILITY OPERATIONS
// =====================================================

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<StorageStats> {
  const adapter = await getAdapter();
  if (!adapter) {
    return {
      totalHighlights: 0,
      totalBookmarks: 0,
      totalGroups: 0,
      totalConnections: 0,
      totalBytes: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  const [highlights, bookmarks, groups, connections] = await Promise.all([
    adapter.get<{ count: number }>(`SELECT COUNT(*) as count FROM highlights`),
    adapter.get<{ count: number }>(`SELECT COUNT(*) as count FROM bookmarks`),
    adapter.get<{ count: number }>(`SELECT COUNT(*) as count FROM highlight_groups`),
    adapter.get<{ count: number }>(`SELECT COUNT(*) as count FROM highlight_connections`),
  ]);

  return {
    totalHighlights: highlights?.count || 0,
    totalBookmarks: bookmarks?.count || 0,
    totalGroups: groups?.count || 0,
    totalConnections: connections?.count || 0,
    totalBytes: 0, // TODO: Calculate actual storage size
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Clear all data (for testing or reset)
 */
export async function clearAllData(): Promise<void> {
  const adapter = await getAdapter();
  if (!adapter) return;

  await adapter.run(`DELETE FROM highlight_connections`);
  await adapter.run(`DELETE FROM highlights`);
  await adapter.run(`DELETE FROM bookmarks`);
  await adapter.run(`DELETE FROM history`);
  // Don't delete groups by default as they may be regenerated
}

// =====================================================
// MAPPING FUNCTIONS (DB rows → TypeScript objects)
// =====================================================

function mapRowToHighlight(row: any): Highlight {
  return {
    id: row.id,
    filePath: row.file_path,
    content: row.content,
    selectionType: row.selection_type,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    blockId: row.block_id,
    color: row.color,
    categoryTag: row.category_tag,
    userNotes: row.user_notes,
    groupId: row.group_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToBookmark(row: any): CodexBookmark {
  return {
    id: row.id,
    path: row.path,
    title: row.title,
    notes: row.notes,
    groupId: row.group_id,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToHistory(row: any): CodexHistory {
  return {
    id: row.id,
    path: row.path,
    title: row.title,
    viewCount: row.view_count,
    viewedAt: row.viewed_at,
    firstViewedAt: row.first_viewed_at,
  };
}

function mapRowToGroup(row: any): HighlightGroup {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    weavePath: row.weave_path,
    loomPath: row.loom_path,
    color: row.color,
    isEditable: row.is_editable === 1,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToConnection(row: any): HighlightConnection {
  return {
    id: row.id,
    sourceHighlightId: row.source_highlight_id,
    targetHighlightId: row.target_highlight_id,
    connectionType: row.connection_type,
    similarityScore: row.similarity_score,
    createdAt: row.created_at,
  };
}

// Export adapter getter for advanced usage
export { getAdapter };
