'use client';

import { useMemo } from 'react';
import { RecommendationCard, type RecommendationItem } from './RecommendationCard';

export interface PersonalitySuggestion {
  traits: {
    honesty: number;
    emotionality: number;
    extraversion: number;
    agreeableness: number;
    conscientiousness: number;
    openness: number;
  };
  reasoning: string;
}

export interface SecurityTierSuggestion {
  tier: string;
  reasoning: string;
}

export interface IdentitySuggestion {
  displayName: string | null;
  bio: string | null;
  systemPrompt: string | null;
}

interface NLRecommendationPanelProps {
  recommendations: RecommendationItem[];
  suggestedPreset: string | null;
  suggestedPresetReasoning: string | null;
  personalitySuggestion: PersonalitySuggestion | null;
  securityTierSuggestion: SecurityTierSuggestion | null;
  identitySuggestion: IdentitySuggestion | null;
  onToggleRecommendation: (id: string) => void;
  onApplyAll: () => void;
  onClearAll: () => void;
  onApplyPersonality: () => void;
  onApplySecurity: () => void;
  onApplyIdentity: () => void;
  onApplyPreset: (presetId: string) => void;
  personalityAccepted: boolean;
  securityAccepted: boolean;
  identityAccepted: boolean;
}

const CATEGORY_ORDER = ['tool', 'skill', 'channel'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  tool: 'Tools',
  skill: 'Skills',
  channel: 'Channels',
};

const HEXACO_LABELS: Record<string, string> = {
  honesty: 'H',
  emotionality: 'E',
  extraversion: 'X',
  agreeableness: 'A',
  conscientiousness: 'C',
  openness: 'O',
};

const HEXACO_COLORS: Record<string, string> = {
  honesty: '#00f5ff',
  emotionality: '#ff6b6b',
  extraversion: '#ffd700',
  agreeableness: '#10ffb0',
  conscientiousness: '#8b5cf6',
  openness: '#ff00f5',
};

const TIER_COLORS: Record<string, string> = {
  dangerous: '#ff3333',
  permissive: '#ff8c00',
  balanced: '#ffd700',
  strict: '#00f5ff',
  paranoid: '#ff00f5',
};

const sectionHeaderStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.75rem',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: '16px 0 8px 0',
};

