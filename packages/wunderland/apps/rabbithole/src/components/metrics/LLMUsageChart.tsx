'use client';

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LLMUsageData {
  usage: Array<{
    id: number;
    model: string;
    provider: string;
    input_tokens: number;
    output_tokens: number;
    latency_ms: number;
    estimated_cost_usd: number;
    request_type: string;
    created_at: string;
  }>;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  modelBreakdown: Record<string, number>;
  providerBreakdown: Record<string, number>;
}

interface LLMUsageChartProps {
  seedId: string;
  range: '24h' | '7d' | '30d';
}

// ---------------------------------------------------------------------------
// Inline SVG helpers
// ---------------------------------------------------------------------------

function miniBarChart(
  data: { label: string; value: number; color: string }[],
  width: number,
  height: number
): string {
  if (data.length === 0) return '';
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.floor((width - (data.length - 1) * 4) / data.length);
  const bars = data
    .map((d, i) => {
      const h = Math.max(2, (d.value / max) * (height - 20));
      const x = i * (barW + 4);
      const y = height - h - 16;
      return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="2" fill="${d.color}" opacity="0.8"/>
        <text x="${x + barW / 2}" y="${height - 2}" text-anchor="middle" fill="#8888a0" font-size="8" font-family="IBM Plex Mono, monospace">${d.label}</text>`;
    })
    .join('\n');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${bars}</svg>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LLMUsageChart({ seedId, range }: LLMUsageChartProps) {
  const [data, setData] = useState<LLMUsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('vcaAuthToken') : null;
    fetch(`/api/metrics/${encodeURIComponent(seedId)}?type=llm&range=${range}`, {
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
    return (
      <div style={{ padding: 16, color: 'var(--color-text-dim)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>
        Loading LLM usage...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 16, color: 'var(--color-text-dim)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>
        No LLM usage data available.
      </div>
    );
  }

  const providerColors: Record<string, string> = {
    openai: '#10a37f',
    anthropic: '#d97706',
    openrouter: '#8b5cf6',
    google: '#4285f4',
    mistral: '#ff6b6b',
  };

  const providerEntries = Object.entries(data.providerBreakdown);
  const modelEntries = Object.entries(data.modelBreakdown);

  const providerBars = providerEntries.map(([name, count]) => ({
    label: name.slice(0, 6),
    value: count,
    color: providerColors[name] ?? '#00f5ff',
  }));

  const modelBars = modelEntries.map(([name, count], i) => ({
    label: name.length > 8 ? name.slice(0, 8) : name,
    value: count,
    color: ['#00f5ff', '#ff6b6b', '#ffd700', '#10ffb0', '#8b5cf6', '#ff00f5'][i % 6]!,
  }));

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Summary stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <StatMini label="Input Tokens" value={formatNumber(data.totalInputTokens)} color="#00f5ff" />
        <StatMini label="Output Tokens" value={formatNumber(data.totalOutputTokens)} color="#10ffb0" />
        <StatMini label="Total Cost" value={`$${data.totalCostUsd.toFixed(4)}`} color="#ffd700" />
        <StatMini label="Avg Latency" value={`${Math.round(data.avgLatencyMs)}ms`} color="#8b5cf6" />
      </div>

      {/* Provider breakdown */}
      {providerBars.length > 0 && (
        <div>
          <SectionLabel>Provider Distribution</SectionLabel>
          <div dangerouslySetInnerHTML={{ __html: miniBarChart(providerBars, 280, 80) }} />
        </div>
      )}

      {/* Model breakdown */}
      {modelBars.length > 0 && (
        <div>
          <SectionLabel>Model Distribution</SectionLabel>
          <div dangerouslySetInnerHTML={{ __html: miniBarChart(modelBars, 280, 80) }} />
        </div>
      )}

      {/* Empty state */}
      {data.usage.length === 0 && providerBars.length === 0 && (
        <div style={{
          padding: 24,
          textAlign: 'center',
          color: 'var(--color-text-dim)',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.75rem',
          fontStyle: 'italic',
        }}>
          No LLM usage recorded yet. Usage data will appear as your agent processes requests.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.3)',
        border: `1px solid ${color}22`,
        borderRadius: 8,
        padding: '10px 12px',
      }}
    >
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.625rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1rem', color, fontWeight: 600, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '0.625rem',
      color: 'var(--color-text-dim)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
