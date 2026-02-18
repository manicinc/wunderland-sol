/**
 * Skeleton Loading Components
 * @module components/quarry/ui/common/Skeleton
 * 
 * @description
 * Animated skeleton placeholders for better perceived performance.
 * Respects prefers-reduced-motion for accessibility.
 * 
 * @example
 * ```tsx
 * // Basic skeleton
 * <Skeleton className="h-4 w-32" />
 * 
 * // Flashcard skeleton
 * <FlashcardSkeleton />
 * 
 * // Quiz question skeleton
 * <QuizQuestionSkeleton />
 * ```
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// BASE SKELETON
// ============================================================================

export interface SkeletonProps {
  className?: string
  /** Whether to animate (respects prefers-reduced-motion) */
  animate?: boolean
  /** Variant style */
  variant?: 'default' | 'circular' | 'text' | 'rectangular'
  /** Width (can be number in px or string like '100%') */
  width?: number | string
  /** Height (can be number in px or string like '2rem') */
  height?: number | string
}

export function Skeleton({
  className,
  animate = true,
  variant = 'default',
  width,
  height,
}: SkeletonProps) {
  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-700',
        animate && 'animate-pulse motion-reduce:animate-none',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'rounded h-4',
        variant === 'rectangular' && 'rounded-lg',
        variant === 'default' && 'rounded',
        className
      )}
      style={style}
      aria-hidden="true"
    />
  )
}

// ============================================================================
// FLASHCARD SKELETON
// ============================================================================

export interface FlashcardSkeletonProps {
  /** Dark mode */
  isDark?: boolean
  /** Number of cards to show */
  count?: number
  /** Compact mode (smaller cards) */
  compact?: boolean
  className?: string
}

export function FlashcardSkeleton({
  isDark = false,
  count = 1,
  compact = false,
  className,
}: FlashcardSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-xl border p-4',
            isDark 
              ? 'bg-gray-800/50 border-gray-700' 
              : 'bg-white border-gray-200',
            compact ? 'p-3' : 'p-5'
          )}
        >
          {/* Card header */}
          <div className="flex items-center justify-between mb-4">
            <Skeleton 
              className={cn(
                isDark ? 'bg-gray-700' : 'bg-gray-200',
                compact ? 'h-3 w-16' : 'h-4 w-20'
              )} 
            />
            <Skeleton 
              className={cn(
                isDark ? 'bg-gray-700' : 'bg-gray-200',
                'h-5 w-5 rounded-full'
              )} 
            />
          </div>
          
          {/* Card front text */}
          <div className="space-y-2 mb-6">
            <Skeleton 
              className={cn(
                isDark ? 'bg-gray-700' : 'bg-gray-200',
                compact ? 'h-4 w-full' : 'h-5 w-full'
              )} 
            />
            <Skeleton 
              className={cn(
                isDark ? 'bg-gray-700' : 'bg-gray-200',
                compact ? 'h-4 w-3/4' : 'h-5 w-4/5'
              )} 
            />
          </div>
          
          {/* Card tags */}
          <div className="flex gap-2">
            <Skeleton 
              className={cn(
                isDark ? 'bg-gray-700' : 'bg-gray-200',
                'h-5 w-12 rounded-full'
              )} 
            />
            <Skeleton 
              className={cn(
                isDark ? 'bg-gray-700' : 'bg-gray-200',
                'h-5 w-16 rounded-full'
              )} 
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// QUIZ QUESTION SKELETON
// ============================================================================

export interface QuizQuestionSkeletonProps {
  isDark?: boolean
  /** Question type affects layout */
  type?: 'multiple_choice' | 'true_false' | 'fill_blank'
  className?: string
}

