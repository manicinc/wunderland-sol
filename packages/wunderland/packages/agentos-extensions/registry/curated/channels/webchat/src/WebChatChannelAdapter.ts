/**
 * @fileoverview IChannelAdapter implementation for the built-in WebChat widget.
 *
 * This is the simplest channel adapter — no external SDK, no authentication.
 * It bridges between the AgentOS channel system and the WebChatService,
 * which in turn delegates to the WunderlandGateway for Socket.IO transport.
 */

import type {
  IChannelAdapter,
  ChannelPlatform,
  ChannelCapability,
  ChannelAuthConfig,
  ChannelConnectionInfo,
  ChannelSendResult,
  MessageContent,
  ChannelEventHandler,
  ChannelEventType,
  ChannelEvent,
  ChannelMessage,
  RemoteUser,
} from '@framers/agentos';
import { WebChatService } from './WebChatService';
import type { WebChatInboundMessage } from './WebChatService';

/** Counter-based UUID fallback for environments without crypto.randomUUID. */
let messageCounter = 0;
function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  messageCounter++;
  return `webchat-msg-${Date.now()}-${messageCounter}`;
}

export class WebChatChannelAdapter implements IChannelAdapter {
  readonly platform: ChannelPlatform = 'webchat';
  readonly displayName = 'WebChat';
  readonly capabilities: readonly ChannelCapability[] = [
    'text',
    'images',
    'typing_indicator',
    'read_receipts',
  ] as const;

  private handlers = new Map<ChannelEventHandler, ChannelEventType[] | undefined>();
  private inboundHandler: ((msg: WebChatInboundMessage) => void) | null = null;

  constructor(private readonly service: WebChatService) {}

  async initialize(_auth: ChannelAuthConfig): Promise<void> {
    // Wire up the inbound message bridge from WebChatService
    this.inboundHandler = (msg: WebChatInboundMessage) => this.handleInboundMessage(msg);
    this.service.onInbound(this.inboundHandler);
  }

  async shutdown(): Promise<void> {
    if (this.inboundHandler) {
      this.service.offInbound(this.inboundHandler);
      this.inboundHandler = null;
    }
    this.handlers.clear();
  }

  getConnectionInfo(): ChannelConnectionInfo {
    // WebChat is always "connected" when the service is running —
    // there's no external connection to establish or maintain.
    return {
      status: this.service.isRunning ? 'connected' : 'disconnected',
    };
  }

  async sendMessage(conversationId: string, content: MessageContent): Promise<ChannelSendResult> {
    const textBlock = content.blocks.find((b) => b.type === 'text');
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    await this.service.sendMessage(conversationId, text);

    const messageId = generateMessageId();
    return { messageId, timestamp: new Date().toISOString() };
  }

  async sendTypingIndicator(conversationId: string, isTyping: boolean): Promise<void> {
    await this.service.sendMessage(conversationId, '', { typing: isTyping });
  }

  on(handler: ChannelEventHandler, eventTypes?: ChannelEventType[]): () => void {
    this.handlers.set(handler, eventTypes);
    return () => {
      this.handlers.delete(handler);
    };
  }

  // ── Private ──

  private handleInboundMessage(msg: WebChatInboundMessage): void {
    const sender: RemoteUser = {
      id: msg.sender.id,
      displayName: msg.sender.displayName,
      username: msg.sender.username,
      avatarUrl: msg.sender.avatarUrl,
    };

    const channelMessage: ChannelMessage = {
      messageId: msg.messageId,
      platform: 'webchat',
      conversationId: msg.conversationId,
      conversationType: 'direct',
      sender,
      content: [{ type: 'text', text: msg.text }],
      text: msg.text,
      timestamp: msg.timestamp,
      rawEvent: msg,
    };

    const event: ChannelEvent<ChannelMessage> = {
      type: 'message',
      platform: 'webchat',
      conversationId: msg.conversationId,
      timestamp: msg.timestamp,
      data: channelMessage,
    };

    this.emit(event);
  }

  private emit(event: ChannelEvent): void {
    for (const [handler, filter] of this.handlers) {
      if (!filter || filter.includes(event.type)) {
        Promise.resolve(handler(event)).catch((err) => {
          console.error('[WebChatChannelAdapter] Handler error:', err);
        });
      }
    }
  }
}
