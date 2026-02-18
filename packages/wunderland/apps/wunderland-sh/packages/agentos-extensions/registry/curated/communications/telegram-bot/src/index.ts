/**
 * Telegram Bot Extension for AgentOS
 * 
 * Provides comprehensive Telegram Bot API integration for AgentOS agents.
 * 
 * @module @framers/agentos-communications-telegram
 * @version 1.0.0
 * @license MIT
 */

import { ExtensionContext, ExtensionPack } from '@framers/agentos';
import { SendMessageTool } from './tools/sendMessage';
import { SendPhotoTool } from './tools/sendPhoto';
import { SendDocumentTool } from './tools/sendDocument';
import { ManageChatTool } from './tools/manageChat';
import { PollMessagesTool } from './tools/pollMessages';
import { TelegramBotService } from './services/telegramBot';
import { loadConfig } from './config';

/**
 * Extension configuration options
 */
export interface TelegramExtensionOptions {
  /** Telegram Bot token - can be provided directly or via env var */
  botToken?: string;
  /** Default parse mode for messages */
  defaultParseMode?: 'Markdown' | 'HTML' | 'MarkdownV2';
  /** Polling interval in ms */
  pollingInterval?: number;
  /** Max retry attempts */
  maxRetries?: number;
  /** Extension priority */
  priority?: number;
}

/**
 * Creates the Telegram Bot extension pack
 * 
 * @param {ExtensionContext} context - The extension context
 * @returns {ExtensionPack} The configured extension pack
 * 
 * @example
 * ```typescript
 * import { createExtensionPack } from '@framers/agentos-communications-telegram';
 * 
 * const pack = createExtensionPack({
 *   options: {
 *     botToken: process.env.TELEGRAM_BOT_TOKEN,
 *     defaultParseMode: 'Markdown'
 *   },
 *   logger: console
 * });
 * ```
 */
export function createExtensionPack(context: ExtensionContext): ExtensionPack {
  // Load configuration from options, env vars, or .env file
  const config = loadConfig(context.options as TelegramExtensionOptions || {});
  
  if (!config.botToken) {
    throw new Error('Telegram bot token is required. Set via options, TELEGRAM_BOT_TOKEN env var, or .env file');
  }
  
  // Initialize bot service
  const botService = new TelegramBotService(config);
  
  // Create tool instances
  const sendMessageTool = new SendMessageTool(botService);
  const sendPhotoTool = new SendPhotoTool(botService);
  const sendDocumentTool = new SendDocumentTool(botService);
  const manageChatTool = new ManageChatTool(botService);
  const pollMessagesTool = new PollMessagesTool(botService);
  
  const priority = config.priority || 50;
  
  return {
    name: '@framers/agentos-communications-telegram',
    version: '1.0.0',
    descriptors: [
      {
        id: 'telegramSendMessage',
        kind: 'tool',
        priority,
        payload: sendMessageTool
      },
      {
        id: 'telegramSendPhoto',
        kind: 'tool',
        priority,
        payload: sendPhotoTool
      },
      {
        id: 'telegramSendDocument',
        kind: 'tool',
        priority,
        payload: sendDocumentTool
      },
      {
        id: 'telegramManageChat',
        kind: 'tool',
        priority,
        payload: manageChatTool
      },
      {
        id: 'telegramPollMessages',
        kind: 'tool',
        priority,
        payload: pollMessagesTool
      }
    ],
    /**
     * Called when extension is activated
     */
    onActivate: async () => {
      await botService.initialize();
      context.logger?.info('Telegram Bot Extension activated');
    },
    /**
     * Called when extension is deactivated
     */
    onDeactivate: async () => {
      await botService.shutdown();
      context.logger?.info('Telegram Bot Extension deactivated');
    }
  };
}

// Export types and services
export { SendMessageTool, SendPhotoTool, SendDocumentTool, ManageChatTool, PollMessagesTool };
export { TelegramBotService } from './services/telegramBot';
export type { TelegramConfig } from './config';

// Default export
export default createExtensionPack;

