import { generateUniqueId as uuidv4 } from '../../utils/ids.js';
import type { StorageAdapter, StorageRunResult } from '@framers/sql-storage-adapter';
import type { PrismaClient as AgentOSPrismaClient } from '@framers/agentos/stubs/prismaClient';
import { getAppDatabase } from '../../core/database/appDatabase.js';

type ConversationRecord = {
  id: string;
  user_id: string | null;
  gmi_instance_id: string | null;
  title: string | null;
  language: string | null;
  session_details: string | null;
  is_archived: number;
  tags: string | null;
  created_at: number;
  updated_at: number;
};

type ConversationMessageRecord = {
  id: string;
  conversation_id: string;
  role: string;
  content: string | null;
  timestamp: number;
  created_at: number;
  tool_calls: string | null;
  tool_call_id: string | null;
  metadata: string | null;
  multimodal_data: string | null;
  audio_url: string | null;
  audio_transcript: string | null;
  voice_settings: string | null;
};

type UpsertConversationArgs = {
  where: { id: string };
  update: Record<string, unknown>;
  create: Record<string, unknown>;
};

type FindUniqueConversationArgs =
  | {
      where: { id: string };
      select?: Record<string, boolean>;
    }
  | {
      where: { id: string };
      include: {
        messages?: {
          orderBy?: { createdAt?: 'asc' | 'desc' };
        };
      };
    };

type DeleteConversationArgs = { where: { id: string } };

type DeleteManyMessagesArgs = { where: { conversationId: string } };

type CreateManyMessagesArgs = {
  data: Array<Record<string, unknown>>;
};

const schemaCache = new WeakSet<StorageAdapter>();

async function ensureSchema(adapter: StorageAdapter): Promise<void> {
  if (schemaCache.has(adapter)) {
    return;
  }

  await adapter.exec(`
    CREATE TABLE IF NOT EXISTS agentos_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      gmi_instance_id TEXT,
      title TEXT,
      language TEXT,
      session_details TEXT,
      is_archived INTEGER DEFAULT 0,
      tags TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agentos_conversation_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT,
      timestamp INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      tool_calls TEXT,
      tool_call_id TEXT,
      metadata TEXT,
      multimodal_data TEXT,
      audio_url TEXT,
      audio_transcript TEXT,
      voice_settings TEXT,
      FOREIGN KEY (conversation_id) REFERENCES agentos_conversations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_agentos_conversations_updated
      ON agentos_conversations(updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_agentos_conversation_messages_conversation
      ON agentos_conversation_messages(conversation_id, created_at);
  `);

  schemaCache.add(adapter);
}

function toBool(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || value.length === 0) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('[AgentOS SQL] Failed to parse JSON column.', { value, error });
    return fallback;
  }
}

function serialiseJson(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.warn('[AgentOS SQL] Failed to stringify JSON value.', { value, error });
    return null;
  }
}

function hydrateConversation(record: ConversationRecord | null) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    userId: record.user_id ?? null,
    gmiInstanceId: record.gmi_instance_id ?? null,
    title: record.title ?? null,
    language: record.language ?? null,
    sessionDetails: parseJson<Record<string, unknown>>(record.session_details, {}),
    isArchived: toBool(record.is_archived),
    tags: parseJson<string[]>(record.tags, []),
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
  };
}

function hydrateConversationMessage(record: ConversationMessageRecord) {
  return {
    id: record.id,
    conversationId: record.conversation_id,
    role: record.role,
    content: record.content,
    timestamp: record.timestamp,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.created_at),
    toolCalls: parseJson<Record<string, unknown> | null>(record.tool_calls, null),
    toolCallId: record.tool_call_id ?? null,
    metadata: parseJson<Record<string, unknown> | null>(record.metadata, null),
    multimodalData: parseJson<Record<string, unknown> | null>(record.multimodal_data, null),
    audioUrl: record.audio_url ?? null,
    audioTranscript: record.audio_transcript ?? null,
    voiceSettings: parseJson<Record<string, unknown> | null>(record.voice_settings, null),
  };
}

class AgentOSSqlPrismaClient {
  private readonly adapter: StorageAdapter;

  public readonly conversation = {
    upsert: (args: UpsertConversationArgs) => this.upsertConversation(args),
    delete: (args: DeleteConversationArgs) => this.deleteConversation(args),
    findUnique: (args: FindUniqueConversationArgs) => this.findConversation(args),
  };

  public readonly conversationMessage = {
    deleteMany: (args: DeleteManyMessagesArgs) => this.deleteManyMessages(args),
    createMany: (args: CreateManyMessagesArgs) => this.createManyMessages(args),
  };

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  public async $connect(): Promise<void> {
    // Connection handled by app database bootstrap.
  }

  public async $disconnect(): Promise<void> {
    // No-op: adapter lifecycle managed by app database module.
  }

  public async $transaction<T>(callback: (tx: AgentOSSqlPrismaClient) => Promise<T>): Promise<T> {
    // Prefer adapter.transaction when the implementation supports async callbacks safely
    if (typeof this.adapter.transaction === 'function' && this.adapter.kind !== 'better-sqlite3') {
      return this.adapter.transaction(async (trx) => {
        await ensureSchema(trx);
        const scopedClient = new AgentOSSqlPrismaClient(trx);
        return callback(scopedClient);
      });
    }

    // Manual transaction for better-sqlite3 or when adapter doesn't expose a safe async transaction wrapper
    try {
      await this.adapter.exec('BEGIN');
      await ensureSchema(this.adapter);
      const result = await callback(this);
      await this.adapter.exec('COMMIT');
      return result;
    } catch (error) {
      try { await this.adapter.exec('ROLLBACK'); } catch { /* ignore rollback failure */ }
      throw error;
    }
  }

