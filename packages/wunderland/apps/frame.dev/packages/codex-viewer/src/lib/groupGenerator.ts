/**
 * Auto-generate default groups from Quarry Codex hierarchy
 * @module codex/lib/groupGenerator
 *
 * @remarks
 * - Creates groups from weave and loom structure
 * - Auto-assigns highlights/bookmarks based on file path
 * - Idempotent: safe to run multiple times
 */

import type { KnowledgeTreeNode } from './types';
import { createGroup, getGroup, getAdapter } from './highlightsStorage';

/**
 * Generate default groups from knowledge tree hierarchy
 * Creates one group per weave and one per loom
 */
export async function generateDefaultGroups(knowledgeTree: KnowledgeTreeNode[]): Promise<void> {
  const adapter = await getAdapter();
  if (!adapter) {
    console.warn('[GroupGenerator] Storage adapter unavailable');
    return;
  }

  const groupsToCreate: Array<{
    name: string;
    weavePath: string;
    loomPath?: string;
    description?: string;
  }> = [];

  // Traverse tree to find weaves and looms
  const traverse = (nodes: KnowledgeTreeNode[], parentPath: string = '') => {
    nodes.forEach((node) => {
      if (node.level === 'weave') {
        // Create group for weave
        groupsToCreate.push({
          name: node.name,
          weavePath: node.path,
          description: `Auto-generated group for ${node.name} weave`,
        });

        // Traverse children for looms
        if (node.children) {
          traverse(node.children, node.path);
        }
      } else if (node.level === 'loom') {
        // Create group for loom
        groupsToCreate.push({
          name: `${parentPath.split('/').pop()} / ${node.name}`,
          weavePath: parentPath,
          loomPath: node.path,
          description: `Auto-generated group for ${node.name} loom`,
        });

        // Continue traversing for nested looms
        if (node.children) {
          traverse(node.children, parentPath);
        }
      } else if (node.children) {
        // Continue traversing
        traverse(node.children, parentPath);
      }
    });
  };

  traverse(knowledgeTree);

  // Create groups (skip if already exists)
  for (const groupData of groupsToCreate) {
    try {
      const existing = await adapter.get<{ id: string }>(
        `SELECT id FROM highlight_groups
         WHERE type = 'default' AND weave_path = ? AND (loom_path = ? OR (loom_path IS NULL AND ? IS NULL))
         LIMIT 1`,
        [groupData.weavePath, groupData.loomPath || null, groupData.loomPath || null]
      );

      if (!existing) {
        await createGroup({
          name: groupData.name,
          description: groupData.description,
          type: 'default',
          weavePath: groupData.weavePath,
          loomPath: groupData.loomPath,
          color: generateGroupColor(groupData.weavePath),
        });

        console.log('[GroupGenerator] Created group:', groupData.name);
      }
    } catch (error) {
      console.warn('[GroupGenerator] Failed to create group:', groupData.name, error);
    }
  }
}

/**
 * Auto-assign a file path to the appropriate default group
 * Returns group ID if found, null otherwise
 */
export async function autoAssignToGroup(filePath: string): Promise<string | null> {
  const adapter = await getAdapter();
  if (!adapter) return null;

  // Extract weave/loom from file path
  // Expected format: "weaves/technology/programming/typescript.md"
  const segments = filePath.split('/');

  if (segments[0] !== 'weaves' || segments.length < 2) {
    return null; // Not in weaves hierarchy
  }

  const weavePath = `weaves/${segments[1]}`;
  const loomPath = segments.length > 2 ? `${weavePath}/${segments[2]}` : null;

  try {
    // Find most specific matching group (loom > weave)
    const group = await adapter.get<{ id: string }>(
      `SELECT id FROM highlight_groups
       WHERE type = 'default'
       AND (
         (loom_path = ?) OR
         (loom_path IS NULL AND weave_path = ?)
       )
       ORDER BY loom_path DESC NULLS LAST
       LIMIT 1`,
      [loomPath, weavePath]
    );

    return group?.id || null;
  } catch (error) {
    console.warn('[GroupGenerator] Failed to auto-assign group:', filePath, error);
    return null;
  }
}

/**
 * Get the group ID for a given file path (for auto-assignment)
 * Checks both loom-level and weave-level groups
 */
export async function getGroupForPath(filePath: string): Promise<string | null> {
  return autoAssignToGroup(filePath);
}

/**
 * Generate a deterministic color for a group based on weave path
 * Uses hash to ensure consistent colors
 */
function generateGroupColor(weavePath: string): string {
  const colors = [
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#f59e0b', // amber-500
    '#10b981', // emerald-500
    '#6366f1', // indigo-500
  ];

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < weavePath.length; i++) {
    hash = ((hash << 5) - hash) + weavePath.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Regenerate all default groups (useful after major tree changes)
 * Removes orphaned default groups
 */
export async function regenerateDefaultGroups(knowledgeTree: KnowledgeTreeNode[]): Promise<void> {
  const adapter = await getAdapter();
  if (!adapter) return;

  // Get all current default groups
  const currentGroups = await adapter.all<{ id: string; weave_path: string; loom_path: string | null }>(
    `SELECT id, weave_path, loom_path FROM highlight_groups WHERE type = 'default'`
  );

  // Build set of valid paths from tree
  const validPaths = new Set<string>();

  const collectPaths = (nodes: KnowledgeTreeNode[], parentPath: string = '') => {
    nodes.forEach((node) => {
      if (node.level === 'weave') {
        validPaths.add(`${node.path}:null`);
        if (node.children) collectPaths(node.children, node.path);
      } else if (node.level === 'loom') {
        validPaths.add(`${parentPath}:${node.path}`);
        if (node.children) collectPaths(node.children, parentPath);
      } else if (node.children) {
        collectPaths(node.children, parentPath);
      }
    });
  };

  collectPaths(knowledgeTree);

  // Remove orphaned groups
  for (const group of currentGroups) {
    const key = `${group.weave_path}:${group.loom_path || 'null'}`;
    if (!validPaths.has(key)) {
      console.log('[GroupGenerator] Removing orphaned group:', key);
      await adapter.run(`DELETE FROM highlight_groups WHERE id = ?`, [group.id]);
    }
  }

  // Generate new groups
  await generateDefaultGroups(knowledgeTree);
}
