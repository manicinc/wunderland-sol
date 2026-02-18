/**
 * Hook for managing highlight/bookmark groups
 * @module codex/hooks/useGroups
 *
 * @remarks
 * - Loads all groups on mount
 * - Provides CRUD operations for custom groups
 * - All default groups are editable
 */

import { useState, useEffect, useCallback } from 'react';
import type { HighlightGroup, CreateGroupData, UpdateGroupData } from '../lib/highlightTypes';
import * as storage from '../lib/highlightsStorage';

export interface UseGroupsResult {
  /** All groups (default + custom), sorted by displayOrder */
  groups: HighlightGroup[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Create a new custom group */
  createCustomGroup: (data: Omit<CreateGroupData, 'type'>) => Promise<HighlightGroup>;
  /** Update a group (name, description, color, displayOrder) */
  updateGroup: (id: string, updates: UpdateGroupData) => Promise<void>;
  /** Delete a group */
  deleteGroup: (id: string) => Promise<void>;
  /** Reload groups from storage */
  reload: () => Promise<void>;
  /** Get groups by type */
  getByType: (type: 'default' | 'custom') => HighlightGroup[];
}

/**
 * Manage highlight/bookmark groups
 *
 * @example
 * ```tsx
 * function GroupsManager() {
 *   const { groups, createCustomGroup, updateGroup, deleteGroup } = useGroups();
 *
 *   const handleCreate = async () => {
 *     await createCustomGroup({
 *       name: 'Important',
 *       description: 'Important highlights',
 *       color: '#ff0000',
 *     });
 *   };
 *
 *   return <GroupList groups={groups} />;
 * }
 * ```
 */
export function useGroups(): UseGroupsResult {
  const [groups, setGroups] = useState<HighlightGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const allGroups = await storage.getGroups();
      setGroups(allGroups);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load groups';
      setError(message);
      console.error('[useGroups] Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCustomGroup = useCallback(
    async (data: Omit<CreateGroupData, 'type'>): Promise<HighlightGroup> => {
      setError(null);

      try {
        const group = await storage.createGroup({
          ...data,
          type: 'custom',
        });

        await loadGroups();
        return group;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create group';
        setError(message);
        console.error('[useGroups] Failed to create group:', err);
        throw err;
      }
    },
    [loadGroups]
  );

  const updateGroup = useCallback(
    async (id: string, updates: UpdateGroupData): Promise<void> => {
      setError(null);

      try {
        await storage.updateGroup(id, updates);
        await loadGroups();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update group';
        setError(message);
        console.error('[useGroups] Failed to update group:', err);
        throw err;
      }
    },
    [loadGroups]
  );

  const deleteGroup = useCallback(
    async (id: string): Promise<void> => {
      setError(null);

      try {
        await storage.deleteGroup(id);
        await loadGroups();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete group';
        setError(message);
        console.error('[useGroups] Failed to delete group:', err);
        throw err;
      }
    },
    [loadGroups]
  );

  const getByType = useCallback(
    (type: 'default' | 'custom'): HighlightGroup[] => {
      return groups.filter((g) => g.type === type);
    },
    [groups]
  );

  // Load groups on mount
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  return {
    groups,
    loading,
    error,
    createCustomGroup,
    updateGroup,
    deleteGroup,
    reload: loadGroups,
    getByType,
  };
}
