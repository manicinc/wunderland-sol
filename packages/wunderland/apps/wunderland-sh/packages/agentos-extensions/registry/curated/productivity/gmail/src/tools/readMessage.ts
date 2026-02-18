/**
 * @fileoverview ITool for reading a full Gmail message by ID.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { GmailService } from '../GmailService';

interface ReadMessageArgs {
  messageId: string;
}

export class GmailReadMessageTool implements ITool<ReadMessageArgs> {
  public readonly id = 'gmailReadMessage';
  public readonly name = 'gmailReadMessage';
  public readonly displayName = 'Read Gmail Message';
  public readonly description =
    'Read the full content of a Gmail email by its message ID. ' +
    'Returns complete message details including subject, sender, recipients, date, body text, and labels.';
  public readonly category = 'productivity';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = false;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['messageId'] as const,
    properties: {
      messageId: {
        type: 'string',
        description: 'The Gmail message ID to read',
      },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      id: { type: 'string' },
      threadId: { type: 'string' },
      subject: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'array', items: { type: 'string' } },
      cc: { type: 'array', items: { type: 'string' } },
      date: { type: 'string' },
      body: { type: 'string' },
      snippet: { type: 'string' },
      labelIds: { type: 'array', items: { type: 'string' } },
      isUnread: { type: 'boolean' },
    },
  };

  constructor(private readonly service: GmailService) {}

  async execute(
    args: ReadMessageArgs,
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      const message = await this.service.getMessage(args.messageId);

      return {
        success: true,
        output: message,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!args.messageId) errors.push('messageId is required');
    else if (typeof args.messageId !== 'string') errors.push('messageId must be a string');
    return { isValid: errors.length === 0, errors };
  }
}
