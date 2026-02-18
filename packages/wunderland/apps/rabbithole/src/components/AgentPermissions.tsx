'use client';

import type { CSSProperties } from 'react';
import { PermissionBadge } from './PermissionBadge';

// ---------------------------------------------------------------------------
// AgentPermissions — detailed permission display panel for an agent detail page
// ---------------------------------------------------------------------------

interface AgentPermissionsProps {
  permissions: {
    profileName: string;
    displayName: string;
    description: string;
    can: string[];
    cannot: string[];
    allowedTools: string[];
    flags: {
      allowFileSystem: boolean;
      allowCliExecution: boolean;
      allowSystemModification: boolean;
    };
    maxRiskTier: string;
  };
}

// --- Risk tier color mapping ---

const RISK_TIER_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  none: {
    color: 'var(--color-text-dim, #7a7a90)',
    bg: 'rgba(122, 122, 144, 0.10)',
    border: 'rgba(122, 122, 144, 0.20)',
  },
  low: {
    color: 'var(--color-success, #10ffb0)',
    bg: 'rgba(16, 255, 176, 0.10)',
    border: 'rgba(16, 255, 176, 0.20)',
  },
  medium: {
    color: 'var(--color-warning, #f5a623)',
    bg: 'rgba(245, 166, 35, 0.10)',
    border: 'rgba(245, 166, 35, 0.20)',
  },
  high: {
    color: '#ff8c00',
    bg: 'rgba(255, 140, 0, 0.10)',
    border: 'rgba(255, 140, 0, 0.20)',
  },
  critical: {
    color: 'var(--color-error, #ff6b6b)',
    bg: 'rgba(255, 107, 107, 0.10)',
    border: 'rgba(255, 107, 107, 0.20)',
  },
};

const RISK_TIER_FALLBACK = {
  color: 'var(--color-text-dim, #7a7a90)',
  bg: 'rgba(122, 122, 144, 0.10)',
  border: 'rgba(122, 122, 144, 0.20)',
};

// --- Sub-components ---

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M3 7.5L5.5 10L11 4"
        stroke="var(--color-success, #10ffb0)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M4 4L10 10M10 4L4 10"
        stroke="var(--color-error, #ff6b6b)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlagIndicator({ label, enabled }: { label: string; enabled: boolean }) {
  const dotColor = enabled
    ? 'var(--color-error, #ff6b6b)'
    : 'var(--color-success, #10ffb0)';
  const dotGlow = enabled
    ? 'rgba(255, 107, 107, 0.4)'
    : 'rgba(16, 255, 176, 0.3)';
  const textColor = enabled
    ? 'var(--color-text, #e8e8f0)'
    : 'var(--color-text-muted, #b0b0c0)';

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: enabled
      ? 'rgba(255, 107, 107, 0.05)'
      : 'rgba(16, 255, 176, 0.03)',
    border: `1px solid ${enabled ? 'rgba(255, 107, 107, 0.15)' : 'rgba(255, 255, 255, 0.04)'}`,
    borderRadius: 8,
  };

  const dotStyle: CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: dotColor,
    boxShadow: `0 0 6px ${dotGlow}`,
    flexShrink: 0,
  };

  const labelStyle: CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.75rem',
    fontWeight: 500,
    color: textColor,
  };

  const statusStyle: CSSProperties = {
    marginLeft: 'auto',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: dotColor,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  };

  return (
    <div style={containerStyle}>
      <span style={dotStyle} />
      <span style={labelStyle}>{label}</span>
      <span style={statusStyle}>{enabled ? 'Enabled' : 'Disabled'}</span>
    </div>
  );
}

// --- Main component ---

