/**
 * @fileoverview WhatsApp Channel Adapter for RabbitHole
 * @module @framers/rabbithole/channels/adapters/WhatsAppAdapter
 *
 * Implements the IChannelAdapter interface for WhatsApp Business Cloud API.
 */

import axios, { type AxiosInstance } from 'axios';
import { BaseChannelAdapter } from '../BaseChannelAdapter.js';
import type {
  ChannelAdapterConfig,
  WhatsAppCredentials,
  OutboundChannelMessage,
  DeliveryStatus,
  ChannelInfo,
  MessageFormatting,
  InboundChannelMessage,
  ChannelUserAction,
} from '../IChannelAdapter.js';

/**
 * WhatsApp Cloud API types
 */
interface WhatsAppWebhookPayload {
  entry: Array<{
    changes: Array<{
      value: {
        messages?: WhatsAppMessage[];
        statuses?: WhatsAppStatus[];
      };
    }>;
  }>;
}

interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'interactive';
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string };
  document?: { id: string; filename: string; mime_type: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
}

interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
}

interface WhatsAppSendResponse {
  messaging_product: string;
  contacts: Array<{ wa_id: string }>;
  messages: Array<{ id: string }>;
}

/**
 * WhatsApp Business Cloud API adapter.
 *
 * Requires webhook configuration for incoming messages.
 * Implements interactive buttons and list messages.
 *
 * @example
 * ```typescript
 * const whatsapp = new WhatsAppAdapter({
 *   platform: 'whatsapp',
 *   credentials: {
 *     platform: 'whatsapp',
 *     phoneNumberId: '...',
 *     accessToken: '...',
 *     webhookVerifyToken: '...',
 *   },
 *   tenantId: 'acme-corp',
 *   webhookUrl: 'https://your-server.com/webhook',
 * });
 *
 * await whatsapp.connect();
 * ```
 */
export class WhatsAppAdapter extends BaseChannelAdapter {
  readonly platform = 'whatsapp' as const;

  private credentials: WhatsAppCredentials;
  private client?: AxiosInstance;

  constructor(config: ChannelAdapterConfig) {
    super(config);

    if (config.credentials.platform !== 'whatsapp') {
      throw new Error('WhatsAppAdapter requires WhatsApp credentials');
    }

    this.credentials = config.credentials;
  }

  async connect(): Promise<void> {
    try {
      this.setStatus('connecting');

      this.client = axios.create({
        baseURL: 'https://graph.facebook.com/v18.0',
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      // Verify credentials by getting phone number info
      const response = await this.client.get(`/${this.credentials.phoneNumberId}`);
      if (!response.data.id) {
        throw new Error('Invalid WhatsApp credentials');
      }

      this.log('Connected with phone number:', response.data.display_phone_number);
      this.setStatus('connected');
      this.log('Connected to WhatsApp Business API');
    } catch (error) {
      this.setStatus('error');
      this.emitError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.cancelReconnect();
    this.client = undefined;
    this.setStatus('disconnected');
    this.log('Disconnected from WhatsApp');
  }

  /**
   * Handles incoming webhook from WhatsApp.
   * Call this from your webhook endpoint.
   */
  async handleWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const value = change.value;

        // Handle incoming messages
        if (value.messages) {
          for (const msg of value.messages) {
            await this.processIncomingMessage(msg);
          }
        }
      }
    }
  }

