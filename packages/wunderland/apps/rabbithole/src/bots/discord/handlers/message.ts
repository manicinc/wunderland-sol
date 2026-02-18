/**
 * @file message.ts
 * @description Handles non-command Discord messages.
 * - Direct @mention -> always responds with personality + RAG
 * - Proactive engagement: rate-limited, probabilistic
 * - Silent channels: rules, announcements, changelog, verify, etc.
 * - Agentic GIPHY: LLM decides when to include GIFs via [GIF:query] tags
 */

import { type Message } from 'discord.js';
import { SILENT_CHANNELS } from '../constants';
import { AiResponderService } from '../ai-responder';
import { WunderbotPersonalityService } from '../wunderbot-personality';
import { TicketBridgeService } from '../ticket-bridge';
import { GiphyService } from '../giphy';
import { BotLogger } from '../../shared/logger';

const logger = new BotLogger('MessageHandler');

const CHAT_COOLDOWN_MS = 120_000;
const GLOBAL_COOLDOWN_MS = 30_000;
const MIN_MESSAGES_SINCE_BOT = 4;

/** Regex to match [GIF:search query] tags in LLM output */
const GIF_TAG_RE = /\[GIF:([^\]]+)\]/gi;

export class MessageHandler {
  private lastBotResponsePerChannel = new Map<string, number>();
  private lastGlobalBotResponse = 0;
  private messagesSinceBotPerChannel = new Map<string, number>();
  private recentMessages = new Map<string, { user: string; text: string; ts: number }[]>();

  constructor(
    private readonly aiResponder: AiResponderService,
    private readonly personality: WunderbotPersonalityService,
    private readonly ticketBridge: TicketBridgeService,
    private readonly giphy: GiphyService,
  ) {}

  async handle(message: Message): Promise<void> {
    const channelId = message.channelId;
    const channelName = ('name' in message.channel ? (message.channel as any).name : '') || '';

    // Feed sentiment
    this.personality.feedSentiment(message.content);

    // Skip silent channels
    const baseName = channelName
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/[\u{FE0F}\u{200D}]/gu, '')
      .replace(/^[-\s]+/, '')
      .replace(/[-\s]+$/, '')
      .toLowerCase();
    if (SILENT_CHANNELS.has(baseName)) return;

    // Track messages since bot's last response
    const count = this.messagesSinceBotPerChannel.get(channelId) ?? 0;
    this.messagesSinceBotPerChannel.set(channelId, count + 1);

    // Store recent messages
    if (!this.recentMessages.has(channelId)) {
      this.recentMessages.set(channelId, []);
    }
    const recent = this.recentMessages.get(channelId)!;
    recent.push({ user: message.author.username, text: message.content, ts: Date.now() });
    if (recent.length > 20) recent.splice(0, recent.length - 20);

    // Sync to ticket bridge if in a ticket thread
    if (message.channel.isThread()) {
      await this.ticketBridge.syncMessageToTicket(
        message.channelId,
        message.author.id,
        message.content,
      );
    }

    // Check if bot was directly mentioned
    const botUser = message.client.user;
    const isMentioned = botUser && message.mentions.has(botUser);
    const isReply = message.reference?.messageId
      ? (await message.channel.messages.fetch(message.reference.messageId).catch(() => null))?.author?.id === botUser?.id
      : false;

    if (isMentioned || isReply) {
      await this.handleDirectMention(message);
      return;
    }

    // Attempt proactive engagement
    await this.attemptProactive(message, channelId);
  }

  private async handleDirectMention(message: Message): Promise<void> {
    const channelId = message.channelId;
    try {
      const question = message.content
        .replace(/<@!?\d+>/g, '')
        .trim();

      if (!question) {
        await message.reply("Rabbit Hole AI assistant. Ask me a question.");
        this.recordBotResponse(channelId);
        return;
      }

      const moodLabel = this.personality.getMoodLabel();
      const moodPrompt = this.personality.getMoodPrompt();
      const answer = await this.aiResponder.answerQuestion(question, moodLabel, moodPrompt);
      await this.replyWithGifs(message, answer);
      this.recordBotResponse(channelId);
    } catch (error: any) {
      logger.error(`Direct mention error: ${error.message}`);
      await message.reply('Error processing request. Try again.').catch(() => {});
    }
  }

  private async attemptProactive(message: Message, channelId: string): Promise<void> {
    if (!this.isEligibleForProactive(channelId)) return;
    if (Math.random() > 0.25) return;

    const recent = this.recentMessages.get(channelId);
    if (!recent || recent.length < 3) return;

    try {
      const context = recent
        .slice(-10)
        .map((m) => `${m.user}: ${m.text}`)
        .join('\n');

      const decision = await this.aiResponder.shouldRespondProactively(context);
      if (!decision.respond) return;

      await this.sendWithGifs(message.channel, decision.response);
      this.recordBotResponse(channelId);
    } catch (error: any) {
      logger.error(`Proactive response error: ${error.message}`);
    }
  }

  /**
   * Parse [GIF:query] tags from LLM output, fetch GIFs, and reply.
   * Text goes as a reply; GIFs are sent as follow-up messages.
   */
  private async replyWithGifs(message: Message, text: string): Promise<void> {
    const gifQueries: string[] = [];
    const cleanText = text.replace(GIF_TAG_RE, (_, query) => {
      gifQueries.push(query.trim());
      return '';
    }).trim();

    if (cleanText) await message.reply(cleanText);

    for (const query of gifQueries) {
      const gifUrl = await this.giphy.search(query);
      if (gifUrl) {
        if ('send' in message.channel) {
          await (message.channel as any).send(gifUrl);
        }
      }
    }
  }

  /**
   * Parse [GIF:query] tags, send text + GIFs to a channel (for proactive messages).
   */
  private async sendWithGifs(channel: any, text: string): Promise<void> {
    const gifQueries: string[] = [];
    const cleanText = text.replace(GIF_TAG_RE, (_, query) => {
      gifQueries.push(query.trim());
      return '';
    }).trim();

    if (cleanText && 'send' in channel) await channel.send(cleanText);

    for (const query of gifQueries) {
      const gifUrl = await this.giphy.search(query);
      if (gifUrl && 'send' in channel) {
        await channel.send(gifUrl);
      }
    }
  }

  private isEligibleForProactive(channelId: string): boolean {
    const now = Date.now();
    if (now - this.lastGlobalBotResponse < GLOBAL_COOLDOWN_MS) return false;
    const lastChat = this.lastBotResponsePerChannel.get(channelId) ?? 0;
    if (now - lastChat < CHAT_COOLDOWN_MS) return false;
    const msgCount = this.messagesSinceBotPerChannel.get(channelId) ?? 0;
    if (msgCount < MIN_MESSAGES_SINCE_BOT) return false;
    return true;
  }

  private recordBotResponse(channelId: string): void {
    const now = Date.now();
    this.lastBotResponsePerChannel.set(channelId, now);
    this.lastGlobalBotResponse = now;
    this.messagesSinceBotPerChannel.set(channelId, 0);
  }
}
