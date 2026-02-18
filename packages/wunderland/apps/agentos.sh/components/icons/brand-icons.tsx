/**
 * Custom Animated SVG Icons for Brand Section
 * 
 * Each icon features:
 * - Gradient strokes with animated shifts
 * - Intricate silhouettes matching brand themes
 * - Respects prefers-reduced-motion
 * - Auto-adapts to light/dark mode via CSS variables
 */

import React from 'react';

interface IconProps {
  className?: string;
  id?: string;
}

/**
 * Shield icon - Security Foundation
 * Polygon shield with inner geometric pattern
 */
export const ShieldIcon: React.FC<IconProps> = ({ className = '', id = 'shield' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--color-accent-secondary)" className="animate-hue-shift" />
        <stop offset="100%" stopColor="var(--color-accent-primary)" className="animate-hue-shift-delay" />
      </linearGradient>
    </defs>
    
    {/* Shield outline */}
    <path
      d="M32 8 L50 14 L50 30 Q50 45 32 56 Q14 45 14 30 L14 14 Z"
      stroke={`url(#${id}-grad)`}
      strokeWidth="1.5"
      fill="none"
      className="transition-all"
    />
    
    {/* Inner geometric pattern */}
    <path
      d="M32 18 L40 24 L40 35 L32 42 L24 35 L24 24 Z"
      stroke={`url(#${id}-grad)`}
      strokeWidth="1.25"
      fill="none"
      opacity="0.6"
    />
    
    {/* Center accent */}
    <circle
      cx="32"
      cy="30"
      r="3"
      fill={`url(#${id}-grad)`}
      opacity="0.8"
    />
  </svg>
);

/**
 * Lock icon - Authentication
 * Detailed padlock with keyhole
 */
