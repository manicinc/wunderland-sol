'use client';

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolExecution {
  id: number;
  tool_id: string;
  tool_name: string;
  status: 'success' | 'failure' | 'timeout';
  duration_ms: number;
  error_message?: string;
  input_summary?: string;
  output_summary?: string;
  created_at: string;
}

interface ToolExecutionData {
  executions: ToolExecution[];
  totalExecutions: number;
  successRate: number;
  avgDurationMs: number;
  toolBreakdown: Record<string, number>;
}

interface ToolExecutionLogProps {
  seedId: string;
  range: '24h' | '7d' | '30d';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ToolExecutionLog({ seedId, range }: ToolExecutionLogProps) {
  const [data, setData] = useState<ToolExecutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failure' | 'timeout'>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('vcaAuthToken') : null;
    fetch(`/api/metrics/${encodeURIComponent(seedId)}?type=tools&range=${range}`, {
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
    return <LoadingState>Loading tool executions...</LoadingState>;
  }

  if (!data) {
    return <LoadingState>No tool execution data available.</LoadingState>;
  }

  const filtered = filter === 'all'
    ? data.executions
    : data.executions.filter((e) => e.status === filter);

  const statusColors: Record<string, string> = {
    success: '#10ffb0',
    failure: '#ff6b6b',
    timeout: '#ffd700',
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
        <MiniStat label="Total Executions" value={String(data.totalExecutions)} color="#00f5ff" />
        <MiniStat
          label="Success Rate"
          value={`${Math.round(data.successRate * 100)}%`}
          color={data.successRate >= 0.9 ? '#10ffb0' : data.successRate >= 0.7 ? '#ffd700' : '#ff6b6b'}
        />
        <MiniStat label="Avg Duration" value={`${Math.round(data.avgDurationMs)}ms`} color="#8b5cf6" />
      </div>

      {/* Tool breakdown chips */}
      {Object.keys(data.toolBreakdown).length > 0 && (
        <div>
          <div style={sectionLabelStyle}>Tool Breakdown</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(data.toolBreakdown).map(([tool, count]) => (
              <span
                key={tool}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.6875rem',
                  padding: '3px 8px',
                  borderRadius: 12,
                  background: 'rgba(0,245,255,0.08)',
                  color: '#00f5ff',
                  border: '1px solid rgba(0,245,255,0.15)',
                }}
              >
                {tool}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['all', 'success', 'failure', 'timeout'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.625rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '4px 10px',
              borderRadius: 6,
              border: `1px solid ${filter === f ? 'var(--color-text-muted)' : 'var(--color-border)'}`,
              background: filter === f ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: filter === f ? 'var(--color-text)' : 'var(--color-text-dim)',
              cursor: 'pointer',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Execution log */}
      {filtered.length > 0 ? (
        <div style={{ display: 'grid', gap: 4 }}>
          {filtered.slice(0, 50).map((exec) => (
            <div key={exec.id}>
              <button
                type="button"
                onClick={() => setExpandedRow(expandedRow === exec.id ? null : exec.id)}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem', color: 'var(--color-text)' }}>
                  {exec.tool_name}
                </span>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.625rem',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: `${statusColors[exec.status] ?? '#888'}22`,
                    color: statusColors[exec.status] ?? '#888',
                  }}
                >
                  {exec.status}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: 'var(--color-text-dim)' }}>
                  {exec.duration_ms}ms
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: 'var(--color-text-dim)' }}>
                  {new Date(exec.created_at).toLocaleTimeString()}
                </span>
              </button>

              {expandedRow === exec.id && (
                <div
                  style={{
                    margin: '2px 0 6px 0',
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--color-border)',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.6875rem',
                    color: 'var(--color-text-muted)',
                    display: 'grid',
                    gap: 4,
                  }}
                >
                  {exec.error_message && (
                    <div style={{ color: '#ff6b6b' }}>Error: {exec.error_message}</div>
                  )}
                  {exec.input_summary && <div>Input: {exec.input_summary}</div>}
                  {exec.output_summary && <div>Output: {exec.output_summary}</div>}
                  {!exec.error_message && !exec.input_summary && !exec.output_summary && (
                    <div style={{ fontStyle: 'italic' }}>No additional details.</div>
                  )}
                </div>
              )}
            </div>
          ))}
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
          No tool executions recorded yet. Data will appear as your agent uses tools.
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

function LoadingState({ children }: { children: React.ReactNode }) {
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
