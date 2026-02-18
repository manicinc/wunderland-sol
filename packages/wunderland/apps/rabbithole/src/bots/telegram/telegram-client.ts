/**
 * @file telegram-client.ts
 * @description Core lifecycle service for the Rabbit Hole Telegram bot.
 * Handles commands, agentic responses, inline PAD mood engine, and proactive engagement.
 *
 * CRITICAL: In Telegram channels, messages arrive as `channel_post` updates — NOT as
 * `message` updates. `bot.command()` handlers only fire for group/private message updates.
 * We therefore manually parse commands from channel_post text in a dedicated handler.
 */

import { Telegraf, Context } from 'telegraf';
import { callLlm, type ChatMessage } from '../shared/llm';
import { KnowledgeBaseService } from '../discord/knowledge-base';
import { GiphyService } from '../discord/giphy';
import { TelegramSetupService } from './telegram-setup';
import { BotLogger } from '../shared/logger';
import {
  BOT_NAME,
  BRAND_NAME,
  LINKS,
  WELCOME_MESSAGE,
  LINKS_MESSAGE,
  PRICING_MESSAGE,
  CHAT_COOLDOWN_SECONDS,
  GLOBAL_COOLDOWN_SECONDS,
  MIN_MESSAGES_SINCE_BOT,
  GIF_PROBABILITY,
} from './constants';

const logger = new BotLogger('TelegramClient');

// --- System Prompt Templates ---

const FAQ_SYSTEM_PROMPT = `You are the ${BRAND_NAME} support assistant.
Answer using ONLY the provided documentation context. Be concise, professional, and direct.
If you don't know, say so plainly and point to ${LINKS.rabbithole} or ${LINKS.wunderland}.
Keep answers under 200 words. No filler. No fluff.

CONTEXT:
{{context}}`;

const ASK_SYSTEM_PROMPT = `You are the ${BRAND_NAME} AI assistant.
Answer questions about AI agents, the platform, CLI tools, pricing, and technical topics.
Use documentation context when relevant. Be professional, concise, and direct. No filler.
Keep answers under 200 words unless the question requires more detail.

CONTEXT:
{{context}}`;

const PERSONALITY_SYSTEM_PROMPT = `You are the ${BRAND_NAME} AI assistant.
You are professional, concise, and objectively calm. Deeply knowledgeable about agent infrastructure.
Current mood: {{mood}} — {{mood_prompt}}
Keep responses under 150 words. Be direct. No puns, no filler, no exclamation marks.
Use the knowledge base context when relevant.

CONTEXT:
{{context}}`;

const PROACTIVE_SYSTEM_PROMPT = `You are the ${BRAND_NAME} AI assistant monitoring this Telegram conversation.
Decide whether to contribute. Current mood: {{mood}} — {{mood_prompt}}

Recent conversation:
{{conversation}}

Rules:
- Only respond if you can add genuine value — answer a question, correct misinformation, or share relevant technical info
- Skip casual chitchat, greetings, and off-topic banter
- If the conversation doesn't warrant a response, reply with EXACTLY: [SKIP]
- Keep responses under 80 words. Professional and direct. No puns, no filler.

CONTEXT:
{{context}}`;

// --- Inline PAD Mood Engine ---

const RABBIT_HEXACO = {
  honesty_humility: 0.82,
  emotionality: 0.55,
  extraversion: 0.88,
  agreeableness: 0.72,
  conscientiousness: 0.65,
  openness: 0.92,
} as const;

interface PADVector {
  pleasure: number;
  arousal: number;
  dominance: number;
}

const BASELINE: PADVector = {
  pleasure: (RABBIT_HEXACO.agreeableness + RABBIT_HEXACO.extraversion) / 2,
  arousal: (RABBIT_HEXACO.extraversion + RABBIT_HEXACO.openness) / 2,
  dominance: (RABBIT_HEXACO.conscientiousness + RABBIT_HEXACO.honesty_humility) / 2,
};

type MoodLabel =
  | 'excited' | 'content' | 'curious' | 'playful' | 'serene'
  | 'bored' | 'anxious' | 'frustrated' | 'melancholic' | 'neutral';

