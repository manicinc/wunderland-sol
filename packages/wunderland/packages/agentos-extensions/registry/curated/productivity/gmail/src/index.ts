/**
 * @fileoverview Gmail Email Extension for AgentOS.
 *
 * Provides 6 ITool descriptors for email operations via the Google Gmail API:
 * list messages, read message, send message, reply to message, search, and list labels.
 *
 * @module @framers/agentos-ext-email-gmail
 */

import type { ExtensionContext, ExtensionPack } from '@framers/agentos';
import { GmailService, type GmailConfig } from './GmailService';
import { GmailListMessagesTool } from './tools/listMessages';
import { GmailReadMessageTool } from './tools/readMessage';
import { GmailSendMessageTool } from './tools/sendMessage';
import { GmailReplyMessageTool } from './tools/replyMessage';
import { GmailSearchMessagesTool } from './tools/searchMessages';
import { GmailListLabelsTool } from './tools/listLabels';

export interface GmailExtensionOptions {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  priority?: number;
}

/**
 * Resolves a Google OAuth credential from options, secrets map, or environment variables.
 */
function resolveCredential(
  name: string,
  optionValue: string | undefined,
  secrets: Record<string, string> | undefined,
  secretKey: string,
  envNames: string[],
): string {
  if (optionValue) return optionValue;

  if (secrets?.[secretKey]) return secrets[secretKey];

  for (const envName of envNames) {
    if (process.env[envName]) return process.env[envName]!;
  }

  throw new Error(
    `Gmail ${name} not found. Provide via options.${name}, secrets["${secretKey}"], ` +
    `or one of these env vars: ${envNames.join(', ')}.`,
  );
}

export function createExtensionPack(context: ExtensionContext): ExtensionPack {
  const options = (context.options ?? {}) as GmailExtensionOptions & { secrets?: Record<string, string> };

  const clientId = resolveCredential(
    'clientId',
    options.clientId,
    options.secrets,
    'google.clientId',
    ['GOOGLE_CLIENT_ID', 'GMAIL_CLIENT_ID'],
  );

  const clientSecret = resolveCredential(
    'clientSecret',
    options.clientSecret,
    options.secrets,
    'google.clientSecret',
    ['GOOGLE_CLIENT_SECRET', 'GMAIL_CLIENT_SECRET'],
  );

  const refreshToken = resolveCredential(
    'refreshToken',
    options.refreshToken,
    options.secrets,
    'google.refreshToken',
    ['GOOGLE_REFRESH_TOKEN', 'GMAIL_REFRESH_TOKEN'],
  );

  const config: GmailConfig = { clientId, clientSecret, refreshToken };
  const service = new GmailService(config);

  const listMessagesTool = new GmailListMessagesTool(service);
  const readMessageTool = new GmailReadMessageTool(service);
  const sendMessageTool = new GmailSendMessageTool(service);
  const replyMessageTool = new GmailReplyMessageTool(service);
  const searchMessagesTool = new GmailSearchMessagesTool(service);
  const listLabelsTool = new GmailListLabelsTool(service);

  const priority = options.priority ?? 50;

  return {
    name: '@framers/agentos-ext-email-gmail',
    version: '0.1.0',
    descriptors: [
      { id: 'gmailListMessages', kind: 'tool', priority, payload: listMessagesTool },
      { id: 'gmailReadMessage', kind: 'tool', priority, payload: readMessageTool },
      { id: 'gmailSendMessage', kind: 'tool', priority, payload: sendMessageTool },
      { id: 'gmailReplyMessage', kind: 'tool', priority, payload: replyMessageTool },
      { id: 'gmailSearchMessages', kind: 'tool', priority, payload: searchMessagesTool },
      { id: 'gmailListLabels', kind: 'tool', priority, payload: listLabelsTool },
      { id: 'gmailService', kind: 'productivity', priority, payload: service },
    ],
    onActivate: async () => {
      await service.initialize();
      context.logger?.info('[Gmail] Extension activated');
    },
    onDeactivate: async () => {
      await service.shutdown();
      context.logger?.info('[Gmail] Extension deactivated');
    },
  };
}

export {
  GmailService,
  GmailListMessagesTool,
  GmailReadMessageTool,
  GmailSendMessageTool,
  GmailReplyMessageTool,
  GmailSearchMessagesTool,
  GmailListLabelsTool,
};
export type { GmailConfig, EmailMessage, EmailLabel, ListMessagesOptions } from './GmailService';
export default createExtensionPack;
