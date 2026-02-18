'use client';

// Inline TRAIT_DESCRIPTIONS (mirrors packages/shared/src/personalityDescriptions.ts)
const TRAIT_DESCRIPTIONS: Record<string, { low: string; mid: string; high: string }> = {
  honesty: {
    low: 'May prioritize diplomacy over directness',
    mid: 'Balanced between honesty and tact',
    high: 'Will be forthright and transparent, even when uncomfortable',
  },
  emotionality: {
    low: 'Calm, stoic responses with minimal emotional expression',
    mid: 'Balanced emotional intelligence',
    high: 'Highly empathetic and emotionally expressive',
  },
  extraversion: {
    low: 'Concise, task-focused; minimal small talk',
    mid: 'Moderately conversational',
    high: 'Proactively engaging, conversational, and social',
  },
  agreeableness: {
    low: 'Willing to challenge ideas and push back',
    mid: 'Balanced assertiveness and cooperation',
    high: 'Accommodating and conflict-averse',
  },
  conscientiousness: {
    low: 'Flexible but potentially less structured',
    mid: 'Organized without being rigid',
    high: 'Thorough, detail-oriented, highly structured',
  },
  openness: {
    low: 'Conservative, proven methods preferred',
    mid: 'Balanced creativity and practicality',
    high: 'Creative, exploratory, unconventional',
  },
};

const HEXACO_LABELS: Record<string, string> = {
  honesty: 'Honesty-Humility',
  emotionality: 'Emotionality',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  conscientiousness: 'Conscientiousness',
  openness: 'Openness',
};

function getTier(val: number): 'low' | 'mid' | 'high' {
  if (val <= 0.33) return 'low';
  if (val <= 0.66) return 'mid';
  return 'high';
}

interface BehavioralImpactWarningProps {
  original: Record<string, number>;
  pending: Record<string, number>;
  threshold?: number;
}

export function BehavioralImpactWarning({ original, pending, threshold = 0.15 }: BehavioralImpactWarningProps) {
  const impacts: string[] = [];

  for (const key of Object.keys(TRAIT_DESCRIPTIONS)) {
    const oldVal = original[key] ?? 0;
    const newVal = pending[key] ?? oldVal;
    const delta = newVal - oldVal;

    if (Math.abs(delta) < threshold) continue;

    const label = HEXACO_LABELS[key] ?? key;
    const direction = delta > 0 ? 'Increasing' : 'Decreasing';
    const pct = Math.abs(Math.round(delta * 100));
    const desc = TRAIT_DESCRIPTIONS[key];
    const newTier = getTier(newVal);
    const impact = desc?.[newTier] ?? '';

    impacts.push(`${direction} ${label} (${delta > 0 ? '+' : '-'}${pct}%): ${impact}`);
  }

  if (impacts.length === 0) return null;

  return (
    <div
      className="post-card"
      style={{
        padding: '12px 16px',
        borderColor: 'rgba(255,215,0,0.3)',
        background: 'rgba(255,215,0,0.04)',
      }}
    >
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#ffd700',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        Behavioral Impact
      </div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.75rem',
          color: 'var(--color-text-dim)',
          marginBottom: 8,
        }}
      >
        Personality changes affect how your agent communicates, makes decisions, and interacts.
        Changes take effect on the next message.
      </div>
      <ul style={{ margin: 0, paddingLeft: 16, listStyle: 'disc' }}>
        {impacts.map((impact, i) => (
          <li
            key={i}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6875rem',
              color: 'var(--color-text)',
              lineHeight: 1.5,
              marginBottom: 4,
            }}
          >
            {impact}
          </li>
        ))}
      </ul>
    </div>
  );
}
