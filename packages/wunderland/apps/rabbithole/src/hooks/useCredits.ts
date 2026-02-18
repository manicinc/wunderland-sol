'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CreditSnapshot {
  allocationKey: string;
  planId?: string | null;
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
  resetAt: string;
  timestamp: string;
}

// Default tier budgets (mirrors credit-allocation.ts server-side values).
// Used as a client-side fallback so we never show 0/0 on API error.
const TIER_DEFAULTS: Record<string, { llm: number; speech: number }> = {
  public:               { llm: 0.05,  speech: 0.03 },
  metered:              { llm: 1.75,  speech: 0.90 },
  'wunderland-trial':   { llm: 0.10,  speech: 0.05 },
  'wunderland-starter': { llm: 0.25,  speech: 0.10 },
  'wunderland-pro':     { llm: 0.75,  speech: 0.30 },
};

function buildFallbackSnapshot(isAuthenticated: boolean): CreditSnapshot {
  const tier = isAuthenticated ? 'metered' : 'public';
  const defaults = TIER_DEFAULTS[tier]!;
  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);
  const makeBucket = (totalUsd: number) => ({
    totalUsd, usedUsd: 0, remainingUsd: totalUsd, isUnlimited: false,
    approxGpt4oTokensTotal: 0, approxGpt4oTokensRemaining: 0,
    approxGpt4oMiniTokensTotal: 0, approxGpt4oMiniTokensRemaining: 0,
    approxWhisperMinutesTotal: 0, approxWhisperMinutesRemaining: 0,
    approxTtsCharactersTotal: 0, approxTtsCharactersRemaining: 0,
  });
  return {
    allocationKey: tier,
    planId: null,
    llm: makeBucket(defaults.llm),
    speech: makeBucket(defaults.speech),
    resetAt: endOfDay.toISOString(),
    timestamp: new Date().toISOString(),
  };
}

// Self-contained: calls rabbithole's own /api/credits route (no external backend).
const CREDITS_URL = '/api/credits';

export function useCredits(pollIntervalMs: number = 60_000) {
  const [credits, setCredits] = useState<CreditSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('vcaAuthToken') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(CREDITS_URL, { headers });
      if (res.ok) {
        const body = await res.json();
        // Validate that the response has the expected shape
        if (body.llm && typeof body.llm.totalUsd === 'number') {
          setCredits({
            allocationKey: body.allocationKey ?? 'metered',
            planId: body.planId ?? null,
            llm: body.llm,
            speech: body.speech ?? body.llm,
            resetAt: body.resetAt ?? new Date(Date.now() + 86400_000).toISOString(),
            timestamp: body.timestamp ?? new Date().toISOString(),
          });
          setError(null);
        } else {
          // API returned 200 but unexpected shape — use client-side defaults
          setCredits(buildFallbackSnapshot(!!token));
          setError('Unexpected credits response shape');
        }
      } else {
        // API error — use client-side defaults so we never show 0/0
        setCredits(buildFallbackSnapshot(!!token));
        setError(`Credits API returned ${res.status}`);
      }
    } catch {
      // Network error — use client-side defaults
      const token = typeof window !== 'undefined' ? localStorage.getItem('vcaAuthToken') : null;
      setCredits(buildFallbackSnapshot(!!token));
      setError('Failed to load credits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (pollIntervalMs > 0) {
      const interval = setInterval(refresh, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [refresh, pollIntervalMs]);

  return { credits, loading, error, refresh };
}
