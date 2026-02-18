// File: backend/src/core/memory/SqliteMemoryAdapter.ts
/**
 * @file SqliteMemoryAdapter.ts
 * @version 2.0.0
 * @description Universal storage implementation of IMemoryAdapter using @framers/sql-storage-adapter
 * V2.0.0: Migrated to use @framers/sql-storage-adapter for better cross-platform support
 * V1.2.0: Made SQLite persistence conditional via ENABLE_SQLITE_MEMORY env var.
 * V1.1.0: Added tool_calls and tool_call_id columns.
 */

import path from 'path';
import fs from 'fs';
import { generateUniqueId as uuidv4 } from '../../utils/ids.js';
import { resolveStorageAdapter, type StorageAdapter } from '@framers/sql-storage-adapter';
import type {
  IMemoryAdapter,
  IStoredConversationTurn,
  IMemoryRetrievalOptions,
} from './IMemoryAdapter.js';

const DB_DIR = path.join(process.cwd(), 'db_data');
const DB_PATH = path.join(DB_DIR, 'vca_memory.sqlite3');

// Check environment variable to enable/disable SQLite persistence
const SQLITE_MEMORY_ENABLED = process.env.ENABLE_SQLITE_MEMORY === 'true';

export class SqliteMemoryAdapter implements IMemoryAdapter {
  private db: StorageAdapter | null = null;
  private isEnabled: boolean = SQLITE_MEMORY_ENABLED;

  private async ensureConversationPersonaColumn(): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      const columns = await this.db.all<{ name: string }>('PRAGMA table_info(conversations);');
      const hasPersonaColumn = columns.some(column => column.name === 'persona');
      
