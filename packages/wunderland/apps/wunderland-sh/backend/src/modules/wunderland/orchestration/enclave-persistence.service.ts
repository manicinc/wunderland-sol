/**
 * @file enclave-persistence.service.ts
 * @description Persistence adapter bridging IEnclavePersistenceAdapter to DatabaseService.
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type { IEnclavePersistenceAdapter, EnclaveConfig } from 'wunderland';

@Injectable()
export class EnclavePersistenceService implements IEnclavePersistenceAdapter {
  constructor(private readonly db: DatabaseService) {}

  async loadAllEnclaves(): Promise<EnclaveConfig[]> {
    const rows = await this.db.all<{
      subreddit_id: string;
      name: string;
      display_name: string;
      description: string;
      topic_tags: string;
      creator_seed_id: string;
      min_level_to_post: string;
      rules: string;
      status: string;
    }>(
      `SELECT subreddit_id, name, display_name, description, topic_tags, creator_seed_id, min_level_to_post, rules, status
         FROM wunderland_subreddits`
    );

    return rows.map((row) => ({
      name: String(row.name),
      displayName: String(row.display_name),
      description: String(row.description),
      tags: JSON.parse(String(row.topic_tags || '[]')) as string[],
      creatorSeedId: String(row.creator_seed_id),
      minLevelToPost: row.min_level_to_post ? String(row.min_level_to_post) : undefined,
      rules: JSON.parse(String(row.rules || '[]')) as string[],
    }));
  }

  async loadMemberships(): Promise<Map<string, string[]>> {
    const rows = await this.db.all<{
      seed_id: string;
      name: string;
    }>(
      `SELECT m.seed_id, s.name
         FROM wunderland_subreddit_members m
         INNER JOIN wunderland_subreddits s ON s.subreddit_id = m.subreddit_id`,
    );

    const map = new Map<string, string[]>();
    for (const row of rows) {
      const enclaveName = String(row.name);
      const seedId = String(row.seed_id);
      const existing = map.get(enclaveName);
      if (existing) {
        existing.push(seedId);
      } else {
        map.set(enclaveName, [seedId]);
      }
    }

    return map;
  }

  async saveEnclave(config: EnclaveConfig): Promise<void> {
    const now = new Date().toISOString();
    const subredditId = this.db.generateId();
    await this.db.run(
      `INSERT INTO wunderland_subreddits
        (subreddit_id, name, display_name, description, rules, topic_tags, creator_seed_id, min_level_to_post, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET
         display_name = excluded.display_name,
         description = excluded.description,
         rules = excluded.rules,
         topic_tags = excluded.topic_tags,
         creator_seed_id = excluded.creator_seed_id,
         min_level_to_post = excluded.min_level_to_post,
         status = excluded.status`,
      [
        subredditId,
        config.name,
        config.displayName,
        config.description,
        JSON.stringify(config.rules),
        JSON.stringify(config.tags),
        config.creatorSeedId,
        config.minLevelToPost ?? null,
        'active',
        now,
      ]
    );
  }

  async saveMembership(seedId: string, enclaveName: string): Promise<void> {
    const row = await this.db.get<{ subreddit_id: string }>(
      `SELECT subreddit_id FROM wunderland_subreddits WHERE name = ? LIMIT 1`,
      [enclaveName],
    );

    if (!row?.subreddit_id) return;

    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO wunderland_subreddit_members
        (subreddit_id, seed_id, role, joined_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(subreddit_id, seed_id) DO NOTHING`,
      [row.subreddit_id, seedId, 'member', now]
    );
  }

  async removeMembership(seedId: string, enclaveName: string): Promise<void> {
    const row = await this.db.get<{ subreddit_id: string }>(
      `SELECT subreddit_id FROM wunderland_subreddits WHERE name = ? LIMIT 1`,
      [enclaveName],
    );

    if (!row?.subreddit_id) return;

    await this.db.run(
      `DELETE FROM wunderland_subreddit_members WHERE seed_id = ? AND subreddit_id = ?`,
      [seedId, row.subreddit_id]
    );
  }
}
