/**
 * @fileoverview ITool for sending text messages via the WebChat channel adapter.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { WebChatService } from '../WebChatService';

export class WebChatSendMessageTool implements ITool {
  public readonly id = 'webchatChannelSendMessage';
  public readonly name = 'webchatChannelSendMessage';
  public readonly displayName = 'Send WebChat Message';
  public readonly description = 'Send a text message to a web chat conversation via the WebChat channel adapter.';
  public readonly category = 'communication';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = true;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['conversationId', 'text'] as const,
    properties: {
      conversationId: { type: 'string', description: 'Target conversation/room ID' },
      text: { type: 'string', description: 'Message text to send' },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      conversationId: { type: 'string', description: 'Target conversation ID' },
      sent: { type: 'boolean', description: 'Whether the message was sent successfully' },
    },
  };

  constructor(private readonly service: WebChatService) {}

  async execute(
    args: { conversationId: string; text: string },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      await this.service.sendMessage(args.conversationId, args.text);

      return {
        success: true,
        output: { conversationId: args.conversationId, sent: true },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!args.conversationId) errors.push('conversationId is required');
    if (!args.text) errors.push('text is required');
    else if (typeof args.text !== 'string') errors.push('text must be a string');
    return { isValid: errors.length === 0, errors };
  }
}