export function QuizQuestionSkeleton({
  isDark = false,
  type = 'multiple_choice',
  className,
}: QuizQuestionSkeletonProps) {
  const bgColor = isDark ? 'bg-gray-700' : 'bg-gray-200'
  const optionCount = type === 'true_false' ? 2 : 4
  
  return (
    <div className={cn('space-y-6', className)}>
      {/* Question text */}
      <div className="space-y-2">
        <Skeleton className={cn(bgColor, 'h-6 w-full')} />
        <Skeleton className={cn(bgColor, 'h-6 w-4/5')} />
      </div>
      
      {/* Answer options */}
      {type === 'fill_blank' ? (
        <Skeleton className={cn(bgColor, 'h-12 w-full rounded-lg')} />
      ) : (
        <div className="space-y-3">
          {Array.from({ length: optionCount }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'rounded-lg border p-4 flex items-center gap-3',
                isDark ? 'border-gray-600' : 'border-gray-200'
              )}
            >
              <Skeleton 
                className={cn(bgColor, 'h-5 w-5 rounded-full flex-shrink-0')} 
              />
              <Skeleton 
                className={cn(bgColor, 'h-4 flex-1')} 
                width="75%"
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Progress indicator */}
      <div className="flex items-center justify-between pt-4">
        <Skeleton className={cn(bgColor, 'h-4 w-24')} />
        <Skeleton className={cn(bgColor, 'h-10 w-24 rounded-lg')} />
      </div>
    </div>
  )
}

// ============================================================================
// GLOSSARY TERM SKELETON
// ============================================================================

export interface GlossaryTermSkeletonProps {
  isDark?: boolean
  count?: number
  className?: string
}

export function GlossaryTermSkeleton({
  isDark = false,
  count = 3,
  className,
}: GlossaryTermSkeletonProps) {
  const bgColor = isDark ? 'bg-gray-700' : 'bg-gray-200'
  
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-lg border p-4',
            isDark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'
          )}
        >
          {/* Term header */}
          <div className="flex items-center justify-between mb-2">
            <Skeleton className={cn(bgColor, 'h-5 w-32')} />
            <Skeleton className={cn(bgColor, 'h-4 w-16 rounded-full')} />
          </div>
          
          {/* Definition */}
          <div className="space-y-1.5">
            <Skeleton className={cn(bgColor, 'h-4 w-full')} />
            <Skeleton className={cn(bgColor, 'h-4 w-5/6')} />
            <Skeleton className={cn(bgColor, 'h-4 w-2/3')} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// LEARNING CARD GRID SKELETON
// ============================================================================

export interface CardGridSkeletonProps {
  isDark?: boolean
  columns?: 1 | 2 | 3
  count?: number
  className?: string
}

export function CardGridSkeleton({
  isDark = false,
  columns = 2,
  count = 4,
  className,
}: CardGridSkeletonProps) {
  const bgColor = isDark ? 'bg-gray-700' : 'bg-gray-200'
  
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-xl border p-5',
            isDark 
              ? 'border-gray-700 bg-gray-800/50' 
              : 'border-gray-200 bg-white'
          )}
        >
          {/* Icon placeholder */}
          <Skeleton className={cn(bgColor, 'h-10 w-10 rounded-lg mb-4')} />
          
          {/* Title */}
          <Skeleton className={cn(bgColor, 'h-5 w-3/4 mb-2')} />
          
          {/* Description */}
          <div className="space-y-1.5 mb-4">
            <Skeleton className={cn(bgColor, 'h-3 w-full')} />
            <Skeleton className={cn(bgColor, 'h-3 w-5/6')} />
          </div>
          
          {/* Footer stats */}
          <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
            <Skeleton className={cn(bgColor, 'h-4 w-16')} />
            <Skeleton className={cn(bgColor, 'h-4 w-12')} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// LIST ITEM SKELETON
// ============================================================================

export interface ListItemSkeletonProps {
  isDark?: boolean
  count?: number
  /** Include avatar/icon */
  hasAvatar?: boolean
  /** Include secondary action */
  hasAction?: boolean
  className?: string
}

