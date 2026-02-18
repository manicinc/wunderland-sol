/**
 * Configuration management for Telegram Bot extension
 * Supports loading from options, environment variables, and .env files
 */

import * as fs from 'fs';
import * as path from 'path';
import { config as dotenvConfig } from 'dotenv';

/**
 * Telegram bot configuration
 */
export interface TelegramConfig {
  botToken: string;
  defaultParseMode: 'Markdown' | 'HTML' | 'MarkdownV2';
  pollingInterval: number;
  maxRetries: number;
  priority?: number;
}

/**
 * Attempts to find and load .env file from various locations
 * 
 * @private
 * @returns {void}
 */
function loadDotEnv(): void {
  const possiblePaths = [
    '.env',
    '../.env',
    '../../.env',
    '../../../.env',
    '../../../../.env',
    '../../../../../.env', // Root of monorepo
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '..', '.env'),
    path.join(process.cwd(), '..', '..', '.env'),
  ];
  
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      dotenvConfig({ path: envPath });
      break;
    }
  }
}

/**
 * Loads configuration from multiple sources with priority:
 * 1. Direct options (highest priority)
 * 2. Environment variables
 * 3. .env file (lowest priority)
 * 
 * @param {Partial<TelegramConfig>} options - Direct configuration options
 * @returns {TelegramConfig} Complete configuration
 * 
 * @example
 * ```typescript
 * // Priority order: options > env vars > .env file
 * const config = loadConfig({
 *   botToken: undefined, // Will check env vars
 *   defaultParseMode: 'HTML' // Direct override
 * });
 * ```
 */
export function loadConfig(options: Partial<TelegramConfig> = {}): TelegramConfig {
  // Try to load .env file if it exists
  loadDotEnv();
  
  // Build config with priority: options > env > defaults
  const config: TelegramConfig = {
    botToken: 
      options.botToken || 
      process.env.TELEGRAM_BOT_TOKEN || 
      process.env.TG_BOT_TOKEN ||
      '',
      
    defaultParseMode: 
      options.defaultParseMode || 
      (process.env.TELEGRAM_PARSE_MODE as any) ||
      'Markdown',
      
    pollingInterval: 
      options.pollingInterval || 
      parseInt(process.env.TELEGRAM_POLLING_INTERVAL || '1000'),
      
    maxRetries: 
      options.maxRetries || 
      parseInt(process.env.TELEGRAM_MAX_RETRIES || '3'),
      
    priority: options.priority
  };
  
  // Validate parse mode
  if (!['Markdown', 'HTML', 'MarkdownV2'].includes(config.defaultParseMode)) {
    config.defaultParseMode = 'Markdown';
  }
  
  return config;
}

/**
 * Gets API key from multiple sources
 * Useful for tools that need to check for API keys dynamically
 * 
 * @param {string} keyName - Name of the key to look for
 * @param {Record<string, any>} [options] - Optional direct configuration
 * @returns {string | undefined} The API key if found
 * 
 * @example
 * ```typescript
 * const token = getApiKey('botToken', options);
 * const apiKey = getApiKey('TELEGRAM_API_KEY');
 * ```
 */
export function getApiKey(
  keyName: string, 
  options?: Record<string, any>
): string | undefined {
  // Check options first
  if (options && options[keyName]) {
    return options[keyName];
  }
  
  // Check environment variables
  const envKeys = [
    keyName,
    keyName.toUpperCase(),
    `TELEGRAM_${keyName.toUpperCase()}`,
    `TG_${keyName.toUpperCase()}`
  ];
  
  for (const envKey of envKeys) {
    if (process.env[envKey]) {
      return process.env[envKey];
    }
  }
  
  return undefined;
}

/**
 * Validates that all required configuration is present
 * 
 * @param {Partial<TelegramConfig>} config - Configuration to validate
 * @throws {Error} If required configuration is missing
 */
export function validateConfig(config: Partial<TelegramConfig>): asserts config is TelegramConfig {
  if (!config.botToken) {
    throw new Error(
      'Telegram bot token is required. Set it via:\n' +
      '  1. options.botToken in extension configuration\n' +
      '  2. TELEGRAM_BOT_TOKEN environment variable\n' +
      '  3. .env file with TELEGRAM_BOT_TOKEN=your_token\n' +
      '\nGet a bot token from @BotFather on Telegram'
    );
  }
  
  if (!config.defaultParseMode) {
    throw new Error('Default parse mode is required');
  }
  
  if (typeof config.pollingInterval !== 'number' || config.pollingInterval < 100) {
    throw new Error('Polling interval must be at least 100ms');
  }
  
  if (typeof config.maxRetries !== 'number' || config.maxRetries < 0) {
    throw new Error('Max retries must be non-negative');
  }
}
