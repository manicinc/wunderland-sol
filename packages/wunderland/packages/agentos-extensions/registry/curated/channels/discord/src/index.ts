/**
 * @fileoverview Discord Channel Extension for AgentOS.
 *
 * Provides a bidirectional messaging channel adapter using discord.js,
 * plus ITool descriptors for programmatic message sending.
 *
 * @module @framers/agentos-ext-channel-discord
 */

import type { ExtensionContext, ExtensionPack } from '@framers/agentos';
import { DiscordService, type DiscordChannelConfig } from './DiscordService';
import { DiscordChannelAdapter } from './DiscordChannelAdapter';
import { DiscordSendMessageTool } from './tools/sendMessage';
import { DiscordSendMediaTool } from './tools/sendMedia';

export interface DiscordChannelOptions {
  botToken?: string;
  botTokenEnv?: string;
  applicationId?: string;
  intents?: number[];
  priority?: number;
}

function resolveBotToken(options: DiscordChannelOptions, secrets?: Record<string, string>): string {
  if (options.botToken) return options.botToken;

  // Check secrets map from registry
  if (secrets?.['discord.botToken']) return secrets['discord.botToken'];

  // Environment variable fallback
  const envName = options.botTokenEnv ?? 'DISCORD_BOT_TOKEN';
  const envValue = process.env[envName];
  if (envValue) return envValue;

  // Common variations
  for (const v of ['DISCORD_BOT_TOKEN', 'DISCORD_TOKEN']) {
    if (process.env[v]) return process.env[v]!;
  }

  throw new Error(
    'Discord bot token not found. Provide via options.botToken, secrets["discord.botToken"], or DISCORD_BOT_TOKEN env var.',
  );
}

export function createExtensionPack(context: ExtensionContext): ExtensionPack {
  const options = (context.options ?? {}) as DiscordChannelOptions & { secrets?: Record<string, string> };
  const botToken = resolveBotToken(options, options.secrets);

  const config: DiscordChannelConfig = {
    botToken,
    applicationId: options.applicationId,
    intents: options.intents,
  };

  const service = new DiscordService(config);
  const adapter = new DiscordChannelAdapter(service);
  const sendMessageTool = new DiscordSendMessageTool(service);
  const sendMediaTool = new DiscordSendMediaTool(service);

  const priority = options.priority ?? 50;

  return {
    name: '@framers/agentos-ext-channel-discord',
    version: '0.1.0',
    descriptors: [
      { id: 'discordChannelSendMessage', kind: 'tool', priority, payload: sendMessageTool },
      { id: 'discordChannelSendMedia', kind: 'tool', priority, payload: sendMediaTool },
      { id: 'discordChannel', kind: 'messaging-channel', priority, payload: adapter },
    ],
    onActivate: async () => {
      await service.initialize();
      // Wire adapter event listeners after service is running
      await adapter.initialize({ platform: 'discord', credential: botToken });
      context.logger?.info('[DiscordChannel] Extension activated');
    },
    onDeactivate: async () => {
      await adapter.shutdown();
      await service.shutdown();
      context.logger?.info('[DiscordChannel] Extension deactivated');
    },
  };
}

export { DiscordService, DiscordChannelAdapter, DiscordSendMessageTool, DiscordSendMediaTool };
export type { DiscordChannelConfig };
export default createExtensionPack;