export function ListItemSkeleton({
  isDark = false,
  count = 3,
  hasAvatar = true,
  hasAction = false,
  className,
}: ListItemSkeletonProps) {
  const bgColor = isDark ? 'bg-gray-700' : 'bg-gray-200'
  
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg',
            isDark ? 'bg-gray-800/30' : 'bg-gray-50'
          )}
        >
          {hasAvatar && (
            <Skeleton className={cn(bgColor, 'h-10 w-10 rounded-full flex-shrink-0')} />
          )}
          
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className={cn(bgColor, 'h-4 w-2/3')} />
            <Skeleton className={cn(bgColor, 'h-3 w-1/2')} />
          </div>
          
          {hasAction && (
            <Skeleton className={cn(bgColor, 'h-8 w-8 rounded-lg flex-shrink-0')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// STAT CARD SKELETON
// ============================================================================

export interface StatCardSkeletonProps {
  isDark?: boolean
  count?: number
  className?: string
}

export function StatCardSkeleton({
  isDark = false,
  count = 4,
  className,
}: StatCardSkeletonProps) {
  const bgColor = isDark ? 'bg-gray-700' : 'bg-gray-200'
  
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-lg border p-4',
            isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
          )}
        >
          <Skeleton className={cn(bgColor, 'h-3 w-16 mb-2')} />
          <Skeleton className={cn(bgColor, 'h-7 w-20')} />
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// CONTENT SKELETON
// ============================================================================

export interface ContentSkeletonProps {
  isDark?: boolean
  className?: string
}

export function ContentSkeleton({
  isDark = false,
  className,
}: ContentSkeletonProps) {
  const bgColor = isDark ? 'bg-gray-700' : 'bg-gray-200'

  return (
    <div className={cn('space-y-6 p-6', className)}>
      {/* Title */}
      <Skeleton className={cn(bgColor, 'h-8 w-2/3')} />
      
      {/* Paragraphs */}
      <div className="space-y-3">
        <Skeleton className={cn(bgColor, 'h-4 w-full')} />
        <Skeleton className={cn(bgColor, 'h-4 w-full')} />
        <Skeleton className={cn(bgColor, 'h-4 w-4/5')} />
      </div>
      
      {/* Subheading */}
      <Skeleton className={cn(bgColor, 'h-6 w-1/3 mt-8')} />
      
      {/* More paragraphs */}
      <div className="space-y-3">
        <Skeleton className={cn(bgColor, 'h-4 w-full')} />
        <Skeleton className={cn(bgColor, 'h-4 w-5/6')} />
        <Skeleton className={cn(bgColor, 'h-4 w-full')} />
        <Skeleton className={cn(bgColor, 'h-4 w-3/4')} />
      </div>
    </div>
  )
}

// ============================================================================
// KNOWLEDGE TREE SKELETON
// ============================================================================

export interface KnowledgeTreeSkeletonProps {
  isDark?: boolean
  count?: number
  className?: string
}

export function KnowledgeTreeSkeleton({
  isDark = false,
  count = 5,
  className,
}: KnowledgeTreeSkeletonProps) {
  const bgColor = isDark ? 'bg-gray-700' : 'bg-gray-200'

  return (
    <div className={cn('space-y-2 p-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${(i % 3) * 16}px` }}>
          <Skeleton className={cn(bgColor, 'h-4 w-4 rounded')} />
          <Skeleton className={cn(bgColor, 'h-4 flex-1', `w-${20 + Math.floor(Math.random() * 40)}`)} />
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// FILE LIST SKELETON
// ============================================================================

export interface FileListSkeletonProps {
  isDark?: boolean
  count?: number
  className?: string
}

export function FileListSkeleton({
  isDark = false,
  count = 6,
  className,
}: FileListSkeletonProps) {
  const bgColor = isDark ? 'bg-gray-700' : 'bg-gray-200'

  return (
    <div className={cn('space-y-1', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-3 p-2 rounded-lg',
            isDark ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'
          )}
        >
          <Skeleton className={cn(bgColor, 'h-5 w-5 rounded flex-shrink-0')} />
          <Skeleton className={cn(bgColor, 'h-4 flex-1')} width="70%" />
        </div>
      ))}
    </div>
  )
}
