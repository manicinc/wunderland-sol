/**
 * @fileoverview ITool for listing Gmail labels (folders).
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { GmailService } from '../GmailService';

export class GmailListLabelsTool implements ITool {
  public readonly id = 'gmailListLabels';
  public readonly name = 'gmailListLabels';
  public readonly displayName = 'List Gmail Labels';
  public readonly description =
    'List all email labels (folders) in the Gmail account. ' +
    'Returns label names, types (system/user), and message counts for each label.';
  public readonly category = 'productivity';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = false;

  public readonly inputSchema = {
    type: 'object' as const,
    properties: {},
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      labels: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string', description: 'Label type: "system" or "user"' },
            messagesTotal: { type: 'number' },
            messagesUnread: { type: 'number' },
          },
        },
      },
      labelCount: { type: 'number' },
    },
  };

  constructor(private readonly service: GmailService) {}

  async execute(
    _args: Record<string, never>,
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      const labels = await this.service.listLabels();

      return {
        success: true,
        output: { labels, labelCount: labels.length },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(_args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    // No required arguments
    return { isValid: true };
  }
}
