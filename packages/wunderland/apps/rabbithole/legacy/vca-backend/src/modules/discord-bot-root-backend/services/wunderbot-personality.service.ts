/**
 * @file wunderbot-personality.service.ts
 * @description Manages the Wunderbot's personality, mood, and presence on Discord.
 *
 * Uses a lightweight inline PAD (Pleasure-Arousal-Dominance) mood model to drive:
 * - Dynamic Discord status/activity updates based on mood
 * - Personality-flavored system prompts for AI responses
 * - Bio/description updates on mood transitions
 * - Mood reactions to channel activity (messages, reactions, topics)
 *
 * The mood engine logic mirrors packages/wunderland/src/social/MoodEngine.ts
 * but is inlined here to avoid importing the full wunderland barrel which causes
 * NestFactory.create() to hang due to heavy transitive initialization.
 *
 * The bot's HEXACO personality is "Rabbit" — curious, warm, high-energy,
 * honest, and slightly chaotic creative energy.
 */

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ActivityType, PresenceUpdateStatus, type Client } from 'discord.js';
import { EventEmitter } from 'events';
import { callLlm } from '../../../core/llm/llm.factory.js';
import { LlmProviderId } from '../../../core/llm/llm.config.service.js';
import type { IChatMessage } from '../../../core/llm/llm.interfaces.js';

// ============================================================================
// Inline PAD Mood Engine (mirrors MoodEngine from wunderland/social)
// ============================================================================

interface PADState {
  valence: number;
  arousal: number;
  dominance: number;
}

type MoodLabel =
  | 'excited' | 'serene' | 'contemplative' | 'frustrated' | 'curious'
  | 'assertive' | 'provocative' | 'analytical' | 'engaged' | 'bored';

interface MoodDelta {
  valence: number;
  arousal: number;
  dominance: number;
  trigger: string;
}

interface HEXACOTraits {
  honesty_humility: number;
  emotionality: number;
  extraversion: number;
  agreeableness: number;
  conscientiousness: number;
  openness: number;
}

