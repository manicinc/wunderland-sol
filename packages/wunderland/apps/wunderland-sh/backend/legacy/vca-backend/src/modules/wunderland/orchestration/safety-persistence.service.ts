/**
 * @file safety-persistence.service.ts
 * @description Persistence adapter bridging ISafetyPersistenceAdapter to DatabaseService.
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type { ISafetyPersistenceAdapter, AgentSafetyState, ContentFlag } from 'wunderland';

interface SafetyRow {
  seed_id: string;
  paused: number;
  stopped: number;
  dms_enabled: number;
  reason: string;
  updated_at: number;
}

interface ContentFlagRow {
  flag_id: string;
  entity_type: string;
  entity_id: string;
  author_seed_id: string;
  reason: string;
  severity: string;
  flagged_at: number;
  resolved: number;
  resolved_by: string | null;
  resolved_at: number | null;
}

@Injectable()
export class SafetyPersistenceService implements ISafetyPersistenceAdapter {
  constructor(private readonly db: DatabaseService) {}

  async loadAgentSafetyState(seedId: string): Promise<AgentSafetyState | null> {
    const row = await this.db.get<SafetyRow>(
      `SELECT seed_id, paused, stopped, dms_enabled, reason, updated_at
         FROM wunderland_agent_safety
        WHERE seed_id = ?`,
      [seedId]
    );

    if (!row) return null;

    return {
      seedId: String(row.seed_id),
      paused: Boolean(row.paused),
      stopped: Boolean(row.stopped),
      dmsEnabled: Boolean(row.dms_enabled),
      reason: String(row.reason),
      updatedAt: new Date(Number(row.updated_at)).toISOString(),
    };
  }

  async saveAgentSafetyState(state: AgentSafetyState): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO wunderland_agent_safety
        (seed_id, paused, stopped, dms_enabled, reason, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        state.seedId,
        state.paused ? 1 : 0,
        state.stopped ? 1 : 0,
        state.dmsEnabled ? 1 : 0,
        state.reason,
        new Date(state.updatedAt).getTime(),
      ]
    );
  }

  async loadContentFlags(opts: {
    resolved?: boolean;
    severity?: string;
    limit?: number;
  }): Promise<ContentFlag[]> {
    const where: string[] = [];
    const params: Array<string | number> = [];

    if (opts.resolved !== undefined) {
      where.push('resolved = ?');
      params.push(opts.resolved ? 1 : 0);
    }
    if (opts.severity !== undefined) {
      where.push('severity = ?');
      params.push(opts.severity);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const limitClause = opts.limit !== undefined ? `LIMIT ?` : '';
    if (opts.limit !== undefined) {
      params.push(opts.limit);
    }

    const rows = await this.db.all<ContentFlagRow>(
      `SELECT flag_id, entity_type, entity_id, author_seed_id, reason, severity, flagged_at, resolved, resolved_by, resolved_at
         FROM wunderland_content_flags
        ${whereClause}
        ORDER BY flagged_at DESC
        ${limitClause}`,
      params
    );

    return rows.map((row) => this.mapFlag(row));
  }

  async saveContentFlag(flag: ContentFlag): Promise<void> {
    await this.db.run(
      `INSERT INTO wunderland_content_flags
        (flag_id, entity_type, entity_id, author_seed_id, reason, severity, flagged_at, resolved, resolved_by, resolved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        flag.flagId,
        flag.entityType,
        flag.entityId,
        flag.authorSeedId,
        flag.reason,
        flag.severity,
        new Date(flag.flaggedAt).getTime(),
        flag.resolved ? 1 : 0,
        flag.resolvedBy ?? null,
        flag.resolvedAt ? new Date(flag.resolvedAt).getTime() : null,
      ]
    );
  }

  async updateContentFlag(flagId: string, updates: Partial<ContentFlag>): Promise<void> {
    const sets: string[] = [];
    const params: Array<string | number | null> = [];

    if (updates.resolved !== undefined) {
      sets.push('resolved = ?');
      params.push(updates.resolved ? 1 : 0);
    }
    if (updates.resolvedBy !== undefined) {
      sets.push('resolved_by = ?');
      params.push(updates.resolvedBy);
    }
    if (updates.resolvedAt !== undefined) {
      sets.push('resolved_at = ?');
      params.push(new Date(updates.resolvedAt).getTime());
    }
    if (updates.severity !== undefined) {
      sets.push('severity = ?');
      params.push(updates.severity);
    }
    if (updates.reason !== undefined) {
      sets.push('reason = ?');
      params.push(updates.reason);
    }

    if (sets.length === 0) return;

    params.push(flagId);
    await this.db.run(
      `UPDATE wunderland_content_flags SET ${sets.join(', ')} WHERE flag_id = ?`,
      params
    );
  }

  private mapFlag(row: ContentFlagRow): ContentFlag {
    return {
      flagId: String(row.flag_id),
      entityType: String(row.entity_type) as ContentFlag['entityType'],
      entityId: String(row.entity_id),
      authorSeedId: String(row.author_seed_id),
      reason: String(row.reason),
      severity: String(row.severity) as ContentFlag['severity'],
      flaggedAt: new Date(Number(row.flagged_at)).toISOString(),
      resolved: Boolean(row.resolved),
      resolvedBy: row.resolved_by ? String(row.resolved_by) : undefined,
      resolvedAt: row.resolved_at ? new Date(Number(row.resolved_at)).toISOString() : undefined,
    };
  }
}
