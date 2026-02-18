'use client';

import clsx from 'clsx';

interface FrameWordmarkProps {
  className?: string;
  size?: 'md' | 'lg';
}

/**
 * Minimal Frame.dev wordmark for branding surfaces.
 * Uses token-driven gradient for light/dark support.
 */
export function FrameWordmark({ className, size = 'md' }: FrameWordmarkProps) {
  const height = size === 'lg' ? 44 : 32;
  const width = size === 'lg' ? 160 : 120;
  return (
    <span className={clsx('theme-logo-wordmark', className)} aria-hidden="true">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 320 100"
        width={width}
        height={height}
        role="presentation"
      >
        <defs>
          <linearGradient id="frame-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent-primary)" />
            <stop offset="100%" stopColor="var(--color-accent-secondary)" />
          </linearGradient>
        </defs>
        {/* Subtle dot glyph */}
        <g opacity="0.9">
          <circle cx="26" cy="52" r="6" fill="url(#frame-gradient)" opacity="0.95" />
          <circle cx="14" cy="40" r="3" fill="var(--color-accent-primary)" opacity="0.4" />
          <circle cx="38" cy="40" r="3" fill="var(--color-accent-secondary)" opacity="0.35" />
        </g>
        {/* Wordmark */}
        <text
          x="70"
          y="60"
          fontFamily="var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          fontSize="36"
          fontWeight={700}
          fill="currentColor"
          letterSpacing="-0.02em"
        >
          fr<tspan fill="url(#frame-gradient)">ame</tspan>
        </text>
      </svg>
    </span>
  );
}

export default FrameWordmark;


