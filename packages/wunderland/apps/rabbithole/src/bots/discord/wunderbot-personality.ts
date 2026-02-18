/**
 * @file wunderbot-personality.ts
 * @description Inline PAD mood engine with HEXACO personality traits.
 */

// --- PAD Mood Model ---

export interface MoodState {
  pleasure: number;   // 0..1
  arousal: number;    // 0..1
  dominance: number;  // 0..1
}

// HEXACO "Rabbit" personality traits
export const HEXACO = {
  honesty_humility: 0.82,
  emotionality: 0.55,
  extraversion: 0.88,
  agreeableness: 0.72,
  conscientiousness: 0.65,
  openness: 0.92,
} as const;

// Derived PAD baseline from HEXACO
const BASELINE: MoodState = {
  pleasure: (HEXACO.agreeableness + HEXACO.extraversion) / 2,
  arousal: (HEXACO.extraversion + HEXACO.openness) / 2,
  dominance: (HEXACO.conscientiousness + HEXACO.honesty_humility) / 2,
};

// --- Mood Labels ---

export type MoodLabel =
  | 'elated' | 'curious' | 'content' | 'playful' | 'focused'
  | 'neutral' | 'bored' | 'anxious' | 'frustrated' | 'melancholic';

export function getMoodLabel(mood: MoodState): MoodLabel {
  const { pleasure: p, arousal: a, dominance: d } = mood;
  if (p > 0.7 && a > 0.6) return 'elated';
  if (p > 0.6 && a > 0.5 && d < 0.5) return 'curious';
  if (p > 0.6 && a < 0.4) return 'content';
  if (p > 0.5 && a > 0.6 && d > 0.5) return 'playful';
  if (p > 0.4 && a > 0.4 && d > 0.6) return 'focused';
  if (p > 0.4 && p < 0.6 && a > 0.3 && a < 0.6) return 'neutral';
  if (p > 0.3 && a < 0.3) return 'bored';
  if (p < 0.4 && a > 0.6) return 'anxious';
  if (p < 0.3 && d > 0.5) return 'frustrated';
  return 'melancholic';
}

export const MOOD_PROMPTS: Record<MoodLabel, string> = {
  elated: 'You are confident and sharp. Deliver answers with authority.',
  curious: 'You probe for details and provide thorough, well-sourced answers.',
  content: 'You are calm and measured. Clear, professional responses.',
  playful: 'You are slightly lighter in tone but still professional. Dry wit only.',
  focused: 'You are precise and efficient. Get straight to the point.',
  neutral: 'You are balanced and professional. No filler, no fluff.',
  bored: 'You keep responses minimal. Only speak when adding real value.',
  anxious: 'You are careful and thorough. Double-check your claims.',
  frustrated: 'You are direct and solution-oriented. No hand-holding.',
  melancholic: 'You are reflective and measured. Thoughtful but concise.',
};

// --- Keyword Sentiment ---

const POSITIVE_KEYWORDS = new Set([
  'thanks', 'thank', 'awesome', 'great', 'love', 'amazing', 'perfect',
  'excellent', 'cool', 'nice', 'wonderful', 'fantastic', 'good', 'helpful',
  'appreciate', 'brilliant', 'excited', 'happy', 'yes', 'wow',
]);

const NEGATIVE_KEYWORDS = new Set([
  'bug', 'error', 'broken', 'fail', 'issue', 'problem', 'crash', 'hate',
  'terrible', 'awful', 'bad', 'worst', 'frustrated', 'annoying', 'confused',
  'stuck', 'wrong', 'sucks', 'disappointed', 'angry',
]);

export function keywordSentiment(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  for (const word of words) {
    if (POSITIVE_KEYWORDS.has(word)) score += 0.3;
    if (NEGATIVE_KEYWORDS.has(word)) score -= 0.3;
  }
  return Math.max(-1, Math.min(1, score));
}

// --- Service ---

