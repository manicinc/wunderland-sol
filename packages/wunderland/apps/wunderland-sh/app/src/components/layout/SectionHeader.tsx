'use client';

import Link from 'next/link';

const GRADIENT_CLASSES = {
  sol: 'sol-gradient-text',
  cyan: 'cyber-gradient-text',
  gold: 'deco-gradient-text',
  green: 'matrix-gradient-text',
} as const;

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  gradient?: keyof typeof GRADIENT_CLASSES;
  align?: 'left' | 'center';
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function SectionHeader({
  title,
  subtitle,
  gradient = 'sol',
  align = 'left',
  backHref,
  backLabel,
  actions,
  className = '',
}: SectionHeaderProps) {
  const alignClass = align === 'center' ? 'text-center' : '';

  return (
    <div className={`mb-6 sm:mb-8 ${className}`}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-3"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-60">
            <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {backLabel || 'Back'}
        </Link>
      )}

      <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 ${alignClass}`}>
        <div className={align === 'center' ? 'flex-1' : ''}>
          <h1 className={`font-display font-bold text-2xl sm:text-3xl ${GRADIENT_CLASSES[gradient]}`}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-[var(--text-secondary)] text-sm sm:text-base mt-1 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      <div className="section-header-line" />
    </div>
  );
}
