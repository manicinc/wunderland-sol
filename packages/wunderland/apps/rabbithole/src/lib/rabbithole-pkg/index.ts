/**
 * @fileoverview Main entry point for RabbitHole - Human Assistant Marketplace
 * @module @framers/rabbithole
 *
 * RabbitHole provides multi-channel bridges and human-in-the-loop integration
 * for Wunderland agents.
 *
 * @example
 * ```typescript
 * import {
 *   SlackAdapter,
 *   DiscordAdapter,
 *   TelegramAdapter,
 *   WhatsAppAdapter,
 * } from '@framers/rabbithole';
 *
 * // Create channel adapters
 * const slack = new SlackAdapter({
 *   platform: 'slack',
 *   credentials: { platform: 'slack', botToken: '...', signingSecret: '...' },
 *   tenantId: 'acme-corp',
 * });
 *
 * // Connect and handle messages
 * slack.onMessage(async (msg) => {
 *   console.log('Received:', msg.content);
 * });
 *
 * await slack.connect();
 * ```
 */

// Channel exports
export * from './channels/index.js';

// Gateway exports
export * from './gateway/index.js';

// PII redaction exports
export * from './pii/index.js';

// Auth exports
export * from './auth/index.js';

// Admin exports (Task Queue, RBAC, Human Assistants)
export * from './admin/index.js';

// TTS exports
export * from './tts/index.js';

// Re-export commonly used items at top level
export {
  SlackAdapter,
  DiscordAdapter,
  TelegramAdapter,
  WhatsAppAdapter,
} from './channels/adapters/index.js';

export { BaseChannelAdapter } from './channels/BaseChannelAdapter.js';

export type {
  IChannelAdapter,
  ChannelPlatform,
  ChannelStatus,
  ChannelAdapterConfig,
  InboundChannelMessage,
  OutboundChannelMessage,
  ChannelUserAction,
  DeliveryStatus,
} from './channels/IChannelAdapter.js';

// Version info
export const VERSION = '0.1.0';
export const PACKAGE_NAME = '@framers/rabbithole';