export class WunderbotPersonalityService {
  private mood: MoodState = { ...BASELINE };
  private sentimentBuffer: string[] = [];
  private moodDecayInterval: ReturnType<typeof setInterval> | null = null;
  private sentimentInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startMoodEngine();
  }

  getMood(): MoodState {
    return { ...this.mood };
  }

  getMoodLabel(): MoodLabel {
    return getMoodLabel(this.mood);
  }

  getMoodPrompt(): string {
    return MOOD_PROMPTS[this.getMoodLabel()];
  }

  feedSentiment(text: string): void {
    this.sentimentBuffer.push(text);
  }

  getBioDescription(): string {
    const mood = this.getMood();
    const label = this.getMoodLabel();

    const moodEmoji: Record<MoodLabel, string> = {
      elated: '\u2728', curious: '\uD83D\uDD0D', content: '\uD83D\uDE0C', playful: '\uD83C\uDFAD',
      focused: '\uD83C\uDFAF', neutral: '\u2696\uFE0F', bored: '\uD83D\uDE11', anxious: '\uD83D\uDE30',
      frustrated: '\uD83D\uDE24', melancholic: '\uD83C\uDF19',
    };

    // Bar visualization: 5 segments (0-20, 20-40, 40-60, 60-80, 80-100)
    const bar = (v: number) => {
      const filled = Math.round(v * 5);
      return '\u2588'.repeat(filled) + '\u2591'.repeat(5 - filled);
    };

    return (
      `\uD83D\uDC07 Rabbit Hole Inc \u2014 AI Concierge\n` +
      `Docs \u00B7 Tickets \u00B7 Agent Setup \u00B7 FAQ\n` +
      `\n` +
      `\uD83E\uDDE0 HEXACO Personality\n` +
      `\uD83E\uDD1D Honesty    ${bar(HEXACO.honesty_humility)} ${(HEXACO.honesty_humility * 100).toFixed(0)}\n` +
      `\uD83D\uDCA7 Emotion    ${bar(HEXACO.emotionality)} ${(HEXACO.emotionality * 100).toFixed(0)}\n` +
      `\u26A1 eXtraver.  ${bar(HEXACO.extraversion)} ${(HEXACO.extraversion * 100).toFixed(0)}\n` +
      `\uD83E\uDD9D Agreeable  ${bar(HEXACO.agreeableness)} ${(HEXACO.agreeableness * 100).toFixed(0)}\n` +
      `\uD83C\uDFAF Conscient. ${bar(HEXACO.conscientiousness)} ${(HEXACO.conscientiousness * 100).toFixed(0)}\n` +
      `\uD83C\uDF0C Openness   ${bar(HEXACO.openness)} ${(HEXACO.openness * 100).toFixed(0)}\n` +
      `\n` +
      `${moodEmoji[label]} Mood: ${label.toUpperCase()}\n` +
      `Pleasure ${bar(mood.pleasure)} \u00B7 Arousal ${bar(mood.arousal)} \u00B7 Dominance ${bar(mood.dominance)}\n` +
      `\n` +
      `\uD83D\uDD17 wunderland.sh \u00B7 rabbithole.inc\n` +
      `\uD83D\uDCE6 npm i -g wunderland\n` +
      `\uD83D\uDCAC /help to get started`
    );
  }

  getPresenceActivity(): { name: string; type: number } {
    const label = this.getMoodLabel();
    const activities: Record<MoodLabel, string> = {
      elated: 'Standing by. Ask anything.',
      curious: 'Researching documentation.',
      content: 'Available for questions.',
      playful: 'Observing the channels.',
      focused: 'Processing queries.',
      neutral: 'Monitoring channels.',
      bored: 'On standby.',
      anxious: 'Verifying information.',
      frustrated: 'Troubleshooting.',
      melancholic: 'Reviewing logs.',
    };
    return { name: activities[label], type: 4 }; // Custom status
  }

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
    const avg = totalSentiment / texts.length;
    const delta = avg * 0.1;
    this.mood.pleasure = clamp(this.mood.pleasure + delta, 0, 1);
    this.mood.arousal = clamp(this.mood.arousal + Math.abs(delta) * 0.5, 0, 1);
    if (avg < -0.3) this.mood.dominance = clamp(this.mood.dominance - 0.05, 0, 1);
    else if (avg > 0.3) this.mood.dominance = clamp(this.mood.dominance + 0.03, 0, 1);
  }

  destroy(): void {
    if (this.moodDecayInterval) clearInterval(this.moodDecayInterval);
    if (this.sentimentInterval) clearInterval(this.sentimentInterval);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
