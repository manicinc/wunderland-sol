/**
 * @fileoverview Telegram Channel Adapter for RabbitHole
 * @module @framers/rabbithole/channels/adapters/TelegramAdapter
 *
 * Implements the IChannelAdapter interface for Telegram Bot API.
 */

import axios, { type AxiosInstance } from 'axios';
import { BaseChannelAdapter } from '../BaseChannelAdapter.js';
import type {
  ChannelAdapterConfig,
  TelegramCredentials,
  OutboundChannelMessage,
  DeliveryStatus,
  ChannelInfo,
  MessageFormatting,
  InboundChannelMessage,
  ChannelUserAction,
  InteractiveElement,
} from '../IChannelAdapter.js';

/**
 * Telegram Bot API response types
 */
interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: Array<{ file_id: string; file_size: number }>;
  document?: { file_id: string; file_name: string; mime_type: string; file_size: number };
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramInlineKeyboard {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
}

/**
 * Telegram channel adapter using Telegram Bot API.
 *
 * Uses long polling by default. For production, configure webhook URL.
 *
 * @example
 * ```typescript
 * const telegram = new TelegramAdapter({
 *   platform: 'telegram',
 *   credentials: {
 *     platform: 'telegram',
 *     botToken: '...',
 *   },
 *   tenantId: 'acme-corp',
 * });
 *
 * await telegram.connect();
 * ```
 */
export class TelegramAdapter extends BaseChannelAdapter {
  readonly platform = 'telegram' as const;

  private credentials: TelegramCredentials;
  private client?: AxiosInstance;
  private pollingTimer?: ReturnType<typeof setTimeout>;
  private lastUpdateId = 0;
  private isPolling = false;

  constructor(config: ChannelAdapterConfig) {
    super(config);

    if (config.credentials.platform !== 'telegram') {
      throw new Error('TelegramAdapter requires Telegram credentials');
    }

    this.credentials = config.credentials;
  }

  async connect(): Promise<void> {
    try {
      this.setStatus('connecting');

      this.client = axios.create({
        baseURL: `https://api.telegram.org/bot${this.credentials.botToken}`,
        timeout: 30000,
      });

      // Verify the token
      const me = await this.client.get('/getMe');
      if (!me.data.ok) {
        throw new Error('Invalid Telegram bot token');
      }

      this.log('Connected as:', me.data.result.username);

      // Start polling
      this.isPolling = true;
      this.pollUpdates();

      this.setStatus('connected');
      this.log('Connected to Telegram');
    } catch (error) {
      this.setStatus('error');
      this.emitError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.cancelReconnect();
    this.isPolling = false;

    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = undefined;
    }

    this.client = undefined;
    this.setStatus('disconnected');
    this.log('Disconnected from Telegram');
  }

