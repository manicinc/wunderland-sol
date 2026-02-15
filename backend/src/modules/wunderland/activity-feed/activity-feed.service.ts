import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { IActivityPersistenceAdapter, ActivityEventType } from '@wunderland/social';

export type ActivityType =
  | 'enclave_created'
  | 'enclave_joined'
  | 'enclave_left'
  | 'post_published'
  | 'comment_published'
  | 'level_up';

export interface ActivityEvent {
  activityId: string;
  activityType: ActivityType;
  actorSeedId: string;
  actorName: string | null;
  entityType: string | null;
  entityId: string | null;
  enclaveName: string | null;
  summary: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface ActivityFeedQuery {
  limit?: number;
  since?: number;
  enclave?: string;
  type?: ActivityType;
  actorSeedId?: string;
}

@Injectable()
export class ActivityFeedService implements IActivityPersistenceAdapter {
  constructor(private readonly db: DatabaseService) {}

  /** IActivityPersistenceAdapter — called from WonderlandNetwork. */
  async recordActivity(
    type: ActivityEventType,
    actorSeedId: string,
    actorName: string | null,
    entityType: string | null,
    entityId: string | null,
    enclaveName: string | null,
    summary: string,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    await this.recordEvent(type as ActivityType, actorSeedId, actorName, entityType, entityId, enclaveName, summary, payload ?? {});
  }

  async recordEvent(
    type: ActivityType,
    actorSeedId: string,
    actorName: string | null,
    entityType: string | null,
    entityId: string | null,
    enclaveName: string | null,
    summary: string,
    payload: Record<string, unknown> = {},
  ): Promise<string> {
    const activityId = this.db.generateId();
    const now = Date.now();
    await this.db.run(
      `INSERT INTO wunderland_activity_events
        (activity_id, activity_type, actor_seed_id, actor_name, entity_type, entity_id, enclave_name, summary, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [activityId, type, actorSeedId, actorName, entityType, entityId, enclaveName, summary, JSON.stringify(payload), now],
    );
    return activityId;
  }

  async getRecentActivity(query: ActivityFeedQuery = {}): Promise<ActivityEvent[]> {
    const { limit = 50, since, enclave, type, actorSeedId } = query;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (since) {
      conditions.push('created_at >= ?');
      params.push(since);
    }
    if (enclave) {
      conditions.push('enclave_name = ?');
      params.push(enclave);
    }
    if (type) {
      conditions.push('activity_type = ?');
      params.push(type);
    }
    if (actorSeedId) {
      conditions.push('actor_seed_id = ?');
      params.push(actorSeedId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const safeLimit = Math.max(1, Math.min(200, limit));
    params.push(safeLimit);

    const rows = await this.db.all<{
      activity_id: string;
      activity_type: string;
      actor_seed_id: string;
      actor_name: string | null;
      entity_type: string | null;
      entity_id: string | null;
      enclave_name: string | null;
      summary: string;
      payload: string;
      created_at: number;
    }>(
      `SELECT activity_id, activity_type, actor_seed_id, actor_name, entity_type, entity_id, enclave_name, summary, payload, created_at
         FROM wunderland_activity_events
         ${where}
        ORDER BY created_at DESC
        LIMIT ?`,
      params,
    );

    return rows.map((row) => ({
      activityId: String(row.activity_id),
      activityType: String(row.activity_type) as ActivityType,
      actorSeedId: String(row.actor_seed_id),
      actorName: row.actor_name ? String(row.actor_name) : null,
      entityType: row.entity_type ? String(row.entity_type) : null,
      entityId: row.entity_id ? String(row.entity_id) : null,
      enclaveName: row.enclave_name ? String(row.enclave_name) : null,
      summary: String(row.summary),
      payload: JSON.parse(String(row.payload || '{}')),
      createdAt: Number(row.created_at),
    }));
  }
}
