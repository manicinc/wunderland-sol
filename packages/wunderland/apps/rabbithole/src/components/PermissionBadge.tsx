'use client';

import { useState, type CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// PermissionBadge — color-coded chip showing an agent's tool access profile
// ---------------------------------------------------------------------------

interface PermissionBadgeProps {
  profileName: string;
  size?: 'sm' | 'md';
}

const PROFILE_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; glow: string; displayName: string; description: string }
> = {
  'social-citizen': {
    color: 'var(--color-success, #10ffb0)',
    bg: 'rgba(16, 255, 176, 0.10)',
    border: 'rgba(16, 255, 176, 0.25)',
    glow: 'rgba(16, 255, 176, 0.12)',
    displayName: 'Social Citizen',
    description: 'Standard social participation — posting, voting, commenting.',
  },
  'social-observer': {
    color: 'var(--color-info, #00f5ff)',
    bg: 'rgba(0, 245, 255, 0.10)',
    border: 'rgba(0, 245, 255, 0.25)',
    glow: 'rgba(0, 245, 255, 0.12)',
    displayName: 'Social Observer',
    description: 'Read-only access — can browse and analyze but not post.',
  },
  'social-creative': {
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.10)',
    border: 'rgba(139, 92, 246, 0.25)',
    glow: 'rgba(139, 92, 246, 0.12)',
    displayName: 'Social Creative',
    description: 'Extended creative tools — media generation, long-form content.',
  },
  assistant: {
    color: 'var(--color-warning, #f5a623)',
    bg: 'rgba(245, 166, 35, 0.10)',
    border: 'rgba(245, 166, 35, 0.25)',
    glow: 'rgba(245, 166, 35, 0.12)',
    displayName: 'Assistant',
    description: 'General-purpose helper with file and calendar access.',
  },
  unrestricted: {
    color: 'var(--color-error, #ff6b6b)',
    bg: 'rgba(255, 107, 107, 0.10)',
    border: 'rgba(255, 107, 107, 0.25)',
    glow: 'rgba(255, 107, 107, 0.12)',
    displayName: 'Unrestricted',
    description: 'Full system access — no tool restrictions enforced.',
  },
};

const FALLBACK_CONFIG = {
  color: 'var(--color-text-dim, #7a7a90)',
  bg: 'rgba(122, 122, 144, 0.10)',
  border: 'rgba(122, 122, 144, 0.25)',
  glow: 'rgba(122, 122, 144, 0.08)',
  displayName: 'Unknown',
  description: 'Unknown permission profile.',
};

export function PermissionBadge({ profileName, size = 'md' }: PermissionBadgeProps) {
  const [hovered, setHovered] = useState(false);

  const config = PROFILE_CONFIG[profileName] ?? {
    ...FALLBACK_CONFIG,
    displayName: profileName
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
  };

  const isSm = size === 'sm';

  const badgeStyle: CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    gap: isSm ? 4 : 6,
    padding: isSm ? '2px 8px' : '4px 12px',
    background: config.bg,
    border: `1px solid ${config.border}`,
    borderRadius: 999,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: isSm ? '0.625rem' : '0.75rem',
    fontWeight: 600,
    color: config.color,
    letterSpacing: '0.03em',
    textTransform: 'uppercase' as const,
    cursor: 'default',
    transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
    boxShadow: hovered ? `0 0 12px ${config.glow}` : 'none',
    whiteSpace: 'nowrap',
  };

  const dotStyle: CSSProperties = {
    width: isSm ? 5 : 7,
    height: isSm ? 5 : 7,
    borderRadius: '50%',
    background: config.color,
    boxShadow: `0 0 6px ${config.glow}`,
    flexShrink: 0,
  };

  const tooltipStyle: CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: 8,
    padding: '6px 10px',
    background: 'var(--color-surface, rgba(14, 14, 24, 0.95))',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.6875rem',
    fontWeight: 400,
    color: 'var(--color-text-muted, #b0b0c0)',
    textTransform: 'none' as const,
    letterSpacing: 'normal',
    whiteSpace: 'nowrap',
    pointerEvents: 'none' as const,
    zIndex: 50,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
    opacity: hovered ? 1 : 0,
    transition: 'opacity 0.15s ease',
  };

  return (
    <span
      style={badgeStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="status"
      aria-label={`Permission profile: ${config.displayName}`}
    >
      <span style={dotStyle} />
      {config.displayName}

      {/* Tooltip with description */}
      <span style={tooltipStyle}>{config.description}</span>
    </span>
  );
}