  private async pollUpdates(): Promise<void> {
    if (!this.isPolling || !this.client) return;

    try {
      const response = await this.client.get('/getUpdates', {
        params: {
          offset: this.lastUpdateId + 1,
          timeout: 20,
          allowed_updates: ['message', 'callback_query'],
        },
      });

      if (response.data.ok && response.data.result.length > 0) {
        for (const update of response.data.result as TelegramUpdate[]) {
          this.lastUpdateId = update.update_id;
          await this.handleUpdate(update);
        }
      }
    } catch (error) {
      if (this.isPolling) {
        this.emitError(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Schedule next poll
    if (this.isPolling) {
      this.pollingTimer = setTimeout(() => this.pollUpdates(), 100);
    }
  }

  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    if (update.message) {
      const msg = update.message;
      const inbound: InboundChannelMessage = {
        platformMessageId: msg.message_id.toString(),
        platform: 'telegram',
        workspaceId: msg.chat.id.toString(),
        channelId: msg.chat.id.toString(),
        userId: msg.from?.id.toString() ?? '',
        userName: msg.from ? `${msg.from.first_name}${msg.from.last_name ? ' ' + msg.from.last_name : ''}` : '',
        content: msg.text ?? '',
        attachments: this.extractAttachments(msg),
        isDirectMessage: msg.chat.type === 'private',
        receivedAt: new Date(msg.date * 1000),
      };

      await this.emitMessage(inbound);
    }

    if (update.callback_query) {
      const query = update.callback_query;
      const action: ChannelUserAction = {
        actionId: query.data ?? '',
        userId: query.from.id.toString(),
        userName: `${query.from.first_name}${query.from.last_name ? ' ' + query.from.last_name : ''}`,
        channelId: query.message?.chat.id.toString() ?? '',
        messageId: query.message?.message_id.toString() ?? '',
        value: query.data ?? '',
        timestamp: new Date(),
      };

      // Answer callback query to remove loading state
      await this.client?.post('/answerCallbackQuery', { callback_query_id: query.id });

      await this.emitAction(action);
    }
  }

  private extractAttachments(msg: TelegramMessage): InboundChannelMessage['attachments'] {
    const attachments: InboundChannelMessage['attachments'] = [];

    if (msg.photo?.length) {
      const largest = msg.photo[msg.photo.length - 1];
      attachments.push({
        type: 'image',
        url: largest.file_id, // Would need getFile API to get actual URL
        size: largest.file_size,
      });
    }

    if (msg.document) {
      attachments.push({
        type: 'file',
        url: msg.document.file_id,
        name: msg.document.file_name,
        mimeType: msg.document.mime_type,
        size: msg.document.file_size,
      });
    }

    return attachments.length > 0 ? attachments : undefined;
  }

  async sendMessage(message: OutboundChannelMessage): Promise<DeliveryStatus> {
    if (!this.client) {
      return this.createDeliveryStatus('failed', undefined, 'Not connected');
    }

    try {
      const payload: Record<string, unknown> = {
        chat_id: message.channelId,
        text: this.truncateContent(message.content, 4096), // Telegram limit
        parse_mode: message.formatting?.markdown ? 'Markdown' : undefined,
      };

      // Add inline keyboard for interactive elements
      if (message.interactiveElements?.length) {
        payload.reply_markup = this.buildInlineKeyboard(message.interactiveElements);
      }

      const response = await this.client.post('/sendMessage', payload);

      if (response.data.ok) {
        return this.createDeliveryStatus('delivered', response.data.result.message_id.toString());
      }

      return this.createDeliveryStatus('failed', undefined, response.data.description);
    } catch (error) {
      return this.createDeliveryStatus('failed', undefined, error instanceof Error ? error.message : String(error));
    }
  }

  private buildInlineKeyboard(elements: InteractiveElement[]): TelegramInlineKeyboard {
    // Group elements into rows of 3
    const rows: Array<Array<{ text: string; callback_data: string }>> = [];
    let currentRow: Array<{ text: string; callback_data: string }> = [];

    for (const el of elements) {
      if (el.type === 'button') {
        currentRow.push({
          text: el.label,
          callback_data: el.actionId,
        });

        if (currentRow.length >= 3) {
          rows.push(currentRow);
          currentRow = [];
        }
      }
    }

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return { inline_keyboard: rows };
  }

  async updateMessage(
    channelId: string,
    messageId: string,
    content: string,
    formatting?: MessageFormatting
  ): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected');
    }

    await this.client.post('/editMessageText', {
      chat_id: channelId,
      message_id: parseInt(messageId, 10),
      text: content,
      parse_mode: formatting?.markdown ? 'Markdown' : undefined,
    });
  }

  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected');
    }

    await this.client.post('/deleteMessage', {
      chat_id: channelId,
      message_id: parseInt(messageId, 10),
    });
  }

  async getChannelInfo(channelId: string): Promise<ChannelInfo> {
    if (!this.client) {
      throw new Error('Not connected');
    }

    const response = await this.client.get('/getChat', {
      params: { chat_id: channelId },
    });

    const chat = response.data.result as TelegramChat;

    let type: ChannelInfo['type'] = 'channel';
    if (chat.type === 'private') type = 'dm';
    else if (chat.type === 'group' || chat.type === 'supergroup') type = 'group';

    return {
      channelId: chat.id.toString(),
      name: chat.title ?? chat.username ?? 'Private Chat',
      type,
    };
  }
}
