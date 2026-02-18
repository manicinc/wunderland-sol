/**
 * Hook for managing highlights
 * @module codex/hooks/useHighlights
 *
 * @remarks
 * - Loads highlights for current file or all highlights
 * - Provides CRUD operations
 * - Auto-assigns to groups based on file path
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  Highlight,
  CreateHighlightData,
  UpdateHighlightData,
  HighlightConnection,
} from '../lib/highlightTypes';
import * as storage from '../lib/highlightsStorage';
import { autoAssignToGroup } from '../lib/groupGenerator';

export interface UseHighlightsOptions {
  /** Filter highlights by file path (undefined = all highlights) */
  filePath?: string;
  /** Auto-load on mount */
  autoLoad?: boolean;
}

export interface UseHighlightsResult {
  /** Highlights list */
  highlights: Highlight[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Selected highlight for viewing/editing */
  selectedHighlight: Highlight | null;
  /** Set selected highlight */
  setSelectedHighlight: (highlight: Highlight | null) => void;
  /** Create a new highlight */
  createHighlight: (data: CreateHighlightData) => Promise<Highlight>;
  /** Update an existing highlight */
  updateHighlight: (id: string, updates: UpdateHighlightData) => Promise<void>;
  /** Delete a highlight */
  deleteHighlight: (id: string) => Promise<void>;
  /** Search highlights */
  searchHighlights: (query: string, limit?: number) => Promise<Highlight[]>;
  /** Get connections for a highlight */
  getConnections: (highlightId: string) => Promise<HighlightConnection[]>;
  /** Reload highlights */
  reload: () => Promise<void>;
}

/**
 * Manage highlights for current file or globally
 *
 * @example
 * ```tsx
 * // Load highlights for specific file
 * function FileHighlights({ filePath }: { filePath: string }) {
 *   const { highlights, createHighlight, updateHighlight } = useHighlights({ filePath });
 *
 *   const handleCreate = async () => {
 *     await createHighlight({
 *       filePath,
 *       content: 'Selected text',
 *       selectionType: 'text',
 *       startOffset: 0,
 *       endOffset: 13,
 *       color: 'yellow',
 *     });
 *   };
 *
 *   return <HighlightsList highlights={highlights} />;
 * }
 *
 * // Load all highlights
 * function AllHighlights() {
 *   const { highlights, searchHighlights } = useHighlights();
 *   return <HighlightsList highlights={highlights} />;
 * }
 * ```
 */
export function useHighlights(options: UseHighlightsOptions = {}): UseHighlightsResult {
  const { filePath, autoLoad = true } = options;

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);

  const loadHighlights = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const results = filePath
        ? await storage.getHighlightsByFile(filePath)
        : await storage.getAllHighlights();

      setHighlights(results);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load highlights';
      setError(message);
      console.error('[useHighlights] Failed to load highlights:', err);
    } finally {
      setLoading(false);
    }
  }, [filePath]);

  const createHighlight = useCallback(
    async (data: CreateHighlightData): Promise<Highlight> => {
      setError(null);

      try {
        // Auto-assign to group if not specified
        if (!data.groupId) {
          const groupId = await autoAssignToGroup(data.filePath);
          if (groupId) {
            data.groupId = groupId;
          }
        }

        const highlight = await storage.createHighlight(data);
        await loadHighlights();
        return highlight;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create highlight';
        setError(message);
        console.error('[useHighlights] Failed to create highlight:', err);
        throw err;
      }
    },
    [loadHighlights]
  );

  const updateHighlight = useCallback(
    async (id: string, updates: UpdateHighlightData): Promise<void> => {
      setError(null);

      try {
        await storage.updateHighlight(id, updates);
        await loadHighlights();

        // Update selected highlight if it was updated
        if (selectedHighlight && selectedHighlight.id === id) {
          const updated = await storage.getHighlight(id);
          setSelectedHighlight(updated);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update highlight';
        setError(message);
        console.error('[useHighlights] Failed to update highlight:', err);
        throw err;
      }
    },
    [loadHighlights, selectedHighlight]
  );

  const deleteHighlight = useCallback(
    async (id: string): Promise<void> => {
      setError(null);

      try {
        await storage.deleteHighlight(id);
        await loadHighlights();

        // Clear selection if deleted highlight was selected
        if (selectedHighlight && selectedHighlight.id === id) {
          setSelectedHighlight(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete highlight';
        setError(message);
        console.error('[useHighlights] Failed to delete highlight:', err);
        throw err;
      }
    },
    [loadHighlights, selectedHighlight]
  );

  const searchHighlights = useCallback(
    async (query: string, limit: number = 50): Promise<Highlight[]> => {
      setError(null);

      try {
        return await storage.searchHighlights(query, limit);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to search highlights';
        setError(message);
        console.error('[useHighlights] Failed to search highlights:', err);
        return [];
      }
    },
    []
  );

  const getConnections = useCallback(
    async (highlightId: string): Promise<HighlightConnection[]> => {
      setError(null);

      try {
        return await storage.getConnections(highlightId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get connections';
        setError(message);
        console.error('[useHighlights] Failed to get connections:', err);
        return [];
      }
    },
    []
  );

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadHighlights();
    }
  }, [autoLoad, loadHighlights]);

  return {
    highlights,
    loading,
    error,
    selectedHighlight,
    setSelectedHighlight,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    searchHighlights,
    getConnections,
    reload: loadHighlights,
  };
}
