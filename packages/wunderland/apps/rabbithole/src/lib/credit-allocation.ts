/**
 * Self-contained credit allocation service for Rabbithole.
 * Tracks daily platform credit budgets (LLM + speech) per user in-memory.
 * No external backend dependency — resolves tier from JWT claims.
 */

// Cost constants (inlined to avoid @framers/shared dependency)
const GPT4O_COST_PER_KTOKENS = 0.005;
const GPT4O_MINI_COST_PER_KTOKENS = 0.00015;
const WHISPER_COST_PER_MINUTE = 0.006;
const TTS_COST_PER_1K_CHARS = 0.015;

export type CreditAllocationKey =
  | 'public'
  | 'metered'
  | 'unlimited'
  | 'global'
  | 'wunderland-trial'
  | 'wunderland-starter'
  | 'wunderland-pro';

export interface CreditContext {
  isAuthenticated: boolean;
  tier?: 'unlimited' | 'metered';
  mode?: 'global' | 'standard' | 'registration';
  planId?: string | null;
  subscriptionStatus?: string;
}

interface CreditUsage {
  llmUsd: number;
  speechUsd: number;
  requestCount: number;
}

interface CreditProfile {
  allocationKey: CreditAllocationKey;
  lastResetDateKey: string;
  usage: CreditUsage;
}

interface AllocationConfig {
  llmDailyUsd: number;
  speechDailyUsd: number;
}

export interface CreditSnapshot {
  allocationKey: CreditAllocationKey;
  llm: {
    totalUsd: number | null;
    usedUsd: number;
    remainingUsd: number | null;
    isUnlimited: boolean;
    approxGpt4oTokensTotal: number | null;
    approxGpt4oTokensRemaining: number | null;
    approxGpt4oMiniTokensTotal: number | null;
    approxGpt4oMiniTokensRemaining: number | null;
  };
  speech: {
    totalUsd: number | null;
    usedUsd: number;
    remainingUsd: number | null;
    isUnlimited: boolean;
    approxWhisperMinutesTotal: number | null;
    approxWhisperMinutesRemaining: number | null;
    approxTtsCharactersTotal: number | null;
    approxTtsCharactersRemaining: number | null;
  };
}

const DEFAULT_ALLOCATIONS: Record<CreditAllocationKey, AllocationConfig> = {
  public: { llmDailyUsd: 0.05, speechDailyUsd: 0.03 },
  metered: { llmDailyUsd: 1.75, speechDailyUsd: 0.9 },
  unlimited: { llmDailyUsd: Number.POSITIVE_INFINITY, speechDailyUsd: Number.POSITIVE_INFINITY },
  global: { llmDailyUsd: 0.45, speechDailyUsd: 0.3 },
  'wunderland-trial': { llmDailyUsd: 0.10, speechDailyUsd: 0.05 },
  'wunderland-starter': { llmDailyUsd: 0.25, speechDailyUsd: 0.10 },
  'wunderland-pro': { llmDailyUsd: 0.75, speechDailyUsd: 0.30 },
};

const profiles: Map<string, CreditProfile> = new Map();

const todayKey = (): string => new Date().toISOString().slice(0, 10);

export function resolveAllocationKey(ctx: CreditContext | undefined): CreditAllocationKey {
  if (!ctx?.isAuthenticated) return 'public';
  if (ctx.mode === 'global') return 'global';
  if (ctx.planId === 'pro') return 'wunderland-pro';
  if (ctx.planId === 'starter') {
    if (ctx.subscriptionStatus === 'trialing') return 'wunderland-trial';
    return 'wunderland-starter';
  }
  if (ctx.tier === 'unlimited') return 'unlimited';
  return 'metered';
}

