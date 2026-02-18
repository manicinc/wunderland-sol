/**
 * @fileoverview WhatsApp Channel Extension for AgentOS.
 *
 * Provides a bidirectional messaging channel adapter using @whiskeysockets/baileys,
 * plus ITool descriptors for programmatic message sending.
 *
 * @module @framers/agentos-ext-channel-whatsapp
 */

import type { ExtensionContext, ExtensionPack } from '@framers/agentos';
import { WhatsAppService, type WhatsAppChannelConfig } from './WhatsAppService';
import { WhatsAppChannelAdapter } from './WhatsAppChannelAdapter';
import { WhatsAppSendMessageTool } from './tools/sendMessage';
import { WhatsAppSendMediaTool } from './tools/sendMedia';

export interface WhatsAppChannelOptions {
  sessionData?: string;
  sessionDataEnv?: string;
  phoneNumber?: string;
  reconnect?: { maxRetries: number; delayMs: number };
  rateLimit?: { maxRequests: number; windowMs: number };
  priority?: number;
}

function resolveSessionData(options: WhatsAppChannelOptions, secrets?: Record<string, string>): string {
  if (options.sessionData) return options.sessionData;

  // Check secrets map from registry
  if (secrets?.['whatsapp.sessionData']) return secrets['whatsapp.sessionData'];

  // Environment variable fallback
  const envName = options.sessionDataEnv ?? 'WHATSAPP_SESSION_DATA';
  const envValue = process.env[envName];
  if (envValue) return envValue;

  // Common variations
  for (const v of ['WHATSAPP_SESSION_DATA', 'WHATSAPP_AUTH_STATE']) {
    if (process.env[v]) return process.env[v]!;
  }

  throw new Error(
    'WhatsApp session data not found. Provide via options.sessionData, secrets["whatsapp.sessionData"], or WHATSAPP_SESSION_DATA env var.',
  );
}

export function createExtensionPack(context: ExtensionContext): ExtensionPack {
  const options = (context.options ?? {}) as WhatsAppChannelOptions & { secrets?: Record<string, string> };
  const sessionData = resolveSessionData(options, options.secrets);

  const config: WhatsAppChannelConfig = {
    sessionData,
    phoneNumber: options.phoneNumber,
    reconnect: options.reconnect ?? { maxRetries: 5, delayMs: 3000 },
    rateLimit: options.rateLimit ?? { maxRequests: 30, windowMs: 1000 },
  };

  const service = new WhatsAppService(config);
  const adapter = new WhatsAppChannelAdapter(service);
  const sendMessageTool = new WhatsAppSendMessageTool(service);
  const sendMediaTool = new WhatsAppSendMediaTool(service);

  const priority = options.priority ?? 50;

  return {
    name: '@framers/agentos-ext-channel-whatsapp',
    version: '0.1.0',
    descriptors: [
      { id: 'whatsappChannelSendMessage', kind: 'tool', priority, payload: sendMessageTool },
      { id: 'whatsappChannelSendMedia', kind: 'tool', priority, payload: sendMediaTool },
      { id: 'whatsappChannel', kind: 'messaging-channel', priority, payload: adapter },
    ],
    onActivate: async () => {
      await service.initialize();
      // Wire adapter event listeners after service is running
      await adapter.initialize({ platform: 'whatsapp', credential: sessionData });
      context.logger?.info('[WhatsAppChannel] Extension activated');
    },
    onDeactivate: async () => {
      await adapter.shutdown();
      await service.shutdown();
      context.logger?.info('[WhatsAppChannel] Extension deactivated');
    },
  };
}

export { WhatsAppService, WhatsAppChannelAdapter, WhatsAppSendMessageTool, WhatsAppSendMediaTool };
export type { WhatsAppChannelConfig };
export default createExtensionPack;