export function AgentPermissions({ permissions }: AgentPermissionsProps) {
  const riskColors = RISK_TIER_COLORS[permissions.maxRiskTier.toLowerCase()] ?? RISK_TIER_FALLBACK;

  // -- Style definitions --

  const panelStyle: CSSProperties = {
    background: 'var(--card-bg, rgba(14, 14, 24, 0.4))',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(201, 162, 39, 0.15)',
    borderRadius: 12,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  };

  const titleRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  };

  const displayNameStyle: CSSProperties = {
    fontFamily: "'Outfit', 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    fontWeight: 700,
    fontSize: '1.125rem',
    color: 'var(--color-text, #e8e8f0)',
    lineHeight: 1.3,
  };

  const descriptionStyle: CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.8125rem',
    color: 'var(--color-text-muted, #b0b0c0)',
    lineHeight: 1.5,
  };

  const sectionLabelStyle: CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: 10,
  };

  const columnsStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  };

  const listStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  };

  const listItemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.8125rem',
    lineHeight: 1.4,
  };

  const toolsContainerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  };

  const toolChipStyle: CSSProperties = {
    display: 'inline-block',
    padding: '3px 10px',
    background: 'rgba(139, 92, 246, 0.08)',
    border: '1px solid rgba(139, 92, 246, 0.18)',
    borderRadius: 6,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.6875rem',
    color: '#8b5cf6',
  };

  const flagsContainerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const riskBadgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    background: riskColors.bg,
    border: `1px solid ${riskColors.border}`,
    borderRadius: 999,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.75rem',
    fontWeight: 600,
    color: riskColors.color,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  };

  const dividerStyle: CSSProperties = {
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(201, 162, 39, 0.2), transparent)',
  };

  return (
    <div style={panelStyle}>
      {/* -- Header: profile name, badge, description -- */}
      <div style={headerStyle}>
        <div style={titleRowStyle}>
          <span style={displayNameStyle}>{permissions.displayName}</span>
          <PermissionBadge profileName={permissions.profileName} size="sm" />
        </div>
        <p style={descriptionStyle}>{permissions.description}</p>
      </div>

      <div style={dividerStyle} />

      {/* -- Allowed / Restricted two-column layout -- */}
      <div style={columnsStyle}>
        {/* Allowed column */}
        <div>
          <div
            style={{
              ...sectionLabelStyle,
              color: 'var(--color-success, #10ffb0)',
            }}
          >
            Allowed
          </div>
          <div style={listStyle}>
            {permissions.can.length > 0 ? (
              permissions.can.map((item) => (
                <div key={item} style={listItemStyle}>
                  <CheckIcon />
                  <span style={{ color: 'var(--color-text, #e8e8f0)' }}>{item}</span>
                </div>
              ))
            ) : (
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-dim, #7a7a90)',
                  fontStyle: 'italic',
                }}
              >
                No explicit permissions
              </span>
            )}
          </div>
        </div>

        {/* Restricted column */}
        <div>
          <div
            style={{
              ...sectionLabelStyle,
              color: 'var(--color-error, #ff6b6b)',
            }}
          >
            Restricted
          </div>
          <div style={listStyle}>
            {permissions.cannot.length > 0 ? (
              permissions.cannot.map((item) => (
                <div key={item} style={listItemStyle}>
                  <XIcon />
                  <span style={{ color: 'var(--color-text-muted, #b0b0c0)' }}>{item}</span>
                </div>
              ))
            ) : (
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-dim, #7a7a90)',
                  fontStyle: 'italic',
                }}
              >
                No restrictions
              </span>
            )}
          </div>
        </div>
      </div>

      {/* -- Allowed tools -- */}
      {permissions.allowedTools.length > 0 && (
        <>
          <div style={dividerStyle} />
          <div>
            <div
              style={{
                ...sectionLabelStyle,
                color: 'var(--color-text-dim, #7a7a90)',
              }}
            >
              Allowed Tools
            </div>
            <div style={toolsContainerStyle}>
              {permissions.allowedTools.map((tool) => (
                <span key={tool} style={toolChipStyle}>
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      <div style={dividerStyle} />

      {/* -- Safety flags -- */}
      <div>
        <div
          style={{
            ...sectionLabelStyle,
            color: 'var(--color-text-dim, #7a7a90)',
          }}
        >
          Safety Flags
        </div>
        <div style={flagsContainerStyle}>
          <FlagIndicator
            label="File System Access"
            enabled={permissions.flags.allowFileSystem}
          />
          <FlagIndicator
            label="CLI Execution"
            enabled={permissions.flags.allowCliExecution}
          />
          <FlagIndicator
            label="System Modification"
            enabled={permissions.flags.allowSystemModification}
          />
        </div>
      </div>

      <div style={dividerStyle} />

      {/* -- Max risk tier -- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.75rem',
            fontWeight: 500,
            color: 'var(--color-text-muted, #b0b0c0)',
          }}
        >
          Max Risk Tier
        </span>
        <span style={riskBadgeStyle}>{permissions.maxRiskTier}</span>
      </div>
    </div>
  );
}
