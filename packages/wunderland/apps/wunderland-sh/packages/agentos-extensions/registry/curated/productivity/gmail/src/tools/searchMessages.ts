/**
 * @fileoverview ITool for searching Gmail messages using Gmail query syntax.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { GmailService } from '../GmailService';

interface SearchMessagesArgs {
  query: string;
  maxResults?: number;
}

export class GmailSearchMessagesTool implements ITool<SearchMessagesArgs> {
  public readonly id = 'gmailSearchMessages';
  public readonly name = 'gmailSearchMessages';
  public readonly displayName = 'Search Gmail Messages';
  public readonly description =
    'Full-text search across Gmail messages using Gmail search syntax. ' +
    'Supports operators like from:, to:, subject:, has:attachment, before:, after:, is:unread, ' +
    'label:, filename:, and boolean operators (AND, OR, NOT). ' +
    'Example: "from:alice@example.com subject:meeting after:2024/01/01"';
  public readonly category = 'productivity';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = false;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['query'] as const,
    properties: {
      query: {
        type: 'string',
        description:
          'Gmail search query using Gmail search syntax ' +
          '(e.g. "from:alice@example.com", "subject:invoice has:attachment", "is:unread after:2024/06/01")',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10, max: 100)',
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
          },
        },
      },
      resultCount: { type: 'number' },
      query: { type: 'string' },
    },
  };

  constructor(private readonly service: GmailService) {}

  async execute(
    args: SearchMessagesArgs,
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      const maxResults = Math.min(Math.max(args.maxResults ?? 10, 1), 100);
      const messages = await this.service.searchMessages(args.query, maxResults);

      // Return summaries for search results
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
        output: { messages: summaries, resultCount: summaries.length, query: args.query },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!args.query) errors.push('query is required');
    else if (typeof args.query !== 'string') errors.push('query must be a string');
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
