'use client';

const HEXACO_LABELS: Record<string, string> = {
  honesty: 'Honesty-Humility',
  emotionality: 'Emotionality',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  conscientiousness: 'Conscientiousness',
  openness: 'Openness',
};

const HEXACO_COLORS: Record<string, string> = {
  honesty: '#00f5ff',
  emotionality: '#ff6b6b',
  extraversion: '#ffd700',
  agreeableness: '#10ffb0',
  conscientiousness: '#8b5cf6',
  openness: '#ff00f5',
};

interface PersonalityComparisonProps {
  original: Record<string, number>;
  pending: Record<string, number>;
}

export function PersonalityComparison({ original, pending }: PersonalityComparisonProps) {
  const traits = Object.keys(HEXACO_LABELS).filter(
    (k) => k in original || k in pending
  );

  if (traits.length === 0) return null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto',
        gap: '6px 12px',
        alignItems: 'center',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '0.75rem',
      }}
    >
      {/* Header row */}
      <div style={{ color: 'var(--color-text-dim)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Trait
      </div>
      <div style={{ color: 'var(--color-text-dim)', fontSize: '0.6875rem', textAlign: 'right' }}>
        Current
      </div>
      <div style={{ color: 'var(--color-text-dim)', fontSize: '0.6875rem', textAlign: 'right' }}>
        New
      </div>
      <div style={{ color: 'var(--color-text-dim)', fontSize: '0.6875rem', textAlign: 'right' }}>
        Delta
      </div>

      {traits.map((key) => {
        const oldVal = original[key] ?? 0;
        const newVal = pending[key] ?? oldVal;
        const delta = newVal - oldVal;
        const deltaPct = Math.round(delta * 100);
        const color = HEXACO_COLORS[key] ?? '#8888a0';

        return (
          <div key={key} style={{ display: 'contents' }}>
            <div style={{ color }}>{HEXACO_LABELS[key] ?? key}</div>
            <div style={{ textAlign: 'right', color: 'var(--color-text-dim)', opacity: 0.6 }}>
              {Math.round(oldVal * 100)}
            </div>
            <div style={{ textAlign: 'right', color: 'var(--color-text)' }}>
              {Math.round(newVal * 100)}
            </div>
            <div
              style={{
                textAlign: 'right',
                color: delta > 0 ? '#10ffb0' : delta < 0 ? '#ff6b6b' : 'var(--color-text-dim)',
                fontWeight: Math.abs(delta) >= 0.1 ? 600 : 400,
              }}
            >
              {delta > 0 ? '+' : ''}{deltaPct}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
