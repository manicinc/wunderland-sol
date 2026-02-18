/**
 * Type definitions for Quarry Codex highlights, bookmarks, and groupings
 * @module codex/lib/highlightTypes
 */

export type SelectionType = 'text' | 'block';
export type ConnectionType = 'auto' | 'manual';
export type GroupType = 'default' | 'custom';
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'orange';

/**
 * Highlight/clipping of text or content blocks
 */
export interface Highlight {
  id: string;
  filePath: string;
  content: string;  // The actual highlighted text
  selectionType: SelectionType;

  // For text selections (character-based)
  startOffset?: number;
  endOffset?: number;

  // For block selections (paragraph, code block, quote)
  blockId?: string;  // e.g., "heading-introduction" or "code-block-3"

  color: HighlightColor;
  categoryTag?: string;
  userNotes?: string;
  createdAt: string;
  updatedAt: string;
  groupId?: string | null;
}

/**
 * Enhanced bookmark with grouping support
 */
export interface CodexBookmark {
  id: string;
  path: string;
  title: string;
  notes?: string;
  addedAt: string;
  updatedAt: string;
  groupId?: string | null;
}

/**
 * Reading history entry with view count
 */
export interface CodexHistory {
  id: string;
  path: string;
  title: string;
  viewCount: number;
  viewedAt: string;
  firstViewedAt: string;
}

/**
 * Group for organizing highlights and bookmarks
 */
export interface HighlightGroup {
  id: string;
  name: string;
  description?: string;
  type: GroupType;  // 'default' (auto-generated) or 'custom' (user-created)

  // For default groups (auto-generated from fabric hierarchy)
  weavePath?: string;  // e.g., "weaves/technology"
  loomPath?: string;   // e.g., "weaves/technology/programming"

  color?: string;      // Hex color for group badge
  createdAt: string;
  updatedAt: string;
  isEditable: boolean; // Even default groups can be edited/removed
  displayOrder: number;
}

/**
 * Connection/link between highlights
 */
export interface HighlightConnection {
  id: string;
  sourceHighlightId: string;
  targetHighlightId: string;
  connectionType: ConnectionType;  // 'auto' (algorithm) or 'manual' (user-created)
  similarityScore?: number;        // 0.0-1.0 for auto connections
  createdAt: string;
}

/**
 * Data for creating a new highlight
 */
export interface CreateHighlightData {
  filePath: string;
  content: string;
  selectionType: SelectionType;
  startOffset?: number;
  endOffset?: number;
  blockId?: string;
  color?: HighlightColor;
  categoryTag?: string;
  userNotes?: string;
  groupId?: string | null;
}

/**
 * Data for updating an existing highlight
 */
export interface UpdateHighlightData {
  content?: string;
  color?: HighlightColor;
  categoryTag?: string;
  userNotes?: string;
  groupId?: string | null;
}

/**
 * Data for creating a new bookmark
 */
export interface CreateBookmarkData {
  path: string;
  title: string;
  notes?: string;
  groupId?: string | null;
}

/**
 * Data for updating an existing bookmark
 */
export interface UpdateBookmarkData {
  title?: string;
  notes?: string;
  groupId?: string | null;
}

/**
 * Data for creating a new group
 */
export interface CreateGroupData {
  name: string;
  description?: string;
  type: GroupType;
  weavePath?: string;
  loomPath?: string;
  color?: string;
}

/**
 * Data for updating an existing group
 */
export interface UpdateGroupData {
  name?: string;
  description?: string;
  color?: string;
  displayOrder?: number;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  totalHighlights: number;
  totalBookmarks: number;
  totalGroups: number;
  totalConnections: number;
  totalBytes: number;
  lastUpdated: string;
}

/**
 * Search result (unified across files, highlights, bookmarks)
 */
export interface SearchResult {
  type: 'file' | 'highlight' | 'bookmark';
  id: string;
  title: string;
  path: string;
  snippet?: string;
  score?: number;
  data?: Highlight | CodexBookmark | any;
}

/**
 * Grouped items for display
 */
export interface GroupedItems<T> {
  group: HighlightGroup | null;  // null for ungrouped items
  items: T[];
  count: number;
}
