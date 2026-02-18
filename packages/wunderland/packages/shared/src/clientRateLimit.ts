/**
 * @file Client-Side Rate Limiter
 * @description Token bucket rate limiter for client-side NL recommendation requests.
 * Prevents users from spamming expensive LLM calls.
 * Persists state to sessionStorage so page refresh doesn't reset budget.
 */

export interface ClientRateLimitConfig {
  /** Maximum number of requests in the token bucket. */
  maxTokens: number;
  /** Milliseconds between token refills (one token per interval). */
  refillIntervalMs: number;
  /** Hard cooldown in ms after bucket exhaustion. */
  cooldownMs: number;
  /** sessionStorage key for persistence. */
  storageKey?: string;
}

interface PersistedState {
  tokens: number;
  lastRefill: number;
  cooldownUntil: number;
}

const DEFAULT_CONFIG: ClientRateLimitConfig = {
  maxTokens: 5,
  refillIntervalMs: 60_000,
  cooldownMs: 30_000,
  storageKey: 'nl-rate-limit',
};

export class ClientRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private cooldownUntil: number;
  private config: Required<ClientRateLimitConfig>;

  constructor(config: Partial<ClientRateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<ClientRateLimitConfig>;

    const restored = this.restore();
    if (restored) {
      this.tokens = restored.tokens;
      this.lastRefill = restored.lastRefill;
      this.cooldownUntil = restored.cooldownUntil;
    } else {
      this.tokens = this.config.maxTokens;
      this.lastRefill = Date.now();
      this.cooldownUntil = 0;
    }
  }

  /** Check if a request is currently allowed (does not consume a token). */
  canRequest(): boolean {
    this.refill();
    if (Date.now() < this.cooldownUntil) return false;
    return this.tokens > 0;
  }

  /** Attempt to consume a token. Returns true if successful, false if rate limited. */
  consume(): boolean {
    this.refill();
    if (Date.now() < this.cooldownUntil) return false;
    if (this.tokens <= 0) {
      this.cooldownUntil = Date.now() + this.config.cooldownMs;
      this.persist();
      return false;
    }
    this.tokens--;
    this.persist();
    return true;
  }

  /** Number of tokens remaining. */
  get remainingTokens(): number {
    this.refill();
    return this.tokens;
  }

  /** Milliseconds remaining on cooldown (0 if not in cooldown). */
  get cooldownRemainingMs(): number {
    return Math.max(0, this.cooldownUntil - Date.now());
  }

  /** Whether currently in cooldown. */
  get isInCooldown(): boolean {
    return Date.now() < this.cooldownUntil;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = Math.floor(elapsed / this.config.refillIntervalMs);
    if (newTokens > 0) {
      this.tokens = Math.min(this.config.maxTokens, this.tokens + newTokens);
      this.lastRefill += newTokens * this.config.refillIntervalMs;
      this.persist();
    }
  }

  private persist(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      const state: PersistedState = {
        tokens: this.tokens,
        lastRefill: this.lastRefill,
        cooldownUntil: this.cooldownUntil,
      };
      sessionStorage.setItem(this.config.storageKey, JSON.stringify(state));
    } catch {
      // sessionStorage full or unavailable — silently ignore
    }
  }

  private restore(): PersistedState | null {
    if (typeof sessionStorage === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(this.config.storageKey);
      if (!raw) return null;
      const state = JSON.parse(raw) as PersistedState;
      if (
        typeof state.tokens === 'number' &&
        typeof state.lastRefill === 'number' &&
        typeof state.cooldownUntil === 'number'
      ) {
        return state;
      }
      return null;
    } catch {
      return null;
    }
  }
}
