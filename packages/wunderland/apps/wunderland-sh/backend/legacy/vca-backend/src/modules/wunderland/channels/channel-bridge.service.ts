/**
 * @file channel-bridge.service.ts
 * @description Bridges the NestJS ChannelsModule with AgentOS ChannelRouter.
 *
 * Handles:
 * - Inbound messages from external platforms → StimulusRouter ingestion
 * - Outbound agent responses → IChannelAdapter dispatch
 * - Gateway WebSocket event forwarding
 * - Session tracking updates
 */

import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { ChannelsService } from './channels.service.js';
import { DatabaseService } from '../../../database/database.service.js';

export interface InboundChannelMessage {
  seedId: string;
  platform: string;
  conversationId: string;
  conversationType: string;
  senderName: string;
  senderPlatformId: string;
  text: string;
  messageId: string;
  timestamp: string;
  isOwner: boolean;
}

export interface OutboundChannelMessage {
  seedId: string;
  platform: string;
  conversationId: string;
  text: string;
  replyToMessageId?: string;
}

@Injectable()
export class ChannelBridgeService {
  private readonly logger = new Logger(ChannelBridgeService.name);

  constructor(
    private readonly channelsService: ChannelsService,
    private readonly db: DatabaseService
  ) {}

  /**
   * Handle an inbound message from an external platform.
   * - Updates (or creates) the channel session
   * - Returns the binding so callers can route to StimulusRouter
   */
  async handleInboundMessage(msg: InboundChannelMessage): Promise<{
    bindingId: string | null;
    sessionId: string;
  }> {
    // 1. Find the binding for this agent + platform + conversation
    const binding = await this.findBinding(msg.seedId, msg.platform, msg.conversationId);

    // 2. Upsert the session
    const sessionId = await this.upsertSession(msg);

    this.logger.debug(
      `Inbound message from ${msg.platform}:${msg.conversationId} for agent ${msg.seedId} (binding=${binding?.bindingId ?? 'none'})`
    );

    return {
      bindingId: binding?.bindingId ?? null,
      sessionId,
    };
  }

  /**
   * Track an outbound agent response for session stats.
   */
  async trackOutboundMessage(msg: OutboundChannelMessage): Promise<void> {
    await this.upsertSession({
      seedId: msg.seedId,
      platform: msg.platform,
      conversationId: msg.conversationId,
      conversationType: 'direct',
      senderName: 'agent',
      senderPlatformId: msg.seedId,
      text: msg.text,
      messageId: `out-${Date.now()}`,
      timestamp: new Date().toISOString(),
      isOwner: false,
    });
  }

  // ── Private ──

  private async findBinding(
    seedId: string,
    platform: string,
    conversationId: string
  ): Promise<{ bindingId: string } | null> {
    const row = await this.db.get<{ binding_id: string }>(
      `SELECT binding_id FROM wunderland_channel_bindings
       WHERE seed_id = ? AND platform = ? AND is_active = 1
       LIMIT 1`,
      [seedId, platform]
    );
    return row ? { bindingId: String(row.binding_id) } : null;
  }

  private async upsertSession(msg: InboundChannelMessage): Promise<string> {
    const existing = await this.db.get<{ session_id: string; message_count: number }>(
      `SELECT session_id, message_count FROM wunderland_channel_sessions
       WHERE seed_id = ? AND platform = ? AND conversation_id = ?`,
      [msg.seedId, msg.platform, msg.conversationId]
    );

    const now = Date.now();

    if (existing) {
      await this.db.run(
        `UPDATE wunderland_channel_sessions
         SET last_message_at = ?, message_count = ?, is_active = 1, updated_at = ?,
             remote_user_name = COALESCE(?, remote_user_name),
             remote_user_id = COALESCE(?, remote_user_id)
         WHERE session_id = ?`,
        [
          now,
          existing.message_count + 1,
          now,
          msg.senderName || null,
          msg.senderPlatformId || null,
          existing.session_id,
        ]
      );
      return String(existing.session_id);
    }

    const sessionId = this.db.generateId();
    await this.db.run(
      `INSERT INTO wunderland_channel_sessions
        (session_id, seed_id, platform, conversation_id, conversation_type,
         remote_user_id, remote_user_name, last_message_at, message_count,
         is_active, context_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, '{}', ?, ?)`,
      [
        sessionId,
        msg.seedId,
        msg.platform,
        msg.conversationId,
        msg.conversationType,
        msg.senderPlatformId || null,
        msg.senderName || null,
        now,
        now,
        now,
      ]
    );

    return sessionId;
  }
}
