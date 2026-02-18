/**
 * @file usagePersistence.service.ts
 * @description Persists daily credit usage to the database so usage survives server restarts.
 *              All methods degrade gracefully — if the DB write fails, the in-memory
 *              creditAllocationService continues operating.
 */

import { getAppDatabase } from '../database/appDatabase.js';
import { generateUniqueId } from '../../utils/ids.js';

export interface PersistedUsageRow {
  id: string;
  user_id: string;
  date_key: string;
  allocation_key: string;
  llm_used_usd: number;
  speech_used_usd: number;
  request_count: number;
  last_updated_at: number;
}

export const usagePersistenceService = {
  /**
   * Write-behind: upsert current in-memory usage to DB.
   * Called after every cost recording (fire-and-forget).
   */
  async persistUsage(
    userId: string,
    dateKey: string,
    allocationKey: string,
    llmUsedUsd: number,
    speechUsedUsd: number,
    requestCount: number,
  ): Promise<void> {
    try {
      const db = await getAppDatabase();
      const existing = await db.get<{ id: string }>(
        'SELECT id FROM usage_daily_ledger WHERE user_id = ? AND date_key = ?',
        [userId, dateKey],
      );
      if (existing) {
        await db.run(
          `UPDATE usage_daily_ledger
           SET llm_used_usd = ?, speech_used_usd = ?, request_count = ?,
               allocation_key = ?, last_updated_at = ?
           WHERE user_id = ? AND date_key = ?`,
          [llmUsedUsd, speechUsedUsd, requestCount, allocationKey, Date.now(), userId, dateKey],
        );
      } else {
        await db.run(
          `INSERT INTO usage_daily_ledger
            (id, user_id, date_key, allocation_key, llm_used_usd, speech_used_usd, request_count, last_updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateUniqueId(), userId, dateKey, allocationKey, llmUsedUsd, speechUsedUsd, requestCount, Date.now()],
        );
      }
    } catch (err) {
      console.warn('[UsagePersistence] Failed to persist usage, continuing in-memory only:', err);
    }
  },

  /**
   * Startup recovery: load today's usage for a user to seed the in-memory profiles map.
   */
  async recoverUsage(userId: string, dateKey: string): Promise<PersistedUsageRow | null> {
    try {
      const db = await getAppDatabase();
      const row = await db.get<PersistedUsageRow>(
        'SELECT * FROM usage_daily_ledger WHERE user_id = ? AND date_key = ?',
        [userId, dateKey],
      );
      return row ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Cleanup: remove ledger rows older than retainDays. Call from startup or a cron.
   */
  async pruneOldRecords(retainDays: number = 90): Promise<number> {
    try {
      const db = await getAppDatabase();
      const cutoffDate = new Date(Date.now() - retainDays * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const result = await db.run(
        'DELETE FROM usage_daily_ledger WHERE date_key < ?',
        [cutoffDate],
      );
      return (result as any)?.changes ?? 0;
    } catch {
      return 0;
    }
  },
};
