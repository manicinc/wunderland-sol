/**
 * AgentOS Telegram Bot Extension
 * 
 * Provides Telegram Bot API capabilities for AgentOS agents.
 * 
 * @module @framers/agentos-ext-telegram
 * @version 1.0.0
 * @license MIT
 */

import { ExtensionContext, ExtensionPack } from '@framers/agentos';
import { SendMessageTool } from './tools/sendMessage';
import { SendPhotoTool } from './tools/sendPhoto';
import { SendDocumentTool } from './tools/sendDocument';
import { GetChatInfoTool } from './tools/getChatInfo';
import { ManageGroupTool } from './tools/manageGroup';
import { HandleCallbackTool } from './tools/handleCallback';
import { TelegramBotService, TelegramConfig } from './services/telegramBot';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Extension configuration options
 */
export interface TelegramExtensionOptions {
  /** Telegram Bot Token - can be provided directly or via env */
  botToken?: string;
  /** Environment variable name for bot token (default: TELEGRAM_BOT_TOKEN) */
  botTokenEnv?: string;
  /** Webhook URL for receiving updates */
  webhookUrl?: string;
  /** Polling interval in ms (if not using webhook) */
  pollingInterval?: number;
  /** Default parse mode for messages (Markdown/HTML) */
  defaultParseMode?: 'Markdown' | 'HTML';
  /** Enable typing action before sending messages */
  enableTypingAction?: boolean;
  /** Rate limiting configuration */
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  /** Extension priority in the stack */
  priority?: number;
}

/**
 * Resolves the bot token from options or environment
 * 
 * @private
 * @param {TelegramExtensionOptions} options - Extension options
 * @returns {string} The resolved bot token
 * @throws {Error} If no bot token is found
 */
function resolveBotToken(options: TelegramExtensionOptions): string {
  // Priority order:
  // 1. Direct botToken in options
  // 2. Custom environment variable specified in options
  // 3. Default TELEGRAM_BOT_TOKEN environment variable
  // 4. Common variations of the env var name
  
  if (options.botToken) {
    return options.botToken;
  }
  
  const envName = options.botTokenEnv || 'TELEGRAM_BOT_TOKEN';
  const envValue = process.env[envName];
  
  if (envValue) {
    return envValue;
  }
  
  // Try common variations
  const variations = [
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_TOKEN',
    'BOT_TOKEN',
    'TELEGRAM_API_KEY',
    'TELEGRAM_KEY'
  ];
  
  for (const varName of variations) {
    const value = process.env[varName];
    if (value) {
      console.log(`Found Telegram bot token in ${varName}`);
      return value;
    }
  }
  
  throw new Error(
    'Telegram bot token not found. Please provide it via options.botToken or set the TELEGRAM_BOT_TOKEN environment variable'
  );
}

/**
 * Creates the Telegram extension pack
 * 
 * @param {ExtensionContext} context - The extension context
 * @returns {ExtensionPack} The configured extension pack
 * 
 * @example
 * ```typescript
 * import { createExtensionPack } from '@framers/agentos-ext-telegram';
 * 
 * // Using environment variable
 * const pack = createExtensionPack({
 *   options: {
 *     // Will read from TELEGRAM_BOT_TOKEN env var
 *   },
 *   logger: console
 * });
 * 
 * // Using direct token
 * const pack = createExtensionPack({
 *   options: {
 *     botToken: 'your-bot-token-here'
 *   },
 *   logger: console
 * });
 * 
 * // Using custom env var
 * const pack = createExtensionPack({
 *   options: {
 *     botTokenEnv: 'MY_TELEGRAM_TOKEN'
 *   },
 *   logger: console
 * });
 * ```
 */
export function createExtensionPack(context: ExtensionContext): ExtensionPack {
  const options = context.options as TelegramExtensionOptions || {};
  
  // Resolve bot token from various sources
  const botToken = resolveBotToken(options);
  
  // Initialize Telegram service with configuration
  const telegramConfig: TelegramConfig = {
    botToken,
    webhookUrl: options.webhookUrl,
    pollingInterval: options.pollingInterval,
    defaultParseMode: options.defaultParseMode || 'Markdown',
    enableTypingAction: options.enableTypingAction !== false,
    rateLimit: options.rateLimit || {
      maxRequests: 30,
      windowMs: 1000 // Telegram's rate limit is ~30 msgs/sec
    }
  };
  
  const telegramService = new TelegramBotService(telegramConfig);
  
  // Create tool instances
  const sendMessageTool = new SendMessageTool(telegramService);
  const sendPhotoTool = new SendPhotoTool(telegramService);
  const sendDocumentTool = new SendDocumentTool(telegramService);
  const getChatInfoTool = new GetChatInfoTool(telegramService);
  const manageGroupTool = new ManageGroupTool(telegramService);
  const handleCallbackTool = new HandleCallbackTool(telegramService);
  
  return {
    name: '@framers/agentos-ext-telegram',
    version: '1.0.0',
    descriptors: [
      {
        id: 'telegramSendMessage',
        kind: 'tool',
        priority: options.priority || 50,
        payload: sendMessageTool
      },
      {
        id: 'telegramSendPhoto',
        kind: 'tool',
        priority: options.priority || 50,
        payload: sendPhotoTool
      },
      {
        id: 'telegramSendDocument',
        kind: 'tool',
        priority: options.priority || 50,
        payload: sendDocumentTool
      },
      {
        id: 'telegramGetChatInfo',
        kind: 'tool',
        priority: options.priority || 50,
        payload: getChatInfoTool
      },
      {
        id: 'telegramManageGroup',
        kind: 'tool',
        priority: options.priority || 50,
        payload: manageGroupTool
      },
      {
        id: 'telegramHandleCallback',
        kind: 'tool',
        priority: options.priority || 50,
        payload: handleCallbackTool
      }
    ],
    /**
     * Called when extension is activated
     */
    onActivate: async () => {
      await telegramService.initialize();
      if (context.onActivate) {
        await context.onActivate();
      }
      context.logger?.info('Telegram Extension activated');
    },
    /**
     * Called when extension is deactivated
     */
    onDeactivate: async () => {
      await telegramService.shutdown();
      if (context.onDeactivate) {
        await context.onDeactivate();
      }
      context.logger?.info('Telegram Extension deactivated');
    }
  };
}

// Export types for consumers
export { 
  SendMessageTool, 
  SendPhotoTool, 
  SendDocumentTool,
  GetChatInfoTool,
  ManageGroupTool,
  HandleCallbackTool,
  TelegramBotService,
  TelegramConfig
};

// Default export for convenience
export default createExtensionPack;
