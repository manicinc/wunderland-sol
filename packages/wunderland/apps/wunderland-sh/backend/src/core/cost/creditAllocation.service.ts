// File: backend/src/core/cost/creditAllocation.service.ts
/**
 * @file creditAllocation.service.ts
 * @description Tracks daily credit allocations for LLM and speech services (STT/TTS).
 *              Provides helpers to synchronise user context, record spend, and expose
 *              remaining allowances for UI and routing logic.
 */
// cspell:ignore synchronise postbuild KTOKENS normalise

import { GPT4O_COST_PER_KTOKENS, GPT4O_MINI_COST_PER_KTOKENS } from '@framers/shared/planCatalog';
import { usagePersistenceService } from './usagePersistence.service.js';

export type CreditServiceCategory = 'llm' | 'speech';
export type CreditAllocationKey = 'public' | 'metered' | 'unlimited' | 'global';

export interface CreditContext {
  /** Indicates whether the requester is authenticated. */
  isAuthenticated: boolean;
  /** Tier reported by auth middleware (if available). */
  tier?: 'unlimited' | 'metered';
  /** Auth mode reported by auth middleware. */
  mode?: 'global' | 'standard' | 'registration';
  /**
   * Optional override for allocation grouping.
   * Allows explicit mapping when upstream logic knows the exact bucket.
   */
  allocationKeyOverride?: CreditAllocationKey;
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

interface CreditAllocationConfig {
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

const profiles: Map<string, CreditProfile> = new Map();

const DEFAULT_WHISPER_COST_PER_MINUTE = parseFloat(process.env.WHISPER_API_COST_PER_MINUTE || '0.006');
const DEFAULT_OPENAI_TTS_COST_PER_1M_CHARS = parseFloat(process.env.OPENAI_TTS_COST_PER_1M_CHARS_TTS1 || '15.0');
const OPENAI_TTS_COST_PER_1K_CHARS = (DEFAULT_OPENAI_TTS_COST_PER_1M_CHARS / 1_000_000) * 1000;

const DEFAULT_ALLOCATIONS: Record<CreditAllocationKey, CreditAllocationConfig> = {
  public: {
    llmDailyUsd: parseFloat(process.env.CREDITS_PUBLIC_LLM_DAILY_USD || '0.05'),
    speechDailyUsd: parseFloat(process.env.CREDITS_PUBLIC_SPEECH_DAILY_USD || '0.03'),
  },
  metered: {
    llmDailyUsd: parseFloat(process.env.CREDITS_METERED_LLM_DAILY_USD || '1.75'),
    speechDailyUsd: parseFloat(process.env.CREDITS_METERED_SPEECH_DAILY_USD || '0.9'),
  },
  unlimited: {
    llmDailyUsd: Number.POSITIVE_INFINITY,
    speechDailyUsd: Number.POSITIVE_INFINITY,
  },
  global: {
    llmDailyUsd: parseFloat(process.env.CREDITS_GLOBAL_LLM_DAILY_USD || '0.45'),
    speechDailyUsd: parseFloat(process.env.CREDITS_GLOBAL_SPEECH_DAILY_USD || '0.3'),
  },
};

const todayKey = (): string => new Date().toISOString().slice(0, 10);

const resolveAllocationKey = (context: CreditContext | undefined): CreditAllocationKey => {
  if (context?.allocationKeyOverride) {
    return context.allocationKeyOverride;
  }
  if (!context?.isAuthenticated) {
    return 'public';
  }
  if (context.mode === 'global') {
    return 'global';
  }
  if (context.tier === 'unlimited') {
    return 'unlimited';
  }
  return 'metered';
};

/** Set of userIds for which we've already attempted DB recovery this session. */
const recoveredUsers: Set<string> = new Set();

const ensureProfile = (userId: string, context?: CreditContext): CreditProfile => {
  const key = resolveAllocationKey(context);
  const dateKey = todayKey();

  let profile = profiles.get(userId);
  if (!profile) {
    profile = {
      allocationKey: key,
      lastResetDateKey: dateKey,
      usage: { llmUsd: 0, speechUsd: 0, requestCount: 0 },
    };
    profiles.set(userId, profile);

    // Attempt to recover persisted usage from DB (fire-and-forget, non-blocking)
    if (!recoveredUsers.has(userId)) {
      recoveredUsers.add(userId);
      usagePersistenceService.recoverUsage(userId, dateKey).then((row) => {
        if (row && profile) {
          // Only seed if the profile hasn't already accumulated usage
          if (profile.usage.llmUsd === 0 && profile.usage.speechUsd === 0) {
            profile.usage.llmUsd = row.llm_used_usd;
            profile.usage.speechUsd = row.speech_used_usd;
            profile.usage.requestCount = row.request_count;
          }
        }
      }).catch(() => { /* graceful degradation */ });
    }
    return profile;
  }

  if (profile.allocationKey !== key) {
    profile.allocationKey = key;
    profile.usage = { llmUsd: 0, speechUsd: 0, requestCount: 0 };
    profile.lastResetDateKey = dateKey;
    return profile;
  }

  if (profile.lastResetDateKey !== dateKey) {
    profile.usage.llmUsd = 0;
    profile.usage.speechUsd = 0;
    profile.usage.requestCount = 0;
    profile.lastResetDateKey = dateKey;
  }

  return profile;
};

const getAllocation = (key: CreditAllocationKey): CreditAllocationConfig => DEFAULT_ALLOCATIONS[key];

const usdToGpt4oTokens = (usd: number): number => Math.floor((usd / GPT4O_COST_PER_KTOKENS) * 1000);
const usdToGpt4oMiniTokens = (usd: number): number => Math.floor((usd / GPT4O_MINI_COST_PER_KTOKENS) * 1000);
const usdToWhisperMinutes = (usd: number): number => usd / DEFAULT_WHISPER_COST_PER_MINUTE;
const usdToTtsCharacters = (usd: number): number => (usd / OPENAI_TTS_COST_PER_1K_CHARS) * 1000;

const normaliseValue = (value: number): number | null => (Number.isFinite(value) ? value : null);

export const creditAllocationService = {
  /**
   * Ensures a profile exists for the user and refreshes usage counters if the day changed.
   */
  syncProfile(userId: string, context?: CreditContext): CreditProfile {
    return ensureProfile(userId, context);
  },

  /**
   * Records cost spend against the appropriate credit bucket.
   */
  recordCost(userId: string, serviceType: string, costUsd: number): void {
    if (!Number.isFinite(costUsd) || costUsd <= 0) return;
    const profile = ensureProfile(userId);
    if (!profile) return;

    const lowered = serviceType.toLowerCase();
    const category: CreditServiceCategory =
      lowered.startsWith('stt') ||
      lowered.startsWith('tts') ||
      lowered.includes('speech')
        ? 'speech'
        : 'llm';

    if (category === 'speech') {
      profile.usage.speechUsd += costUsd;
    } else {
      profile.usage.llmUsd += costUsd;
    }
    profile.usage.requestCount++;
  },

  /**
   * Returns a snapshot of remaining credits for UI or decision making.
   */
  getSnapshot(userId: string, context?: CreditContext): CreditSnapshot {
    const profile = ensureProfile(userId, context);
    const allocation = getAllocation(profile.allocationKey);

    const llmTotalUsd = allocation.llmDailyUsd;
    const speechTotalUsd = allocation.speechDailyUsd;

    const llmRemainingUsd = Number.isFinite(llmTotalUsd)
      ? Math.max(llmTotalUsd - profile.usage.llmUsd, 0)
      : Number.POSITIVE_INFINITY;
    const speechRemainingUsd = Number.isFinite(speechTotalUsd)
      ? Math.max(speechTotalUsd - profile.usage.speechUsd, 0)
      : Number.POSITIVE_INFINITY;

    const llmSnapshot = {
      totalUsd: normaliseValue(llmTotalUsd),
      usedUsd: profile.usage.llmUsd,
      remainingUsd: normaliseValue(llmRemainingUsd),
      isUnlimited: !Number.isFinite(llmTotalUsd),
      approxGpt4oTokensTotal: Number.isFinite(llmTotalUsd) ? usdToGpt4oTokens(llmTotalUsd) : null,
      approxGpt4oTokensRemaining: Number.isFinite(llmRemainingUsd) ? usdToGpt4oTokens(llmRemainingUsd) : null,
      approxGpt4oMiniTokensTotal: Number.isFinite(llmTotalUsd) ? usdToGpt4oMiniTokens(llmTotalUsd) : null,
      approxGpt4oMiniTokensRemaining: Number.isFinite(llmRemainingUsd) ? usdToGpt4oMiniTokens(llmRemainingUsd) : null,
    };

    const speechSnapshot = {
      totalUsd: normaliseValue(speechTotalUsd),
      usedUsd: profile.usage.speechUsd,
      remainingUsd: normaliseValue(speechRemainingUsd),
      isUnlimited: !Number.isFinite(speechTotalUsd),
      approxWhisperMinutesTotal: Number.isFinite(speechTotalUsd) ? usdToWhisperMinutes(speechTotalUsd) : null,
      approxWhisperMinutesRemaining: Number.isFinite(speechRemainingUsd) ? usdToWhisperMinutes(speechRemainingUsd) : null,
      approxTtsCharactersTotal: Number.isFinite(speechTotalUsd) ? usdToTtsCharacters(speechTotalUsd) : null,
      approxTtsCharactersRemaining: Number.isFinite(speechRemainingUsd) ? usdToTtsCharacters(speechRemainingUsd) : null,
    };

    return {
      allocationKey: profile.allocationKey,
      llm: llmSnapshot,
      speech: speechSnapshot,
    };
  },

  /**
   * Returns true when sufficient speech credits remain for OpenAI-backed processing.
   */
  hasSpeechCredits(userId: string, context?: CreditContext): boolean {
    const snapshot = this.getSnapshot(userId, context);
    if (snapshot.speech.isUnlimited) return true;
    const remainingUsd = snapshot.speech.remainingUsd ?? 0;
    return remainingUsd > 0.0005; // Treat very small values as depleted.
  },

  /**
   * Returns true when sufficient LLM credits remain.
   */
  hasLlmCredits(userId: string, context?: CreditContext): boolean {
    const snapshot = this.getSnapshot(userId, context);
    if (snapshot.llm.isUnlimited) return true;
    const remainingUsd = snapshot.llm.remainingUsd ?? 0;
    return remainingUsd > 0.0005;
  },

  /**
   * Returns the raw profile for persistence purposes.
   */
  getProfile(userId: string, context?: CreditContext): CreditProfile {
    return ensureProfile(userId, context);
  },
};

export type { CreditSnapshot as CreditSummary };
