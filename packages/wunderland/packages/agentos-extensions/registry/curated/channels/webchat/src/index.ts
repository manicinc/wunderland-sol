/**
 * @fileoverview WebChat Channel Extension for AgentOS.
 *
 * Provides a lightweight messaging channel adapter for the built-in web chat
 * widget. Unlike other channel extensions, WebChat does NOT use an external
 * SDK — it delegates transport to the existing WunderlandGateway (Socket.IO).
 *
 * The backend wires:
 * - `service.onSend` → `gateway.broadcastChannelMessage` (outbound)
 * - `gateway.on('channel:send:internal')` → `service.injectMessage()` (inbound)
 *
 * @module @framers/agentos-ext-channel-webchat
 */

import type { ExtensionContext, ExtensionPack } from '@framers/agentos';
import { WebChatService } from './WebChatService';
import { WebChatChannelAdapter } from './WebChatChannelAdapter';
import { WebChatSendMessageTool } from './tools/sendMessage';

export interface WebChatChannelOptions {
  /** Optional priority for extension descriptors. Defaults to 50. */
  priority?: number;
  /**
   * Optional onSend callback. Normally the backend sets this after
   * extension activation to bridge to the WunderlandGateway.
   */
  onSend?: (conversationId: string, text: string, metadata?: Record<string, unknown>) => void | Promise<void>;
}

export function createExtensionPack(context: ExtensionContext): ExtensionPack {
  const options = (context.options ?? {}) as WebChatChannelOptions;

  // No secret resolution needed — WebChat uses gateway auth, not its own credentials.
  const service = new WebChatService();
  const adapter = new WebChatChannelAdapter(service);
  const sendMessageTool = new WebChatSendMessageTool(service);

  // If an onSend callback was provided via options, wire it immediately.
  if (options.onSend) {
    service.onSend = options.onSend;
  }

  const priority = options.priority ?? 50;

  return {
    name: '@framers/agentos-ext-channel-webchat',
    version: '0.1.0',
    descriptors: [
      { id: 'webchatChannelSendMessage', kind: 'tool', priority, payload: sendMessageTool },
      { id: 'webchatChannel', kind: 'messaging-channel', priority, payload: adapter },
    ],
    onActivate: async () => {
      await service.initialize();
      // Wire adapter event listeners after service is running.
      // No credential needed — pass empty string since webchat uses gateway auth.
      await adapter.initialize({ platform: 'webchat', credential: '' });
      context.logger?.info('[WebChatChannel] Extension activated');
    },
    onDeactivate: async () => {
      await adapter.shutdown();
      await service.shutdown();
      context.logger?.info('[WebChatChannel] Extension deactivated');
    },
  };
}

export { WebChatService, WebChatChannelAdapter, WebChatSendMessageTool };
export type {
  WebChatInboundMessage,
  WebChatSendMetadata,
  InboundHandler,
  OnSendCallback,
} from './WebChatService';
export default createExtensionPack;
