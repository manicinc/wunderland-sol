/**
 * @fileoverview Telegram Channel Extension for AgentOS.
 *
 * Provides a bidirectional messaging channel adapter using grammY,
 * plus ITool descriptors for programmatic message sending.
 *
 * @module @framers/agentos-ext-channel-telegram
 */

import type { ExtensionContext, ExtensionPack } from '@framers/agentos';
import { TelegramService, type TelegramChannelConfig } from './TelegramService';
import { TelegramChannelAdapter } from './TelegramChannelAdapter';
import { TelegramSendMessageTool } from './tools/sendMessage';
import { TelegramSendMediaTool } from './tools/sendMedia';

export interface TelegramChannelOptions {
  botToken?: string;
  botTokenEnv?: string;
  webhookUrl?: string;
  pollingTimeout?: number;
  defaultParseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  rateLimit?: { maxRequests: number; windowMs: number };
  priority?: number;
}

function resolveBotToken(options: TelegramChannelOptions, secrets?: Record<string, string>): string {
  if (options.botToken) return options.botToken;

  // Check secrets map from registry
  if (secrets?.['telegram.botToken']) return secrets['telegram.botToken'];

  // Environment variable fallback
  const envName = options.botTokenEnv ?? 'TELEGRAM_BOT_TOKEN';
  const envValue = process.env[envName];
  if (envValue) return envValue;

  // Common variations
  for (const v of ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_TOKEN']) {
    if (process.env[v]) return process.env[v]!;
  }

  throw new Error(
    'Telegram bot token not found. Provide via options.botToken, secrets["telegram.botToken"], or TELEGRAM_BOT_TOKEN env var.',
  );
}

export function createExtensionPack(context: ExtensionContext): ExtensionPack {
  const options = (context.options ?? {}) as TelegramChannelOptions & { secrets?: Record<string, string> };
  const botToken = resolveBotToken(options, options.secrets);

  const config: TelegramChannelConfig = {
    botToken,
    webhookUrl: options.webhookUrl,
    pollingTimeout: options.pollingTimeout,
    defaultParseMode: options.defaultParseMode ?? 'HTML',
    rateLimit: options.rateLimit ?? { maxRequests: 30, windowMs: 1000 },
  };

  const service = new TelegramService(config);
  const adapter = new TelegramChannelAdapter(service);
  const sendMessageTool = new TelegramSendMessageTool(service);
  const sendMediaTool = new TelegramSendMediaTool(service);

  const priority = options.priority ?? 50;

  return {
    name: '@framers/agentos-ext-channel-telegram',
    version: '0.1.0',
    descriptors: [
      { id: 'telegramChannelSendMessage', kind: 'tool', priority, payload: sendMessageTool },
      { id: 'telegramChannelSendMedia', kind: 'tool', priority, payload: sendMediaTool },
      { id: 'telegramChannel', kind: 'messaging-channel', priority, payload: adapter },
    ],
    onActivate: async () => {
      await service.initialize();
      // Wire adapter event listeners after service is running
      await adapter.initialize({ platform: 'telegram', credential: botToken });
      context.logger?.info('[TelegramChannel] Extension activated');
    },
    onDeactivate: async () => {
      await adapter.shutdown();
      await service.shutdown();
      context.logger?.info('[TelegramChannel] Extension deactivated');
    },
  };
}

export { TelegramService, TelegramChannelAdapter, TelegramSendMessageTool, TelegramSendMediaTool };
export type { TelegramChannelConfig };
export default createExtensionPack;
