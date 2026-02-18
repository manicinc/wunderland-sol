import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * LinkButton - Button-styled Link component
 * Uses same visual treatment as Button but navigates instead of submitting
 */

type LinkButtonVariant = 'primary' | 'secondary' | 'ghost';
type LinkButtonSize = 'sm' | 'md' | 'lg';

interface LinkButtonProps extends React.ComponentProps<typeof Link> {
  variant?: LinkButtonVariant;
  size?: LinkButtonSize;
  children: React.ReactNode;
}

const variantStyles: Record<LinkButtonVariant, string> = {
  primary: `
    relative overflow-hidden
    bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)]
    text-white
    shadow-lg shadow-[var(--color-accent-primary)]/20
    hover:shadow-xl hover:shadow-[var(--color-accent-primary)]/30
    hover:brightness-110
    active:scale-[0.98]
    transition-all duration-200
  `,
  
  secondary: `
    relative
    bg-[var(--color-background-card)]
    backdrop-blur-xl
    border-2 border-[var(--color-border-primary)]
    text-[var(--color-text-primary)]
    shadow-sm
    hover:bg-[var(--color-accent-primary)]/10
    hover:border-[var(--color-accent-primary)]
    hover:text-[var(--color-accent-primary)]
    active:scale-[0.98]
    transition-all duration-200
  `,
  
  ghost: `
    relative
    text-[var(--color-accent-primary)]
    hover:text-[var(--color-accent-secondary)]
    hover:underline underline-offset-4
    transition-all duration-200
  `
};

const sizeStyles: Record<LinkButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm font-medium',
  md: 'px-5 py-2.5 text-base font-semibold',
  lg: 'px-6 py-3 text-lg font-semibold'
};

export const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    return (
      <Link
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2',
          'rounded-lg',
          'font-[family-name:var(--font-grotesk)]',
          'transition-all',
          'focus-visible:outline-none',
          'focus-visible:ring-2',
          'focus-visible:ring-[var(--color-accent-primary)]',
          'focus-visible:ring-offset-2',
          'no-underline',
          
          // Variant styles
          variantStyles[variant],
          
          // Size styles
          sizeStyles[size],
          
          // Custom classes
          className
        )}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

LinkButton.displayName = 'LinkButton';

