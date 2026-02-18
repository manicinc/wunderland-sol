/**
 * Button Component
 *
 * Neumorphic buttons with various variants and states.
 */

import React from 'react';
import { colors, shadows, animation } from './tokens';

// ============================================================================
// Types
// ============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

// ============================================================================
// Styles
// ============================================================================

const SIZE_STYLES: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    fontSize: '0.875rem',
    padding: '0.5rem 1rem',
    minHeight: '2rem',
  },
  md: {
    fontSize: '1rem',
    padding: '0.75rem 1.5rem',
    minHeight: '2.5rem',
  },
  lg: {
    fontSize: '1.125rem',
    padding: '1rem 2rem',
    minHeight: '3rem',
  },
};

const VARIANT_STYLES: Record<
  ButtonVariant,
  { base: React.CSSProperties; hover: React.CSSProperties }
> = {
  primary: {
    base: {
      background: `linear-gradient(135deg, ${colors.neon.cyan}20, ${colors.neon.magenta}20)`,
      color: colors.neon.cyan,
      border: `1px solid ${colors.neon.cyan}40`,
      boxShadow: shadows.md,
    },
    hover: {
      background: `linear-gradient(135deg, ${colors.neon.cyan}30, ${colors.neon.magenta}30)`,
      boxShadow: `${shadows.md}, ${shadows.glow.cyan}`,
    },
  },
  secondary: {
    base: {
      background: colors.bg.elevated,
      color: colors.text.primary,
      border: `1px solid ${colors.border.default}`,
      boxShadow: shadows.md,
    },
    hover: {
      background: colors.bg.hover,
      borderColor: colors.border.strong,
    },
  },
  ghost: {
    base: {
      background: 'transparent',
      color: colors.text.secondary,
      border: '1px solid transparent',
    },
    hover: {
      background: colors.bg.elevated,
      color: colors.text.primary,
    },
  },
  danger: {
    base: {
      background: `${colors.neon.red}20`,
      color: colors.neon.red,
      border: `1px solid ${colors.neon.red}40`,
      boxShadow: shadows.md,
    },
    hover: {
      background: `${colors.neon.red}30`,
      boxShadow: `${shadows.md}, ${shadows.glow.red}`,
    },
  },
  success: {
    base: {
      background: `${colors.neon.green}20`,
      color: colors.neon.green,
      border: `1px solid ${colors.neon.green}40`,
      boxShadow: shadows.md,
    },
    hover: {
      background: `${colors.neon.green}30`,
      boxShadow: `${shadows.md}, ${shadows.glow.green}`,
    },
  },
};

// ============================================================================
// Loading Spinner
// ============================================================================

function LoadingSpinner({ size }: { size: ButtonSize }) {
  const spinnerSize = size === 'sm' ? 14 : size === 'md' ? 16 : 20;

  return (
    <svg
      width={spinnerSize}
      height={spinnerSize}
      viewBox="0 0 24 24"
      fill="none"
      style={{
        animation: 'rh-spin 1s linear infinite',
      }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="31.4 31.4"
        opacity="0.25"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="31.4 31.4"
        strokeDashoffset="62.8"
        style={{
          transformOrigin: 'center',
        }}
      />
      <style>{`
        @keyframes rh-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );
}

// ============================================================================
// Button Component
// ============================================================================

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = false,
  style,
  ...props
}: ButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
    borderRadius: '0.75rem',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: `all ${animation.duration.default} ${animation.easing.default}`,
    outline: 'none',
    width: fullWidth ? '100%' : 'auto',
    ...sizeStyle,
    ...variantStyle.base,
    ...(isHovered && !disabled && !loading ? variantStyle.hover : {}),
    ...(isPressed && !disabled && !loading ? { boxShadow: shadows.inset } : {}),
    ...style,
  };

  return (
    <button
      style={baseStyle}
      disabled={disabled || loading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size={size} />
      ) : (
        <>
          {icon}
          {children}
          {iconRight}
        </>
      )}
    </button>
  );
}

export default Button;
