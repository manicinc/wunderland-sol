/**
 * @fileoverview ITool for replying to an existing Gmail message thread.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { GmailService } from '../GmailService';

interface ReplyMessageArgs {
  messageId: string;
  body: string;
}

export class GmailReplyMessageTool implements ITool<ReplyMessageArgs> {
  public readonly id = 'gmailReplyMessage';
  public readonly name = 'gmailReplyMessage';
  public readonly displayName = 'Reply to Gmail Message';
  public readonly description =
    'Reply to an existing email thread in Gmail. ' +
    'Automatically sets In-Reply-To and References headers for proper threading, ' +
    'and prefixes the subject with "Re:" if not already present.';
  public readonly category = 'productivity';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = true;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['messageId', 'body'] as const,
    properties: {
      messageId: {
        type: 'string',
        description: 'The Gmail message ID to reply to',
      },
      body: {
        type: 'string',
        description: 'Reply body text (plain text)',
      },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      id: { type: 'string', description: 'Reply message ID' },
      threadId: { type: 'string', description: 'Thread ID of the reply' },
    },
  };

  constructor(private readonly service: GmailService) {}

  async execute(
    args: ReplyMessageArgs,
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      const result = await this.service.replyToMessage(args.messageId, args.body);

      return {
        success: true,
        output: { id: result.id, threadId: result.threadId },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!args.messageId) errors.push('messageId is required');
    else if (typeof args.messageId !== 'string') errors.push('messageId must be a string');
    if (!args.body) errors.push('body is required');
    else if (typeof args.body !== 'string') errors.push('body must be a string');
    return { isValid: errors.length === 0, errors };
  }
}
