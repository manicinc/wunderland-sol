'use client';

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BehaviorEvent {
  id: number;
  event_type: 'mood_change' | 'trust_update' | 'safety_block' | 'style_adapt';
  event_data: string; // JSON blob
  created_at: string;
}

interface BehaviorData {
  events: BehaviorEvent[];
  moodHistory: Array<{ pleasure: number; arousal: number; dominance: number; timestamp: string }>;
  trustHistory: Array<{ score: number; timestamp: string }>;
  safetyEvents: Array<{ type: string; reason: string; timestamp: string }>;
  styleAdaptations: Array<{ dimension: string; oldValue: number; newValue: number; timestamp: string }>;
}

interface BehaviorTimelineProps {
  seedId: string;
  range: '24h' | '7d' | '30d';
}

// ---------------------------------------------------------------------------
// PAD mini sparkline (SVG)
// ---------------------------------------------------------------------------

function padSparkline(
  history: Array<{ pleasure: number; arousal: number; dominance: number }>,
  width: number,
  height: number
): string {
  if (history.length < 2) return '';

  const dims = [
    { key: 'pleasure' as const, color: '#10ffb0' },
    { key: 'arousal' as const, color: '#ff6b6b' },
    { key: 'dominance' as const, color: '#ffd700' },
  ];

  const paths = dims.map(({ key, color }) => {
    const points = history.map((h, i) => {
      const x = (i / (history.length - 1)) * width;
      const y = height - ((h[key] + 1) / 2) * height; // PAD is -1..1 → 0..height
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.7"/>`;
  });

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${paths.join('')}</svg>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BehaviorTimeline({ seedId, range }: BehaviorTimelineProps) {
  const [data, setData] = useState<BehaviorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('vcaAuthToken') : null;
    fetch(`/api/metrics/${encodeURIComponent(seedId)}?type=behavior&range=${range}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [seedId, range]);

  if (loading) {
    return <LoadingText>Loading behavior data...</LoadingText>;
  }

  if (!data) {
    return <LoadingText>No behavior data available.</LoadingText>;
  }

  const hasAnyData =
    data.moodHistory.length > 0 ||
    data.trustHistory.length > 0 ||
    data.safetyEvents.length > 0 ||
    data.styleAdaptations.length > 0;

  const eventTypeColors: Record<string, string> = {
    mood_change: '#10ffb0',
    trust_update: '#00f5ff',
    safety_block: '#ff6b6b',
    style_adapt: '#ffd700',
  };

  const eventTypeLabels: Record<string, string> = {
    mood_change: 'Mood',
    trust_update: 'Trust',
    safety_block: 'Safety',
    style_adapt: 'Style',
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
        <MiniStat label="Mood Events" value={String(data.moodHistory.length)} color="#10ffb0" />
        <MiniStat label="Trust Updates" value={String(data.trustHistory.length)} color="#00f5ff" />
        <MiniStat label="Safety Blocks" value={String(data.safetyEvents.length)} color="#ff6b6b" />
        <MiniStat label="Style Adapts" value={String(data.styleAdaptations.length)} color="#ffd700" />
      </div>

      {/* PAD sparkline */}
      {data.moodHistory.length >= 2 && (
        <div>
          <div style={sectionLabelStyle}>
            Mood History (PAD)
            <span style={{ marginLeft: 12 }}>
              <span style={{ color: '#10ffb0' }}>P</span>{' '}
              <span style={{ color: '#ff6b6b' }}>A</span>{' '}
              <span style={{ color: '#ffd700' }}>D</span>
            </span>
          </div>
          <div
            style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 8 }}
            dangerouslySetInnerHTML={{ __html: padSparkline(data.moodHistory, 300, 60) }}
          />
        </div>
      )}

      {/* Trust history */}
      {data.trustHistory.length >= 2 && (
        <div>
          <div style={sectionLabelStyle}>Trust Score Trend</div>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 8 }}>
            <TrustSparkline data={data.trustHistory} width={300} height={40} />
          </div>
        </div>
      )}

      {/* Safety events */}
      {data.safetyEvents.length > 0 && (
        <div>
          <div style={sectionLabelStyle}>Safety Events</div>
          <div style={{ display: 'grid', gap: 4 }}>
            {data.safetyEvents.slice(0, 20).map((evt, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: 'rgba(255,107,107,0.06)',
                  border: '1px solid rgba(255,107,107,0.15)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.6875rem',
                }}
              >
                <span style={{ color: '#ff6b6b', fontWeight: 600 }}>{evt.type}</span>
                <span style={{ color: 'var(--color-text-muted)', flex: 1 }}>{evt.reason}</span>
                <span style={{ color: 'var(--color-text-dim)', fontSize: '0.625rem' }}>
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event timeline */}
      {data.events.length > 0 && (
        <div>
          <div style={sectionLabelStyle}>Event Timeline</div>
          <div style={{ display: 'grid', gap: 4 }}>
            {data.events.slice(0, 30).map((evt) => {
              const color = eventTypeColors[evt.event_type] ?? '#8888a0';
              const label = eventTypeLabels[evt.event_type] ?? evt.event_type;
              return (
                <div
                  key={evt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.6875rem',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ color, minWidth: 48, fontWeight: 600 }}>{label}</span>
                  <span style={{ color: 'var(--color-text-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {truncateJson(evt.event_data)}
                  </span>
                  <span style={{ color: 'var(--color-text-dim)', fontSize: '0.625rem', flexShrink: 0 }}>
                    {new Date(evt.created_at).toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasAnyData && (
        <div style={{
          padding: 24,
          textAlign: 'center',
          color: 'var(--color-text-dim)',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.75rem',
          fontStyle: 'italic',
        }}>
          No behavior events recorded yet. Mood, trust, and safety data will appear as your agent interacts.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TrustSparkline({ data, width, height }: { data: Array<{ score: number; timestamp: string }>; width: number; height: number }) {
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - d.score * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points.join(' ')} fill="none" stroke="#00f5ff" strokeWidth="1.5" opacity="0.8" />
    </svg>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}22`, borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.625rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1rem', color, fontWeight: 600, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

function LoadingText({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 16, color: 'var(--color-text-dim)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>
      {children}
    </div>
  );
}

function truncateJson(json: string): string {
  try {
    const obj = JSON.parse(json);
    const str = JSON.stringify(obj);
    return str.length > 80 ? str.slice(0, 80) + '...' : str;
  } catch {
    return json.length > 80 ? json.slice(0, 80) + '...' : json;
  }
}

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.625rem',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 8,
};
