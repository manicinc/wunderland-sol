'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Inline ClientRateLimiter (mirrors packages/shared/src/clientRateLimit.ts)
// ---------------------------------------------------------------------------

interface PersistedState {
  tokens: number;
  lastRefill: number;
  cooldownUntil: number;
}

class ClientRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private cooldownUntil = 0;
  private maxTokens: number;
  private refillIntervalMs: number;
  private cooldownMs: number;
  private storageKey: string;

  constructor(
    maxTokens = 5,
    refillIntervalMs = 60_000,
    cooldownMs = 30_000,
    storageKey = 'nl-recommend-rate-limit'
  ) {
    this.maxTokens = maxTokens;
    this.refillIntervalMs = refillIntervalMs;
    this.cooldownMs = cooldownMs;
    this.storageKey = storageKey;

    const restored = this.restore();
    if (restored) {
      this.tokens = restored.tokens;
      this.lastRefill = restored.lastRefill;
      this.cooldownUntil = restored.cooldownUntil;
    } else {
      this.tokens = maxTokens;
      this.lastRefill = Date.now();
    }
  }

  canRequest(): boolean {
    this.refill();
    if (Date.now() < this.cooldownUntil) return false;
    return this.tokens > 0;
  }

  consume(): boolean {
    this.refill();
    if (Date.now() < this.cooldownUntil) return false;
    if (this.tokens <= 0) {
      this.cooldownUntil = Date.now() + this.cooldownMs;
      this.persist();
      return false;
    }
    this.tokens--;
    this.persist();
    return true;
  }

  get remainingTokens(): number {
    this.refill();
    return this.tokens;
  }

  get cooldownRemainingMs(): number {
    return Math.max(0, this.cooldownUntil - Date.now());
  }

  private refill(): void {
    const elapsed = Date.now() - this.lastRefill;
    const newTokens = Math.floor(elapsed / this.refillIntervalMs);
    if (newTokens > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
      this.lastRefill += newTokens * this.refillIntervalMs;
      this.persist();
    }
  }

  private persist(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.setItem(
        this.storageKey,
        JSON.stringify({ tokens: this.tokens, lastRefill: this.lastRefill, cooldownUntil: this.cooldownUntil })
      );
    } catch { /* ignore */ }
  }

  private restore(): PersistedState | null {
    if (typeof sessionStorage === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(this.storageKey);
      if (!raw) return null;
      const s = JSON.parse(raw) as PersistedState;
      if (typeof s.tokens === 'number' && typeof s.lastRefill === 'number' && typeof s.cooldownUntil === 'number') {
        return s;
      }
      return null;
    } catch { return null; }
  }
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export function useNLRateLimit() {
  const limiterRef = useRef<ClientRateLimiter | null>(null);
  if (!limiterRef.current) {
    limiterRef.current = new ClientRateLimiter();
  }

  const [cooldownMs, setCooldownMs] = useState(0);
  const [remaining, setRemaining] = useState(5);

  useEffect(() => {
    const tick = () => {
      if (!limiterRef.current) return;
      setCooldownMs(limiterRef.current.cooldownRemainingMs);
      setRemaining(limiterRef.current.remainingTokens);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const tryRequest = useCallback(() => {
    if (!limiterRef.current) return false;
    const ok = limiterRef.current.consume();
    setCooldownMs(limiterRef.current.cooldownRemainingMs);
    setRemaining(limiterRef.current.remainingTokens);
    return ok;
  }, []);

  const canRequest = cooldownMs === 0 && remaining > 0;

  return { canRequest, tryRequest, cooldownMs, remaining };
}
