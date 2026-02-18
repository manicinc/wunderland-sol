/**
 * @fileoverview IChannelAdapter implementation for WhatsApp via Baileys.
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
import { WhatsAppService } from './WhatsAppService';

export class WhatsAppChannelAdapter implements IChannelAdapter {
  readonly platform: ChannelPlatform = 'whatsapp';
  readonly displayName = 'WhatsApp';
  readonly capabilities: readonly ChannelCapability[] = [
    'text',
    'images',
    'audio',
    'documents',
    'typing_indicator',
    'read_receipts',
    'group_chat',
  ] as const;

  private handlers = new Map<ChannelEventHandler, ChannelEventType[] | undefined>();
  // Baileys is an optional peer dependency. Keep types loose so this package can
  // compile in environments where Baileys isn't installed.
  private msgHandler: ((message: any, isGroup: boolean) => void) | null = null;

  constructor(private readonly service: WhatsAppService) {}

  async initialize(auth: ChannelAuthConfig): Promise<void> {
    // Service is initialized by the extension pack lifecycle, but
    // if called directly (e.g., standalone usage), we wire up here.
    this.msgHandler = (message: any, isGroup: boolean) =>
      this.handleInboundMessage(message, isGroup);
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

    let messageId: string;

    if (imageBlock && imageBlock.type === 'image') {
      const result = await this.service.sendImage(
        conversationId,
        imageBlock.url,
        imageBlock.caption ?? (textBlock?.type === 'text' ? textBlock.text : undefined),
      );
      messageId = result.key.id;
    } else if (documentBlock && documentBlock.type === 'document') {
      const result = await this.service.sendDocument(
        conversationId,
        documentBlock.url,
        documentBlock.filename,
      );
      messageId = result.key.id;
    } else {
      const text = textBlock?.type === 'text' ? textBlock.text : '';
      const result = await this.service.sendMessage(conversationId, text, {
        quotedMessageId: content.replyToMessageId ?? undefined,
      });
      messageId = result.key.id;
    }

    return { messageId, timestamp: new Date().toISOString() };
  }

  async sendTypingIndicator(conversationId: string, isTyping: boolean): Promise<void> {
    await this.service.sendPresenceUpdate(conversationId, isTyping ? 'composing' : 'paused');
  }

  on(handler: ChannelEventHandler, eventTypes?: ChannelEventType[]): () => void {
    this.handlers.set(handler, eventTypes);
    return () => {
      this.handlers.delete(handler);
    };
  }

  // ── Private ──

  private handleInboundMessage(msg: any, isGroup: boolean): void {
    const jid = msg.key.remoteJid ?? '';
    const participantJid = msg.key.participant ?? jid;

    // Extract the text content from the message
    const textContent =
      msg.message?.conversation ??
      msg.message?.extendedTextMessage?.text ??
      msg.message?.imageMessage?.caption ??
      '';

    // Extract sender information
    const pushName = msg.pushName ?? undefined;
    const senderNumber = participantJid.replace(/@s\.whatsapp\.net$/, '').replace(/@.*$/, '');

    const sender: RemoteUser = {
      id: participantJid,
      displayName: pushName,
      username: senderNumber,
    };

    const conversationType: ConversationType = isGroup ? 'group' : 'direct';

    const timestamp = typeof msg.messageTimestamp === 'number'
      ? msg.messageTimestamp
      : Number(msg.messageTimestamp ?? Math.floor(Date.now() / 1000));

    const channelMessage: ChannelMessage = {
      messageId: msg.key.id ?? '',
      platform: 'whatsapp',
      conversationId: jid,
      conversationType,
      sender,
      content: [{ type: 'text', text: textContent }],
      text: textContent,
      timestamp: new Date(timestamp * 1000).toISOString(),
      replyToMessageId: msg.message?.extendedTextMessage?.contextInfo?.stanzaId ?? undefined,
      rawEvent: msg,
    };

    const event: ChannelEvent<ChannelMessage> = {
      type: 'message',
      platform: 'whatsapp',
      conversationId: jid,
      timestamp: channelMessage.timestamp,
      data: channelMessage,
    };

    this.emit(event);
  }

  private emit(event: ChannelEvent): void {
    for (const [handler, filter] of this.handlers) {
      if (!filter || filter.includes(event.type)) {
        Promise.resolve(handler(event)).catch((err) => {
          console.error('[WhatsAppChannelAdapter] Handler error:', err);
        });
      }
    }
  }
}
