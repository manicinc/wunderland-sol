'use client';

import type { CSSProperties } from 'react';

interface StatWidgetProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: number;
  trendDirection?: 'up' | 'down' | 'flat';
  className?: string;
}

function TrendArrow({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'flat') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M2 6h8"
          stroke="var(--color-text-dim)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const color =
    direction === 'up' ? 'var(--color-success)' : 'var(--color-error)';
  const path =
    direction === 'up'
      ? 'M6 9V3M6 3L3 6M6 3L9 6'
      : 'M6 3V9M6 9L3 6M6 9L9 6';

  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d={path} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatWidget({
  icon,
  label,
  value,
  trend,
  trendDirection,
  className = '',
}: StatWidgetProps) {
  const resolvedDirection =
    trendDirection ?? (trend != null ? (trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat') : undefined);

  const trendColor =
    resolvedDirection === 'up'
      ? 'var(--color-success)'
      : resolvedDirection === 'down'
        ? 'var(--color-error)'
        : 'var(--color-text-dim)';

  const containerStyle: CSSProperties = {
    padding: '20px 24px',
    borderRadius: 12,
    background: 'var(--card-bg, #151520)',
    border: '1px solid rgba(201, 162, 39, 0.15)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    transition: 'border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease',
    cursor: 'default',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  };

  const iconContainerStyle: CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: 'rgba(201, 162, 39, 0.08)',
    border: '1px solid rgba(201, 162, 39, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: 'var(--color-text-muted)',
  };

  const labelStyle: CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'var(--color-text-dim)',
    letterSpacing: '0.02em',
    textTransform: 'uppercase' as const,
    lineHeight: 1.3,
    marginBottom: 2,
  };

  const valueStyle: CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--color-text)',
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  };

  const trendContainerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    marginLeft: 8,
  };

  const trendTextStyle: CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.6875rem',
    fontWeight: 500,
    color: trendColor,
    lineHeight: 1,
  };

  return (
    <div
      className={className}
      style={containerStyle}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = 'rgba(201, 162, 39, 0.4)';
        el.style.boxShadow = '0 0 20px rgba(201, 162, 39, 0.08), 0 4px 16px rgba(0, 0, 0, 0.15)';
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = 'rgba(201, 162, 39, 0.15)';
        el.style.boxShadow = 'none';
        el.style.transform = 'translateY(0)';
      }}
    >
      <div style={iconContainerStyle}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={labelStyle}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={valueStyle}>{value}</span>
          {trend != null && resolvedDirection && (
            <span style={trendContainerStyle}>
              <TrendArrow direction={resolvedDirection} />
              <span style={trendTextStyle}>
                {trend > 0 ? '+' : ''}
                {trend}%
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
