/**
 * Button Component
 * @module components/ui/button
 *
 * @description
 * A comprehensive, accessible button component following the FRAME design system.
 * Supports multiple variants, sizes, states, and compositions.
 *
 * Built with:
 * - Full keyboard accessibility
 * - Loading states with spinners
 * - Icon support (left/right positioning)
 * - Dark mode support
 * - Motion-safe animations
 * - Touch-optimized targets
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Button onClick={handleClick}>Click me</Button>
 *
 * // With variant and size
 * <Button variant="ghost" size="sm">Small Ghost</Button>
 *
 * // With loading state
 * <Button isLoading loadingText="Saving...">Save</Button>
 *
 * // Icon button
 * <Button variant="ghost" size="icon"><Settings /></Button>
 *
 * // With left icon
 * <Button leftIcon={<Plus />}>Add Item</Button>
 * ```
 */

'use client'

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// VARIANT STYLES
// ============================================================================

const baseStyles = [
  'inline-flex items-center justify-center gap-2',
  'font-medium transition-all duration-200',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  'disabled:pointer-events-none disabled:opacity-50',
  'select-none touch-manipulation',
  'motion-safe:active:scale-[0.98]',
].join(' ')

const variantStyles = {
  // Primary/Default - main CTA button
  default: [
    'bg-emerald-600 text-white shadow-sm',
    'hover:bg-emerald-700',
    'focus-visible:ring-emerald-500',
    'dark:bg-emerald-500 dark:hover:bg-emerald-600',
  ].join(' '),

  // Secondary - less prominent actions
  secondary: [
    'bg-zinc-100 text-zinc-900',
    'hover:bg-zinc-200',
    'focus-visible:ring-zinc-500',
    'dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
  ].join(' '),

  // Outline - bordered button
  outline: [
    'border border-zinc-300 bg-transparent text-zinc-700',
    'hover:bg-zinc-50 hover:border-zinc-400',
    'focus-visible:ring-zinc-500',
    'dark:border-zinc-600 dark:text-zinc-300',
    'dark:hover:bg-zinc-800 dark:hover:border-zinc-500',
  ].join(' '),

  // Ghost - minimal, icon-friendly
  ghost: [
    'bg-transparent text-zinc-600',
    'hover:bg-zinc-100 hover:text-zinc-900',
    'focus-visible:ring-zinc-500',
    'dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
  ].join(' '),

  // Link - appears as a link
  link: [
    'text-emerald-600 underline-offset-4',
    'hover:underline hover:text-emerald-700',
    'focus-visible:ring-emerald-500',
    'dark:text-emerald-400 dark:hover:text-emerald-300',
  ].join(' '),

  // Destructive - dangerous actions
  destructive: [
    'bg-red-600 text-white shadow-sm',
    'hover:bg-red-700',
    'focus-visible:ring-red-500',
    'dark:bg-red-600 dark:hover:bg-red-700',
  ].join(' '),

  // Destructive outline
  destructiveOutline: [
    'border border-red-300 bg-transparent text-red-600',
    'hover:bg-red-50 hover:border-red-400',
    'focus-visible:ring-red-500',
    'dark:border-red-700 dark:text-red-400',
    'dark:hover:bg-red-950 dark:hover:border-red-600',
  ].join(' '),

  // Success - positive actions
  success: [
    'bg-emerald-600 text-white shadow-sm',
    'hover:bg-emerald-700',
    'focus-visible:ring-emerald-500',
  ].join(' '),

  // Warning - cautionary actions
  warning: [
    'bg-amber-500 text-white shadow-sm',
    'hover:bg-amber-600',
    'focus-visible:ring-amber-500',
  ].join(' '),

  // Cyan accent - brand secondary
  cyan: [
    'bg-cyan-600 text-white shadow-sm',
    'hover:bg-cyan-700',
    'focus-visible:ring-cyan-500',
    'dark:bg-cyan-500 dark:hover:bg-cyan-600',
  ].join(' '),

  // Subtle - very minimal
  subtle: [
    'bg-zinc-50 text-zinc-600',
    'hover:bg-zinc-100 hover:text-zinc-900',
    'dark:bg-zinc-900 dark:text-zinc-400',
    'dark:hover:bg-zinc-800 dark:hover:text-zinc-200',
  ].join(' '),
} as const

