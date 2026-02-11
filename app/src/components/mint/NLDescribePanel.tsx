'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { WizardAction, TraitsState } from './wizard-types';

// ---------------------------------------------------------------------------
// Client-side rate limiter (mirrors packages/shared/src/clientRateLimit.ts)
// ---------------------------------------------------------------------------

class ClientRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private cooldownUntil = 0;

  constructor(
    private maxTokens = 5,
    private refillIntervalMs = 60_000,
    private cooldownMs = 30_000,
    private storageKey = 'nl-mint-rate-limit'
  ) {
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
    return Date.now() >= this.cooldownUntil && this.tokens > 0;
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

  get remainingTokens(): number { this.refill(); return this.tokens; }
  get cooldownRemainingMs(): number { return Math.max(0, this.cooldownUntil - Date.now()); }

  private refill(): void {
    const elapsed = Date.now() - this.lastRefill;
    const t = Math.floor(elapsed / this.refillIntervalMs);
    if (t > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + t);
      this.lastRefill += t * this.refillIntervalMs;
      this.persist();
    }
  }

  private persist(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify({
        tokens: this.tokens, lastRefill: this.lastRefill, cooldownUntil: this.cooldownUntil,
      }));
    } catch { /* ignore */ }
  }

  private restore(): { tokens: number; lastRefill: number; cooldownUntil: number } | null {
    if (typeof sessionStorage === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(this.storageKey);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (typeof s.tokens === 'number') return s;
      return null;
    } catch { return null; }
  }
}

// ---------------------------------------------------------------------------
// Recommendation types (inline, mirrors rabbithole API response)
// ---------------------------------------------------------------------------

interface NLRecommendation {
  id: string;
  category: 'skill' | 'tool' | 'channel';
  itemId: string;
  displayName: string;
  reasoning: string;
  confidence: number;
  accepted: boolean;
}

interface NLResponse {
  recommendations: NLRecommendation[];
  suggestedPreset: string | null;
  personalitySuggestion: { traits: Record<string, number>; reasoning: string } | null;
  securityTierSuggestion: { tier: string; reasoning: string } | null;
  identitySuggestion: { displayName: string | null; bio: string | null; systemPrompt: string | null } | null;
}

// ---------------------------------------------------------------------------
// Trait key mapping: rabbithole uses 'honesty', wunderland-sh uses 'honestyHumility'
// ---------------------------------------------------------------------------

