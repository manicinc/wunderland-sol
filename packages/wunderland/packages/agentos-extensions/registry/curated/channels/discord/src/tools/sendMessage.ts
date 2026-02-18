/**
 * @fileoverview ITool for sending text messages via the Discord channel adapter.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { DiscordService } from '../DiscordService';
import type { APIEmbed } from 'discord.js';

export class DiscordSendMessageTool implements ITool {
  public readonly id = 'discordChannelSendMessage';
  public readonly name = 'discordChannelSendMessage';
  public readonly displayName = 'Send Discord Message';
  public readonly description = 'Send a text message to a Discord channel, optionally with an embed.';
  public readonly category = 'communication';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = true;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['channelId', 'text'] as const,
    properties: {
      channelId: { type: 'string', description: 'Target channel ID' },
      text: { type: 'string', description: 'Message text (max 2000 chars)' },
      embed: {
        type: 'object',
        description: 'Optional rich embed',
        properties: {
          title: { type: 'string', description: 'Embed title' },
          description: { type: 'string', description: 'Embed description' },
          color: { type: 'number', description: 'Embed color as integer' },
          fields: {
            type: 'array',
            description: 'Embed fields',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: { type: 'string' },
                inline: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      messageId: { type: 'string', description: 'Sent message ID' },
      channelId: { type: 'string', description: 'Target channel ID' },
    },
  };

  constructor(private readonly service: DiscordService) {}

  async execute(
    args: {
      channelId: string;
      text: string;
      embed?: { title?: string; description?: string; color?: number; fields?: Array<{ name: string; value: string; inline?: boolean }> };
    },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      if (args.text.length > 2000) {
        throw new Error('Message text exceeds 2000 character limit');
      }

      const embeds: APIEmbed[] = [];
      if (args.embed) {
        embeds.push({
          title: args.embed.title,
          description: args.embed.description,
          color: args.embed.color,
          fields: args.embed.fields,
        });
      }

      const result = await this.service.sendMessage(args.channelId, args.text, {
        embeds: embeds.length > 0 ? embeds : undefined,
      });

      return {
        success: true,
        output: { messageId: result.id, channelId: args.channelId },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!args.channelId) errors.push('channelId is required');
    if (!args.text) errors.push('text is required');
    else if (typeof args.text !== 'string') errors.push('text must be a string');
    else if (args.text.length > 2000) errors.push('text exceeds 2000 character limit');
    return { isValid: errors.length === 0, errors };
  }
}
