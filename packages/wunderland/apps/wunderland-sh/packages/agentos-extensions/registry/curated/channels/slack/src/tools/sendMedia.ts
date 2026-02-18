/**
 * @fileoverview ITool for uploading files via the Slack channel adapter.
 */

import type { ITool, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { SlackService } from '../SlackService';

export class SlackSendMediaTool implements ITool {
  public readonly id = 'slackChannelSendMedia';
  public readonly name = 'slackChannelSendMedia';
  public readonly displayName = 'Send Slack Media';
  public readonly description = 'Upload a file to a Slack channel via the channel adapter.';
  public readonly category = 'communication';
  public readonly version = '0.1.0';
  public readonly hasSideEffects = true;

  public readonly inputSchema = {
    type: 'object' as const,
    required: ['channel', 'url'] as const,
    properties: {
      channel: { type: 'string', description: 'Target channel ID (e.g., C0123456789)' },
      url: { type: 'string', description: 'URL or local path of the file to upload' },
      filename: { type: 'string', description: 'Optional filename for the upload' },
    },
  };

  public readonly outputSchema = {
    type: 'object' as const,
    properties: {
      fileId: { type: 'string', description: 'ID of the uploaded file' },
    },
  };

  constructor(private readonly service: SlackService) {}

  async execute(
    args: { channel: string; url: string; filename?: string },
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    try {
      const result = await this.service.uploadFile(args.channel, args.url, args.filename);

      return { success: true, output: { fileId: result.fileId } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  validateArgs(args: Record<string, any>): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!args.channel) errors.push('channel is required');
    if (!args.url) errors.push('url is required');
    return { isValid: errors.length === 0, errors };
  }
}
