'use client';

import Link from 'next/link';
import { WunderlandIcon } from './WunderlandIcon';

interface WunderlandLogoProps {
  variant?: 'full' | 'compact' | 'icon' | 'wordmark';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  tagline?: string;
  showParentBadge?: boolean;
  href?: string;
  className?: string;
  colorVariant?: 'neon' | 'gold' | 'monochrome';
  forLight?: boolean;
}

const SIZES = {
  sm: { icon: 32, text: '1.125rem', tagline: '0.5rem', badge: '0.5rem' },
  md: { icon: 48, text: '1.5rem', tagline: '0.625rem', badge: '0.55rem' },
  lg: { icon: 64, text: '2.25rem', tagline: '0.75rem', badge: '0.6rem' },
};

export function WunderlandLogo({
  variant = 'full',
  size = 'md',
  showTagline = true,
  tagline = 'AUTONOMOUS AGENTS',
  showParentBadge = false,
  href,
  className = '',
  colorVariant = 'neon',
  forLight = false,
}: WunderlandLogoProps) {
  const sizeConfig = SIZES[size];

  const textGradient =
    colorVariant === 'neon'
      ? 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 40%, #c9a227 70%, #eab308 100%)'
      : colorVariant === 'gold'
        ? 'linear-gradient(135deg, #92702a 0%, #c9a227 50%, #eab308 100%)'
        : forLight
          ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
          : 'linear-gradient(135deg, #e2e8f0 0%, #f1f5f9 100%)';

  const taglineColor =
    colorVariant === 'neon'
      ? forLight
        ? 'rgba(14, 165, 233, 0.7)'
        : 'rgba(125, 211, 252, 0.6)'
      : colorVariant === 'gold'
        ? forLight
          ? 'rgba(161, 98, 7, 0.8)'
          : 'rgba(234, 179, 8, 0.7)'
        : forLight
          ? 'rgba(30, 41, 59, 0.6)'
          : 'rgba(226, 232, 240, 0.5)';

  const content = (
    <div className={`wl-logo wl-logo--${variant} ${className}`} style={{ display: 'flex', alignItems: 'center', gap: size === 'sm' ? '0.5rem' : '0.75rem' }}>
      {/* Icon */}
      {variant !== 'wordmark' && (
        <WunderlandIcon
          size={sizeConfig.icon}
          id={`logo-${size}`}
          variant={colorVariant}
          forLight={forLight}
        />
      )}

      {/* Text content */}
      {variant !== 'icon' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
          {/* WUNDERLAND wordmark */}
          <span
            className="wl-logo-wordmark"
            style={{
              fontFamily: "'Syne', system-ui, sans-serif",
              fontSize: sizeConfig.text,
              fontWeight: 700,
              letterSpacing: '0.08em',
              background: textGradient,
              lineHeight: 1,
            }}
          >
            WUNDERLAND
          </span>

          {/* Tagline */}
          {variant === 'full' && showTagline && (
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: sizeConfig.tagline,
                fontWeight: 400,
                letterSpacing: '0.15em',
                color: taglineColor,
                lineHeight: 1.2,
                marginTop: '0.125rem',
              }}
            >
              {tagline}
            </span>
          )}

          {/* Rabbit Hole Inc badge */}
          {variant === 'full' && showParentBadge && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                marginTop: '0.5rem',
                padding: '0.25rem 0.625rem',
                background: forLight ? 'rgba(199, 165, 66, 0.1)' : 'rgba(199, 165, 66, 0.12)',
                border: `1px solid ${forLight ? 'rgba(199, 165, 66, 0.25)' : 'rgba(199, 165, 66, 0.2)'}`,
                borderRadius: '4px',
                width: 'fit-content',
              }}
            >
              {/* Keyhole icon */}
              <svg width="12" height="12" viewBox="0 0 100 100" style={{ opacity: 0.8 }}>
                <path
                  d="M 50 6 C 72 6, 90 24, 90 46 C 90 62, 78 76, 62 80 L 62 82 C 62 84, 60 86, 58 86 L 58 94 L 42 94 L 42 86 C 40 86, 38 84, 38 82 L 38 80 C 22 76, 10 62, 10 46 C 10 24, 28 6, 50 6 Z"
                  fill="#c7a542"
                />
              </svg>
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: sizeConfig.badge,
                  fontWeight: 400,
                  letterSpacing: '0.12em',
                  color: forLight ? 'rgba(161, 98, 7, 0.85)' : 'rgba(234, 179, 8, 0.8)',
                }}
              >
                RABBIT HOLE INC
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none' }}>
        {content}
      </Link>
    );
  }

  return content;
}
