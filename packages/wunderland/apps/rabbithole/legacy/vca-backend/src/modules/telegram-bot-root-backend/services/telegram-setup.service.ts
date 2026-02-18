/**
 * @file telegram-setup.service.ts
 * @description Auto-setup service for the Telegram channel/group.
 * Sets channel photo, description, and pins a welcome post with links.
 */

import { Injectable, Logger } from '@nestjs/common';
import type { Telegraf } from 'telegraf';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  CHANNEL_DESCRIPTION,
  WELCOME_MESSAGE,
  BOT_LOGO_PATH,
} from '../telegram-bot.constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../../../../..');

@Injectable()
export class TelegramSetupService {
  private readonly logger = new Logger('TelegramSetup');

  /**
   * Run full channel/group setup: photo, description, pinned welcome post.
   */
  async setupChat(bot: Telegraf, chatId: string | number): Promise<string> {
    const results: string[] = [];

    // 1. Set chat photo
    try {
      const logoPath = path.join(PROJECT_ROOT, BOT_LOGO_PATH);
      if (fs.existsSync(logoPath)) {
        await bot.telegram.setChatPhoto(chatId, { source: fs.createReadStream(logoPath) });
        results.push('Set channel photo from logo');
        this.logger.log('Channel photo updated');
      } else {
        results.push(`Logo not found at ${BOT_LOGO_PATH}`);
        this.logger.warn(`Logo file not found: ${logoPath}`);
      }
    } catch (error: any) {
      // May fail if bot doesn't have permission or photo is already set
      results.push(`Photo: ${error.message}`);
      this.logger.warn(`Failed to set photo: ${error.message}`);
    }

    // 2. Set chat description
    try {
      await bot.telegram.setChatDescription(chatId, CHANNEL_DESCRIPTION);
      results.push('Set channel description');
      this.logger.log('Channel description updated');
    } catch (error: any) {
      results.push(`Description: ${error.message}`);
      this.logger.warn(`Failed to set description: ${error.message}`);
    }

    // 3. Send and pin welcome message
    try {
      const msg = await bot.telegram.sendMessage(chatId, WELCOME_MESSAGE, {
        parse_mode: 'MarkdownV2',
        // @ts-expect-error — telegraf types lag behind API
        disable_web_page_preview: true,
      });
      await bot.telegram.pinChatMessage(chatId, msg.message_id, {
        disable_notification: true,
      });
      results.push('Sent and pinned welcome message');
      this.logger.log('Welcome message pinned');
    } catch (error: any) {
      results.push(`Welcome message: ${error.message}`);
      this.logger.warn(`Failed to send welcome: ${error.message}`);
    }

    return results.join('\n');
  }
}
