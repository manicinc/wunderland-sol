import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SectionLabelProps = {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  tone?: 'accent' | 'muted';
};

/**
 * Shared high-contrast pill used for section subtitles/badges.
 */
export function SectionLabel({ children, icon, className, tone = 'accent' }: SectionLabelProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide',
        tone === 'accent'
          ? 'border border-[var(--color-border-interactive)] bg-[var(--color-background-elevated)]/80 text-[var(--color-accent-primary)] shadow-[0_12px_30px_rgba(12,10,41,0.18)] backdrop-blur'
          : 'border border-[var(--color-border-subtle)] bg-[var(--color-background-glass)]/70 text-[var(--color-text-secondary)]',
        className
      )}
    >
      {icon && <span className="inline-flex text-current">{icon}</span>}
      <span className="text-current">{children}</span>
    </div>
  );
}

