/**
 * @file instrumentation.ts
 * @description Next.js instrumentation hook. Runs once on server start.
 * Starts Discord and Telegram bots if their respective env vars are set.
 *
 * Uses NEXT_RUNTIME check to ensure bots only load in the Node.js runtime,
 * NOT the edge runtime (which can't resolve native Node.js dependencies).
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.DISCORD_BOT_ENABLED === 'true') {
      const { startDiscordBot } = await import('./src/bots');
      startDiscordBot();
    }

    if (process.env.TELEGRAM_BOT_ENABLED === 'true') {
      const { startTelegramBot } = await import('./src/bots');
      startTelegramBot();
    }
  }
}
