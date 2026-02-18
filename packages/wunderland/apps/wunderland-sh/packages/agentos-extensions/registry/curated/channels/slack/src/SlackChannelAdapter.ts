/**
 * @fileoverview IChannelAdapter implementation for Slack via @slack/bolt.
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
  ConversationType,
} from '@framers/agentos';
import { SlackService } from './SlackService';
import type { MessageEvent } from '@slack/bolt';

export class SlackChannelAdapter implements IChannelAdapter {
  readonly platform: ChannelPlatform = 'slack';
  readonly displayName = 'Slack';
  readonly capabilities: readonly ChannelCapability[] = [
    'text',
    'rich_text',
    'images',
    'documents',
    'threads',
    'reactions',
    'mentions',
    'group_chat',
    'editing',
    'deletion',
  ] as const;

  private handlers = new Map<ChannelEventHandler, ChannelEventType[] | undefined>();
  private msgHandler: ((event: MessageEvent) => void) | null = null;

  constructor(private readonly service: SlackService) {}

  async initialize(_auth: ChannelAuthConfig): Promise<void> {
    // Service is initialized by the extension pack lifecycle, but
    // if called directly (e.g., standalone usage), we wire up here.
    this.msgHandler = (event: MessageEvent) => this.handleInboundMessage(event);
    this.service.onMessage(this.msgHandler);
  }

  async shutdown(): Promise<void> {
    if (this.msgHandler) {
      this.service.offMessage(this.msgHandler);
      this.msgHandler = null;
    }
    this.handlers.clear();
  }

  getConnectionInfo(): ChannelConnectionInfo {
    return {
      status: this.service.isRunning ? 'connected' : 'disconnected',
    };
  }

  async sendMessage(conversationId: string, content: MessageContent): Promise<ChannelSendResult> {
    const textBlock = content.blocks.find((b) => b.type === 'text');
    const imageBlock = content.blocks.find((b) => b.type === 'image');
    const documentBlock = content.blocks.find((b) => b.type === 'document');

    // Build Slack blocks for rich content
    const slackBlocks: object[] = [];

    if (textBlock && textBlock.type === 'text') {
      slackBlocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: textBlock.text },
      });
    }

    if (imageBlock && imageBlock.type === 'image') {
      slackBlocks.push({
        type: 'image',
        image_url: imageBlock.url,
        alt_text: imageBlock.caption ?? 'image',
      });
    }

    // For documents, upload as a file instead of using blocks
    if (documentBlock && documentBlock.type === 'document') {
      await this.service.uploadFile(
        conversationId,
        documentBlock.url,
        documentBlock.filename,
      );
    }

    const text = (textBlock && textBlock.type === 'text') ? textBlock.text : '';

    const result = await this.service.sendMessage(conversationId, text, {
      blocks: slackBlocks.length > 0 ? slackBlocks : undefined,
      threadTs: content.replyToMessageId ?? undefined,
    });

    return { messageId: result.ts, timestamp: new Date().toISOString() };
  }

  async sendTypingIndicator(_conversationId: string, _isTyping: boolean): Promise<void> {
    // Slack does not support bot typing indicators — no-op.
  }

  on(handler: ChannelEventHandler, eventTypes?: ChannelEventType[]): () => void {
    this.handlers.set(handler, eventTypes);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async editMessage(conversationId: string, messageId: string, content: MessageContent): Promise<void> {
    const textBlock = content.blocks.find((b) => b.type === 'text');
    const text = (textBlock && textBlock.type === 'text') ? textBlock.text : '';

    const slackBlocks: object[] = [];
    if (textBlock && textBlock.type === 'text') {
      slackBlocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: textBlock.text },
      });
    }

    await this.service.updateMessage(conversationId, messageId, text, {
      blocks: slackBlocks.length > 0 ? slackBlocks : undefined,
    });
  }

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    await this.service.deleteMessage(conversationId, messageId);
  }

  async addReaction(conversationId: string, messageId: string, emoji: string): Promise<void> {
    // Strip colons if present (e.g., ":thumbsup:" → "thumbsup")
    const name = emoji.replace(/^:+|:+$/g, '');
    await this.service.addReaction(conversationId, messageId, name);
  }

  async getConversationInfo(conversationId: string): Promise<{
    name?: string;
    memberCount?: number;
    isGroup: boolean;
    metadata?: Record<string, unknown>;
  }> {
    const info = await this.service.getConversationInfo(conversationId);
    return {
      name: info.name,
      memberCount: info.memberCount,
      isGroup: info.isGroup,
      metadata: {
        topic: info.topic,
        purpose: info.purpose,
        ...info.metadata,
      },
    };
  }

  // ── Private ──

  private handleInboundMessage(event: MessageEvent): void {
    const msg = event as any;

    const sender: RemoteUser = {
      id: msg.user ?? 'unknown',
      displayName: undefined, // Slack events don't include display name; would require users.info call
      username: undefined,
    };

    // Determine conversation type from channel_type
    let conversationType: ConversationType;
    switch (msg.channel_type) {
      case 'im':
        conversationType = 'direct';
        break;
      case 'mpim':
      case 'channel':
      case 'group':
      default:
        conversationType = 'group';
        break;
    }

    const channelMessage: ChannelMessage = {
      messageId: msg.ts ?? msg.event_ts ?? '',
      platform: 'slack',
      conversationId: msg.channel ?? '',
      conversationType,
      sender,
      content: [{ type: 'text', text: msg.text ?? '' }],
      text: msg.text ?? '',
      timestamp: msg.ts
        ? new Date(parseFloat(msg.ts) * 1000).toISOString()
        : new Date().toISOString(),
      replyToMessageId: msg.thread_ts !== msg.ts ? msg.thread_ts : undefined,
      rawEvent: event,
    };

    const channelEvent: ChannelEvent<ChannelMessage> = {
      type: 'message',
      platform: 'slack',
      conversationId: msg.channel ?? '',
      timestamp: channelMessage.timestamp,
      data: channelMessage,
    };

    this.emit(channelEvent);
  }

  private emit(event: ChannelEvent): void {
    for (const [handler, filter] of this.handlers) {
      if (!filter || filter.includes(event.type)) {
        Promise.resolve(handler(event)).catch((err) => {
          console.error('[SlackChannelAdapter] Handler error:', err);
        });
      }
    }
  }
}