function ensureProfile(userId: string, ctx?: CreditContext): CreditProfile {
  const key = resolveAllocationKey(ctx);
  const dateKey = todayKey();

  let profile = profiles.get(userId);
  if (!profile) {
    profile = { allocationKey: key, lastResetDateKey: dateKey, usage: { llmUsd: 0, speechUsd: 0, requestCount: 0 } };
    profiles.set(userId, profile);
    return profile;
  }

  if (profile.allocationKey !== key) {
    profile.allocationKey = key;
    profile.usage = { llmUsd: 0, speechUsd: 0, requestCount: 0 };
    profile.lastResetDateKey = dateKey;
    return profile;
  }

  if (profile.lastResetDateKey !== dateKey) {
    profile.usage = { llmUsd: 0, speechUsd: 0, requestCount: 0 };
    profile.lastResetDateKey = dateKey;
  }
  return profile;
}

const norm = (v: number): number | null => (Number.isFinite(v) ? v : null);
const usdToGpt4o = (usd: number) => Math.floor((usd / GPT4O_COST_PER_KTOKENS) * 1000);
const usdToGpt4oMini = (usd: number) => Math.floor((usd / GPT4O_MINI_COST_PER_KTOKENS) * 1000);
const usdToWhisper = (usd: number) => usd / WHISPER_COST_PER_MINUTE;
const usdToTts = (usd: number) => (usd / TTS_COST_PER_1K_CHARS) * 1000;

export function getSnapshot(userId: string, ctx?: CreditContext): CreditSnapshot {
  const profile = ensureProfile(userId, ctx);
  const alloc = DEFAULT_ALLOCATIONS[profile.allocationKey];

  const llmTotal = alloc.llmDailyUsd;
  const speechTotal = alloc.speechDailyUsd;
  const llmRemaining = Number.isFinite(llmTotal) ? Math.max(llmTotal - profile.usage.llmUsd, 0) : Number.POSITIVE_INFINITY;
  const speechRemaining = Number.isFinite(speechTotal) ? Math.max(speechTotal - profile.usage.speechUsd, 0) : Number.POSITIVE_INFINITY;

  return {
    allocationKey: profile.allocationKey,
    llm: {
      totalUsd: norm(llmTotal),
      usedUsd: profile.usage.llmUsd,
      remainingUsd: norm(llmRemaining),
      isUnlimited: !Number.isFinite(llmTotal),
      approxGpt4oTokensTotal: Number.isFinite(llmTotal) ? usdToGpt4o(llmTotal) : null,
      approxGpt4oTokensRemaining: Number.isFinite(llmRemaining) ? usdToGpt4o(llmRemaining) : null,
      approxGpt4oMiniTokensTotal: Number.isFinite(llmTotal) ? usdToGpt4oMini(llmTotal) : null,
      approxGpt4oMiniTokensRemaining: Number.isFinite(llmRemaining) ? usdToGpt4oMini(llmRemaining) : null,
    },
    speech: {
      totalUsd: norm(speechTotal),
      usedUsd: profile.usage.speechUsd,
      remainingUsd: norm(speechRemaining),
      isUnlimited: !Number.isFinite(speechTotal),
      approxWhisperMinutesTotal: Number.isFinite(speechTotal) ? usdToWhisper(speechTotal) : null,
      approxWhisperMinutesRemaining: Number.isFinite(speechRemaining) ? usdToWhisper(speechRemaining) : null,
      approxTtsCharactersTotal: Number.isFinite(speechTotal) ? usdToTts(speechTotal) : null,
      approxTtsCharactersRemaining: Number.isFinite(speechRemaining) ? usdToTts(speechRemaining) : null,
    },
  };
}

export function recordCost(userId: string, serviceType: string, costUsd: number): void {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return;
  const profile = ensureProfile(userId);
  const isSpeech = serviceType.toLowerCase().startsWith('stt') ||
    serviceType.toLowerCase().startsWith('tts') ||
    serviceType.toLowerCase().includes('speech');
  if (isSpeech) profile.usage.speechUsd += costUsd;
  else profile.usage.llmUsd += costUsd;
  profile.usage.requestCount++;
}
