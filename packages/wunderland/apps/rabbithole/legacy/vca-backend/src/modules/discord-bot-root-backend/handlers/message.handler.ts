/**
 * @file message.handler.ts
 * @description Handles messages across the Discord server:
 * 1. Ticket thread sync — syncs thread messages as comments to the DB
 * 2. Bot @mentions — generates AI responses when mentioned anywhere
 * 3. Agentic channel engagement — Rabbit uses LLM to decide whether to respond,
 *    with basic cooldowns to avoid cost overrun. The LLM itself decides whether
 *    to engage or stay silent via the [SKIP] mechanism.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { type Message, ChannelType, type TextChannel } from 'discord.js';
import { TicketBridgeService } from '../services/ticket-bridge.service.js';
import { AiResponderService } from '../services/ai-responder.service.js';
import { WunderbotPersonalityService } from '../services/wunderbot-personality.service.js';
import { GiphyService } from '../services/giphy.service.js';

// ---------------------------------------------------------------------------
// Safety-only rate limits (prevent API cost overrun, NOT engagement logic)
// ---------------------------------------------------------------------------

/** Hard minimum seconds between proactive LLM calls per channel. */
const CHANNEL_COOLDOWN_SECONDS = 60;

/** Hard minimum seconds between proactive LLM calls globally. */
const GLOBAL_COOLDOWN_SECONDS = 15;

/** Probability of attaching a mood GIF to a proactive response. */
const GIF_PROBABILITY = 0.15;

/** Channels where the bot should NEVER proactively respond. */
const SILENT_CHANNEL_PATTERNS = [
  'rules', 'announcements', 'changelog', 'verify', 'create-ticket',
  'faq', 'getting-started', 'npm-package', 'links', 'local-dev',
];

@Injectable()
export class MessageHandler {
  private readonly logger = new Logger('MessageHandler');

  /** Timestamp of last proactive LLM call per channel ID. */
  private channelCooldowns = new Map<string, number>();

  /** Timestamp of last proactive LLM call globally. */
  private lastGlobalCall = 0;

  constructor(
    @Inject(TicketBridgeService) private readonly ticketBridge: TicketBridgeService,
    @Inject(AiResponderService) private readonly aiResponder: AiResponderService,
    @Inject(WunderbotPersonalityService) private readonly personality: WunderbotPersonalityService,
    @Inject(GiphyService) private readonly giphy: GiphyService,
  ) {}

  async handle(message: Message): Promise<void> {
    // Feed all messages to the personality engine for LLM mood updates
    this.personality.reactToMessage(message.content, message.author.displayName || message.author.username);

    // 1. Thread messages → ticket sync
    if (message.channel.isThread()) {
      return this.handleThreadMessage(message);
    }

    // 2. Direct @mention of the bot → always respond
    if (message.mentions.has(message.client.user!)) {
      return this.handleDirectMention(message);
    }

    // 3. Agentic channel engagement — LLM decides whether to respond
    if (this.isEligibleForProactiveResponse(message)) {
      await this.attemptProactiveResponse(message);
    }
  }

  // ---------------------------------------------------------------------------
  // Thread message handling (existing ticket sync)
  // ---------------------------------------------------------------------------

  private async handleThreadMessage(message: Message): Promise<void> {
    const thread = message.channel;
    if (!thread.isThread()) return;

    const mapping = await this.ticketBridge.getMapping(thread.id);
    if (!mapping) {
      if (message.mentions.has(message.client.user!)) {
        await this.handleDirectMention(message);
      }
      return;
    }

    const isTeamMember = await this.isTeamMember(message);

    try {
      await this.ticketBridge.syncMessageToTicket(
        thread.id,
        message.author.id,
        message.author.displayName || message.author.username,
        message.content,
        isTeamMember,
      );
    } catch (error: any) {
      this.logger.warn(`Failed to sync message to ticket: ${error.message}`);
    }

    if (message.mentions.has(message.client.user!)) {
      await this.handleBotMentionInThread(message, thread.id);
    }
  }

  // ---------------------------------------------------------------------------
  // Direct @mention handling (responds in any channel)
  // ---------------------------------------------------------------------------