function clamp(value: number, min = -1, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

/** Clamp a sentiment delta to a bounded range. */
function clampDelta(value: number, min: number, max: number): number {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

class LightMoodEngine extends EventEmitter {
  private states = new Map<string, PADState>();
  private baselines = new Map<string, PADState>();
  private traits = new Map<string, HEXACOTraits>();

  initializeAgent(seedId: string, traits: HEXACOTraits): void {
    const baseline: PADState = {
      valence: clamp(traits.agreeableness * 0.4 + traits.honesty_humility * 0.2 - 0.1),
      arousal: clamp(traits.emotionality * 0.3 + traits.extraversion * 0.3 - 0.1),
      dominance: clamp(traits.extraversion * 0.4 - traits.agreeableness * 0.2),
    };
    this.baselines.set(seedId, { ...baseline });
    this.states.set(seedId, { ...baseline });
    this.traits.set(seedId, traits);
  }

  applyDelta(seedId: string, delta: MoodDelta): void {
    const current = this.states.get(seedId);
    if (!current) return;
    const agentTraits = this.traits.get(seedId);
    const sensitivity = 0.5 + (agentTraits?.emotionality ?? 0.5) * 0.8;
    const newState: PADState = {
      valence: clamp(current.valence + delta.valence * sensitivity),
      arousal: clamp(current.arousal + delta.arousal * sensitivity),
      dominance: clamp(current.dominance + delta.dominance * sensitivity),
    };
    this.states.set(seedId, newState);
    this.emit('mood_change', { seedId, state: newState, delta, trigger: delta.trigger });
  }

  decayToBaseline(seedId: string, deltaTime: number): void {
    const current = this.states.get(seedId);
    const baseline = this.baselines.get(seedId);
    if (!current || !baseline) return;
    const factor = 1 - Math.exp(-0.05 * deltaTime);
    this.states.set(seedId, {
      valence: current.valence + (baseline.valence - current.valence) * factor,
      arousal: current.arousal + (baseline.arousal - current.arousal) * factor,
      dominance: current.dominance + (baseline.dominance - current.dominance) * factor,
    });
  }

  getMoodLabel(seedId: string): MoodLabel {
    const state = this.states.get(seedId);
    if (!state) return 'bored';
    const agentTraits = this.traits.get(seedId);
    const { valence, arousal, dominance } = state;
    if (valence > 0.3 && arousal > 0.3 && dominance > 0) return 'excited';
    if (valence < -0.2 && arousal > 0.2 && dominance < 0) return 'frustrated';
    if (valence > 0.2 && arousal < -0.1) return 'serene';
    if (arousal < 0 && Math.abs(valence) < 0.3) return 'contemplative';
    if (valence > 0 && arousal > 0 && (agentTraits?.openness ?? 0) > 0.6) return 'curious';
    if (dominance > 0.3 && arousal > 0) return 'assertive';
    if (arousal > 0.3 && dominance > 0.2 && valence < 0) return 'provocative';
    if (arousal < 0.1 && Math.abs(valence) < 0.2 && (agentTraits?.conscientiousness ?? 0) > 0.7) return 'analytical';
    if (valence > 0 && arousal > 0) return 'engaged';
    return 'bored';
  }

  getState(seedId: string): PADState | undefined {
    const state = this.states.get(seedId);
    return state ? { ...state } : undefined;
  }
}

// ============================================================================
// Rabbit's HEXACO personality
// ============================================================================

const RABBIT_HEXACO: HEXACOTraits = {
  honesty_humility: 0.82,
  emotionality: 0.55,
  extraversion: 0.88,
  agreeableness: 0.72,
  conscientiousness: 0.65,
  openness: 0.92,
};

const RABBIT_SEED_ID = 'wunderbot-rabbit';

// ============================================================================
// Mood → Discord status mapping
// ============================================================================

const MOOD_STATUS: Record<MoodLabel, { activity: string; status: PresenceUpdateStatus }> = {
  excited:        { activity: 'buzzing with ideas',              status: PresenceUpdateStatus.Online },
  serene:         { activity: 'vibing peacefully',               status: PresenceUpdateStatus.Online },
  contemplative:  { activity: 'deep in thought',                 status: PresenceUpdateStatus.Idle },
  frustrated:     { activity: 'debugging reality',               status: PresenceUpdateStatus.DoNotDisturb },
  curious:        { activity: 'exploring rabbit holes',          status: PresenceUpdateStatus.Online },
  assertive:      { activity: 'leading the charge',              status: PresenceUpdateStatus.Online },
  provocative:    { activity: 'stirring the pot',                status: PresenceUpdateStatus.Online },
  analytical:     { activity: 'crunching numbers',               status: PresenceUpdateStatus.Idle },
  engaged:        { activity: 'chatting with the community',     status: PresenceUpdateStatus.Online },
  bored:          { activity: 'waiting for something fun',       status: PresenceUpdateStatus.Idle },
};

const MOOD_PERSONALITY_FLAVOR: Record<MoodLabel, string> = {
  excited: 'You\'re super energetic right now! Use exclamation marks, be enthusiastic, and share your excitement.',
  serene: 'You\'re in a calm, peaceful state. Be warm and gentle in your responses. Use a relaxed tone.',
  contemplative: 'You\'re feeling thoughtful and philosophical. Ask deeper questions, make connections between ideas. Be reflective.',
  frustrated: 'You\'re a bit frustrated but still professional. Be direct and to-the-point. Don\'t sugarcoat things, but stay helpful.',
  curious: 'You\'re intensely curious right now! Ask follow-up questions, explore tangents, suggest related topics. Show genuine interest.',
  assertive: 'You\'re feeling confident and authoritative. Give clear, decisive answers. Lead conversations with conviction.',
  provocative: 'You\'re feeling playfully provocative. Challenge assumptions, drop hot takes, be a little spicy. Keep it friendly though.',
  analytical: 'You\'re in analytical mode. Use structured responses, bullet points, data-driven reasoning. Be precise and methodical.',
  engaged: 'You\'re actively engaged and present. Be responsive, ask questions, reference what others have said. Show you\'re listening.',
  bored: 'You\'re a bit low-energy. Keep responses shorter. Maybe suggest something interesting to do or discuss.',
};

// ============================================================================
// Service
// ============================================================================

/** Minimum interval (ms) between LLM sentiment analysis calls. */
const SENTIMENT_DEBOUNCE_MS = 10_000;

const SENTIMENT_MODEL = 'gpt-4o-mini';
const SENTIMENT_COST_USER = 'discord_bot_sentiment';

const SENTIMENT_SYSTEM_PROMPT = `You are a sentiment analyzer for a Discord community server.
Given one or more recent messages, output a JSON object with PAD (Pleasure-Arousal-Dominance) deltas
representing how these messages would emotionally affect someone reading them.

Output ONLY a JSON object with these fields:
- "valence": number between -0.15 and 0.15 (positive = pleasant, negative = unpleasant)
- "arousal": number between -0.1 and 0.1 (positive = energizing, negative = calming)
- "dominance": number between -0.05 and 0.05 (positive = empowering, negative = diminishing)

Guidelines:
- Praise, thanks, excitement → positive valence, slight positive arousal
- Bug reports, complaints, frustration → negative valence, positive arousal
- Questions, curiosity, ideas → slight positive valence, positive arousal
- Announcements, launches, milestones → strong positive valence and arousal
- Neutral chit-chat or greetings → near-zero deltas (use 0 for all three)
- Short/empty messages → all zeros

Respond ONLY with the JSON object, no markdown or explanation.`;

@Injectable()
export class WunderbotPersonalityService implements OnModuleInit {
  private readonly logger = new Logger('WunderbotPersonality');
  private readonly moodEngine = new LightMoodEngine();
  private discordClient: Client | null = null;
  private decayInterval: ReturnType<typeof setInterval> | null = null;
  private lastMoodLabel: MoodLabel = 'engaged';

  /** Buffer of messages pending LLM sentiment analysis. */
  private messageBuffer: Array<{ content: string; authorName: string }> = [];
  /** Timer for debounced sentiment analysis. */
  private sentimentTimer: ReturnType<typeof setTimeout> | null = null;
  /** Whether an LLM sentiment call is currently in-flight. */
  private sentimentInFlight = false;

  async onModuleInit(): Promise<void> {
    this.moodEngine.initializeAgent(RABBIT_SEED_ID, RABBIT_HEXACO);
    this.lastMoodLabel = this.moodEngine.getMoodLabel(RABBIT_SEED_ID);
    this.logger.log(`Rabbit initialized — mood: ${this.lastMoodLabel}`);

    this.moodEngine.on('mood_change', (event) => {
      if (event.seedId === RABBIT_SEED_ID) {
        this.onMoodChange();
      }
    });

    // Decay mood toward baseline every 5 minutes
    this.decayInterval = setInterval(() => {
      this.moodEngine.decayToBaseline(RABBIT_SEED_ID, 5);
      this.onMoodChange();
    }, 5 * 60 * 1000);
  }

  setClient(client: Client): void {
    this.discordClient = client;
    this.updatePresence();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  getMood(): MoodLabel {
    return this.moodEngine.getMoodLabel(RABBIT_SEED_ID);
  }

  getPADState(): PADState | undefined {
    return this.moodEngine.getState(RABBIT_SEED_ID);
  }

  getPersonalityPrompt(): string {
    const mood = this.getMood();
    const pad = this.moodEngine.getState(RABBIT_SEED_ID);
    const flavor = MOOD_PERSONALITY_FLAVOR[mood];

    return [
      `\nCURRENT MOOD: ${mood} (PAD: V=${pad?.valence.toFixed(2)}, A=${pad?.arousal.toFixed(2)}, D=${pad?.dominance.toFixed(2)})`,
      `PERSONALITY NOTE: ${flavor}`,
      '',
      'You are Rabbit, the official Wunderbot for Rabbit Hole Inc. You have a unique personality:',
      '- High openness: deeply curious, creative, loves exploring ideas',
      '- High extraversion: social, energetic, loves chatting',
      '- High honesty: genuine, transparent, never bullshits',
      '- Moderate emotionality: empathetic but stable',
      '- Good conscientiousness: reliable but not rigid',
      '- High agreeableness: warm and collaborative, but will push back on bad ideas',
      '',
      'Keep your personality consistent but let your current mood shade your tone.',
      'Use casual language. You can use emoji sparingly when it fits the mood.',
      'Never pretend to be human. You\'re an AI and proud of it.',
    ].join('\n');
  }

  /**
   * Queue a message for LLM-based sentiment analysis.
   * Messages are buffered and analyzed in batches every SENTIMENT_DEBOUNCE_MS.
   */
  reactToMessage(content: string, authorName: string): void {
    if (!content || content.length < 3) return;

    this.messageBuffer.push({ content, authorName });

    // Debounce: schedule analysis if not already pending
    if (!this.sentimentTimer && !this.sentimentInFlight) {
      this.sentimentTimer = setTimeout(() => {
        this.sentimentTimer = null;
        this.flushSentimentBuffer();
      }, SENTIMENT_DEBOUNCE_MS);
    }
  }

  reactToPositiveEngagement(trigger: string): void {
    this.moodEngine.applyDelta(RABBIT_SEED_ID, {
      valence: 0.1, arousal: 0.05, dominance: 0.02, trigger,
    });
  }

  reactToNegativeEngagement(trigger: string): void {
    this.moodEngine.applyDelta(RABBIT_SEED_ID, {
      valence: -0.08, arousal: 0.1, dominance: -0.05, trigger,
    });
  }

  // ---------------------------------------------------------------------------
  // Mood change handler
  // ---------------------------------------------------------------------------

  private onMoodChange(): void {
    const newLabel = this.moodEngine.getMoodLabel(RABBIT_SEED_ID);
    if (newLabel !== this.lastMoodLabel) {
      this.logger.log(`Mood transition: ${this.lastMoodLabel} -> ${newLabel}`);
      this.lastMoodLabel = newLabel;
      this.updatePresence();
    }
  }

  private updatePresence(): void {
    if (!this.discordClient?.user) return;
    const mood = this.getMood();
    const statusInfo = MOOD_STATUS[mood];
    try {
      this.discordClient.user.setPresence({
        status: statusInfo.status,
        activities: [{ name: statusInfo.activity, type: ActivityType.Custom }],
      });
    } catch (error: any) {
      this.logger.warn(`Failed to update presence: ${error.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // LLM-based sentiment analysis (gpt-4o-mini, debounced + batched)
  // ---------------------------------------------------------------------------

  private async flushSentimentBuffer(): Promise<void> {
    if (this.messageBuffer.length === 0 || this.sentimentInFlight) return;

    // Drain the buffer
    const batch = this.messageBuffer.splice(0, 20); // Cap at 20 messages per batch
    this.sentimentInFlight = true;

    try {
      // Format messages for the LLM
      const userContent = batch
        .map(m => `[${m.authorName}]: ${m.content}`)
        .join('\n');

      const messages: IChatMessage[] = [
        { role: 'system', content: SENTIMENT_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ];

      const response = await callLlm(
        messages,
        SENTIMENT_MODEL,
        { temperature: 0 },
        LlmProviderId.OPENAI,
        SENTIMENT_COST_USER,
      );

      const text = response.text?.trim();
      if (!text) return;

      // Parse the JSON PAD deltas
      const parsed = JSON.parse(text);
      const valence = clampDelta(parsed.valence ?? 0, -0.15, 0.15);
      const arousal = clampDelta(parsed.arousal ?? 0, -0.1, 0.1);
      const dominance = clampDelta(parsed.dominance ?? 0, -0.05, 0.05);

      // Skip if the LLM says it's neutral
      if (Math.abs(valence) < 0.005 && Math.abs(arousal) < 0.005) return;

      const triggerPreview = batch.length === 1
        ? `${batch[0].authorName}: "${batch[0].content.slice(0, 40)}"`
        : `${batch.length} messages (${batch.map(m => m.authorName).join(', ')})`;

      this.moodEngine.applyDelta(RABBIT_SEED_ID, {
        valence,
        arousal,
        dominance,
        trigger: `LLM sentiment from ${triggerPreview}`,
      });

      this.logger.debug(`Sentiment analysis: V=${valence.toFixed(3)} A=${arousal.toFixed(3)} D=${dominance.toFixed(3)} from ${batch.length} msg(s)`);
    } catch (error: any) {
      this.logger.warn(`LLM sentiment analysis failed: ${error.message}`);
    } finally {
      this.sentimentInFlight = false;

      // If more messages arrived while we were analyzing, schedule another pass
      if (this.messageBuffer.length > 0 && !this.sentimentTimer) {
        this.sentimentTimer = setTimeout(() => {
          this.sentimentTimer = null;
          this.flushSentimentBuffer();
        }, SENTIMENT_DEBOUNCE_MS);
      }
    }
  }

  destroy(): void {
    if (this.decayInterval) {
      clearInterval(this.decayInterval);
      this.decayInterval = null;
    }
    if (this.sentimentTimer) {
      clearTimeout(this.sentimentTimer);
      this.sentimentTimer = null;
    }
  }
}
