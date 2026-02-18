/**
 * @file channels.service.ts
 * @description Business logic for managing channel bindings and sessions.
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type {
  CreateChannelBindingDto,
  UpdateChannelBindingDto,
  ListChannelBindingsQueryDto,
  ListChannelSessionsQueryDto,
} from '../dto/channels.dto.js';
import { AgentImmutableException } from '../wunderland.exceptions.js';
import { getAgentSealState } from '../immutability/agentSealing.js';

// ── Domain Types ──

export interface ChannelBindingRecord {
  bindingId: string;
  seedId: string;
  ownerUserId: string;
  platform: string;
  channelId: string;
  conversationType: string;
  credentialId: string | null;
  isActive: boolean;
  autoBroadcast: boolean;
  platformConfig: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface ChannelSessionRecord {
  sessionId: string;
  seedId: string;
  platform: string;
  conversationId: string;
  conversationType: string;
  remoteUserId: string | null;
  remoteUserName: string | null;
  lastMessageAt: number;
  messageCount: number;
  isActive: boolean;
  context: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

@Injectable()
export class ChannelsService {
  constructor(private readonly db: DatabaseService) {}

  // ── Bindings ──

  async listBindings(
    userId: string,
    query: ListChannelBindingsQueryDto = {}
  ): Promise<{ items: ChannelBindingRecord[] }> {
    const where: string[] = ['owner_user_id = ?'];
    const params: Array<string | number> = [userId];

    if (query.seedId) {
      where.push('seed_id = ?');
      params.push(query.seedId.trim());
    }
    if (query.platform) {
      where.push('platform = ?');
      params.push(query.platform.trim());
    }

    const rows = await this.db.all<any>(
      `SELECT * FROM wunderland_channel_bindings WHERE ${where.join(' AND ')} ORDER BY created_at DESC`,
      params
    );

    return { items: rows.map((row) => this.mapBinding(row)) };
  }

  async getBinding(userId: string, bindingId: string): Promise<{ binding: ChannelBindingRecord }> {
    const row = await this.db.get<any>(
      `SELECT * FROM wunderland_channel_bindings WHERE binding_id = ? AND owner_user_id = ?`,
      [bindingId, userId]
    );

    if (!row) {
      throw new NotFoundException(`Channel binding "${bindingId}" not found.`);
    }

    return { binding: this.mapBinding(row) };
  }

  async createBinding(
    userId: string,
    dto: CreateChannelBindingDto
  ): Promise<{ binding: ChannelBindingRecord }> {
    const seedId = dto.seedId.trim();

    // Verify agent ownership
    await this.requireOwnedAgent(userId, seedId);
    await this.assertAgentNotSealed(seedId, ['channelBindings']);

    // Check for duplicate binding
    const existing = await this.db.get<any>(
      `SELECT binding_id FROM wunderland_channel_bindings WHERE seed_id = ? AND platform = ? AND channel_id = ?`,
      [seedId, dto.platform.trim(), dto.channelId.trim()]
    );
    if (existing) {
      throw new BadRequestException(
        `Binding already exists for ${dto.platform}:${dto.channelId} on agent "${seedId}".`
      );
    }

    const bindingId = this.db.generateId();
    const now = Date.now();

    let platformConfig = '{}';
    if (dto.platformConfig) {
      try {
        JSON.parse(dto.platformConfig);
        platformConfig = dto.platformConfig;
      } catch {
        throw new BadRequestException('platformConfig must be valid JSON.');
      }
    }

    await this.db.run(
      `INSERT INTO wunderland_channel_bindings
        (binding_id, seed_id, owner_user_id, platform, channel_id, conversation_type,
         credential_id, is_active, auto_broadcast, platform_config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bindingId,
        seedId,
        userId,
        dto.platform.trim(),
        dto.channelId.trim(),
        dto.conversationType ?? 'direct',
        dto.credentialId?.trim() ?? null,
        1,
        dto.autoBroadcast ? 1 : 0,
        platformConfig,
        now,
        now,
      ]
    );

    const row = await this.db.get<any>(
      `SELECT * FROM wunderland_channel_bindings WHERE binding_id = ?`,
      [bindingId]
    );
    return { binding: this.mapBinding(row!) };
  }

  async updateBinding(
    userId: string,
    bindingId: string,
    dto: UpdateChannelBindingDto
  ): Promise<{ binding: ChannelBindingRecord }> {
    const existing = await this.db.get<any>(
      `SELECT * FROM wunderland_channel_bindings WHERE binding_id = ? AND owner_user_id = ?`,
      [bindingId, userId]
    );
    if (!existing) {
      throw new NotFoundException(`Channel binding "${bindingId}" not found.`);
    }
    await this.assertAgentNotSealed(String(existing.seed_id), ['channelBindings']);

    const updates: string[] = [];
    const params: Array<string | number | null> = [];

    if (dto.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(dto.isActive ? 1 : 0);
    }
    if (dto.autoBroadcast !== undefined) {
      updates.push('auto_broadcast = ?');
      params.push(dto.autoBroadcast ? 1 : 0);
    }
    if (dto.credentialId !== undefined) {
      updates.push('credential_id = ?');
      params.push(dto.credentialId?.trim() ?? null);
    }
    if (dto.platformConfig !== undefined) {
      try {
        JSON.parse(dto.platformConfig);
      } catch {
        throw new BadRequestException('platformConfig must be valid JSON.');
      }
      updates.push('platform_config = ?');
      params.push(dto.platformConfig);
    }

    if (updates.length === 0) {
      return { binding: this.mapBinding(existing) };
    }

    updates.push('updated_at = ?');
    params.push(Date.now());
    params.push(bindingId);

    await this.db.run(
      `UPDATE wunderland_channel_bindings SET ${updates.join(', ')} WHERE binding_id = ?`,
      params
    );

    const row = await this.db.get<any>(
      `SELECT * FROM wunderland_channel_bindings WHERE binding_id = ?`,
      [bindingId]
    );
    return { binding: this.mapBinding(row!) };
  }

  async deleteBinding(userId: string, bindingId: string): Promise<{ deleted: boolean }> {
    const existing = await this.db.get<any>(
      `SELECT binding_id FROM wunderland_channel_bindings WHERE binding_id = ? AND owner_user_id = ?`,
      [bindingId, userId]
    );
    if (!existing) {
      throw new NotFoundException(`Channel binding "${bindingId}" not found.`);
    }
    await this.assertAgentNotSealed(String(existing.seed_id), ['channelBindings']);

    await this.db.run(`DELETE FROM wunderland_channel_bindings WHERE binding_id = ?`, [bindingId]);

    return { deleted: true };
  }

  // ── Sessions ──

  async listSessions(
    userId: string,
    query: ListChannelSessionsQueryDto = {}
  ): Promise<{ items: ChannelSessionRecord[] }> {
    // Only return sessions for agents owned by this user
    const where: string[] = [
      `cs.seed_id IN (SELECT seed_id FROM wunderland_agents WHERE owner_user_id = ?)`,
    ];
    const params: Array<string | number> = [userId];

    if (query.seedId) {
      where.push('cs.seed_id = ?');
      params.push(query.seedId.trim());
    }
    if (query.platform) {
      where.push('cs.platform = ?');
      params.push(query.platform.trim());
    }
    if (query.activeOnly) {
      where.push('cs.is_active = 1');
    }

    const rows = await this.db.all<any>(
      `SELECT cs.* FROM wunderland_channel_sessions cs
       WHERE ${where.join(' AND ')}
       ORDER BY cs.last_message_at DESC
       LIMIT 100`,
      params
    );

    return { items: rows.map((row) => this.mapSession(row)) };
  }

  async getSession(userId: string, sessionId: string): Promise<{ session: ChannelSessionRecord }> {
    const row = await this.db.get<any>(
      `SELECT cs.* FROM wunderland_channel_sessions cs
       INNER JOIN wunderland_agents wa ON cs.seed_id = wa.seed_id
       WHERE cs.session_id = ? AND wa.owner_user_id = ?`,
      [sessionId, userId]
    );
    if (!row) {
      throw new NotFoundException(`Channel session "${sessionId}" not found.`);
    }
    return { session: this.mapSession(row) };
  }

  // ── Stats ──

  async getChannelStats(
    userId: string,
    seedId?: string
  ): Promise<{
    totalBindings: number;
    activeBindings: number;
    totalSessions: number;
    activeSessions: number;
    platformBreakdown: Record<string, number>;
  }> {
    const seedFilter = seedId ? `AND seed_id = '${seedId}'` : '';

    const bindingStats = await this.db.get<any>(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
       FROM wunderland_channel_bindings
       WHERE owner_user_id = ? ${seedFilter}`,
      [userId]
    );

    const sessionStats = await this.db.get<any>(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN cs.is_active = 1 THEN 1 ELSE 0 END) as active
       FROM wunderland_channel_sessions cs
       INNER JOIN wunderland_agents wa ON cs.seed_id = wa.seed_id
       WHERE wa.owner_user_id = ? ${seedFilter ? `AND cs.seed_id = '${seedId}'` : ''}`,
      [userId]
    );

    const platformRows = await this.db.all<{ platform: string; count: number }>(
      `SELECT platform, COUNT(*) as count
       FROM wunderland_channel_bindings
       WHERE owner_user_id = ? AND is_active = 1 ${seedFilter}
       GROUP BY platform`,
      [userId]
    );

    const platformBreakdown: Record<string, number> = {};
    for (const row of platformRows) {
      platformBreakdown[String(row.platform)] = Number(row.count);
    }

    return {
      totalBindings: Number(bindingStats?.total ?? 0),
      activeBindings: Number(bindingStats?.active ?? 0),
      totalSessions: Number(sessionStats?.total ?? 0),
      activeSessions: Number(sessionStats?.active ?? 0),
      platformBreakdown,
    };
  }

  // ── Private Helpers ──

  private async requireOwnedAgent(userId: string, seedId: string): Promise<void> {
    const agent = await this.db.get<{ seed_id: string }>(
      `SELECT seed_id FROM wunderland_agents WHERE seed_id = ? AND owner_user_id = ? AND status != 'archived'`,
      [seedId, userId]
    );
    if (!agent) {
      throw new NotFoundException(`Agent "${seedId}" not found or not owned by current user.`);
    }
  }

  private async assertAgentNotSealed(seedId: string, fields: string[]): Promise<void> {
    const state = await getAgentSealState(this.db as any, seedId);
    if (state?.isSealed) {
      throw new AgentImmutableException(seedId, fields);
    }
  }

  private mapBinding(row: any): ChannelBindingRecord {
    let platformConfig: Record<string, unknown> = {};
    try {
      platformConfig = JSON.parse(String(row.platform_config || '{}'));
    } catch {
      // ignore malformed JSON
    }

    return {
      bindingId: String(row.binding_id),
      seedId: String(row.seed_id),
      ownerUserId: String(row.owner_user_id),
      platform: String(row.platform),
      channelId: String(row.channel_id),
      conversationType: String(row.conversation_type || 'direct'),
      credentialId: row.credential_id ? String(row.credential_id) : null,
      isActive: Boolean(row.is_active),
      autoBroadcast: Boolean(row.auto_broadcast),
      platformConfig,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    };
  }

  private mapSession(row: any): ChannelSessionRecord {
    let context: Record<string, unknown> = {};
    try {
      context = JSON.parse(String(row.context_json || '{}'));
    } catch {
      // ignore malformed JSON
    }

    return {
      sessionId: String(row.session_id),
      seedId: String(row.seed_id),
      platform: String(row.platform),
      conversationId: String(row.conversation_id),
      conversationType: String(row.conversation_type || 'direct'),
      remoteUserId: row.remote_user_id ? String(row.remote_user_id) : null,
      remoteUserName: row.remote_user_name ? String(row.remote_user_name) : null,
      lastMessageAt: Number(row.last_message_at),
      messageCount: Number(row.message_count),
      isActive: Boolean(row.is_active),
      context,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    };
  }
}
