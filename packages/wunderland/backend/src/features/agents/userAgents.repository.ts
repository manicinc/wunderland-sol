import { getAppDatabase, generateId } from '../../core/database/appDatabase.js';

export interface UserAgentRecord {
  id: string;
  user_id: string;
  label: string;
  slug: string | null;
  plan_id: string | null;
  status: string;
  config: string;
  created_at: number;
  updated_at: number;
  archived_at: number | null;
}

export interface CreateUserAgentInput {
  userId: string;
  label: string;
  slug?: string | null;
  planId?: string | null;
  status?: string;
  config: Record<string, unknown>;
}

export interface UpdateUserAgentInput {
  id: string;
  userId: string;
  label?: string;
  slug?: string | null;
  planId?: string | null;
  status?: string;
  config?: Record<string, unknown>;
  archivedAt?: number | null;
}

const serializeConfig = (config: Record<string, unknown>): string =>
  JSON.stringify(config ?? {});

const mapRecord = (record: UserAgentRecord) => ({
  id: record.id,
  userId: record.user_id,
  label: record.label,
  slug: record.slug,
  planId: record.plan_id,
  status: record.status,
  config: JSON.parse(record.config ?? '{}') as Record<string, unknown>,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
  archivedAt: record.archived_at,
});

export const userAgentsRepository = {
  async listByUser(userId: string) {
    const db = getAppDatabase();
    const rows = await db.all<UserAgentRecord>(
      'SELECT * FROM user_agents WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
    );
    return rows.map(mapRecord);
  },

  async getById(userId: string, agentId: string) {
    const db = getAppDatabase();
    const row = await db.get<UserAgentRecord>(
      'SELECT * FROM user_agents WHERE user_id = ? AND id = ? LIMIT 1',
      [userId, agentId],
    );
    return row ? mapRecord(row) : null;
  },

  async countActive(userId: string) {
    const db = getAppDatabase();
    const row = await db.get<{ total: number }>(
      "SELECT COUNT(1) AS total FROM user_agents WHERE user_id = ? AND status = 'active'",
      [userId],
    );
    return row?.total ?? 0;
  },

  async countCreationsSince(userId: string, since: number) {
    const db = getAppDatabase();
    const row = await db.get<{ total: number }>(
      'SELECT COUNT(1) AS total FROM user_agent_creation_log WHERE user_id = ? AND created_at >= ?',
      [userId, since],
    );
    return row?.total ?? 0;
  },

  async create(input: CreateUserAgentInput) {
    const db = getAppDatabase();
    const id = generateId();
    const now = Date.now();
    await db.run(
      `
        INSERT INTO user_agents (
          id, user_id, label, slug, plan_id, status, config, created_at, updated_at, archived_at
        ) VALUES (@id, @user_id, @label, @slug, @plan_id, @status, @config, @created_at, @updated_at, NULL)
      `,
      {
        id,
        user_id: input.userId,
        label: input.label,
        slug: input.slug ?? null,
        plan_id: input.planId ?? null,
        status: input.status ?? 'active',
        config: serializeConfig(input.config),
        created_at: now,
        updated_at: now,
      },
    );

    await this.recordCreation(input.userId, id, now);
    const created = await this.getById(input.userId, id);
    if (!created) {
      throw new Error('Failed to load created user agent.');
    }
    return created;
  },

  async update(input: UpdateUserAgentInput) {
    const db = getAppDatabase();
    const now = Date.now();
    const fields: string[] = [];
    const params: Record<string, unknown> = {
      id: input.id,
      user_id: input.userId,
      updated_at: now,
    };

    if (typeof input.label === 'string') {
      fields.push('label = @label');
      params.label = input.label;
    }
    if (typeof input.slug !== 'undefined') {
      fields.push('slug = @slug');
      params.slug = input.slug ?? null;
    }
    if (typeof input.planId !== 'undefined') {
      fields.push('plan_id = @plan_id');
      params.plan_id = input.planId ?? null;
    }
    if (typeof input.status === 'string') {
      fields.push('status = @status');
      params.status = input.status;
    }
    if (typeof input.config !== 'undefined') {
      fields.push('config = @config');
      params.config = serializeConfig(input.config);
    }
    if (typeof input.archivedAt !== 'undefined') {
      fields.push('archived_at = @archived_at');
      params.archived_at = input.archivedAt ?? null;
    }

    if (!fields.length) {
      return this.getById(input.userId, input.id);
    }

    const setClause = fields.join(', ');
    await db.run(
      `
        UPDATE user_agents
           SET ${setClause},
               updated_at = @updated_at
         WHERE id = @id AND user_id = @user_id
      `,
      params,
    );

    return this.getById(input.userId, input.id);
  },

  async delete(userId: string, agentId: string) {
    const db = getAppDatabase();
    await db.run(
      'DELETE FROM user_agents WHERE user_id = ? AND id = ?',
      [userId, agentId],
    );
  },

  async recordCreation(userId: string, agentId: string | null, timestamp?: number) {
    const db = getAppDatabase();
    await db.run(
      `
        INSERT INTO user_agent_creation_log (
          id, user_id, agent_id, created_at
        ) VALUES (@id, @user_id, @agent_id, @created_at)
      `,
      {
        id: generateId(),
        user_id: userId,
        agent_id: agentId,
        created_at: timestamp ?? Date.now(),
      },
    );
  },
};
