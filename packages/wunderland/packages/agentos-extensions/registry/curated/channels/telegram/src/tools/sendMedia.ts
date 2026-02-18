/**
 * @fileoverview ITool for sending media (photo, document, video) via the Telegram channel adapter.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { TelegramService } from '../TelegramService';

export class TelegramSendMediaTool implements ITool {
  public readonly id = 'telegramChannelSendMedia';
  public readonly name = 'telegramChannelSendMedia';
  public readonly displayName = 'Send Telegram Media';
  public readonly description = 'Send a photo or document to a Telegram chat via the channel adapter.';
  public readonly category = 'communication';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = true;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['chatId', 'mediaType', 'url'] as const,
    properties: {
      chatId: { type: 'string', description: 'Target chat ID' },
      mediaType: { type: 'string', enum: ['photo', 'document'], description: 'Type of media to send' },
      url: { type: 'string', description: 'URL or file_id of the media' },
      caption: { type: 'string', description: 'Optional caption' },
      filename: { type: 'string', description: 'Filename (documents only)' },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      messageId: { type: 'number', description: 'Sent message ID' },
    },
  };

  constructor(private readonly service: TelegramService) {}

  async execute(
    args: { chatId: string; mediaType: 'photo' | 'document'; url: string; caption?: string; filename?: string },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      let result: { message_id: number };

      if (args.mediaType === 'photo') {
        result = await this.service.sendPhoto(args.chatId, args.url, { caption: args.caption });
      } else {
        result = await this.service.sendDocument(args.chatId, args.url, {
          caption: args.caption,
          filename: args.filename,
        });
      }

      return { success: true, output: { messageId: result.message_id } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!args.chatId) errors.push('chatId is required');
    if (!args.mediaType || !['photo', 'document'].includes(args.mediaType)) {
      errors.push('mediaType must be "photo" or "document"');
    }
    if (!args.url) errors.push('url is required');
    return { isValid: errors.length === 0, errors };
  }
}
