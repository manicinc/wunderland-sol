/**
 * @file index.ts
 * @description Entry point for bot services. Exports start/stop functions
 * for Discord and Telegram bots.
 */

import { DiscordClient } from './discord/discord-client';
import { TelegramClient } from './telegram/telegram-client';
import { BotLogger } from './shared/logger';

const logger = new BotLogger('Bots');

let discordClient: DiscordClient | null = null;
let telegramClient: TelegramClient | null = null;

export async function startDiscordBot(): Promise<void> {
  try {
    discordClient = new DiscordClient();
    await discordClient.start();
  } catch (error: any) {
    logger.error(`Failed to start Discord bot: ${error.message}`);
  }
}

export async function startTelegramBot(): Promise<void> {
  try {
    telegramClient = new TelegramClient();
    await telegramClient.start();
  } catch (error: any) {
    logger.error(`Failed to start Telegram bot: ${error.message}`);
  }
}

export function stopBots(): void {
  if (discordClient) {
    discordClient.destroy();
    discordClient = null;
  }
  if (telegramClient) {
    telegramClient.destroy();
    telegramClient = null;
  }
}
