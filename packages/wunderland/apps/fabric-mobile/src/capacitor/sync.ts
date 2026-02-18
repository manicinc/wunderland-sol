/**
 * Backend Sync Service for FABRIC Mobile
 * Optional synchronization with any FABRIC-compatible backend
 */

import { query, execute, getSyncTimestamp, setSyncTimestamp } from './sqlite';

export interface SyncConfig {
  backendUrl: string;
  apiKey?: string;
  autoSync?: boolean;
  syncIntervalMs?: number;
}

interface SyncResult {
  success: boolean;
  strandsUploaded: number;
  strandsDownloaded: number;
  error?: string;
}

let syncConfig: SyncConfig | null = null;
let syncInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Configure backend sync
 */
export function configureSync(config: SyncConfig): void {
  syncConfig = config;

  // Clear existing interval
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }

  // Set up auto-sync if enabled
  if (config.autoSync && config.syncIntervalMs) {
    syncInterval = setInterval(() => {
      sync().catch(console.error);
    }, config.syncIntervalMs);
  }

  console.log('[Sync] Configured with backend:', config.backendUrl);
}

/**
 * Check if sync is configured
 */
export function isSyncConfigured(): boolean {
  return syncConfig !== null && Boolean(syncConfig.backendUrl);
}

/**
 * Get current sync configuration
 */
export function getSyncConfig(): SyncConfig | null {
  return syncConfig;
}

/**
 * Perform bidirectional sync with backend
 */
export async function sync(): Promise<SyncResult> {
  if (!syncConfig?.backendUrl) {
    return { success: false, strandsUploaded: 0, strandsDownloaded: 0, error: 'Sync not configured' };
  }

  const result: SyncResult = {
    success: true,
    strandsUploaded: 0,
    strandsDownloaded: 0,
  };

  try {
    // Get last sync timestamp
    const lastSync = await getSyncTimestamp('last_full_sync') || 0;

    // Push local changes to backend
    const localChanges = await query<any>(
      'SELECT * FROM strands WHERE updated_at > ?',
      [lastSync]
    );

    if (localChanges.length > 0) {
      const pushResponse = await fetch(`${syncConfig.backendUrl}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(syncConfig.apiKey && { 'Authorization': `Bearer ${syncConfig.apiKey}` }),
        },
        body: JSON.stringify({ strands: localChanges, lastSync }),
      });

      if (pushResponse.ok) {
        result.strandsUploaded = localChanges.length;
      } else {
        throw new Error(`Push failed: ${pushResponse.statusText}`);
      }
    }

    // Pull remote changes
    const pullResponse = await fetch(
      `${syncConfig.backendUrl}/api/sync/pull?since=${lastSync}`,
      {
        headers: {
          ...(syncConfig.apiKey && { 'Authorization': `Bearer ${syncConfig.apiKey}` }),
        },
      }
    );

    if (pullResponse.ok) {
      const remoteData = await pullResponse.json();

      // Upsert remote strands
      for (const strand of remoteData.strands || []) {
        await execute(
          `INSERT OR REPLACE INTO strands (id, title, content, loom_id, created_at, updated_at, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [strand.id, strand.title, strand.content, strand.loom_id, strand.created_at, strand.updated_at, JSON.stringify(strand.metadata)]
        );
        result.strandsDownloaded++;
      }

      // Upsert remote looms
      for (const loom of remoteData.looms || []) {
        await execute(
          `INSERT OR REPLACE INTO looms (id, title, description, weave_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [loom.id, loom.title, loom.description, loom.weave_id, loom.created_at, loom.updated_at]
        );
      }

      // Upsert remote weaves
      for (const weave of remoteData.weaves || []) {
        await execute(
          `INSERT OR REPLACE INTO weaves (id, title, description, created_at)
           VALUES (?, ?, ?, ?)`,
          [weave.id, weave.title, weave.description, weave.created_at]
        );
      }
    } else {
      throw new Error(`Pull failed: ${pullResponse.statusText}`);
    }

    // Update sync timestamp
    await setSyncTimestamp('last_full_sync', Date.now());

    console.log('[Sync] Complete:', result);
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Sync] Error:', error);
  }

  return result;
}

/**
 * Disconnect sync (stop auto-sync)
 */
export function disconnectSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  syncConfig = null;
  console.log('[Sync] Disconnected');
}

/**
 * Test connection to backend
 */
export async function testConnection(url: string, apiKey?: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`, {
      headers: {
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
