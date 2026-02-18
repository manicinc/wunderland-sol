'use client';

import Link from 'next/link';
import { useState } from 'react';
import { OrnateToggle } from './OrnateToggle';

interface IntegrationCardProps {
  name: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  description?: string;
  status?: 'connected' | 'disconnected' | 'error' | 'configuring';
  href?: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  NonNullable<IntegrationCardProps['status']>,
  { color: string; label: string }
> = {
  connected: { color: 'var(--color-success, #10ffb0)', label: 'Connected' },
  disconnected: { color: 'var(--color-text-dim, #6b6b7b)', label: 'Disconnected' },
  error: { color: 'var(--color-error, #ff6b6b)', label: 'Error' },
  configuring: { color: 'var(--color-warning, #f5a623)', label: 'Configuring' },
};

export function IntegrationCard({
  name,
  icon,
  enabled,
  onToggle,
  description,
  status,
  href,
  className = '',
}: IntegrationCardProps) {
  const [hovered, setHovered] = useState(false);

  const statusInfo = status ? STATUS_CONFIG[status] : null;

  const cardContent = (
    <div
      className={className}
      style={{
        position: 'relative',
        background: 'var(--card-bg, rgba(26,26,46,0.4))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid rgba(201,162,39,${hovered ? '0.4' : '0.2'})`,
        borderRadius: 12,
        padding: 16,
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        cursor: href ? 'pointer' : 'default',
        boxShadow: hovered ? '0 0 20px rgba(201,162,39,0.06)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row: icon + name + toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: 'var(--color-text, #e0e0f0)',
            fontSize: '1.25rem',
            lineHeight: 1,
          }}
        >
          {icon}
        </div>

        {/* Name */}
        <span
          style={{
            flex: 1,
            fontWeight: 700,
            fontSize: '0.875rem',
            color: 'var(--color-text, #e0e0f0)',
          }}
        >
          {name}
        </span>

        {/* Toggle */}
        <div
          onClick={(e) => e.preventDefault()}
          style={{ flexShrink: 0 }}
        >
          <OrnateToggle
            checked={enabled}
            onChange={onToggle}
            size="sm"
          />
        </div>
      </div>

      {/* Description */}
      {description && (
        <p
          style={{
            margin: '8px 0 0',
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted, #9595a8)',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}

      {/* Status badge + configure link */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 10,
        }}
      >
        {statusInfo && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6875rem',
              color: statusInfo.color,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: statusInfo.color,
                boxShadow:
                  status === 'connected'
                    ? `0 0 8px ${statusInfo.color}`
                    : status === 'error'
                      ? `0 0 6px ${statusInfo.color}`
                      : 'none',
                flexShrink: 0,
              }}
            />
            {statusInfo.label}
          </span>
        )}

        {href && (
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6875rem',
              color: 'var(--color-text-dim, #6b6b7b)',
              marginLeft: 'auto',
            }}
          >
            Configure &rarr;
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
