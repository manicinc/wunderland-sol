/**
 * @file ticket-bridge.service.ts
 * @description Bridges Discord interactions to the existing SupportService.
 * Creates tickets from Discord modals, syncs thread messages as comments,
 * and manages the discord_ticket_threads mapping table.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { SupportService } from '../../support/support.service.js';
import { AiResponderService } from './ai-responder.service.js';
import { getAppDatabase, generateId } from '../../../core/database/appDatabase.js';
import {
  type TextChannel,
  type ThreadChannel,
  type User,
  type Guild,
  ChannelType,
  EmbedBuilder,
} from 'discord.js';
import { BRAND_COLOR } from '../discord-bot.constants.js';

export interface TicketThreadMapping {
  id: string;
  ticketId: string;
  threadId: string;
  channelId: string;
  guildId: string;
  discordUserId: string;
  createdAt: number;
}

@Injectable()
export class TicketBridgeService {
  private readonly logger = new Logger('TicketBridge');

  constructor(
    @Inject(SupportService) private readonly supportService: SupportService,
    @Inject(AiResponderService) private readonly aiResponder: AiResponderService,
  ) {}

  /**
   * Create a support ticket from a Discord user and open a private thread.
   */
  async createTicketFromDiscord(
    user: User,
    guild: Guild,
    channel: TextChannel,
    subject: string,
    category: string,
    description: string,
  ): Promise<{ ticketId: string; thread: ThreadChannel }> {
    // AI-categorize the ticket
    const aiCategory = await this.aiResponder.categorizeTicket(subject, description);
    const finalCategory = category || aiCategory.category;
    const priority = aiCategory.priority;

    // Create ticket in the DB via existing SupportService
    const ticket = await this.supportService.createTicket({
      userId: `discord:${user.id}`,
      userEmail: `${user.username}@discord.user`,
      userName: user.displayName || user.username,
      userPlan: 'unknown',
      subject,
      category: finalCategory,
      priority,
      description,
    });

    // Create a private thread for this ticket
    const thread = await channel.threads.create({
      name: `🎫 ${subject.slice(0, 90)}`,
      type: ChannelType.PrivateThread,
      reason: `Support ticket ${ticket.id}`,
    });

    // Add the user to the thread
    await thread.members.add(user.id);

    // Store the mapping
    const db = getAppDatabase();
    const mappingId = generateId();
    await db.run(
      `INSERT INTO discord_ticket_threads (id, ticket_id, thread_id, channel_id, guild_id, discord_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [mappingId, ticket.id, thread.id, channel.id, guild.id, user.id, Date.now()],
    );

    // Update support_tickets with discord_thread_id
    await db.run(
      'UPDATE support_tickets SET discord_thread_id = ?, discord_user_id = ? WHERE id = ?',
      [thread.id, user.id, ticket.id],
    );

    // Post ticket info embed in the thread
    const ticketEmbed = new EmbedBuilder()
      .setTitle(`Ticket #${ticket.id.slice(0, 8)}`)
      .setDescription(description)
      .addFields(
        { name: 'Subject', value: subject, inline: true },
        { name: 'Category', value: finalCategory, inline: true },
        { name: 'Priority', value: priority, inline: true },
        { name: 'Status', value: 'Open', inline: true },
      )
      .setColor(BRAND_COLOR)
      .setTimestamp();

    await thread.send({ embeds: [ticketEmbed] });

    // Generate and post AI first response
    try {
      const aiResponse = await this.aiResponder.suggestFirstResponse({
        subject,
        description,
        category: finalCategory,
      });
      await thread.send(`**Rabbit AI** 🐇\n${aiResponse}`);
    } catch (error: any) {
      this.logger.warn(`Failed to generate AI first response: ${error.message}`);
    }

    return { ticketId: ticket.id, thread };
  }

  /**
   * Sync a message from a Discord thread to the ticket as a comment.
   */
  async syncMessageToTicket(
    threadId: string,
    authorId: string,
    authorName: string,
    content: string,
    isTeamMember: boolean,
  ): Promise<void> {
    const mapping = await this.getMapping(threadId);
    if (!mapping) return;

    if (isTeamMember) {
      await this.supportService.addAdminComment(
        mapping.ticketId,
        `discord:${authorId}`,
        content,
      );
    } else {
      await this.supportService.addUserComment(
        mapping.ticketId,
        `discord:${mapping.discordUserId}`,
        content,
      );
    }
  }

  /**
   * Get the ticket status for a given ticket ID.
   */
  async getTicketStatus(ticketId: string): Promise<{
    found: boolean;
    status?: string;
    subject?: string;
    category?: string;
    priority?: string;
    createdAt?: number;
  }> {
    const db = getAppDatabase();
    const ticket = await db.get(
      'SELECT id, subject, category, priority, status, created_at FROM support_tickets WHERE id LIKE ?',
      [`${ticketId}%`],
    );

    if (!ticket) return { found: false };

    return {
      found: true,
      status: (ticket as any).status,
      subject: (ticket as any).subject,
      category: (ticket as any).category,
      priority: (ticket as any).priority,
      createdAt: (ticket as any).created_at,
    };
  }

  /**
   * Check if a thread is mapped to a ticket.
   */
  async getMapping(threadId: string): Promise<TicketThreadMapping | null> {
    const db = getAppDatabase();
    const row = await db.get(
      'SELECT * FROM discord_ticket_threads WHERE thread_id = ? LIMIT 1',
      [threadId],
    );
    if (!row) return null;

    return {
      id: (row as any).id,
      ticketId: (row as any).ticket_id,
      threadId: (row as any).thread_id,
      channelId: (row as any).channel_id,
      guildId: (row as any).guild_id,
      discordUserId: (row as any).discord_user_id,
      createdAt: (row as any).created_at,
    };
  }
}
