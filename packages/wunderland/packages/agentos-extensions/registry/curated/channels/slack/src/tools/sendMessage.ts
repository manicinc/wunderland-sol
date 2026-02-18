/**
 * @fileoverview ITool for sending text messages via the Slack channel adapter.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { SlackService } from '../SlackService';

export class SlackSendMessageTool implements ITool {
  public readonly id = 'slackChannelSendMessage';
  public readonly name = 'slackChannelSendMessage';
  public readonly displayName = 'Send Slack Message';
  public readonly description = 'Send a text message to a Slack channel or conversation via the channel adapter.';
  public readonly category = 'communication';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = true;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['channel', 'text'] as const,
    properties: {
      channel: { type: 'string', description: 'Target channel ID (e.g., C0123456789)' },
      text: { type: 'string', description: 'Message text (fallback for clients that cannot render blocks)' },
      blocks: { type: 'array', description: 'Optional Slack Block Kit blocks for rich formatting' },
      threadTs: { type: 'string', description: 'Thread timestamp to reply in a thread' },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      ts: { type: 'string', description: 'Timestamp ID of the sent message' },
      channel: { type: 'string', description: 'Channel the message was sent to' },
    },
  };

  constructor(private readonly service: SlackService) {}

  async execute(
    args: { channel: string; text: string; blocks?: object[]; threadTs?: string },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      const result = await this.service.sendMessage(args.channel, args.text, {
        blocks: args.blocks,
        threadTs: args.threadTs,
      });

      return {
        success: true,
        output: { ts: result.ts, channel: result.channel },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!args.channel) errors.push('channel is required');
    if (!args.text) errors.push('text is required');
    else if (typeof args.text !== 'string') errors.push('text must be a string');
    return { isValid: errors.length === 0, errors };
  }
}
