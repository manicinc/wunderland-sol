/**
 * @fileoverview Slack Channel Extension for AgentOS.
 *
 * Provides a bidirectional messaging channel adapter using @slack/bolt,
 * plus ITool descriptors for programmatic message sending and file uploads.
 *
 * @module @framers/agentos-ext-channel-slack
 */

import type { ExtensionContext, ExtensionPack } from '@framers/agentos';
import { SlackService, type SlackChannelConfig } from './SlackService';
import { SlackChannelAdapter } from './SlackChannelAdapter';
import { SlackSendMessageTool } from './tools/sendMessage';
import { SlackSendMediaTool } from './tools/sendMedia';

export interface SlackChannelOptions {
  botToken?: string;
  signingSecret?: string;
  appToken?: string;
  socketMode?: boolean;
  port?: number;
  priority?: number;
}

function resolveBotToken(options: SlackChannelOptions, secrets?: Record<string, string>): string {
  if (options.botToken) return options.botToken;

  // Check secrets map from registry
  if (secrets?.['slack.botToken']) return secrets['slack.botToken'];

  // Environment variable fallback
  const envValue = process.env['SLACK_BOT_TOKEN'];
  if (envValue) return envValue;

  throw new Error(
    'Slack bot token not found. Provide via options.botToken, secrets["slack.botToken"], or SLACK_BOT_TOKEN env var.',
  );
}

function resolveSigningSecret(options: SlackChannelOptions, secrets?: Record<string, string>): string {
  if (options.signingSecret) return options.signingSecret;

  // Check secrets map from registry
  if (secrets?.['slack.signingSecret']) return secrets['slack.signingSecret'];

  // Environment variable fallback
  const envValue = process.env['SLACK_SIGNING_SECRET'];
  if (envValue) return envValue;

  throw new Error(
    'Slack signing secret not found. Provide via options.signingSecret, secrets["slack.signingSecret"], or SLACK_SIGNING_SECRET env var.',
  );
}

function resolveAppToken(options: SlackChannelOptions, secrets?: Record<string, string>): string | undefined {
  if (options.appToken) return options.appToken;

  // Check secrets map from registry
  if (secrets?.['slack.appToken']) return secrets['slack.appToken'];

  // Environment variable fallback
  const envValue = process.env['SLACK_APP_TOKEN'];
  if (envValue) return envValue;

  return undefined;
}

export function createExtensionPack(context: ExtensionContext): ExtensionPack {
  const options = (context.options ?? {}) as SlackChannelOptions & { secrets?: Record<string, string> };
  const botToken = resolveBotToken(options, options.secrets);
  const signingSecret = resolveSigningSecret(options, options.secrets);
  const appToken = resolveAppToken(options, options.secrets);

  const config: SlackChannelConfig = {
    botToken,
    signingSecret,
    appToken,
    socketMode: options.socketMode ?? !!appToken,
    port: options.port,
  };

  const service = new SlackService(config);
  const adapter = new SlackChannelAdapter(service);
  const sendMessageTool = new SlackSendMessageTool(service);
  const sendMediaTool = new SlackSendMediaTool(service);

  const priority = options.priority ?? 50;

  return {
    name: '@framers/agentos-ext-channel-slack',
    version: '0.1.0',
    descriptors: [
      { id: 'slackChannelSendMessage', kind: 'tool', priority, payload: sendMessageTool },
      { id: 'slackChannelSendMedia', kind: 'tool', priority, payload: sendMediaTool },
      { id: 'slackChannel', kind: 'messaging-channel', priority, payload: adapter },
    ],
    onActivate: async () => {
      await service.initialize();
      // Wire adapter event listeners after service is running
      await adapter.initialize({ platform: 'slack', credential: botToken });
      context.logger?.info('[SlackChannel] Extension activated');
    },
    onDeactivate: async () => {
      await adapter.shutdown();
      await service.shutdown();
      context.logger?.info('[SlackChannel] Extension deactivated');
    },
  };
}

export { SlackService, SlackChannelAdapter, SlackSendMessageTool, SlackSendMediaTool };
export type { SlackChannelConfig };
export default createExtensionPack;
