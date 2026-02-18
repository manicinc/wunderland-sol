/**
 * @file ticket-bridge.ts
 * @description Bridges Discord threads to the backend support ticket system via HTTP API.
 * Replaces direct SupportService/getAppDatabase() calls with API calls to the backend.
 */

import { BotLogger } from '../shared/logger';
import { AiResponderService } from './ai-responder';

const logger = new BotLogger('TicketBridge');

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:3001';
}

export class TicketBridgeService {
  constructor(private readonly aiResponder: AiResponderService) {}

  async createTicketFromDiscord(params: {
    threadId: string;
    guildId: string;
    userId: string;
    userEmail?: string;
    userName: string;
    subject: string;
    category: string;
    priority?: string;
    description: string;
  }): Promise<{ ticketId: string; firstResponse: string } | null> {
    try {
      const categorised = await this.aiResponder.categorizeTicket(params.subject, params.description);

      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/api/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: params.userId,
          userEmail: params.userEmail || `discord-${params.userId}@discord.bridge`,
          userName: params.userName,
          subject: params.subject,
          category: categorised.category || params.category,
          priority: categorised.priority || params.priority || 'normal',
          description: params.description,
          source: 'discord',
          threadId: params.threadId,
          guildId: params.guildId,
        }),
      });

      if (!response.ok) {
        logger.error(`Ticket API returned ${response.status}`);
        return null;
      }

      const ticket = (await response.json()) as any;
      const ticketId = ticket?.id || ticket?.ticketId || 'unknown';

      const firstResponse = await this.aiResponder.suggestFirstResponse(
        params.subject,
        params.description,
        categorised.category,
      );

      logger.log(`Created ticket ${ticketId} for Discord thread ${params.threadId}`);
      return { ticketId, firstResponse };
    } catch (error: any) {
      logger.error('Failed to create ticket from Discord', error.message);
      return null;
    }
  }

  async syncMessageToTicket(threadId: string, userId: string, content: string): Promise<boolean> {
    try {
      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/api/support/tickets/discord-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, userId, content }),
      });
      return response.ok;
    } catch (error: any) {
      logger.error(`Failed to sync message for thread ${threadId}`, error.message);
      return false;
    }
  }
}