  private async handleDirectMention(message: Message): Promise<void> {
    const cleanMessage = message.content.replace(/<@!?\d+>/g, '').trim();
    if (!cleanMessage) {
      await message.reply('Hey! Ask me anything about Rabbit Hole, Wunderland, or Wunderbots. \u{1F407}');
      return;
    }

    try {
      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }

      const recentMessages = await message.channel.messages.fetch({ limit: 10 });
      const history = recentMessages
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .map(m => ({
          role: m.author.bot ? ('assistant' as const) : ('user' as const),
          content: m.content,
        }))
        .filter(m => m.content.length > 0);

      const response = await this.aiResponder.generatePersonalityResponse(
        cleanMessage,
        this.personality.getPersonalityPrompt(),
        history.slice(0, -1),
      );

      await message.reply(response);
      this.personality.reactToPositiveEngagement(`Mentioned by ${message.author.displayName}`);
    } catch (error: any) {
      this.logger.error(`Direct mention response failed: ${error.message}`);
      await message.reply('Hmm, my brain glitched for a sec. Try again? \u{1F407}');
    }
  }

  // ---------------------------------------------------------------------------
  // Agentic proactive engagement (LLM decides, basic cooldowns for cost)
  // ---------------------------------------------------------------------------

  /**
   * Basic eligibility check — only prevents API cost overrun.
   * The actual decision to respond or stay silent is made by the LLM.
   */
  private isEligibleForProactiveResponse(message: Message): boolean {
    if (!message.guild) return false;
    if (message.channel.type !== ChannelType.GuildText) return false;

    // Never respond in admin/read-only channels
    const channelName = (message.channel as TextChannel).name.toLowerCase();
    if (SILENT_CHANNEL_PATTERNS.some(p => channelName.includes(p))) return false;

    // Skip very short messages (reactions, emoji-only, etc.)
    if (message.content.length < 5) return false;

    // Hard cooldowns to prevent API cost overrun
    const now = Date.now();
    if (now - this.lastGlobalCall < GLOBAL_COOLDOWN_SECONDS * 1000) return false;
    const lastChannel = this.channelCooldowns.get(message.channelId) || 0;
    if (now - lastChannel < CHANNEL_COOLDOWN_SECONDS * 1000) return false;

    return true;
  }

  /**
   * Ask the LLM to generate a response. The LLM returns [SKIP] if it decides
   * the bot shouldn't engage. This is the core agentic decision — the LLM sees
   * the full conversation context and decides whether Rabbit has something to add.
   */
  private async attemptProactiveResponse(message: Message): Promise<void> {
    // Mark cooldowns immediately to prevent duplicate calls
    this.lastGlobalCall = Date.now();
    this.channelCooldowns.set(message.channelId, Date.now());

    try {
      // Get recent context — the LLM needs to see the conversation to decide
      const recentMessages = await message.channel.messages.fetch({ limit: 12 });
      const sorted = recentMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      const context = sorted
        .map(m => {
          const name = m.author.bot ? `[BOT] ${m.author.displayName}` : m.author.displayName;
          const age = Math.round((Date.now() - m.createdTimestamp) / 1000);
          return `[${age}s ago] ${name}: ${m.content}`;
        })
        .filter(c => c.length > 0)
        .join('\n');

      const response = await this.aiResponder.generateProactiveResponse(
        message.content,
        context,
        this.personality.getPersonalityPrompt(),
      );

      // LLM decided to stay silent
      if (!response) return;

      // Occasionally attach a mood GIF
      let gifUrl: string | null = null;
      if (Math.random() < GIF_PROBABILITY && this.giphy.isAvailable) {
        gifUrl = await this.giphy.getMoodGif(this.personality.getMood());
      }

      const replyContent = gifUrl ? `${response}\n${gifUrl}` : response;
      await message.reply(replyContent);

      this.logger.debug(`Proactive response in #${(message.channel as TextChannel).name}`);
    } catch (error: any) {
      this.logger.warn(`Proactive response failed: ${error.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Thread bot mention (ticket thread support)
  // ---------------------------------------------------------------------------

  private async handleBotMentionInThread(message: Message, _threadId: string): Promise<void> {
    try {
      const messages = await message.channel.messages.fetch({ limit: 20 });
      const history = messages
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .map(m => ({
          role: m.author.bot ? ('assistant' as const) : ('user' as const),
          content: m.content,
        }))
        .filter(m => m.content.length > 0);

      const cleanMessage = message.content.replace(/<@!?\d+>/g, '').trim();
      if (!cleanMessage) return;

      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }

      const response = await this.aiResponder.generateThreadResponse(
        history.slice(0, -1),
        cleanMessage,
      );

      await message.reply(response);
    } catch (error: any) {
      this.logger.error(`Bot mention response failed: ${error.message}`);
      await message.reply('I\'m having trouble right now. A team member will help you shortly.');
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async isTeamMember(message: Message): Promise<boolean> {
    if (!message.guild || !message.member) return false;
    return message.member.roles.cache.some(
      r => r.name === 'Team' || r.name === 'Founder',
    );
  }
}