  private async upsertConversation(args: UpsertConversationArgs): Promise<void> {
    const { where, update, create } = args;
    const now = Date.now();
    const existing = await this.adapter.get<ConversationRecord>(
      'SELECT * FROM agentos_conversations WHERE id = ?',
      [where.id],
    );

    if (existing) {
      await this.adapter.run(
        `
          UPDATE agentos_conversations
             SET user_id = ?,
                 gmi_instance_id = ?,
                 title = ?,
                 language = ?,
                 session_details = ?,
                 is_archived = ?,
                 tags = ?,
                 updated_at = ?
           WHERE id = ?
        `,
        [
          update.userId ?? existing.user_id ?? null,
          update.gmiInstanceId ?? existing.gmi_instance_id ?? null,
          update.title ?? existing.title ?? null,
          update.language ?? existing.language ?? null,
          serialiseJson(update.sessionDetails ?? parseJson(existing.session_details, {})),
          toBool(update.isArchived ?? existing.is_archived) ? 1 : 0,
          serialiseJson(update.tags ?? parseJson(existing.tags, [])),
          update.updatedAt instanceof Date ? update.updatedAt.getTime() : now,
          where.id,
        ],
      );
      return;
    }

    const createdAt =
      create.createdAt instanceof Date
        ? create.createdAt.getTime()
        : typeof create.createdAt === 'number'
        ? create.createdAt
        : now;

    await this.adapter.run(
      `
        INSERT INTO agentos_conversations (
          id,
          user_id,
          gmi_instance_id,
          title,
          language,
          session_details,
          is_archived,
          tags,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        create.id ?? where.id,
        create.userId ?? null,
        create.gmiInstanceId ?? null,
        create.title ?? null,
        create.language ?? null,
        serialiseJson(create.sessionDetails ?? {}),
        toBool(create.isArchived) ? 1 : 0,
        serialiseJson(create.tags ?? []),
        createdAt,
        create.updatedAt instanceof Date ? create.updatedAt.getTime() : now,
      ],
    );
  }

  private async deleteConversation({ where }: DeleteConversationArgs): Promise<StorageRunResult> {
    return this.adapter.run(
      'DELETE FROM agentos_conversations WHERE id = ?',
      [where.id],
    );
  }

  private async findConversation(args: FindUniqueConversationArgs): Promise<any> {
    const record = await this.adapter.get<ConversationRecord>(
      'SELECT * FROM agentos_conversations WHERE id = ?',
      [args.where.id],
    );

    if (!record) {
      return null;
    }

    const conversation = hydrateConversation(record)!;

    if ('select' in args && args.select) {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(args.select)) {
        if (!value) continue;
        result[key] = (conversation as any)[key];
      }
      return result;
    }

    if ('include' in args && args.include?.messages) {
      const order = args.include.messages.orderBy?.createdAt === 'desc' ? 'DESC' : 'ASC';
      const rows = await this.adapter.all<ConversationMessageRecord>(
        `SELECT * FROM agentos_conversation_messages WHERE conversation_id = ? ORDER BY created_at ${order}`,
        [conversation.id],
      );
      (conversation as any).messages = rows.map(hydrateConversationMessage);
    }

    return conversation;
  }

  private async deleteManyMessages({ where }: DeleteManyMessagesArgs): Promise<void> {
    await this.adapter.run(
      'DELETE FROM agentos_conversation_messages WHERE conversation_id = ?',
      [where.conversationId],
    );
  }

  private async createManyMessages({ data }: CreateManyMessagesArgs): Promise<void> {
    if (!Array.isArray(data) || data.length === 0) {
      return;
    }

    const operations = data.map((item) => {
      const id = typeof item.id === 'string' && item.id.length > 0 ? item.id : uuidv4();
      const conversationId = String(item.conversationId ?? item.conversation_id);
      const role = String(item.role);
      const content =
        typeof item.content === 'string' ? item.content : serialiseJson(item.content);
      const timestamp = item.timestamp instanceof Date
        ? item.timestamp.getTime()
        : typeof item.timestamp === 'number'
        ? item.timestamp
        : Date.now();
      const createdAt = item.createdAt instanceof Date
        ? item.createdAt.getTime()
        : timestamp;

      return this.adapter.run(
        `
          INSERT INTO agentos_conversation_messages (
            id,
            conversation_id,
            role,
            content,
            timestamp,
            created_at,
            tool_calls,
            tool_call_id,
            metadata,
            multimodal_data,
            audio_url,
            audio_transcript,
            voice_settings
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          conversationId,
          role,
          content ?? null,
          timestamp,
          createdAt,
          serialiseJson(item.tool_calls ?? (item as any).toolCalls ?? null),
          item.toolCallId ?? (item as any).tool_call_id ?? null,
          serialiseJson((item as any).metadata ?? null),
          serialiseJson((item as any).multimodalData ?? null),
          (item as any).audioUrl ?? null,
          (item as any).audioTranscript ?? null,
          serialiseJson((item as any).voiceSettings ?? null),
        ],
      );
    });

    await Promise.all(operations);
  }
}

export async function createAgentOSSqlClient(): Promise<AgentOSPrismaClient> {
  let adapter: StorageAdapter;
  try {
    adapter = getAppDatabase();
  } catch (error) {
    throw new Error(
      '[AgentOS SQL] App database has not been initialised. Call initializeAppDatabase() before enabling AgentOS.',
    );
  }
  await ensureSchema(adapter);
  const client = new AgentOSSqlPrismaClient(adapter);
  return client as unknown as AgentOSPrismaClient;
}