export const LockIcon: React.FC<IconProps> = ({ className = '', id = 'lock' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--color-accent-secondary)" className="animate-hue-shift" />
        <stop offset="100%" stopColor="var(--color-accent-primary)" className="animate-hue-shift-delay" />
      </linearGradient>
    </defs>
    
    {/* Shackle */}
    <path
      d="M22 28 L22 20 Q22 12 32 12 Q42 12 42 20 L42 28"
      stroke={`url(#${id}-grad)`}
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />
    
    {/* Body */}
    <rect
      x="18"
      y="28"
      width="28"
      height="20"
      rx="2"
      stroke={`url(#${id}-grad)`}
      strokeWidth="1.5"
      fill="none"
    />
    
    {/* Keyhole */}
    <circle
      cx="32"
      cy="36"
      r="2.5"
      fill={`url(#${id}-grad)`}
      opacity="0.8"
    />
    <path
      d="M32 38.5 L32 42"
      stroke={`url(#${id}-grad)`}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Certificate icon - Compliance
 * Ribbon badge with seal
 */
export const CertificateIcon: React.FC<IconProps> = ({ className = '', id = 'cert' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--color-accent-secondary)" className="animate-hue-shift" />
        <stop offset="100%" stopColor="var(--color-accent-primary)" className="animate-hue-shift-delay" />
      </linearGradient>
    </defs>
    
    {/* Document */}
    <rect
      x="14"
      y="10"
      width="28"
      height="32"
      rx="2"
      stroke={`url(#${id}-grad)`}
      strokeWidth="1.5"
      fill="none"
    />
    
    {/* Seal circle */}
    <circle
      cx="38"
      cy="45"
      r="10"
      stroke={`url(#${id}-grad)`}
      strokeWidth="1.5"
      fill="none"
    />
    
    {/* Star in seal */}
    <path
      d="M38 40 L39.5 43 L43 43.5 L40.5 46 L41 49.5 L38 47.5 L35 49.5 L35.5 46 L33 43.5 L36.5 43 Z"
      stroke={`url(#${id}-grad)`}
      strokeWidth="1"
      fill="none"
    />
    
    {/* Ribbons */}
    <path
      d="M38 55 L38 60 L35 57 L32 60 L32 52"
      stroke={`url(#${id}-grad)`}
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M38 55 L38 60 L41 57 L44 60 L44 52"
      stroke={`url(#${id}-grad)`}
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

/**
 * Graph icon - Audit & Monitoring
 * Analytics chart with trend line
 */
export const GraphIcon: React.FC<IconProps> = ({ className = '', id = 'graph' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--color-accent-secondary)" className="animate-hue-shift" />
        <stop offset="100%" stopColor="var(--color-accent-primary)" className="animate-hue-shift-delay" />
      </linearGradient>
    </defs>
    
    {/* Axes */}
    <path
      d="M12 52 L12 12 M12 52 L52 52"
      stroke={`url(#${id}-grad)`}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    
    {/* Bar chart */}
    <rect x="18" y="38" width="6" height="14" fill={`url(#${id}-grad)`} opacity="0.6" rx="1" />
    <rect x="28" y="32" width="6" height="20" fill={`url(#${id}-grad)`} opacity="0.7" rx="1" />
    <rect x="38" y="26" width="6" height="26" fill={`url(#${id}-grad)`} opacity="0.8" rx="1" />
    
    {/* Trend line */}
    <path
      d="M18 42 L28 36 L38 30 L48 22"
      stroke={`url(#${id}-grad)`}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity="0.9"
    />
    
    {/* Data points */}
    <circle cx="18" cy="42" r="2" fill={`url(#${id}-grad)`} />
    <circle cx="28" cy="36" r="2" fill={`url(#${id}-grad)`} />
    <circle cx="38" cy="30" r="2" fill={`url(#${id}-grad)`} />
    <circle cx="48" cy="22" r="2" fill={`url(#${id}-grad)`} />
  </svg>
);

/**
 * Skyline icon - Scale
 * Stylized city skyline
 */
export const SkylineIcon: React.FC<IconProps> = ({ className = '', id = 'skyline' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--color-accent-secondary)" className="animate-hue-shift" />
        <stop offset="100%" stopColor="var(--color-accent-primary)" className="animate-hue-shift-delay" />
      </linearGradient>
    </defs>
    
    {/* Buildings */}
    <rect x="10" y="35" width="8" height="19" stroke={`url(#${id}-grad)`} strokeWidth="1.5" fill="none" />
    <rect x="20" y="25" width="10" height="29" stroke={`url(#${id}-grad)`} strokeWidth="1.5" fill="none" />
    <rect x="32" y="15" width="12" height="39" stroke={`url(#${id}-grad)`} strokeWidth="1.5" fill="none" />
    <rect x="46" y="30" width="8" height="24" stroke={`url(#${id}-grad)`} strokeWidth="1.5" fill="none" />
    
    {/* Windows (small rectangles) */}
    <rect x="13" y="38" width="2" height="2" fill={`url(#${id}-grad)`} opacity="0.5" />
    <rect x="13" y="43" width="2" height="2" fill={`url(#${id}-grad)`} opacity="0.5" />
    <rect x="23" y="28" width="2" height="2" fill={`url(#${id}-grad)`} opacity="0.5" />
    <rect x="23" y="33" width="2" height="2" fill={`url(#${id}-grad)`} opacity="0.5" />
    <rect x="23" y="38" width="2" height="2" fill={`url(#${id}-grad)`} opacity="0.5" />
    <rect x="26" y="28" width="2" height="2" fill={`url(#${id}-grad)`} opacity="0.5" />
    <rect x="26" y="33" width="2" height="2" fill={`url(#${id}-grad)`} opacity="0.5" />
    <rect x="26" y="38" width="2" height="2" fill={`url(#${id}-grad)`} opacity="0.5" />
    <rect x="36" y="20" width="2" height="2" fill={`url(#${id}-grad)`} opacity="0.5" />
    <rect x="36" y="26" width="2" height="2" fill={`url(#${id}-grad)`} opacity="0.5" />
    <rect x="36" y="32" width="2" height="2" fill={`url(#${id}-grad)`} opacity="0.5" />
    <rect x="40" y="20" width="2" height="2" fill={`url(#${id}-grad)`} opacity="0.5" />
    <rect x="40" y="26" width="2" height="2" fill={`url(#${id}-grad)`} opacity="0.5" />
    <rect x="40" y="32" width="2" height="2" fill={`url(#${id}-grad)`} opacity="0.5" />
    
    {/* Base line */}
    <path d="M8 54 L56 54" stroke={`url(#${id}-grad)`} strokeWidth="1.5" />
  </svg>
);

/**
 * Document Check icon - Compliance & Privacy
 * Document with checkmark
 */
export const DocumentCheckIcon: React.FC<IconProps> = ({ className = '', id = 'doccheck' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--color-accent-secondary)" className="animate-hue-shift" />
        <stop offset="100%" stopColor="var(--color-accent-primary)" className="animate-hue-shift-delay" />
      </linearGradient>
    </defs>
    
    {/* Document */}
    <path
      d="M18 10 L42 10 L50 18 L50 54 L18 54 Z"
      stroke={`url(#${id}-grad)`}
      strokeWidth="1.5"
      fill="none"
      strokeLinejoin="round"
    />
    
    {/* Folded corner */}
    <path
      d="M42 10 L42 18 L50 18"
      stroke={`url(#${id}-grad)`}
      strokeWidth="1.5"
      fill="none"
      strokeLinejoin="round"
    />
    
    {/* Checkmark in circle */}
    <circle
      cx="34"
      cy="36"
      r="10"
      stroke={`url(#${id}-grad)`}
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M28 36 L32 40 L40 32"
      stroke={`url(#${id}-grad)`}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

