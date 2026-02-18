/**
 * @file creditGate.service.ts
 * @description Pre-check gate that runs BEFORE any LLM or speech call.
 *              Returns a structured allow/deny result with user-friendly error messages.
 */

import { creditAllocationService, type CreditContext, type CreditSnapshot } from './creditAllocation.service.js';
import { CostService } from './cost.service.js';

export interface CreditGateErrorDetails {
  allocationKey: string;
  limitType: 'daily-credit-llm' | 'daily-credit-speech' | 'session-cost';
  usedUsd?: number;
  totalUsd?: number | null;
  remainingUsd?: number | null;
  resetAt: string;
  upgradeUrl: string;
}

export interface CreditGateError {
  status: number;
  code: string;
  message: string;
  details: CreditGateErrorDetails;
}

export type CreditGateResult =
  | { allowed: true; snapshot: CreditSnapshot }
  | { allowed: false; error: CreditGateError };

const DISABLE_LIMITS = process.env.DISABLE_COST_LIMITS === 'true';
const SESSION_THRESHOLD = parseFloat(process.env.COST_THRESHOLD_USD_PER_SESSION || '2.00');

const endOfDayISO = (): string => {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
};

export const creditGateService = {
  /**
   * Pre-check: can this user make an LLM call?
   * Call this BEFORE callLlm() in chat routes.
   */
  checkLlm(userId: string, context: CreditContext): CreditGateResult {
    if (DISABLE_LIMITS) {
      return { allowed: true, snapshot: creditAllocationService.getSnapshot(userId, context) };
    }

    // 1. Session cost threshold
    if (CostService.isSessionCostThresholdReached(userId, SESSION_THRESHOLD)) {
      const sessionCost = CostService.getSessionCost(userId);
      return {
        allowed: false,
        error: {
          status: 429,
          code: 'SESSION_COST_EXCEEDED',
          message: `Your session spending has reached the $${SESSION_THRESHOLD.toFixed(2)} limit. Please start a new session or upgrade your plan.`,
          details: {
            allocationKey: context.tier || 'public',
            limitType: 'session-cost',
            usedUsd: sessionCost.totalCost,
            totalUsd: SESSION_THRESHOLD,
            resetAt: endOfDayISO(),
            upgradeUrl: '/pricing',
          },
        },
      };
    }

    // 2. Daily credit budget
    creditAllocationService.syncProfile(userId, context);
    const snapshot = creditAllocationService.getSnapshot(userId, context);

    if (!snapshot.llm.isUnlimited && (snapshot.llm.remainingUsd ?? 0) <= 0.0005) {
      return {
        allowed: false,
        error: {
          status: 429,
          code: 'DAILY_CREDIT_EXHAUSTED',
          message: 'Your daily AI credit allowance has been used up. Credits reset at midnight UTC. Upgrade for higher limits.',
          details: {
            allocationKey: snapshot.allocationKey,
            limitType: 'daily-credit-llm',
            usedUsd: snapshot.llm.usedUsd,
            totalUsd: snapshot.llm.totalUsd,
            remainingUsd: 0,
            resetAt: endOfDayISO(),
            upgradeUrl: '/pricing',
          },
        },
      };
    }

    return { allowed: true, snapshot };
  },

  /**
   * Pre-check: can this user make a speech (STT/TTS) call?
   */
  checkSpeech(userId: string, context: CreditContext): CreditGateResult {
    if (DISABLE_LIMITS) {
      return { allowed: true, snapshot: creditAllocationService.getSnapshot(userId, context) };
    }

    creditAllocationService.syncProfile(userId, context);
    const snapshot = creditAllocationService.getSnapshot(userId, context);

    if (!snapshot.speech.isUnlimited && (snapshot.speech.remainingUsd ?? 0) <= 0.0005) {
      return {
        allowed: false,
        error: {
          status: 429,
          code: 'DAILY_SPEECH_CREDIT_EXHAUSTED',
          message: 'Your daily speech credit allowance has been used up. Credits reset at midnight UTC.',
          details: {
            allocationKey: snapshot.allocationKey,
            limitType: 'daily-credit-speech',
            usedUsd: snapshot.speech.usedUsd,
            totalUsd: snapshot.speech.totalUsd,
            remainingUsd: 0,
            resetAt: endOfDayISO(),
            upgradeUrl: '/pricing',
          },
        },
      };
    }

    return { allowed: true, snapshot };
  },
};
