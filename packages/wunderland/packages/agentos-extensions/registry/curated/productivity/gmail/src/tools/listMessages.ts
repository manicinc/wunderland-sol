/**
 * @fileoverview ITool for listing Gmail messages with optional filtering.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { GmailService } from '../GmailService';

interface ListMessagesArgs {
  query?: string;
  labelIds?: string[];
  maxResults?: number;
}

export class GmailListMessagesTool implements ITool<ListMessagesArgs> {
  public readonly id = 'gmailListMessages';
  public readonly name = 'gmailListMessages';
  public readonly displayName = 'List Gmail Messages';
  public readonly description =
    'List emails from Gmail inbox with optional filtering by query string, label IDs, and result limit. ' +
    'Returns message summaries including subject, sender, date, snippet, and labels.';
  public readonly category = 'productivity';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = false;

  public readonly inputSchema = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description:
          'Gmail search query (e.g. "is:unread", "from:alice@example.com", "subject:invoice"). ' +
          'Uses standard Gmail search syntax.',
      },
      labelIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by label IDs (e.g. ["INBOX", "UNREAD"])',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of messages to return (default: 10, max: 100)',
        default: 10,
      },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      messages: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            threadId: { type: 'string' },
            subject: { type: 'string' },
            from: { type: 'string' },
            date: { type: 'string' },
            snippet: { type: 'string' },
            isUnread: { type: 'boolean' },
            labelIds: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      resultCount: { type: 'number' },
    },
  };

  constructor(private readonly service: GmailService) {}

  async execute(
    args: ListMessagesArgs,
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      const maxResults = Math.min(Math.max(args.maxResults ?? 10, 1), 100);

      const messages = await this.service.listMessages({
        query: args.query,
        labelIds: args.labelIds,
        maxResults,
      });

      // Return summaries (omit full body for list view)
      const summaries = messages.map((msg) => ({
        id: msg.id,
        threadId: msg.threadId,
        subject: msg.subject,
        from: msg.from,
        to: msg.to,
        date: msg.date,
        snippet: msg.snippet,
        isUnread: msg.isUnread,
        labelIds: msg.labelIds,
      }));

      return {
        success: true,
        output: { messages: summaries, resultCount: summaries.length },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (args.query !== undefined && typeof args.query !== 'string') {
      errors.push('query must be a string');
    }
    if (args.labelIds !== undefined && !Array.isArray(args.labelIds)) {
      errors.push('labelIds must be an array of strings');
    }
    if (args.maxResults !== undefined) {
      if (typeof args.maxResults !== 'number' || args.maxResults < 1) {
        errors.push('maxResults must be a positive number');
      }
      if (args.maxResults > 100) {
        errors.push('maxResults cannot exceed 100');
      }
    }
    return { isValid: errors.length === 0, errors };
  }
}
