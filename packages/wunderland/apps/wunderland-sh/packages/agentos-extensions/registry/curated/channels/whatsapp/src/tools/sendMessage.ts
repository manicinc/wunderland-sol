/**
 * @fileoverview ITool for sending text messages via the WhatsApp channel adapter.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { WhatsAppService } from '../WhatsAppService';

export class WhatsAppSendMessageTool implements ITool {
  public readonly id = 'whatsappChannelSendMessage';
  public readonly name = 'whatsappChannelSendMessage';
  public readonly displayName = 'Send WhatsApp Message';
  public readonly description = 'Send a text message to a WhatsApp chat via the channel adapter.';
  public readonly category = 'communication';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = true;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['jid', 'text'] as const,
    properties: {
      jid: { type: 'string', description: 'Target JID (e.g., 1234567890@s.whatsapp.net or group-id@g.us)' },
      text: { type: 'string', description: 'Message text' },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      messageId: { type: 'string', description: 'Sent message ID' },
      jid: { type: 'string', description: 'Target JID' },
    },
  };

  constructor(private readonly service: WhatsAppService) {}

  async execute(
    args: { jid: string; text: string },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      const result = await this.service.sendMessage(args.jid, args.text);

      return {
        success: true,
        output: { messageId: result.key.id, jid: args.jid },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!args.jid) errors.push('jid is required');
    else if (typeof args.jid !== 'string') errors.push('jid must be a string');
    if (!args.text) errors.push('text is required');
    else if (typeof args.text !== 'string') errors.push('text must be a string');
    return { isValid: errors.length === 0, errors };
  }
}
