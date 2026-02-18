/**
 * @fileoverview ITool for sending media (image, document) via the WhatsApp channel adapter.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { WhatsAppService } from '../WhatsAppService';

export class WhatsAppSendMediaTool implements ITool {
  public readonly id = 'whatsappChannelSendMedia';
  public readonly name = 'whatsappChannelSendMedia';
  public readonly displayName = 'Send WhatsApp Media';
  public readonly description = 'Send an image or document to a WhatsApp chat via the channel adapter.';
  public readonly category = 'communication';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = true;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['jid', 'mediaType', 'url'] as const,
    properties: {
      jid: { type: 'string', description: 'Target JID (e.g., 1234567890@s.whatsapp.net or group-id@g.us)' },
      mediaType: { type: 'string', enum: ['image', 'document'], description: 'Type of media to send' },
      url: { type: 'string', description: 'URL of the media file' },
      caption: { type: 'string', description: 'Optional caption (images only)' },
      filename: { type: 'string', description: 'Filename (documents only)' },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      messageId: { type: 'string', description: 'Sent message ID' },
    },
  };

  constructor(private readonly service: WhatsAppService) {}

  async execute(
    args: { jid: string; mediaType: 'image' | 'document'; url: string; caption?: string; filename?: string },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      let result: { key: { id: string } };

      if (args.mediaType === 'image') {
        result = await this.service.sendImage(args.jid, args.url, args.caption);
      } else {
        result = await this.service.sendDocument(args.jid, args.url, args.filename);
      }

      return { success: true, output: { messageId: result.key.id } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!args.jid) errors.push('jid is required');
    if (!args.mediaType || !['image', 'document'].includes(args.mediaType)) {
      errors.push('mediaType must be "image" or "document"');
    }
    if (!args.url) errors.push('url is required');
    return { isValid: errors.length === 0, errors };
  }
}