function getMoodLabel(pad: PADVector): MoodLabel {
  const { pleasure: p, arousal: a, dominance: d } = pad;
  if (p > 0.7 && a > 0.7) return 'excited';
  if (p > 0.7 && a < 0.4) return 'serene';
  if (p > 0.6 && a > 0.4 && a <= 0.7) return 'content';
  if (p > 0.5 && a > 0.6 && d < 0.5) return 'playful';
  if (p > 0.3 && a > 0.5 && d > 0.5) return 'curious';
  if (p < 0.3 && a < 0.3) return 'melancholic';
  if (p < 0.3 && a > 0.6) return 'frustrated';
  if (p < 0.5 && a > 0.5 && d < 0.4) return 'anxious';
  if (p < 0.5 && a < 0.4) return 'bored';
  return 'neutral';
}

const MOOD_PROMPTS: Record<MoodLabel, string> = {
  excited: 'You are confident and sharp. Deliver answers with authority.',
  content: 'You are calm and measured. Clear, professional responses.',
  curious: 'You probe for details and provide thorough, well-sourced answers.',
  playful: 'Slightly lighter tone but still professional. Dry wit only.',
  serene: 'You are calm and deliberate. Measured responses.',
  bored: 'Keep responses minimal. Only speak when adding real value.',
  anxious: 'You are careful and thorough. Double-check your claims.',
  frustrated: 'You are direct and solution-oriented. No hand-holding.',
  melancholic: 'You are reflective and measured. Thoughtful but concise.',
  neutral: 'You are balanced and professional. No filler, no fluff.',
};

// --- Keyword Sentiment ---

const POSITIVE_KEYWORDS = [
  'awesome', 'great', 'thanks', 'love', 'amazing', 'cool', 'nice', 'excellent',
  'fantastic', 'wonderful', 'helpful', 'brilliant', 'perfect', 'good', 'wow',
  'thank', 'appreciate', 'happy', 'excited', 'beautiful', 'impressive',
];
const NEGATIVE_KEYWORDS = [
  'bad', 'terrible', 'awful', 'hate', 'bug', 'broken', 'sucks', 'worst',
  'angry', 'frustrated', 'annoying', 'disappointing', 'sad', 'fail', 'error',
  'crash', 'problem', 'issue', 'ugly', 'slow', 'stupid',
];

function keywordSentiment(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of POSITIVE_KEYWORDS) {
    if (lower.includes(kw)) score += 0.15;
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (lower.includes(kw)) score -= 0.15;
  }
  return Math.max(-1, Math.min(1, score));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// --- Telegram Client ---

export class TelegramClient {
  private bot: Telegraf | null = null;
  private botUsername = '';

  // Mood state
  private mood: PADVector = { ...BASELINE };
  private moodDecayInterval: ReturnType<typeof setInterval> | null = null;
  private sentimentInterval: ReturnType<typeof setInterval> | null = null;
  private sentimentBuffer: string[] = [];

  // Proactive engagement tracking
  private lastBotResponsePerChat: Map<string, number> = new Map();
  private lastGlobalBotResponse = 0;
  private messagesSinceBotPerChat: Map<string, number> = new Map();
  private recentMessages: Map<string, Array<{ user: string; text: string; ts: number }>> = new Map();

  // Shared services
  private readonly knowledgeBase: KnowledgeBaseService;
  private readonly giphyService: GiphyService;
  private readonly setupService: TelegramSetupService;

  constructor() {
    this.knowledgeBase = new KnowledgeBaseService();
    this.giphyService = new GiphyService();
    this.setupService = new TelegramSetupService();
  }

  // --- Lifecycle ---

