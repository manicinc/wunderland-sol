/**
 * @fileoverview IChannelAdapter implementation for Discord via discord.js.
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
import { DiscordService } from './DiscordService';
import { ChannelType, type Message, type APIEmbed } from 'discord.js';

export class DiscordChannelAdapter implements IChannelAdapter {
  readonly platform: ChannelPlatform = 'discord';
  readonly displayName = 'Discord';
  readonly capabilities: readonly ChannelCapability[] = [
    'text',
    'rich_text',
    'images',
    'documents',
    'embeds',
    'reactions',
    'threads',
    'typing_indicator',
    'group_chat',
    'mentions',
    'editing',
    'deletion',
  ] as const;

  private handlers = new Map<ChannelEventHandler, ChannelEventType[] | undefined>();
  private messageHandler: ((message: Message) => void) | null = null;

  constructor(private readonly service: DiscordService) {}

  async initialize(_auth: ChannelAuthConfig): Promise<void> {
    this.messageHandler = (message: Message) => this.handleInboundMessage(message);
    this.service.onMessage(this.messageHandler);
  }

  async shutdown(): Promise<void> {
    if (this.messageHandler) {
      this.service.offMessage(this.messageHandler);
      this.messageHandler = null;
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
    const embedBlock = content.blocks.find((b) => b.type === 'embed');

    // Build embeds array from embed blocks
    const embeds: APIEmbed[] = [];
    if (embedBlock && embedBlock.type === 'embed') {
      embeds.push({
        title: (embedBlock as any).title,
        description: (embedBlock as any).description,
        color: (embedBlock as any).color,
        fields: (embedBlock as any).fields,
      });
    }

    if (imageBlock && imageBlock.type === 'image') {
      // Send image as attachment with optional text
      const result = await this.service.sendFile(
        conversationId,
        imageBlock.url,
        imageBlock.caption ?? undefined,
      );
      return { messageId: result.id, timestamp: new Date().toISOString() };
    }

    if (documentBlock && documentBlock.type === 'document') {
      const result = await this.service.sendFile(
        conversationId,
        documentBlock.url,
        documentBlock.filename,
      );
      return { messageId: result.id, timestamp: new Date().toISOString() };
    }

    const text = textBlock?.text ?? '';
    const result = await this.service.sendMessage(conversationId, text, {
      embeds: embeds.length > 0 ? embeds : undefined,
      replyToMessageId: content.replyToMessageId ?? undefined,
    });

    return { messageId: result.id, timestamp: result.timestamp };
  }

  async sendTypingIndicator(conversationId: string, isTyping: boolean): Promise<void> {
    if (isTyping) {
      await this.service.setTyping(conversationId);
    }
    // Discord typing indicator auto-clears after ~10 seconds or on message send.
  }

  on(handler: ChannelEventHandler, eventTypes?: ChannelEventType[]): () => void {
    this.handlers.set(handler, eventTypes);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async editMessage(conversationId: string, messageId: string, content: MessageContent): Promise<void> {
    const client = this.service.getClient();
    const channel = await client.channels.fetch(conversationId);
    if (!channel || !('messages' in channel)) return;

    const msg = await (channel as any).messages.fetch(messageId);
    const textBlock = content.blocks.find((b) => b.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      await msg.edit({ content: textBlock.text });
    }
  }

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    const client = this.service.getClient();
    const channel = await client.channels.fetch(conversationId);
    if (!channel || !('messages' in channel)) return;

    const msg = await (channel as any).messages.fetch(messageId);
    await msg.delete();
  }

  async addReaction(conversationId: string, messageId: string, emoji: string): Promise<void> {
    const client = this.service.getClient();
    const channel = await client.channels.fetch(conversationId);
    if (!channel || !('messages' in channel)) return;

    const msg = await (channel as any).messages.fetch(messageId);
    await msg.react(emoji);
  }

  async getConversationInfo(conversationId: string): Promise<{
    name?: string;
    memberCount?: number;
    isGroup: boolean;
    metadata?: Record<string, unknown>;
  }> {
    const client = this.service.getClient();
    const channel = await client.channels.fetch(conversationId);
    if (!channel) {
      return { isGroup: false };
    }

    const isDM = channel.isDMBased();
    const isGroup = !isDM;

    return {
      name: 'name' in channel ? (channel as any).name : undefined,
      memberCount: 'guild' in channel && (channel as any).guild
        ? (channel as any).guild.memberCount
        : undefined,
      isGroup,
      metadata: {
        type: ChannelType[channel.type],
        guildId: 'guildId' in channel ? (channel as any).guildId : undefined,
      },
    };
  }

  // -- Private --

  private handleInboundMessage(message: Message): void {
    const sender: RemoteUser = {
      id: message.author.id,
      displayName: message.member?.displayName ?? message.author.displayName ?? undefined,
      username: message.author.username,
    };

    const conversationType: ConversationType = this.resolveConversationType(message);

    const channelMessage: ChannelMessage = {
      messageId: message.id,
      platform: 'discord',
      conversationId: message.channelId,
      conversationType,
      sender,
      content: [{ type: 'text', text: message.content ?? '' }],
      text: message.content ?? '',
      timestamp: message.createdAt.toISOString(),
      replyToMessageId: message.reference?.messageId ?? undefined,
      rawEvent: message,
    };

    const event: ChannelEvent<ChannelMessage> = {
      type: 'message',
      platform: 'discord',
      conversationId: message.channelId,
      timestamp: channelMessage.timestamp,
      data: channelMessage,
    };

    this.emit(event);
  }

  private resolveConversationType(message: Message): ConversationType {
    const channelType = message.channel.type;

    if (channelType === ChannelType.DM) return 'direct';
    if (
      channelType === ChannelType.PublicThread ||
      channelType === ChannelType.PrivateThread ||
      channelType === ChannelType.AnnouncementThread
    ) {
      return 'thread';
    }
    // GuildText, GuildAnnouncement, GuildVoice, GuildStageVoice, GroupDM, etc.
    return 'group';
  }

  private emit(event: ChannelEvent): void {
    for (const [handler, filter] of this.handlers) {
      if (!filter || filter.includes(event.type)) {
        Promise.resolve(handler(event)).catch((err) => {
          console.error('[DiscordChannelAdapter] Handler error:', err);
        });
      }
    }
  }
}