function mapToWunderlandTraits(traits: Record<string, number>): TraitsState {
  return {
    honestyHumility: traits.honesty ?? traits.honestyHumility ?? 0.7,
    emotionality: traits.emotionality ?? 0.5,
    extraversion: traits.extraversion ?? 0.6,
    agreeableness: traits.agreeableness ?? 0.7,
    conscientiousness: traits.conscientiousness ?? 0.6,
    openness: traits.openness ?? 0.7,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface NLDescribePanelProps {
  dispatch: React.Dispatch<WizardAction>;
}

const API_BASE = process.env.NEXT_PUBLIC_RABBITHOLE_API_URL || '';

export default function NLDescribePanel({ dispatch }: NLDescribePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState<NLRecommendation[]>([]);
  const [personalitySuggestion, setPersonalitySuggestion] = useState<NLResponse['personalitySuggestion']>(null);
  const [showResults, setShowResults] = useState(false);

  const limiterRef = useRef<ClientRateLimiter | null>(null);
  if (!limiterRef.current) limiterRef.current = new ClientRateLimiter();

  const [cooldown, setCooldown] = useState(0);
  const [remaining, setRemaining] = useState(5);

  useEffect(() => {
    const tick = () => {
      if (!limiterRef.current) return;
      setCooldown(limiterRef.current.cooldownRemainingMs);
      setRemaining(limiterRef.current.remainingTokens);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const canRequest = cooldown === 0 && remaining > 0;

  const handleSuggest = useCallback(async () => {
    if (!description.trim() || description.trim().length < 10) return;
    if (!limiterRef.current?.consume()) return;

    setLoading(true);
    setError('');
    try {
      const url = API_BASE ? `${API_BASE}/api/voice/recommend-config` : '/api/voice/recommend-config';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Suggestion failed');
      }
      const data: NLResponse = await res.json();
      setRecommendations(data.recommendations?.map((r) => ({ ...r, accepted: true })) ?? []);
      setPersonalitySuggestion(data.personalitySuggestion ?? null);
      setShowResults(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suggestion failed');
    } finally {
      setLoading(false);
    }
  }, [description]);

  const handleApply = useCallback(() => {
    const accepted = recommendations.filter((r) => r.accepted);
    const skills = accepted.filter((r) => r.category === 'skill').map((r) => r.itemId);
    const channels = accepted.filter((r) => r.category === 'channel').map((r) => r.itemId);
    const traits = personalitySuggestion?.traits ? mapToWunderlandTraits(personalitySuggestion.traits) : undefined;

    dispatch({
      type: 'APPLY_NL_RECOMMENDATIONS',
      traits,
      skills: skills.length > 0 ? skills : undefined,
      channels: channels.length > 0 ? channels : undefined,
    });

    setExpanded(false);
  }, [recommendations, personalitySuggestion, dispatch]);

  const toggleRecommendation = (id: string) => {
    setRecommendations((prev) => prev.map((r) => r.id === id ? { ...r, accepted: !r.accepted } : r));
  };

  const CATEGORY_COLORS: Record<string, string> = { skill: 'var(--sol-purple)', tool: 'var(--neon-cyan)', channel: 'var(--neon-green)' };
  const CATEGORY_LABELS: Record<string, string> = { skill: 'Skills', tool: 'Tools', channel: 'Channels' };

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
          Describe Your Agent (AI Suggestions)
        </span>
        <span className={`text-[var(--text-tertiary)] text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 grid gap-3">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your agent in natural language... e.g., 'A research assistant that helps with academic papers, uses web search, and communicates via Telegram'"
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-[rgba(0,0,0,0.3)] border border-[var(--border-glass)] text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] font-mono focus:outline-none focus:border-[var(--neon-cyan)]/40 resize-none"
          />

          {error && (
            <div className="text-[11px] font-mono text-[var(--neon-red)]">{error}</div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleSuggest}
              disabled={!description.trim() || description.trim().length < 10 || loading || !canRequest}
              className="px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase bg-[rgba(153,69,255,0.10)] text-[var(--sol-purple)] border border-[rgba(153,69,255,0.25)] hover:bg-[rgba(153,69,255,0.16)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Analyzing...'
                : cooldown > 0
                  ? `Rate limited (${Math.ceil(cooldown / 1000)}s)`
                  : `Suggest Config (${remaining})`}
            </button>
          </div>

          {/* Results */}
          {showResults && recommendations.length > 0 && (
            <div className="grid gap-2 mt-1">
              {(['skill', 'tool', 'channel'] as const).map((cat) => {
                const items = recommendations.filter((r) => r.category === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-[var(--text-tertiary)] mb-1">
                      {CATEGORY_LABELS[cat]} ({items.filter((i) => i.accepted).length}/{items.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleRecommendation(item.id)}
                          className={`text-[11px] font-mono px-2 py-0.5 rounded-full border transition-all ${
                            item.accepted
                              ? `bg-[rgba(153,69,255,0.08)] border-[rgba(153,69,255,0.2)]`
                              : 'bg-transparent border-[var(--border-glass)] opacity-40'
                          }`}
                          style={{ color: item.accepted ? CATEGORY_COLORS[cat] : 'var(--text-tertiary)' }}
                          title={item.reasoning}
                        >
                          {item.accepted ? '✓ ' : ''}{item.displayName}
                          <span className="ml-1 opacity-50">{Math.round(item.confidence * 100)}%</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Personality suggestion */}
              {personalitySuggestion && (
                <div className="text-[10px] font-mono text-[var(--text-tertiary)] mt-1">
                  <span className="uppercase tracking-[0.15em]">Personality: </span>
                  {Object.entries(personalitySuggestion.traits).map(([k, v]) => (
                    <span key={k} className="mr-2">
                      {k.charAt(0).toUpperCase()}:{Math.round((v as number) * 100)}
                    </span>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleApply}
                className="mt-1 px-4 py-2 rounded-lg text-xs font-mono uppercase bg-[rgba(16,255,176,0.10)] text-[var(--neon-green)] border border-[rgba(16,255,176,0.25)] hover:bg-[rgba(16,255,176,0.16)] transition-all"
              >
                Apply Selected Suggestions
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