  async start(): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      logger.warn('TELEGRAM_BOT_TOKEN not set. Telegram bot will NOT start.');
      return;
    }

    try {
      this.bot = new Telegraf(token);

      const me = await this.bot.telegram.getMe();
      this.botUsername = me.username ?? '';
      logger.log(`Bot identity: @${this.botUsername} (id: ${me.id})`);

      this.registerCommands();
      this.bot.on('message', (ctx) => this.handleMessage(ctx));
      this.bot.on('channel_post', (ctx) => this.handleChannelPost(ctx));
      this.startMoodEngine();

      await this.bot.launch({ dropPendingUpdates: true });
      logger.log('Telegram bot launched successfully.');
    } catch (err: any) {
      logger.error(`Failed to launch Telegram bot: ${err.message}`, err.stack);
    }
  }

  destroy(): void {
    if (this.moodDecayInterval) clearInterval(this.moodDecayInterval);
    if (this.sentimentInterval) clearInterval(this.sentimentInterval);
    if (this.bot) {
      this.bot.stop('Shutdown');
      logger.log('Telegram bot stopped.');
    }
  }

  // --- Command Registration ---

  private registerCommands(): void {
    if (!this.bot) return;

    this.bot.command('help', (ctx) => this.cmdHelp(ctx));
    this.bot.command('start', (ctx) => this.cmdStart(ctx));
    this.bot.command('faq', (ctx) => this.cmdFaq(ctx));
    this.bot.command('ask', (ctx) => this.cmdAsk(ctx));
    this.bot.command('pricing', (ctx) => this.cmdPricing(ctx));
    this.bot.command('docs', (ctx) => this.cmdDocs(ctx));
    this.bot.command('links', (ctx) => this.cmdLinks(ctx));
    this.bot.command('setup', (ctx) => this.cmdSetup(ctx));
    this.bot.command('clear', (ctx) => this.cmdClear(ctx));
  }

  // --- Command Handlers ---

  private async cmdHelp(ctx: Context): Promise<void> {
    try {
      await ctx.reply(WELCOME_MESSAGE, { parse_mode: 'MarkdownV2' });
    } catch (err: any) {
      logger.error(`/help error: ${err.message}`);
    }
  }

  private async cmdStart(ctx: Context): Promise<void> {
    try {
      await ctx.reply(WELCOME_MESSAGE, { parse_mode: 'MarkdownV2' });
    } catch (err: any) {
      logger.error(`/start error: ${err.message}`);
    }
  }

  private async cmdFaq(ctx: Context): Promise<void> {
    try {
      const text = (ctx.message as any)?.text ?? '';
      const question = text.replace(/^\/faq\s*/i, '').trim();
      if (!question) {
        await ctx.reply('Please provide a question. Usage: /faq <your question>');
        return;
      }
      const answer = await this.aiChat(FAQ_SYSTEM_PROMPT, question, 0.3);
      await ctx.reply(answer);
    } catch (err: any) {
      logger.error(`/faq error: ${err.message}`);
      await ctx.reply('Sorry, I encountered an error processing your question.');
    }
  }

  private async cmdAsk(ctx: Context): Promise<void> {
    try {
      const text = (ctx.message as any)?.text ?? '';
      const question = text.replace(/^\/ask\s*/i, '').trim();
      if (!question) {
        await ctx.reply('Please provide a question. Usage: /ask <your question>');
        return;
      }
      const answer = await this.aiChat(ASK_SYSTEM_PROMPT, question, 0.5);
      await ctx.reply(answer);
    } catch (err: any) {
      logger.error(`/ask error: ${err.message}`);
      await ctx.reply('Sorry, I encountered an error processing your question.');
    }
  }

  private async cmdPricing(ctx: Context): Promise<void> {
    try {
      await ctx.reply(PRICING_MESSAGE, { parse_mode: 'MarkdownV2' });
    } catch (err: any) {
      logger.error(`/pricing error: ${err.message}`);
    }
  }

  private async cmdDocs(ctx: Context): Promise<void> {
    try {
      const text = (ctx.message as any)?.text ?? '';
      const topic = text.replace(/^\/docs\s*/i, '').trim();
      if (!topic) {
        await ctx.reply('Please provide a topic. Usage: /docs <topic>');
        return;
      }
      const answer = await this.aiChat(ASK_SYSTEM_PROMPT, `Documentation about: ${topic}`, 0.3);
      await ctx.reply(answer);
    } catch (err: any) {
      logger.error(`/docs error: ${err.message}`);
      await ctx.reply('Sorry, I encountered an error searching the docs.');
    }
  }

  private async cmdLinks(ctx: Context): Promise<void> {
    try {
      await ctx.reply(LINKS_MESSAGE, { parse_mode: 'MarkdownV2' });
    } catch (err: any) {
      logger.error(`/links error: ${err.message}`);
    }
  }

  private async cmdSetup(ctx: Context): Promise<void> {
    try {
      const chatId = ctx.chat?.id;
      const userId = (ctx.message as any)?.from?.id;
      if (!chatId || !userId) {
        await ctx.reply('Cannot determine chat or user info.');
        return;
      }

      const member = await ctx.telegram.getChatMember(chatId, userId);
      if (!['creator', 'administrator'].includes(member.status)) {
        await ctx.reply('Only admins can run /setup.');
        return;
      }

      await ctx.reply('Running auto-setup...');
      const results = await this.setupService.setupChat(this.bot!, chatId);
      await ctx.reply(`Setup complete:\n${results.map((r) => `- ${r}`).join('\n')}`);
    } catch (err: any) {
      logger.error(`/setup error: ${err.message}`);
      await ctx.reply(`Setup failed: ${err.message}`);
    }
  }

  private async cmdClear(ctx: Context): Promise<void> {
    logger.log(`/clear triggered in chat ${ctx.chat?.id} by user ${(ctx.message as any)?.from?.id}`);
    try {
      const chatId = ctx.chat?.id;
      const userId = (ctx.message as any)?.from?.id;
      if (!chatId || !userId) {
        logger.warn('/clear: missing chatId or userId');
        await ctx.reply('Cannot determine chat or user info.');
        return;
      }

      // In private chats (DMs), skip admin check
      const chatType = ctx.chat?.type;
      if (chatType === 'group' || chatType === 'supergroup') {
        const member = await ctx.telegram.getChatMember(chatId, userId);
        if (!['creator', 'administrator'].includes(member.status)) {
          await ctx.reply('Only admins can run /clear.');
          return;
        }
      }

      const text = (ctx.message as any)?.text ?? '';
      const countArg = text.replace(/^\/clear\s*/i, '').trim();
      const count = Math.min(Math.max(parseInt(countArg, 10) || 50, 1), 100);

      const replyMsg = (ctx.message as any)?.message_id;
      if (!replyMsg) return;

      // Delete messages backwards from the command message
      let deleted = 0;
      for (let i = 0; i < count; i++) {
        const msgId = replyMsg - i;
        if (msgId < 1) break;
        try {
          await ctx.telegram.deleteMessage(chatId, msgId);
          deleted++;
        } catch {
          // Message may already be deleted or too old
        }
      }

      // Send confirmation (auto-deletes after 5s)
      const confirm = await ctx.reply(`Deleted ${deleted} messages.`);
      setTimeout(async () => {
        try {
          await ctx.telegram.deleteMessage(chatId, (confirm as any).message_id);
        } catch {}
      }, 5000);
    } catch (err: any) {
      logger.error(`/clear error: ${err.message}`);
      await ctx.reply(`Clear failed: ${err.message}`);
    }
  }

  // --- Channel Post Handler ---

  private async handleChannelPost(ctx: Context): Promise<void> {
    const post = (ctx as any).channelPost;
    if (!post?.text) return;

    this.sentimentBuffer.push(post.text);

    // Match /command or /command@BotName with optional args
    const match = post.text.match(/^\/(\w+)(?:@\w+)?(?:\s+([\s\S]*))?$/);
    if (!match) return;
    logger.log(`Channel post command: /${match[1]} args="${match[2] ?? ''}" in chat ${post.chat?.id}`);

    const [, command, rawArgs] = match;
    const args = (rawArgs ?? '').trim();
    const chatId = post.chat?.id;

    if (!chatId || !this.bot) return;

    try {
      switch (command.toLowerCase()) {
        case 'help':
        case 'start':
          await this.bot.telegram.sendMessage(chatId, WELCOME_MESSAGE, { parse_mode: 'MarkdownV2' });
          break;

        case 'faq': {
          if (!args) {
            await this.bot.telegram.sendMessage(chatId, 'Please provide a question. Usage: /faq <your question>');
            break;
          }
          const faqAnswer = await this.aiChat(FAQ_SYSTEM_PROMPT, args, 0.3);
          await this.bot.telegram.sendMessage(chatId, faqAnswer);
          break;
        }

        case 'ask': {
          if (!args) {
            await this.bot.telegram.sendMessage(chatId, 'Please provide a question. Usage: /ask <your question>');
            break;
          }
          const askAnswer = await this.aiChat(ASK_SYSTEM_PROMPT, args, 0.5);
          await this.bot.telegram.sendMessage(chatId, askAnswer);
          break;
        }

        case 'pricing':
          await this.bot.telegram.sendMessage(chatId, PRICING_MESSAGE, { parse_mode: 'MarkdownV2' });
          break;

        case 'docs': {
          if (!args) {
            await this.bot.telegram.sendMessage(chatId, 'Please provide a topic. Usage: /docs <topic>');
            break;
          }
          const docsAnswer = await this.aiChat(ASK_SYSTEM_PROMPT, `Documentation about: ${args}`, 0.3);
          await this.bot.telegram.sendMessage(chatId, docsAnswer);
          break;
        }

        case 'links':
          await this.bot.telegram.sendMessage(chatId, LINKS_MESSAGE, { parse_mode: 'MarkdownV2' });
          break;

        case 'setup':
          await this.handleSetupFromChannel(chatId);
          break;

        case 'clear': {
          const clearCount = Math.min(Math.max(parseInt(args, 10) || 50, 1), 100);
          const lastMsgId = post.message_id;
          let clearDeleted = 0;
          for (let i = 0; i < clearCount; i++) {
            const mid = lastMsgId - i;
            if (mid < 1) break;
            try {
              await this.bot!.telegram.deleteMessage(chatId, mid);
              clearDeleted++;
            } catch { /* already deleted or too old */ }
          }
          const cfm = await this.bot!.telegram.sendMessage(chatId, `Deleted ${clearDeleted} messages.`);
          setTimeout(async () => {
            try { await this.bot!.telegram.deleteMessage(chatId, cfm.message_id); } catch {}
          }, 5000);
          break;
        }

        default:
          break;
      }
    } catch (err: any) {
      logger.error(`Channel post command /${command} error: ${err.message}`, err.stack);
    }
  }

  private async handleSetupFromChannel(chatId: number): Promise<void> {
    if (!this.bot) return;
    try {
      await this.bot.telegram.sendMessage(chatId, 'Running auto-setup...');
      const results = await this.setupService.setupChat(this.bot, chatId);
      await this.bot.telegram.sendMessage(chatId, `Setup complete:\n${results.map((r) => `- ${r}`).join('\n')}`);
    } catch (err: any) {
      logger.error(`Channel setup error: ${err.message}`);
      await this.bot.telegram.sendMessage(chatId, `Setup failed: ${err.message}`);
    }
  }

  // --- Message Handler ---

  private async handleMessage(ctx: Context): Promise<void> {
    const msg = (ctx.message as any);
    if (!msg?.text) return;

    const chatId = String(ctx.chat?.id ?? '');
    const userName = msg.from?.username ?? msg.from?.first_name ?? 'unknown';
    const text = msg.text as string;

    this.sentimentBuffer.push(text);

    const count = this.messagesSinceBotPerChat.get(chatId) ?? 0;
    this.messagesSinceBotPerChat.set(chatId, count + 1);

    if (!this.recentMessages.has(chatId)) {
      this.recentMessages.set(chatId, []);
    }
    const recent = this.recentMessages.get(chatId)!;
    recent.push({ user: userName, text, ts: Date.now() });
    if (recent.length > 20) recent.splice(0, recent.length - 20);

    if (this.isBotMentioned(msg) || this.isBotRepliedTo(msg)) {
      await this.handleDirectMention(ctx, text);
      return;
    }

    await this.attemptProactiveResponse(ctx, chatId);
  }

  // --- Direct Mention ---

  private async handleDirectMention(ctx: Context, question: string): Promise<void> {
    const chatId = String(ctx.chat?.id ?? '');
    try {
      const cleanQuestion = question
        .replace(new RegExp(`@${this.botUsername}`, 'gi'), '')
        .trim();

      if (!cleanQuestion) {
        await ctx.reply(`${BRAND_NAME} AI assistant. Ask me a question.`);
        this.recordBotResponse(chatId);
        return;
      }

      const answer = await this.aiChat(PERSONALITY_SYSTEM_PROMPT, cleanQuestion, 0.7);
      await ctx.reply(answer, { reply_parameters: { message_id: (ctx.message as any)?.message_id } });
      this.recordBotResponse(chatId);
    } catch (err: any) {
      logger.error(`Direct mention error: ${err.message}`);
      await ctx.reply('Oops, my rabbit brain glitched for a moment. Try again?');
    }
  }

  // --- Proactive Engagement ---

  private async attemptProactiveResponse(ctx: Context, chatId: string): Promise<void> {
    if (!this.isEligibleForProactive(chatId)) return;
    if (Math.random() > 0.25) return;

    const recent = this.recentMessages.get(chatId);
    if (!recent || recent.length < 2) return;

    try {
      const conversationContext = recent
        .slice(-10)
        .map((m) => `${m.user}: ${m.text}`)
        .join('\n');

      const answer = await this.aiChat(
        PROACTIVE_SYSTEM_PROMPT.replace('{{conversation}}', conversationContext),
        'Should I chime in?',
        0.8,
      );

      if (answer.trim() === '[SKIP]' || answer.includes('[SKIP]')) return;

      await ctx.reply(answer);
      this.recordBotResponse(chatId);

      if (Math.random() < GIF_PROBABILITY) {
        await this.sendMoodGif(ctx);
      }
    } catch (err: any) {
      logger.error(`Proactive response error: ${err.message}`);
    }
  }

  private isEligibleForProactive(chatId: string): boolean {
    const now = Date.now();
    if (now - this.lastGlobalBotResponse < GLOBAL_COOLDOWN_SECONDS * 1000) return false;
    const lastChat = this.lastBotResponsePerChat.get(chatId) ?? 0;
    if (now - lastChat < CHAT_COOLDOWN_SECONDS * 1000) return false;
    const msgCount = this.messagesSinceBotPerChat.get(chatId) ?? 0;
    if (msgCount < MIN_MESSAGES_SINCE_BOT) return false;
    return true;
  }

  private recordBotResponse(chatId: string): void {
    const now = Date.now();
    this.lastBotResponsePerChat.set(chatId, now);
    this.lastGlobalBotResponse = now;
    this.messagesSinceBotPerChat.set(chatId, 0);
  }

  // --- Mention Detection ---

  private isBotMentioned(msg: any): boolean {
    if (msg.entities) {
      for (const entity of msg.entities) {
        if (
          entity.type === 'mention' &&
          msg.text?.substring(entity.offset, entity.offset + entity.length)
            .toLowerCase() === `@${this.botUsername.toLowerCase()}`
        ) {
          return true;
        }
      }
    }

    const lower = (msg.text ?? '').toLowerCase();
    if (
      lower.includes('rabbit') ||
      lower.includes('rabbitholeincbot') ||
      lower.includes(`@${this.botUsername.toLowerCase()}`)
    ) {
      return true;
    }

    return false;
  }

  private isBotRepliedTo(msg: any): boolean {
    if (!msg.reply_to_message) return false;
    return msg.reply_to_message.from?.username?.toLowerCase() === this.botUsername.toLowerCase();
  }

  // --- GIF ---

  private async sendMoodGif(ctx: Context): Promise<void> {
    try {
      const label = getMoodLabel(this.mood);
      const gifUrl = await this.giphyService.search(`${label} rabbit`);
      if (gifUrl) {
        await ctx.replyWithAnimation(gifUrl);
      }
    } catch (err: any) {
      logger.warn(`Failed to send GIF: ${err.message}`);
    }
  }

  // --- AI Chat Helper ---

  private async aiChat(systemPromptTemplate: string, question: string, temperature: number): Promise<string> {
    let context = '';
    try {
      context = this.knowledgeBase.buildContext(question, 5);
    } catch {
      context = 'No knowledge base context available.';
    }

    const moodLabel = getMoodLabel(this.mood);
    const systemPrompt = systemPromptTemplate
      .replace('{{context}}', context)
      .replace('{{mood}}', moodLabel)
      .replace('{{mood_prompt}}', MOOD_PROMPTS[moodLabel]);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ];

    const response = await callLlm(messages, { temperature, max_tokens: 1024 });
    return response.text ?? 'I had trouble generating a response. Please try again.';
  }

  // --- Mood Engine ---

  private startMoodEngine(): void {
    this.moodDecayInterval = setInterval(() => this.decayMood(), 5 * 60 * 1000);
    this.sentimentInterval = setInterval(() => this.processSentimentBuffer(), 10 * 1000);
  }

  private decayMood(): void {
    const rate = 0.15;
    this.mood.pleasure += (BASELINE.pleasure - this.mood.pleasure) * rate;
    this.mood.arousal += (BASELINE.arousal - this.mood.arousal) * rate;
    this.mood.dominance += (BASELINE.dominance - this.mood.dominance) * rate;
  }

  private processSentimentBuffer(): void {
    if (this.sentimentBuffer.length === 0) return;

    const texts = this.sentimentBuffer.splice(0);
    let totalSentiment = 0;
    for (const text of texts) {
      totalSentiment += keywordSentiment(text);
    }

    const avgSentiment = totalSentiment / texts.length;
    const delta = avgSentiment * 0.1;
    this.mood.pleasure = clamp(this.mood.pleasure + delta, 0, 1);
    this.mood.arousal = clamp(this.mood.arousal + Math.abs(delta) * 0.5, 0, 1);

    if (avgSentiment < -0.3) {
      this.mood.dominance = clamp(this.mood.dominance - 0.05, 0, 1);
    } else if (avgSentiment > 0.3) {
      this.mood.dominance = clamp(this.mood.dominance + 0.03, 0, 1);
    }
  }
}