const sizeStyles = {
  xs: 'h-7 px-2 text-xs rounded',
  sm: 'h-8 px-3 text-sm rounded-md',
  default: 'h-10 px-4 text-sm rounded-md',
  lg: 'h-12 px-6 text-base rounded-lg',
  xl: 'h-14 px-8 text-lg rounded-lg',
  // Icon buttons - square
  icon: 'h-10 w-10 rounded-md',
  iconSm: 'h-8 w-8 rounded-md',
  iconXs: 'h-6 w-6 rounded',
  iconLg: 'h-12 w-12 rounded-lg',
  // Touch-optimized (44px minimum - iOS/Android guidelines)
  touch: 'min-h-[44px] min-w-[44px] px-4 text-sm rounded-lg',
  touchLg: 'min-h-[48px] min-w-[48px] px-6 text-base rounded-lg',
} as const

// ============================================================================
// TYPES
// ============================================================================

export type ButtonVariant = keyof typeof variantStyles
export type ButtonSize = keyof typeof sizeStyles

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: ButtonVariant
  /** Size of the button */
  size?: ButtonSize
  /** Whether the button should take full width */
  fullWidth?: boolean
  /** Border radius override */
  rounded?: 'default' | 'full' | 'none'
  /** Loading state - shows spinner and disables button */
  isLoading?: boolean
  /** Text to show while loading (replaces children) */
  loadingText?: string
  /** Icon to show on the left side */
  leftIcon?: ReactNode
  /** Icon to show on the right side */
  rightIcon?: ReactNode
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getButtonClasses({
  variant = 'default',
  size = 'default',
  fullWidth = false,
  rounded = 'default',
  className,
}: Pick<ButtonProps, 'variant' | 'size' | 'fullWidth' | 'rounded' | 'className'>): string {
  const roundedStyles = {
    default: '', // uses size-specific rounding
    full: 'rounded-full',
    none: 'rounded-none',
  }

  return cn(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    fullWidth && 'w-full',
    roundedStyles[rounded],
    className
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Button component with multiple variants, sizes, and states.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      fullWidth = false,
      rounded = 'default',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading

    const iconSize = 
      size === 'xs' || size === 'iconXs' ? 'h-3 w-3' :
      size === 'sm' || size === 'iconSm' ? 'h-3.5 w-3.5' :
      size === 'lg' || size === 'xl' || size === 'iconLg' ? 'h-5 w-5' :
      'h-4 w-4'

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={getButtonClasses({ variant, size, fullWidth, rounded, className })}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        {...props}
      >
        {/* Loading spinner */}
        {isLoading && (
          <Loader2
            className={cn('animate-spin', iconSize)}
            aria-hidden="true"
          />
        )}

        {/* Left icon (hidden when loading) */}
        {!isLoading && leftIcon && (
          <span className="shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )}

        {/* Button content */}
        {isLoading && loadingText ? (
          <span>{loadingText}</span>
        ) : (
          children
        )}

        {/* Right icon */}
        {rightIcon && !isLoading && (
          <span className="shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

// ============================================================================
// ICON BUTTON SHORTHAND
// ============================================================================

export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon'> {
  /** Icon to render */
  icon: ReactNode
  /** Accessible label (required for icon-only buttons) */
  'aria-label': string
}

/**
 * Icon-only button with required aria-label for accessibility.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'icon', variant = 'ghost', className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn('p-0', className)}
        {...props}
      >
        {icon}
      </Button>
    )
  }
)

IconButton.displayName = 'IconButton'

// ============================================================================
// BUTTON GROUP
// ============================================================================

export interface ButtonGroupProps {
  children: ReactNode
  /** Attach buttons together */
  attached?: boolean
  /** Orientation */
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

/**
 * Groups buttons together with optional attached styling.
 */
export function ButtonGroup({
  children,
  attached = false,
  orientation = 'horizontal',
  className,
}: ButtonGroupProps) {
  const attachedHorizontalStyles = [
    '[&>button]:rounded-none',
    '[&>button:first-child]:rounded-l-md',
    '[&>button:last-child]:rounded-r-md',
    '[&>button:not(:first-child)]:-ml-px',
  ].join(' ')

  const attachedVerticalStyles = [
    '[&>button]:rounded-none',
    '[&>button:first-child]:rounded-t-md',
    '[&>button:last-child]:rounded-b-md',
    '[&>button:not(:first-child)]:-mt-px',
  ].join(' ')

  return (
    <div
      role="group"
      className={cn(
        'inline-flex',
        orientation === 'vertical' ? 'flex-col' : 'flex-row',
        attached && orientation === 'horizontal' && attachedHorizontalStyles,
        attached && orientation === 'vertical' && attachedVerticalStyles,
        !attached && 'gap-2',
        className
      )}
    >
      {children}
    </div>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export default Button
