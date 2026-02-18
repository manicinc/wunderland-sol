/**
 * @fileoverview ITool for sending media (image, document) via the Discord channel adapter.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { DiscordService } from '../DiscordService';

export class DiscordSendMediaTool implements ITool {
  public readonly id = 'discordChannelSendMedia';
  public readonly name = 'discordChannelSendMedia';
  public readonly displayName = 'Send Discord Media';
  public readonly description = 'Send an image or document attachment to a Discord channel.';
  public readonly category = 'communication';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = true;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['channelId', 'url'] as const,
    properties: {
      channelId: { type: 'string', description: 'Target channel ID' },
      url: { type: 'string', description: 'URL of the file to send' },
      filename: { type: 'string', description: 'Override filename for the attachment' },
      description: { type: 'string', description: 'Alt text / description for the attachment' },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      messageId: { type: 'string', description: 'Sent message ID' },
    },
  };

  constructor(private readonly service: DiscordService) {}

  async execute(
    args: { channelId: string; url: string; filename?: string; description?: string },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      const result = await this.service.sendFile(
        args.channelId,
        args.url,
        args.filename,
        args.description,
      );

      return { success: true, output: { messageId: result.id } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!args.channelId) errors.push('channelId is required');
    if (!args.url) errors.push('url is required');
    return { isValid: errors.length === 0, errors };
  }
}
