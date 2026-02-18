'use client';

import { useCredits } from '@/hooks/useCredits';
import { UsageMeter } from '@/components/ornate';

const tierLabels: Record<string, string> = {
  public: 'Free',
  metered: 'Metered',
  unlimited: 'Enterprise',
  global: 'Global',
  'wunderland-trial': 'Trial',
  'wunderland-starter': 'Starter',
  'wunderland-pro': 'Pro',
};

const isWunderlandPlan = (key: string) => key.startsWith('wunderland-');

export function UsageDashboard() {
  const { credits, loading, error } = useCredits(30_000);

  if (loading && !credits) return null;
  if (!credits) return null;

  const llmUsedCents = Math.round(credits.llm.usedUsd * 100);
  const llmTotalCents = credits.llm.totalUsd != null ? Math.round(credits.llm.totalUsd * 100) : 0;
  const speechUsedCents = Math.round(credits.speech.usedUsd * 100);
  const speechTotalCents =
    credits.speech.totalUsd != null ? Math.round(credits.speech.totalUsd * 100) : 0;

  const tierLabel = tierLabels[credits.allocationKey] || credits.allocationKey;
  const resetTime = new Date(credits.resetAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const wunderland = isWunderlandPlan(credits.allocationKey);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'start',
        gap: '8px 16px',
        padding: '16px 20px',
        borderRadius: 12,
        border: '1px solid rgba(201,162,39,0.12)',
        background: 'var(--card-bg, rgba(26,26,46,0.4))',
        marginBottom: 20,
      }}
    >
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 600,
          fontSize: '0.8125rem',
          color: 'var(--color-text, #e8e0d0)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Daily Usage
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        <span
          className="badge badge--neutral"
          style={{ fontSize: '0.625rem' }}
        >
          {tierLabel}
        </span>
        {wunderland && (
          <span
            style={{
              fontSize: '0.5625rem',
              padding: '2px 8px',
              borderRadius: 6,
              border: '1px solid rgba(0,245,255,0.2)',
              background: 'rgba(0,245,255,0.06)',
              color: '#00f5ff',
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            BYO Keys
          </span>
        )}
      </div>

      <div
        style={{
          gridColumn: '1 / -1',
          display: 'flex',
          gap: 20,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {error && !credits.llm.totalUsd && !credits.llm.isUnlimited ? (
          <div
            style={{
              flex: 1,
              minWidth: 120,
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid rgba(255,107,107,0.15)',
              background: 'rgba(255,107,107,0.04)',
              textAlign: 'center',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6875rem',
              color: 'var(--color-text-dim, #8a8aa0)',
              letterSpacing: '0.06em',
            }}
          >
            Credits unavailable
          </div>
        ) : credits.llm.isUnlimited ? (
          <div
            style={{
              flex: 1,
              minWidth: 120,
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid rgba(139,92,246,0.15)',
              background: 'rgba(139,92,246,0.04)',
              textAlign: 'center',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6875rem',
              color: '#a78bfa',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Enterprise LLM
          </div>
        ) : (
          <UsageMeter
            value={llmUsedCents}
            max={llmTotalCents}
            label={wunderland ? 'Platform LLM' : 'LLM Credits'}
            unit={'\u00A2'}
            size={100}
          />
        )}

        {error && !credits.speech.totalUsd && !credits.speech.isUnlimited ? (
          <div
            style={{
              flex: 1,
              minWidth: 120,
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid rgba(255,107,107,0.15)',
              background: 'rgba(255,107,107,0.04)',
              textAlign: 'center',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6875rem',
              color: 'var(--color-text-dim, #8a8aa0)',
              letterSpacing: '0.06em',
            }}
          >
            Credits unavailable
          </div>
        ) : credits.speech.isUnlimited ? (
          <div
            style={{
              flex: 1,
              minWidth: 120,
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid rgba(139,92,246,0.15)',
              background: 'rgba(139,92,246,0.04)',
              textAlign: 'center',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6875rem',
              color: '#a78bfa',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Enterprise Speech
          </div>
        ) : (
          <UsageMeter
            value={speechUsedCents}
            max={speechTotalCents}
            label="Speech"
            unit={'\u00A2'}
            size={100}
          />
        )}

        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.625rem',
            opacity: 0.45,
            whiteSpace: 'nowrap',
          }}
        >
          Resets {resetTime}
        </div>
      </div>

      {wunderland && (
        <div
          style={{
            gridColumn: '1 / -1',
            fontSize: '0.625rem',
            fontFamily: "'IBM Plex Mono', monospace",
            color: 'var(--color-text-dim, #8a8aa0)',
            lineHeight: 1.5,
            paddingTop: 4,
          }}
        >
          Platform credits cover AI Builder &amp; voice transcription. Your agents use your own API keys.
        </div>
      )}
    </div>
  );
}
