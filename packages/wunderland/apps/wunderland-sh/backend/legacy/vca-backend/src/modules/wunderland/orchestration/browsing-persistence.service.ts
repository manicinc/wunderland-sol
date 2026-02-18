/**
 * @file browsing-persistence.service.ts
 * @description Persistence adapter bridging IBrowsingPersistenceAdapter to DatabaseService.
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type { IBrowsingPersistenceAdapter, BrowsingSessionRecord } from 'wunderland';

interface BrowsingSessionRow {
  session_id: string;
  seed_id: string;
  enclaves_visited: string;
  posts_read: number;
  comments_written: number;
  votes_cast: number;
  started_at: number;
  finished_at: number;
}

@Injectable()
export class BrowsingPersistenceService implements IBrowsingPersistenceAdapter {
  constructor(private readonly db: DatabaseService) {}

  async saveBrowsingSession(sessionId: string, record: BrowsingSessionRecord): Promise<void> {
    await this.db.run(
      `INSERT INTO wunderland_browsing_sessions
        (session_id, seed_id, enclaves_visited, posts_read, comments_written, votes_cast, started_at, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        record.seedId,
        JSON.stringify(record.enclavesVisited),
        record.postsRead,
        record.commentsWritten,
        record.votesCast,
        new Date(record.startedAt).getTime(),
        new Date(record.finishedAt).getTime(),
      ]
    );
  }

  async loadLastSession(seedId: string): Promise<BrowsingSessionRecord | null> {
    const row = await this.db.get<BrowsingSessionRow>(
      `SELECT session_id, seed_id, enclaves_visited, posts_read, comments_written, votes_cast, started_at, finished_at
         FROM wunderland_browsing_sessions
        WHERE seed_id = ?
        ORDER BY finished_at DESC
        LIMIT 1`,
      [seedId]
    );

    if (!row) return null;

    return this.mapRow(row);
  }

  async loadSessionHistory(seedId: string, limit: number): Promise<BrowsingSessionRecord[]> {
    const rows = await this.db.all<BrowsingSessionRow>(
      `SELECT session_id, seed_id, enclaves_visited, posts_read, comments_written, votes_cast, started_at, finished_at
         FROM wunderland_browsing_sessions
        WHERE seed_id = ?
        ORDER BY finished_at DESC
        LIMIT ?`,
      [seedId, limit]
    );

    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: BrowsingSessionRow): BrowsingSessionRecord {
    return {
      seedId: String(row.seed_id),
      enclavesVisited: JSON.parse(String(row.enclaves_visited || '[]')) as string[],
      postsRead: Number(row.posts_read),
      commentsWritten: Number(row.comments_written),
      votesCast: Number(row.votes_cast),
      startedAt: new Date(Number(row.started_at)).toISOString(),
      finishedAt: new Date(Number(row.finished_at)).toISOString(),
    };
  }
}
