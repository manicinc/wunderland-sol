/**
 * RabbitHole Admin UI - Design Tokens
 *
 * Neumorphic design system based on hackbase-next patterns.
 * Dark theme with soft shadows and neon accents.
 */

// ============================================================================
// Color Palette
// ============================================================================

export const colors = {
  // Background layers (dark to light)
  bg: {
    primary: '#0a0a0f',
    secondary: '#12121a',
    tertiary: '#1a1a24',
    elevated: '#22222e',
    hover: '#2a2a38',
  },

  // Text colors
  text: {
    primary: '#ffffff',
    secondary: '#a0a0b0',
    muted: '#6a6a7a',
    disabled: '#4a4a5a',
  },

  // Neon accents (from hackbase-next)
  neon: {
    cyan: '#00d4ff',
    magenta: '#ff00aa',
    yellow: '#ffcc00',
    green: '#00ff88',
    orange: '#ff6600',
    purple: '#aa00ff',
    red: '#ff3366',
  },

  // Status colors
  status: {
    pending: '#ffcc00',
    approved: '#00ff88',
    assigned: '#00d4ff',
    inProgress: '#aa00ff',
    review: '#ff6600',
    completed: '#00ff88',
    rejected: '#ff3366',
  },

  // Risk levels
  risk: {
    low: '#00d4ff',
    medium: '#ffcc00',
    high: '#ff6600',
    critical: '#ff3366',
  },

  // Role colors
  role: {
    superadmin: '#ff00aa',
    admin: '#aa00ff',
    assistant: '#00d4ff',
    client: '#00ff88',
  },

  // Border colors
  border: {
    subtle: 'rgba(255, 255, 255, 0.05)',
    default: 'rgba(255, 255, 255, 0.1)',
    strong: 'rgba(255, 255, 255, 0.2)',
    focus: '#00d4ff',
  },
} as const;

// ============================================================================
// Neumorphic Shadows
// ============================================================================

export const shadows = {
  // Subtle elevation
  sm: `
    2px 2px 4px rgba(0, 0, 0, 0.4),
    -2px -2px 4px rgba(255, 255, 255, 0.02)
  `,

  // Default panel elevation
  md: `
    4px 4px 8px rgba(0, 0, 0, 0.5),
    -4px -4px 8px rgba(255, 255, 255, 0.03)
  `,

  // Elevated cards
  lg: `
    8px 8px 16px rgba(0, 0, 0, 0.6),
    -8px -8px 16px rgba(255, 255, 255, 0.04)
  `,

  // Pressed/inset state
  inset: `
    inset 2px 2px 4px rgba(0, 0, 0, 0.5),
    inset -2px -2px 4px rgba(255, 255, 255, 0.02)
  `,

  // Neon glow effects
  glow: {
    cyan: '0 0 20px rgba(0, 212, 255, 0.3)',
    magenta: '0 0 20px rgba(255, 0, 170, 0.3)',
    yellow: '0 0 20px rgba(255, 204, 0, 0.3)',
    green: '0 0 20px rgba(0, 255, 136, 0.3)',
    red: '0 0 20px rgba(255, 51, 102, 0.3)',
  },
} as const;

// ============================================================================
// Typography
// ============================================================================

export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },

  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ============================================================================
// Spacing & Layout
// ============================================================================

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.25rem',
  default: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  '2xl': '2rem',
  full: '9999px',
} as const;

// ============================================================================
// Animation
// ============================================================================

export const animation = {
  duration: {
    fast: '150ms',
    default: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// ============================================================================
// Z-Index Scale
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
} as const;

// ============================================================================
// Combined Theme
// ============================================================================

export const theme = {
  colors,
  shadows,
  typography,
  spacing,
  borderRadius,
  animation,
  zIndex,
} as const;

export type Theme = typeof theme;
export default theme;