  /**
   * Verifies webhook during Meta App setup.
   */
  verifyWebhook(
    mode: string,
    token: string,
    challenge: string
  ): string | null {
    if (mode === 'subscribe' && token === this.credentials.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }

  private async processIncomingMessage(msg: WhatsAppMessage): Promise<void> {
    // Handle interactive responses (buttons)
    if (msg.type === 'interactive' && msg.interactive) {
      const reply = msg.interactive.button_reply ?? msg.interactive.list_reply;
      if (reply) {
        const action: ChannelUserAction = {
          actionId: reply.id,
          userId: msg.from,
          userName: msg.from, // WhatsApp doesn't provide names in message
          channelId: msg.from,
          messageId: msg.id,
          value: reply.id,
          timestamp: new Date(parseInt(msg.timestamp, 10) * 1000),
        };

        await this.emitAction(action);
        return;
      }
    }

    // Handle regular messages
    const inbound: InboundChannelMessage = {
      platformMessageId: msg.id,
      platform: 'whatsapp',
      workspaceId: this.credentials.phoneNumberId,
      channelId: msg.from,
      userId: msg.from,
      userName: msg.from,
      content: msg.text?.body ?? '',
      attachments: this.extractAttachments(msg),
      isDirectMessage: true, // WhatsApp is always DM-style
      receivedAt: new Date(parseInt(msg.timestamp, 10) * 1000),
    };

    await this.emitMessage(inbound);
  }

  private extractAttachments(msg: WhatsAppMessage): InboundChannelMessage['attachments'] {
    if (msg.image) {
      return [{
        type: 'image',
        url: msg.image.id, // Would need media download API
        mimeType: msg.image.mime_type,
      }];
    }

    if (msg.document) {
      return [{
        type: 'file',
        url: msg.document.id,
        name: msg.document.filename,
        mimeType: msg.document.mime_type,
      }];
    }

    return undefined;
  }

  async sendMessage(message: OutboundChannelMessage): Promise<DeliveryStatus> {
    if (!this.client) {
      return this.createDeliveryStatus('failed', undefined, 'Not connected');
    }

    try {
      let payload: Record<string, unknown>;

      // Check if we have interactive elements
      if (message.interactiveElements?.length) {
        payload = this.buildInteractiveMessage(message);
      } else {
        // Simple text message
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: message.channelId,
          type: 'text',
          text: {
            preview_url: true,
            body: this.truncateContent(message.content, 4096), // WhatsApp limit
          },
        };
      }

      const response = await this.client.post<WhatsAppSendResponse>(
        `/${this.credentials.phoneNumberId}/messages`,
        payload
      );

      const messageId = response.data.messages?.[0]?.id;
      return this.createDeliveryStatus('delivered', messageId);
    } catch (error) {
      return this.createDeliveryStatus('failed', undefined, error instanceof Error ? error.message : String(error));
    }
  }

  private buildInteractiveMessage(message: OutboundChannelMessage): Record<string, unknown> {
    const buttons = message.interactiveElements?.filter((el) => el.type === 'button').slice(0, 3); // WhatsApp max 3 buttons

    if (!buttons?.length) {
      // Fall back to text message
      return {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.channelId,
        type: 'text',
        text: { body: message.content },
      };
    }

    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: message.channelId,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: this.truncateContent(message.content, 1024) },
        action: {
          buttons: buttons.map((btn) => ({
            type: 'reply',
            reply: {
              id: btn.actionId,
              title: this.truncateContent(btn.label, 20), // WhatsApp button title limit
            },
          })),
        },
      },
    };
  }

  async updateMessage(
    _channelId: string,
    _messageId: string,
    _content: string,
    _formatting?: MessageFormatting
  ): Promise<void> {
    // WhatsApp doesn't support message editing
    throw new Error('WhatsApp does not support message editing');
  }

  async deleteMessage(_channelId: string, _messageId: string): Promise<void> {
    // WhatsApp doesn't support message deletion via API
    throw new Error('WhatsApp does not support message deletion');
  }

  async getChannelInfo(channelId: string): Promise<ChannelInfo> {
    // WhatsApp is always 1:1 DM style
    return {
      channelId,
      name: channelId, // Phone number
      type: 'dm',
    };
  }

  /**
   * Marks messages as read.
   */
  async markAsRead(messageId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected');
    }

    await this.client.post(`/${this.credentials.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
  }
}
