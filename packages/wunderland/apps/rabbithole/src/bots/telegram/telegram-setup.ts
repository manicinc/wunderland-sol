/**
 * @file telegram-setup.ts
 * @description Auto-setup for Telegram channel/group. Sets photo, description,
 * pinned welcome message, bot commands, and bot profile.
 */

import * as path from 'path';
import * as fs from 'fs';
import type { Telegraf } from 'telegraf';
import { BotLogger } from '../shared/logger';
import {
  BOT_LOGO_PATH,
  BOT_NAME,
  BRAND_NAME,
  CHANNEL_DESCRIPTION,
  WELCOME_MESSAGE,
} from './constants';

const logger = new BotLogger('TelegramSetup');

export class TelegramSetupService {
  async setupChat(bot: Telegraf, chatId: string | number): Promise<string[]> {
    const results: string[] = [];

    // 1. Set chat photo
    try {
      // In Next.js, process.cwd() is the app root (apps/rabbithole/)
      const logoPath = path.join(process.cwd(), BOT_LOGO_PATH);
      if (fs.existsSync(logoPath)) {
        await bot.telegram.setChatPhoto(chatId, { source: fs.createReadStream(logoPath) });
        results.push('Chat photo set successfully.');
        logger.log('Chat photo updated.');
      } else {
        results.push(`Logo not found at ${logoPath}; skipping photo.`);
        logger.warn(`Logo not found: ${logoPath}`);
      }
    } catch (err: any) {
      results.push(`Failed to set chat photo: ${err.message}`);
      logger.error('Failed to set chat photo', err.stack);
    }

    // 2. Set chat description
    try {
      await bot.telegram.setChatDescription(chatId, CHANNEL_DESCRIPTION);
      results.push('Chat description set.');
      logger.log('Chat description updated.');
    } catch (err: any) {
      results.push(`Failed to set description: ${err.message}`);
      logger.error('Failed to set chat description', err.stack);
    }

    // 3. Send and pin welcome message
    try {
      const msg = await bot.telegram.sendMessage(chatId, WELCOME_MESSAGE, {
        parse_mode: 'MarkdownV2',
      });
      await bot.telegram.pinChatMessage(chatId, msg.message_id, {
        disable_notification: true,
      });
      results.push('Welcome message sent and pinned.');
      logger.log('Welcome message pinned.');
    } catch (err: any) {
      results.push(`Failed to send/pin welcome: ${err.message}`);
      logger.error('Failed to send/pin welcome message', err.stack);
    }

    // 4. Register bot command menu
    try {
      await bot.telegram.setMyCommands([
        { command: 'help', description: 'Show help and commands' },
        { command: 'start', description: 'Welcome message' },
        { command: 'faq', description: 'Ask a frequently asked question' },
        { command: 'ask', description: 'Ask the bot anything' },
        { command: 'pricing', description: 'View pricing tiers' },
        { command: 'docs', description: 'Search documentation' },
        { command: 'links', description: 'Show all links' },
        { command: 'setup', description: 'Auto-setup channel (admin)' },
      ]);
      results.push('Bot command menu registered.');
      logger.log('Bot commands registered.');
    } catch (err: any) {
      results.push(`Failed to register commands: ${err.message}`);
      logger.error('Failed to register bot commands', err.stack);
    }

    // 5. Set bot profile description
    try {
      await bot.telegram.callApi('setMyDescription', {
        description: `${BOT_NAME} — the official ${BRAND_NAME} assistant. Ask me anything about our AI agent platform!`,
      });
      await bot.telegram.callApi('setMyShortDescription', {
        short_description: `${BRAND_NAME} AI assistant`,
      });
      results.push('Bot profile description set.');
      logger.log('Bot profile description updated.');
    } catch (err: any) {
      results.push(`Failed to set bot profile: ${err.message}`);
      logger.error('Failed to set bot profile description', err.stack);
    }

    return results;
  }
}
