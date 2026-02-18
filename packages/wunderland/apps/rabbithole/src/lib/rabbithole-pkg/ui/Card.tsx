/**
 * Card Component
 *
 * Neumorphic cards for stats, panels, and content.
 */

import React from 'react';
import { colors, shadows, borderRadius, spacing } from './tokens';

// ============================================================================
// Types
// ============================================================================

export type CardVariant = 'default' | 'elevated' | 'inset' | 'hardware' | 'stat';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  neonBorder?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

// ============================================================================
// Stat Card Helper
// ============================================================================

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  color?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = colors.neon.cyan,
  className,
}: StatCardProps) {
  return (
    <Card variant="stat" padding="md" className={className}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p
            style={{
              color: colors.text.secondary,
              fontSize: '0.875rem',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {title}
          </p>
          <p
            style={{
              color: color,
              fontSize: '2rem',
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1,
              marginBottom: subtitle ? '0.5rem' : 0,
            }}
          >
            {value}
          </p>
          {subtitle && <p style={{ color: colors.text.muted, fontSize: '0.875rem' }}>{subtitle}</p>}
          {trend && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                marginTop: '0.5rem',
                color: trend.value >= 0 ? colors.neon.green : colors.neon.red,
                fontSize: '0.875rem',
              }}
            >
              <span>{trend.value >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              {trend.label && <span style={{ color: colors.text.muted }}>{trend.label}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div
            style={{
              color: color,
              opacity: 0.5,
              fontSize: '1.5rem',
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// Card Component
// ============================================================================

const PADDING_STYLES: Record<CardPadding, string> = {
  none: '0',
  sm: spacing[3],
  md: spacing[6],
  lg: spacing[8],
};

const VARIANT_STYLES: Record<CardVariant, React.CSSProperties> = {
  default: {
    background: colors.bg.secondary,
    border: `1px solid ${colors.border.subtle}`,
    boxShadow: shadows.md,
  },
  elevated: {
    background: colors.bg.elevated,
    border: `1px solid ${colors.border.default}`,
    boxShadow: shadows.lg,
  },
  inset: {
    background: colors.bg.primary,
    border: `1px solid ${colors.border.subtle}`,
    boxShadow: shadows.inset,
  },
  hardware: {
    background: `linear-gradient(135deg, ${colors.bg.secondary} 0%, ${colors.bg.tertiary} 100%)`,
    border: `1px solid ${colors.border.default}`,
    boxShadow: shadows.lg,
    position: 'relative',
  },
  stat: {
    background: colors.bg.secondary,
    border: `1px solid ${colors.border.subtle}`,
    boxShadow: shadows.md,
  },
};

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  header,
  footer,
  neonBorder = false,
  className,
  style,
  onClick,
}: CardProps) {
  const baseStyle: React.CSSProperties = {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: onClick ? 'pointer' : 'default',
    ...VARIANT_STYLES[variant],
    ...style,
  };

  const contentStyle: React.CSSProperties = {
    padding: PADDING_STYLES[padding],
  };

  const headerStyle: React.CSSProperties = {
    padding: `${spacing[4]} ${PADDING_STYLES[padding]}`,
    borderBottom: `1px solid ${colors.border.subtle}`,
    color: colors.text.primary,
    fontWeight: 600,
  };

  const footerStyle: React.CSSProperties = {
    padding: `${spacing[4]} ${PADDING_STYLES[padding]}`,
    borderTop: `1px solid ${colors.border.subtle}`,
    background: colors.bg.primary,
  };

  return (
    <div
      style={baseStyle}
      className={className}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Hardware panel top highlight */}
      {variant === 'hardware' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)`,
          }}
        />
      )}

      {/* Neon border effect placeholder */}
      {neonBorder && (
        <div
          style={{
            position: 'absolute',
            inset: -1,
            borderRadius: 'inherit',
            padding: 1,
            background: `linear-gradient(135deg, ${colors.neon.cyan}, ${colors.neon.magenta})`,
            pointerEvents: 'none',
            opacity: 0.5,
          }}
        />
      )}

      {header && <div style={headerStyle}>{header}</div>}
      <div style={contentStyle}>{children}</div>
      {footer && <div style={footerStyle}>{footer}</div>}
    </div>
  );
}

export default Card;
