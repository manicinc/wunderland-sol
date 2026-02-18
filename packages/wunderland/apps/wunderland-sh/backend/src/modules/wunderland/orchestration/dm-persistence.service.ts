/**
 * @file dm-persistence.service.ts
 * @description Persistence adapter bridging IDMPersistenceAdapter to DatabaseService.
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import type { IDMPersistenceAdapter, DMThread, DMMessage } from 'wunderland';

interface DMThreadRow {
  thread_id: string;
  participant_a: string;
  participant_b: string;
  last_message_at: number;
  message_count: number;
  created_at: number;
}

interface DMMessageRow {
  message_id: string;
  thread_id: string;
  from_seed_id: string;
  content: string;
  manifest: string;
  reply_to_message_id: string | null;
  created_at: number;
}

@Injectable()
export class DMPersistenceService implements IDMPersistenceAdapter {
  constructor(private readonly db: DatabaseService) {}

  async saveThread(thread: DMThread): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO wunderland_dm_threads
        (thread_id, participant_a, participant_b, last_message_at, message_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        thread.threadId,
        thread.participants[0],
        thread.participants[1],
        new Date(thread.lastMessageAt).getTime(),
        thread.messageCount,
        new Date(thread.createdAt).getTime(),
      ]
    );
  }

  async loadThreads(seedId: string): Promise<DMThread[]> {
    const rows = await this.db.all<DMThreadRow>(
      `SELECT thread_id, participant_a, participant_b, last_message_at, message_count, created_at
         FROM wunderland_dm_threads
        WHERE participant_a = ? OR participant_b = ?
        ORDER BY last_message_at DESC`,
      [seedId, seedId]
    );

    return rows.map((row) => this.mapThread(row));
  }

  async saveMessage(message: DMMessage): Promise<void> {
    await this.db.run(
      `INSERT INTO wunderland_dm_messages
        (message_id, thread_id, from_seed_id, content, manifest, reply_to_message_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        message.messageId,
        message.threadId,
        message.fromSeedId,
        message.content,
        JSON.stringify(message.manifest),
        message.replyToMessageId ?? null,
        new Date(message.createdAt).getTime(),
      ]
    );
  }

  async loadMessages(threadId: string, limit: number): Promise<DMMessage[]> {
    const rows = await this.db.all<DMMessageRow>(
      `SELECT message_id, thread_id, from_seed_id, content, manifest, reply_to_message_id, created_at
         FROM wunderland_dm_messages
        WHERE thread_id = ?
        ORDER BY created_at DESC
        LIMIT ?`,
      [threadId, limit]
    );

    return rows.map((row) => ({
      messageId: String(row.message_id),
      threadId: String(row.thread_id),
      fromSeedId: String(row.from_seed_id),
      content: String(row.content),
      manifest: JSON.parse(String(row.manifest)),
      replyToMessageId: row.reply_to_message_id ? String(row.reply_to_message_id) : undefined,
      createdAt: new Date(Number(row.created_at)).toISOString(),
    }));
  }

  async loadPublicStats(seedId: string): Promise<{ totalSent: number; totalReceived: number }> {
    // Find all threads where this agent participates
    const sent = await this.db.get<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt
         FROM wunderland_dm_messages m
         INNER JOIN wunderland_dm_threads t ON m.thread_id = t.thread_id
        WHERE (t.participant_a = ? OR t.participant_b = ?)
          AND m.from_seed_id = ?`,
      [seedId, seedId, seedId]
    );

    const received = await this.db.get<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt
         FROM wunderland_dm_messages m
         INNER JOIN wunderland_dm_threads t ON m.thread_id = t.thread_id
        WHERE (t.participant_a = ? OR t.participant_b = ?)
          AND m.from_seed_id != ?`,
      [seedId, seedId, seedId]
    );

    return {
      totalSent: Number(sent?.cnt ?? 0),
      totalReceived: Number(received?.cnt ?? 0),
    };
  }

  private mapThread(row: DMThreadRow): DMThread {
    return {
      threadId: String(row.thread_id),
      participants: [String(row.participant_a), String(row.participant_b)],
      lastMessageAt: new Date(Number(row.last_message_at)).toISOString(),
      messageCount: Number(row.message_count),
      createdAt: new Date(Number(row.created_at)).toISOString(),
    };
  }
}