      if (!hasPersonaColumn) {
        console.log('[SqliteMemoryAdapter] Adding missing persona column to conversations table.');
        await this.db.exec('ALTER TABLE conversations ADD COLUMN persona TEXT;');
      }
    } catch (error) {
      console.error('[SqliteMemoryAdapter] Failed to ensure persona column exists:', error);
      throw error;
    }
  }

  public async initialize(): Promise<void> {
    if (!this.isEnabled) {
      console.log('[SqliteMemoryAdapter] SQLite memory is DISABLED via ENABLE_SQLITE_MEMORY environment variable.');
      return;
    }

    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
        console.log(`[SqliteMemoryAdapter] Created database directory: ${DB_DIR}`);
      }

      // Use sql-storage-adapter with auto-detection
      this.db = await resolveStorageAdapter({
        filePath: DB_PATH,
        priority: ['better-sqlite3', 'sqljs'],
      });

      await this.db.open({ filePath: DB_PATH });
      console.log(`[SqliteMemoryAdapter] Connected using ${this.db.kind} adapter: ${DB_PATH}`);
      
      // Create conversations table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
          conversationId TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          agentId TEXT, 
          createdAt INTEGER NOT NULL,
          lastActivity INTEGER NOT NULL,
          summary TEXT,
          title TEXT,
          persona TEXT
        );
      `);
      
      await this.db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_activity ON conversations (userId, lastActivity);');
      await this.db.exec('CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (userId);');
      await this.ensureConversationPersonaColumn();

      // Create conversation_turns table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS conversation_turns (
          storageId TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          conversationId TEXT NOT NULL,
          agentId TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
          content TEXT,
          timestamp INTEGER NOT NULL,
          model TEXT,
          prompt_tokens INTEGER,
          completion_tokens INTEGER,
          total_tokens INTEGER,
          tool_calls TEXT,
          tool_call_id TEXT,
          metadata TEXT,
          summary TEXT,
          FOREIGN KEY (conversationId) REFERENCES conversations(conversationId) ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);

      await this.db.exec('CREATE INDEX IF NOT EXISTS idx_turns_conversation ON conversation_turns (conversationId);');
      await this.db.exec('CREATE INDEX IF NOT EXISTS idx_turns_timestamp ON conversation_turns (timestamp);');
      await this.db.exec('CREATE INDEX IF NOT EXISTS idx_turns_user ON conversation_turns (userId);');

      console.log('[SqliteMemoryAdapter] Memory database initialized successfully');
    } catch (error) {
      console.error('[SqliteMemoryAdapter] Failed to initialize:', error);
      throw error;
    }
  }

  public async storeConversationTurn(
    userId: string,
    conversationId: string,
    turnData: Omit<IStoredConversationTurn, 'storageId' | 'conversationId'>
  ): Promise<string> {
    if (!this.isEnabled || !this.db) {
      return uuidv4(); // Return dummy ID when disabled
    }

    const storageId = uuidv4();
    const {
      agentId, role, content, timestamp, model,
      usage, tool_calls, tool_call_id, metadata, summary,
    } = turnData;

    try {
      // Ensure conversation exists
      await this.db.run(
        `INSERT INTO conversations (conversationId, userId, agentId, createdAt, lastActivity)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(conversationId) DO UPDATE SET lastActivity=excluded.lastActivity`,
        [conversationId, userId, agentId, timestamp, timestamp]
      );

      // Insert turn
      await this.db.run(
        `INSERT INTO conversation_turns (
          storageId, userId, conversationId, agentId, role, content, timestamp,
          model, prompt_tokens, completion_tokens, total_tokens,
          tool_calls, tool_call_id, metadata, summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          storageId, userId, conversationId, agentId, role, content, timestamp,
          model,
          usage?.prompt_tokens ?? null,
          usage?.completion_tokens ?? null,
          usage?.total_tokens ?? null,
          tool_calls ? JSON.stringify(tool_calls) : null,
          tool_call_id,
          metadata ? JSON.stringify(metadata) : null,
          summary
        ]
      );

      console.log(`[SqliteMemoryAdapter] Stored turn ${storageId} for conv ${conversationId}`);
      return storageId;
    } catch (error) {
      console.error(`[SqliteMemoryAdapter] Error storing turn for conv ${conversationId}:`, error);
      throw error;
    }
  }

  public async retrieveConversationTurns(
    userId: string,
    conversationId: string,
    options?: IMemoryRetrievalOptions
  ): Promise<IStoredConversationTurn[]> {
    if (!this.isEnabled || !this.db) {
      return [];
    }

    try {
      let query = `
        SELECT * FROM conversation_turns
        WHERE userId = ? AND conversationId = ?
        ORDER BY timestamp ASC
      `;
      const params: any[] = [userId, conversationId];

      if (options?.limit) {
        query += ` LIMIT ?`;
        params.push(options.limit);
      }

      const rows = await this.db.all<any>(query, params);

      return rows.map(row => ({
        storageId: row.storageId,
        conversationId: row.conversationId,
        agentId: row.agentId,
        role: row.role,
        content: row.content,
        timestamp: row.timestamp,
        model: row.model,
        usage: {
          prompt_tokens: row.prompt_tokens,
          completion_tokens: row.completion_tokens,
          total_tokens: row.total_tokens
        },
        tool_calls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
        tool_call_id: row.tool_call_id,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        summary: row.summary
      }));
    } catch (error) {
      console.error(`[SqliteMemoryAdapter] Error retrieving conversation ${conversationId}:`, error);
      return [];
    }
  }

  public async listUserConversations(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Array<{ conversationId: string; lastActivity: number; agentId?: string; summary?: string; title?: string; turnCount?: number; persona?: string | null }>> {
    if (!this.isEnabled || !this.db) {
      return [];
    }

    try {
      const rows = await this.db.all<any>(
        `SELECT c.conversationId, c.lastActivity, c.agentId, c.summary, c.title, c.persona,
                COUNT(t.storageId) as turnCount
         FROM conversations c
         LEFT JOIN conversation_turns t ON c.conversationId = t.conversationId
         WHERE c.userId = ?
         GROUP BY c.conversationId
         ORDER BY c.lastActivity DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      return rows.map(row => ({
        conversationId: row.conversationId,
        lastActivity: row.lastActivity,
        agentId: row.agentId,
        summary: row.summary,
        title: row.title,
        turnCount: row.turnCount,
        persona: row.persona
      }));
    } catch (error) {
      console.error(`[SqliteMemoryAdapter] Error listing conversations for user ${userId}:`, error);
      return [];
    }
  }

  public async setConversationPersona(
    userId: string,
    conversationId: string,
    agentId: string,
    persona: string | null,
    timestamp: number = Date.now(),
  ): Promise<void> {
    if (!this.isEnabled || !this.db) {
      return;
    }

    try {
      await this.db.run(
        `INSERT INTO conversations (conversationId, userId, agentId, createdAt, lastActivity, persona)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(conversationId) DO UPDATE SET persona=excluded.persona, lastActivity=excluded.lastActivity`,
        [conversationId, userId, agentId, timestamp, timestamp, persona]
      );
    } catch (error) {
      console.error(`[SqliteMemoryAdapter] Error setting persona for conv ${conversationId}:`, error);
      throw error;
    }
  }

  public async getConversationPersona(userId: string, conversationId: string): Promise<string | null> {
    if (!this.isEnabled || !this.db) {
      return null;
    }

    try {
      const row = await this.db.get<{ persona: string | null }>(
        'SELECT persona FROM conversations WHERE userId = ? AND conversationId = ?',
        [userId, conversationId]
      );
      return row?.persona ?? null;
    } catch (error) {
      console.error(`[SqliteMemoryAdapter] Error getting persona for conv ${conversationId}:`, error);
      return null;
    }
  }

  public async pruneHistory(
    userId: string,
    criteria?: Record<string, any>
  ): Promise<{ prunedTurnsCount: number; remainingTurnsCount: number }> {
    if (!this.isEnabled || !this.db) {
      return { prunedTurnsCount: 0, remainingTurnsCount: 0 };
    }

    try {
      const beforeCount = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM conversation_turns WHERE userId = ?',
        [userId]
      );

      if (criteria?.beforeTimestamp) {
        await this.db.run(
          'DELETE FROM conversation_turns WHERE userId = ? AND timestamp < ?',
          [userId, criteria.beforeTimestamp]
        );
      }

      const afterCount = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM conversation_turns WHERE userId = ?',
        [userId]
      );

      return {
        prunedTurnsCount: (beforeCount?.count ?? 0) - (afterCount?.count ?? 0),
        remainingTurnsCount: afterCount?.count ?? 0
      };
    } catch (error) {
      console.error(`[SqliteMemoryAdapter] Error pruning history for user ${userId}:`, error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      console.log('[SqliteMemoryAdapter] Disconnected from database');
    }
  }
}

export const sqliteMemoryAdapter = new SqliteMemoryAdapter();
