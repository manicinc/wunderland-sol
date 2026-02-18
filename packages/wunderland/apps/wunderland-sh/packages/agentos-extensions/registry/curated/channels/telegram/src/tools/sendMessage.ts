/**
 * @fileoverview ITool for sending text messages via the Telegram channel adapter.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { TelegramService } from '../TelegramService';

export class TelegramSendMessageTool implements ITool {
  public readonly id = 'telegramChannelSendMessage';
  public readonly name = 'telegramChannelSendMessage';
  public readonly displayName = 'Send Telegram Message';
  public readonly description = 'Send a text message to a Telegram chat via the channel adapter.';
  public readonly category = 'communication';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = true;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['chatId', 'text'] as const,
    properties: {
      chatId: { type: 'string', description: 'Target chat ID' },
      text: { type: 'string', description: 'Message text (max 4096 chars)' },
      parseMode: { type: 'string', enum: ['Markdown', 'MarkdownV2', 'HTML'], description: 'Parse mode' },
      replyToMessageId: { type: 'number', description: 'Reply to message ID' },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      messageId: { type: 'number', description: 'Sent message ID' },
      chatId: { type: 'string', description: 'Target chat ID' },
    },
  };

  constructor(private readonly service: TelegramService) {}

  async execute(
    args: { chatId: string; text: string; parseMode?: string; replyToMessageId?: number },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      if (args.text.length > 4096) {
        throw new Error('Message text exceeds 4096 character limit');
      }

      const result = await this.service.sendMessage(args.chatId, args.text, {
        parseMode: args.parseMode,
        replyToMessageId: args.replyToMessageId,
      });

      return {
        success: true,
        output: { messageId: result.message_id, chatId: args.chatId },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!args.chatId) errors.push('chatId is required');
    if (!args.text) errors.push('text is required');
    else if (typeof args.text !== 'string') errors.push('text must be a string');
    else if (args.text.length > 4096) errors.push('text exceeds 4096 character limit');
    return { isValid: errors.length === 0, errors };
  }
}
