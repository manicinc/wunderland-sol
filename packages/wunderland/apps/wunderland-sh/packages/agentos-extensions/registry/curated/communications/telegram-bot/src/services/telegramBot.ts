/**
 * Telegram Bot service for managing bot instance and API calls
 */

import TelegramBot from 'node-telegram-bot-api';
import { TelegramConfig } from '../config';

/**
 * Message send options
 */
export interface SendMessageOptions {
  chatId: string | number;
  text: string;
  parseMode?: 'Markdown' | 'HTML' | 'MarkdownV2';
  disableNotification?: boolean;
  replyToMessageId?: number;
  replyMarkup?: any;
}

/**
 * Photo send options
 */
export interface SendPhotoOptions {
  chatId: string | number;
  photo: string | Buffer;
  caption?: string;
  parseMode?: 'Markdown' | 'HTML' | 'MarkdownV2';
  disableNotification?: boolean;
}

/**
 * Service for interacting with Telegram Bot API
 * 
 * @class TelegramBotService
 * 
 * @example
 * ```typescript
 * const service = new TelegramBotService(config);
 * await service.initialize();
 * await service.sendMessage({
 *   chatId: '@mychannel',
 *   text: 'Hello from AgentOS!'
 * });
 * ```
 */
export class TelegramBotService {
  private bot: TelegramBot | null = null;
  private config: TelegramConfig;
  private retryAttempts: Map<string, number> = new Map();
  
  /**
   * Creates an instance of TelegramBotService
   * 
   * @param {TelegramConfig} config - Bot configuration
   */
  constructor(config: TelegramConfig) {
    this.config = config;
  }
  
  /**
   * Initializes the bot instance
   * 
   * @returns {Promise<void>}
   */
  async initialize(): Promise<void> {
    if (this.bot) return;
    
    this.bot = new TelegramBot(this.config.botToken, {
      polling: false // We'll use webhook or manual polling
    });
    
    // Verify bot token is valid
    try {
      const me = await this.bot.getMe();
      console.info(`Telegram bot initialized: @${me.username}`);
    } catch (error) {
      throw new Error(`Failed to initialize Telegram bot: ${error}`);
    }
  }
  
  /**
   * Sends a text message
   * 
   * @param {SendMessageOptions} options - Message options
   * @returns {Promise<any>} Sent message object
   */
  async sendMessage(options: SendMessageOptions): Promise<any> {
    if (!this.bot) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }
    
    const parseMode = options.parseMode || this.config.defaultParseMode;
    
    try {
      const result = await this.retryOperation(async () => {
        return this.bot!.sendMessage(options.chatId, options.text, {
          parse_mode: parseMode,
          disable_notification: options.disableNotification,
          reply_to_message_id: options.replyToMessageId,
          reply_markup: options.replyMarkup
        });
      });
      
      return {
        success: true,
        messageId: result.message_id,
        chatId: result.chat.id,
        date: result.date,
        text: result.text
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Sends a photo
   * 
   * @param {SendPhotoOptions} options - Photo options
   * @returns {Promise<any>} Sent message object
   */
  async sendPhoto(options: SendPhotoOptions): Promise<any> {
    if (!this.bot) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }
    
    const parseMode = options.parseMode || this.config.defaultParseMode;
    
    try {
      const result = await this.retryOperation(async () => {
        return this.bot!.sendPhoto(options.chatId, options.photo, {
          caption: options.caption,
          parse_mode: parseMode,
          disable_notification: options.disableNotification
        });
      });
      
      return {
        success: true,
        messageId: result.message_id,
        chatId: result.chat.id,
        date: result.date,
        photo: result.photo
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Sends a document
   * 
   * @param {Object} options - Document options
   * @returns {Promise<any>} Sent message object
   */
  async sendDocument(options: {
    chatId: string | number;
    document: string | Buffer;
    caption?: string;
    parseMode?: string;
  }): Promise<any> {
    if (!this.bot) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }
    
    try {
      const result = await this.retryOperation(async () => {
        return this.bot!.sendDocument(options.chatId, options.document, {
          caption: options.caption,
          parse_mode: options.parseMode as any || this.config.defaultParseMode
        });
      });
      
      return {
        success: true,
        messageId: result.message_id,
        chatId: result.chat.id,
        date: result.date,
        document: result.document
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Gets information about a chat
   * 
   * @param {string | number} chatId - Chat identifier
   * @returns {Promise<any>} Chat information
   */
  async getChatInfo(chatId: string | number): Promise<any> {
    if (!this.bot) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }
    
    try {
      const chat = await this.bot.getChat(chatId);
      return {
        success: true,
        id: chat.id,
        type: chat.type,
        title: chat.title,
        username: chat.username,
        description: chat.description,
        inviteLink: chat.invite_link
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Pins a message in a chat
   * 
   * @param {string | number} chatId - Chat identifier
   * @param {number} messageId - Message to pin
   * @param {boolean} disableNotification - Silent pin
   * @returns {Promise<any>} Operation result
   */
  async pinMessage(
    chatId: string | number, 
    messageId: number,
    disableNotification = false
  ): Promise<any> {
    if (!this.bot) {
      throw new Error('Bot not initialized. Call initialize() first.');
    }
    
    try {
      await this.bot.pinChatMessage(chatId, messageId, {
        disable_notification: disableNotification
      });
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Gets recent messages from a chat (if using polling)
   * 
   * @param {string | number} chatId - Chat identifier
   * @param {number} limit - Number of messages to retrieve
   * @returns {Promise<any[]>} Recent messages
   */
  async getRecentMessages(chatId: string | number, limit = 10): Promise<any[]> {
    // Note: Telegram Bot API doesn't directly support getting message history
    // This would need to be implemented using message polling/webhooks
    // and maintaining a message cache
    
    return {
      success: false,
      error: 'Message history requires webhook setup or message caching',
      hint: 'Use webhooks or long polling to receive and cache messages'
    } as any;
  }
  
  /**
   * Retries an operation with exponential backoff
   * 
   * @private
   * @param {Function} operation - Operation to retry
   * @returns {Promise<any>} Operation result
   */
  private async retryOperation(operation: () => Promise<any>): Promise<any> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        if (attempt < this.config.maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Shuts down the bot service
   * 
   * @returns {Promise<void>}
   */
  async shutdown(): Promise<void> {
    if (this.bot) {
      await this.bot.stopPolling();
      this.bot = null;
    }
    
    this.retryAttempts.clear();
  }
  
  /**
   * Gets the bot instance (for advanced operations)
   * 
   * @returns {TelegramBot | null} Bot instance
   */
  getBotInstance(): TelegramBot | null {
    return this.bot;
  }
}