const pillButtonStyle = (active: boolean, color: string): React.CSSProperties => ({
  padding: '4px 12px',
  borderRadius: 6,
  border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
  background: active ? `${color}15` : 'transparent',
  color: active ? color : 'var(--color-text-dim)',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.75rem',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});

export function NLRecommendationPanel({
  recommendations,
  suggestedPreset,
  suggestedPresetReasoning,
  personalitySuggestion,
  securityTierSuggestion,
  identitySuggestion,
  onToggleRecommendation,
  onApplyAll,
  onClearAll,
  onApplyPersonality,
  onApplySecurity,
  onApplyIdentity,
  onApplyPreset,
  personalityAccepted,
  securityAccepted,
  identityAccepted,
}: NLRecommendationPanelProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, RecommendationItem[]> = {};
    for (const cat of CATEGORY_ORDER) {
      groups[cat] = recommendations.filter((r) => r.category === cat);
    }
    return groups;
  }, [recommendations]);

  const acceptedCount = recommendations.filter((r) => r.accepted).length;

  return (
    <div
      className="post-card"
      style={{
        padding: '16px 20px',
        borderColor: 'rgba(139,92,246,0.3)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.8125rem',
            color: 'var(--color-text)',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          AI Recommendations
        </h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onApplyAll} style={pillButtonStyle(true, '#10ffb0')}>
            Accept All
          </button>
          <button onClick={onClearAll} style={pillButtonStyle(false, '#ff6b6b')}>
            Clear All
          </button>
        </div>
      </div>

      {/* Suggested preset */}
      {suggestedPreset && (
        <div style={{ marginBottom: 12 }}>
          <div style={sectionHeaderStyle}>Suggested Preset</div>
          <button
            onClick={() => onApplyPreset(suggestedPreset)}
            style={{
              ...pillButtonStyle(true, '#ffd700'),
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              textAlign: 'left',
            }}
          >
            <span style={{ fontWeight: 600 }}>{suggestedPreset}</span>
            {suggestedPresetReasoning && (
              <span style={{ opacity: 0.6, fontSize: '0.6875rem', flex: 1 }}>
                — {suggestedPresetReasoning}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Item recommendations by category */}
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (!items || items.length === 0) return null;
        return (
          <div key={cat}>
            <div style={sectionHeaderStyle}>
              {CATEGORY_LABELS[cat]} ({items.filter((i) => i.accepted).length}/{items.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((item) => (
                <RecommendationCard
                  key={item.id}
                  item={item}
                  onToggle={onToggleRecommendation}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Personality suggestion */}
      {personalitySuggestion && (
        <div>
          <div style={sectionHeaderStyle}>Personality Profile</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${personalityAccepted ? '#8b5cf6' : 'rgba(255,255,255,0.08)'}`,
              background: personalityAccepted ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.02)',
              cursor: 'pointer',
              opacity: personalityAccepted ? 1 : 0.5,
            }}
            onClick={onApplyPersonality}
          >
            {/* Mini trait indicators */}
            <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' }}>
              {Object.entries(personalitySuggestion.traits).map(([key, val]) => (
                <span
                  key={key}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.6875rem',
                    color: HEXACO_COLORS[key] ?? '#8888a0',
                  }}
                >
                  {HEXACO_LABELS[key] ?? key}:{Math.round(val * 100)}
                </span>
              ))}
            </div>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: '2px solid #8b5cf6',
                background: personalityAccepted ? '#8b5cf6' : 'transparent',
                flexShrink: 0,
              }}
            />
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6875rem',
              color: 'var(--color-text-dim)',
              marginTop: 4,
              paddingLeft: 4,
            }}
          >
            {personalitySuggestion.reasoning}
          </div>
        </div>
      )}

      {/* Security tier suggestion */}
      {securityTierSuggestion && (
        <div>
          <div style={sectionHeaderStyle}>Security Tier</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${securityAccepted ? (TIER_COLORS[securityTierSuggestion.tier] ?? '#ffd700') : 'rgba(255,255,255,0.08)'}`,
              background: securityAccepted ? `${TIER_COLORS[securityTierSuggestion.tier] ?? '#ffd700'}10` : 'rgba(255,255,255,0.02)',
              cursor: 'pointer',
              opacity: securityAccepted ? 1 : 0.5,
            }}
            onClick={onApplySecurity}
          >
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.8125rem',
                color: TIER_COLORS[securityTierSuggestion.tier] ?? '#ffd700',
                flex: 1,
              }}
            >
              {securityTierSuggestion.tier.toUpperCase()}
            </span>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: `2px solid ${TIER_COLORS[securityTierSuggestion.tier] ?? '#ffd700'}`,
                background: securityAccepted ? (TIER_COLORS[securityTierSuggestion.tier] ?? '#ffd700') : 'transparent',
                flexShrink: 0,
              }}
            />
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6875rem',
              color: 'var(--color-text-dim)',
              marginTop: 4,
              paddingLeft: 4,
            }}
          >
            {securityTierSuggestion.reasoning}
          </div>
        </div>
      )}

      {/* Identity suggestion */}
      {identitySuggestion && (identitySuggestion.displayName || identitySuggestion.bio) && (
        <div>
          <div style={sectionHeaderStyle}>Identity Suggestion</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${identityAccepted ? '#00f5ff' : 'rgba(255,255,255,0.08)'}`,
              background: identityAccepted ? 'rgba(0,245,255,0.08)' : 'rgba(255,255,255,0.02)',
              cursor: 'pointer',
              opacity: identityAccepted ? 1 : 0.5,
            }}
            onClick={onApplyIdentity}
          >
            <div style={{ flex: 1 }}>
              {identitySuggestion.displayName && (
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem', color: 'var(--color-text)' }}>
                  {identitySuggestion.displayName}
                </div>
              )}
              {identitySuggestion.bio && (
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.6875rem',
                    color: 'var(--color-text-dim)',
                    marginTop: 2,
                  }}
                >
                  {identitySuggestion.bio.slice(0, 120)}
                  {identitySuggestion.bio.length > 120 ? '...' : ''}
                </div>
              )}
            </div>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: '2px solid #00f5ff',
                background: identityAccepted ? '#00f5ff' : 'transparent',
                flexShrink: 0,
              }}
            />
          </div>
        </div>
      )}

      {/* Summary footer */}
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.6875rem',
          color: 'var(--color-text-dim)',
          marginTop: 12,
          textAlign: 'center',
          opacity: 0.6,
        }}
      >
        {acceptedCount} of {recommendations.length} items selected
      </div>
    </div>
  );
}
