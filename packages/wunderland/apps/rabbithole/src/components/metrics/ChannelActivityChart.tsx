'use client';

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChannelActivityData {
  activity: Array<{
    id: number;
    platform: string;
    channel_id?: string;
    event_type: string;
    response_time_ms?: number;
    created_at: string;
  }>;
  totalMessages: number;
  avgResponseTimeMs: number;
  platformBreakdown: Record<string, number>;
}

interface ChannelActivityChartProps {
  seedId: string;
  range: '24h' | '7d' | '30d';
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const PLATFORM_COLORS: Record<string, string> = {
  telegram: '#0088cc',
  discord: '#5865F2',
  slack: '#4A154B',
  whatsapp: '#25D366',
  webchat: '#00f5ff',
  email: '#ffd700',
  sms: '#10ffb0',
  matrix: '#0DBD8B',
  signal: '#3A76F0',
  nostr: '#8b5cf6',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChannelActivityChart({ seedId, range }: ChannelActivityChartProps) {
  const [data, setData] = useState<ChannelActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('vcaAuthToken') : null;
    fetch(`/api/metrics/${encodeURIComponent(seedId)}?type=channels&range=${range}`, {
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
    return <LoadingText>Loading channel activity...</LoadingText>;
  }

  if (!data) {
    return <LoadingText>No channel activity data available.</LoadingText>;
  }

  const platformEntries = Object.entries(data.platformBreakdown).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...platformEntries.map(([, v]) => v), 1);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <MiniStat label="Total Messages" value={String(data.totalMessages)} color="#00f5ff" />
        <MiniStat
          label="Avg Response Time"
          value={data.avgResponseTimeMs > 0 ? `${Math.round(data.avgResponseTimeMs)}ms` : '—'}
          color="#10ffb0"
        />
        <MiniStat
          label="Active Platforms"
          value={String(platformEntries.length)}
          color="#8b5cf6"
        />
      </div>

      {/* Horizontal bar chart per platform */}
      {platformEntries.length > 0 ? (
        <div>
          <div style={sectionLabelStyle}>Messages by Platform</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {platformEntries.map(([platform, count]) => {
              const color = PLATFORM_COLORS[platform] ?? '#00f5ff';
              const pct = (count / maxCount) * 100;
              return (
                <div key={platform} style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color, textTransform: 'capitalize' }}>
                    {platform}
                  </span>
                  <div style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(2, pct)}%`,
                        height: '100%',
                        borderRadius: 4,
                        background: `${color}88`,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: 'var(--color-text-dim)', minWidth: 32, textAlign: 'right' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{
          padding: 24,
          textAlign: 'center',
          color: 'var(--color-text-dim)',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.75rem',
          fontStyle: 'italic',
        }}>
          No channel activity recorded yet. Connect channels and start messaging to see data.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.625rem',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 8,
};
