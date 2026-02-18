/**
 * @file RabbitHoleLogo.tsx
 * @description Rabbit Hole brand logo with typography
 * Uses Cormorant Garamond for "RABBIT HOLE" and Tenor Sans for "INC" and tagline
 */

'use client';

import React from 'react';
import { KeyholeIcon } from './KeyholeIcon';
import styles from './RabbitHoleLogo.module.scss';

type LogoVariant = 'full' | 'compact' | 'icon' | 'wordmark';
type LogoSize = 'sm' | 'md' | 'lg';

interface RabbitHoleLogoProps {
  /** Logo variant: full (icon + text + tagline), compact (icon + text), icon only, or wordmark only */
  variant?: LogoVariant;
  /** Show tagline below the logo text */
  showTagline?: boolean;
  /** Custom tagline text */
  tagline?: string;
  /** Logo size preset */
  size?: LogoSize;
  /** Additional CSS classes */
  className?: string;
  /** Link destination (wraps logo in anchor) */
  href?: string;
}

const SIZE_CONFIG: Record<LogoSize, { icon: number; text: string; tagline: string; gap: string }> = {
  sm: { icon: 32, text: '1rem', tagline: '0.5rem', gap: '0.5rem' },
  md: { icon: 48, text: '1.5rem', tagline: '0.6rem', gap: '0.75rem' },
  lg: { icon: 64, text: '2rem', tagline: '0.75rem', gap: '1rem' },
};

export function RabbitHoleLogo({
  variant = 'full',
  showTagline = true,
  tagline = "FOUNDER'S CLUB",
  size = 'md',
  className,
  href,
}: RabbitHoleLogoProps) {
  const config = SIZE_CONFIG[size];

  const showIcon = variant !== 'wordmark';
  const showText = variant !== 'icon';
  const showTaglineText = showTagline && (variant === 'full');

  const logoContent = (
    <div
      className={`${styles.logo} ${styles[`logo--${size}`]} ${className || ''}`}
      style={{ gap: config.gap }}
    >
      {showIcon && (
        <KeyholeIcon size={config.icon} className={styles.icon} id={`logo-${size}`} />
      )}

      {showText && (
        <div className={styles.text}>
          <div className={styles.wordmark}>
            <span className={styles.name} style={{ fontSize: config.text }}>
              RABBIT{' '}
            </span>
            <span style={{ whiteSpace: 'nowrap' }}>
              <span className={styles.name} style={{ fontSize: config.text }}>
                HOLE
              </span>
              {' '}
              <span className={styles.inc} style={{ fontSize: `calc(${config.text} * 0.4)`, verticalAlign: 'baseline' }}>
                INC
              </span>
            </span>
          </div>

          {showTaglineText && (
            <span className={styles.tagline} style={{ fontSize: config.tagline }}>
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} className={styles.link}>
        {logoContent}
      </a>
    );
  }

  return logoContent;
}

export default RabbitHoleLogo;
