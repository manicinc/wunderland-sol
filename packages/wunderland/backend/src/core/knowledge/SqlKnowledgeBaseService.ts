import { generateUniqueId as uuidv4 } from '../../utils/ids.js';
import type { StorageAdapter } from '@framers/sql-storage-adapter';
import { getAppDatabase } from '../database/appDatabase.js';
import type { IKnowledgeBaseService, IKnowledgeItem } from './IKnowledgeBaseService.js';

type KnowledgeRecord = {
  id: string;
  type: string;
  tags: string | null;
  content: string;
  metadata: string | null;
  created_at: number;
  updated_at: number;
};

const INITIALISED_ADAPTERS = new WeakSet<StorageAdapter>();

async function ensureSchema(adapter: StorageAdapter): Promise<void> {
  if (INITIALISED_ADAPTERS.has(adapter)) {
    return;
  }

  await adapter.exec(`
    CREATE TABLE IF NOT EXISTS agentos_knowledge_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      tags TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_agentos_kb_type ON agentos_knowledge_items(type);
    CREATE INDEX IF NOT EXISTS idx_agentos_kb_created ON agentos_knowledge_items(created_at DESC);
  `);

  INITIALISED_ADAPTERS.add(adapter);
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || value.length === 0) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('[AgentOS][KB/SQL] Failed to parse JSON value.', { value, error });
    return fallback;
  }
}

function serialiseJson(value: unknown): string {
  if (value === undefined || value === null) {
    return JSON.stringify([]);
  }
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.warn('[AgentOS][KB/SQL] Failed to serialise JSON value.', { value, error });
    return JSON.stringify([]);
  }
}

function hydrateRecord(record: KnowledgeRecord): IKnowledgeItem {
  return {
    id: record.id,
    type: record.type,
    tags: parseJson<string[]>(record.tags, []),
    content: record.content,
    metadata: parseJson<Record<string, unknown> | undefined>(record.metadata, undefined),
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
  };
}

export class SqlKnowledgeBaseService implements IKnowledgeBaseService {
  private adapter: StorageAdapter | null = null;

  async initialize(): Promise<void> {
    if (this.adapter) {
      return;
    }
    let adapter: StorageAdapter;
    try {
      adapter = getAppDatabase();
    } catch (error) {
      throw new Error('[AgentOS][KB/SQL] App database has not been initialised. Ensure initializeAppDatabase() runs before using the knowledge base.');
    }
    await ensureSchema(adapter);
    this.adapter = adapter;
  }

  private async getAdapter(): Promise<StorageAdapter> {
    if (!this.adapter) {
      await this.initialize();
    }
    return this.adapter!;
  }

  async getKnowledgeItemById(id: string): Promise<IKnowledgeItem | null> {
    const adapter = await this.getAdapter();
    const record = await adapter.get<KnowledgeRecord>(
      'SELECT * FROM agentos_knowledge_items WHERE id = ?',
      [id],
    );
    return record ? hydrateRecord(record) : null;
  }

  async findKnowledgeItemsByTags(tags: string[]): Promise<IKnowledgeItem[]> {
    if (!tags.length) return [];
    const adapter = await this.getAdapter();
    const rows = await adapter.all<KnowledgeRecord>('SELECT * FROM agentos_knowledge_items');

    const normalised = tags.map((tag) => tag.toLowerCase());
    return rows
      .map(hydrateRecord)
      .filter((item) =>
        item.tags.some((tag) => normalised.includes(tag.toLowerCase())),
      );
  }

  async searchKnowledgeBase(query: string, limit = 5): Promise<IKnowledgeItem[]> {
    if (!query || !query.trim()) return [];
    const adapter = await this.getAdapter();
    const rows = await adapter.all<KnowledgeRecord>('SELECT * FROM agentos_knowledge_items');
    const lower = query.toLowerCase();
    const terms = lower.split(/\s+/).filter((term) => term.length > 1);
    if (!terms.length) return [];

    return rows
      .map(hydrateRecord)
      .map((item) => {
        const haystack = [
          item.id,
          item.type,
          item.content,
          ...(item.tags ?? []),
        ]
          .join(' ')
          .toLowerCase();
        const score = terms.reduce(
          (acc, term) => acc + (haystack.includes(term) ? 1 : 0),
          0,
        );
        return { item, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ item }) => item);
  }

  async addKnowledgeItem(itemData: Omit<IKnowledgeItem, 'id'> | IKnowledgeItem): Promise<IKnowledgeItem> {
    const adapter = await this.getAdapter();
    const now = Date.now();
    const id =
      'id' in itemData && itemData.id ? itemData.id : `kb_${uuidv4()}`;

    const payload: IKnowledgeItem = {
      id,
      type: itemData.type,
      // Persist ownership scoping into tags for simple filtering downstream
      tags: itemData.tags ?? [],
      content: itemData.content,
      metadata: itemData.metadata,
      createdAt: itemData.createdAt ? new Date(itemData.createdAt) : new Date(now),
      updatedAt: new Date(now),
    };

    await adapter.run(
      `
        INSERT INTO agentos_knowledge_items (
          id, type, tags, content, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          type = excluded.type,
          tags = excluded.tags,
          content = excluded.content,
          metadata = excluded.metadata,
          updated_at = excluded.updated_at
      `,
      [
        payload.id,
        payload.type,
        serialiseJson(payload.tags ?? []),
        payload.content,
        payload.metadata ? JSON.stringify(payload.metadata) : null,
        (payload.createdAt ?? new Date(now)).getTime(),
        (payload.updatedAt ?? new Date(now)).getTime(),
      ],
    );

    return payload;
  }

  /**
   * Lists knowledge items for a given agent scoped to a user by filtering tags.
   * We encode scoping as tags: `agent:<agentId>` and `owner:<userId>`.
   */
  async listByAgent(agentId: string, userId: string): Promise<IKnowledgeItem[]> {
    const adapter = await this.getAdapter();
    const rows = await adapter.all<KnowledgeRecord>('SELECT * FROM agentos_knowledge_items');
    const items = rows.map(hydrateRecord);
    const agentTag = `agent:${agentId}`.toLowerCase();
    const ownerTag = `owner:${userId}`.toLowerCase();
    return items.filter((it) => {
      const tags = (it.tags ?? []).map((t) => t.toLowerCase());
      return tags.includes(agentTag) && tags.includes(ownerTag);
    });
  }

  async countByAgent(agentId: string, userId: string): Promise<number> {
    const items = await this.listByAgent(agentId, userId);
    return items.length;
    }

  async deleteById(id: string): Promise<void> {
    const adapter = await this.getAdapter();
    await adapter.run('DELETE FROM agentos_knowledge_items WHERE id = ?', [id]);
  }

  async reloadKnowledgeBase(): Promise<void> {
    // SQL-backed implementation does not need reload semantics; noop to satisfy interface.
  }
}

export const sqlKnowledgeBaseService = new SqlKnowledgeBaseService();
