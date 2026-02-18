/**
 * @fileoverview ITool for composing and sending a new Gmail message.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { GmailService } from '../GmailService';

interface SendMessageArgs {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

export class GmailSendMessageTool implements ITool<SendMessageArgs> {
  public readonly id = 'gmailSendMessage';
  public readonly name = 'gmailSendMessage';
  public readonly displayName = 'Send Gmail Message';
  public readonly description =
    'Compose and send a new email via Gmail. ' +
    'Supports To, CC, and BCC recipients. The email body is sent as plain text.';
  public readonly category = 'productivity';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = true;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['to', 'subject', 'body'] as const,
    properties: {
      to: {
        type: 'string',
        description: 'Recipient email address (comma-separated for multiple)',
      },
      subject: {
        type: 'string',
        description: 'Email subject line',
      },
      body: {
        type: 'string',
        description: 'Email body text (plain text)',
      },
      cc: {
        type: 'string',
        description: 'CC recipients (comma-separated email addresses)',
      },
      bcc: {
        type: 'string',
        description: 'BCC recipients (comma-separated email addresses)',
      },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      id: { type: 'string', description: 'Sent message ID' },
      threadId: { type: 'string', description: 'Thread ID of sent message' },
    },
  };

  constructor(private readonly service: GmailService) {}

  async execute(
    args: SendMessageArgs,
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      const result = await this.service.sendMessage({
        to: args.to,
        subject: args.subject,
        body: args.body,
        cc: args.cc,
        bcc: args.bcc,
      });

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
    if (!args.to) errors.push('to is required');
    else if (typeof args.to !== 'string') errors.push('to must be a string');
    if (!args.subject) errors.push('subject is required');
    else if (typeof args.subject !== 'string') errors.push('subject must be a string');
    if (!args.body) errors.push('body is required');
    else if (typeof args.body !== 'string') errors.push('body must be a string');
    if (args.cc !== undefined && typeof args.cc !== 'string') errors.push('cc must be a string');
    if (args.bcc !== undefined && typeof args.bcc !== 'string') errors.push('bcc must be a string');
    return { isValid: errors.length === 0, errors };
  }
}
