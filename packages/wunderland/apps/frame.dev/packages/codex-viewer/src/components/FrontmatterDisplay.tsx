/**
 * Frontmatter Display Component
 * Displays parsed YAML frontmatter in a styled, collapsible box
 * @module codex/FrontmatterDisplay
 */

'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import type { StrandMetadata } from '../lib/types'

interface FrontmatterDisplayProps {
  /** Parsed frontmatter metadata */
  metadata: Record<string, any>
  /** Whether frontmatter was found */
  hasFrontmatter: boolean
  /** Optional custom className */
  className?: string
}

/**
 * Display frontmatter metadata in a collapsible, styled box
 *
 * @remarks
 * - Shows metadata as key-value pairs
 * - Supports arrays, objects, primitives
 * - Collapsible for cleaner UI
 * - Analog paper styling
 *
 * @example
 * ```tsx
 * const { metadata, hasFrontmatter } = parseFrontmatter(content)
 *
 * <FrontmatterDisplay
 *   metadata={metadata}
 *   hasFrontmatter={hasFrontmatter}
 * />
 * ```
 */
export default function FrontmatterDisplay({
  metadata,
  hasFrontmatter,
  className = '',
}: FrontmatterDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Don't render if no frontmatter
  if (!hasFrontmatter || Object.keys(metadata).length === 0) {
    return null
  }

  /**
   * Format a value for display
   */
  const formatValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2)
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false'
    }
    return String(value)
  }

  return (
    <div className={`frontmatter-display ${className}`}>
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="frontmatter-header"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <FileText className="w-4 h-4" />
          <span className="font-semibold text-sm">Document Metadata</span>
        </div>
        <span className="text-xs opacity-60">
          {Object.keys(metadata).length} {Object.keys(metadata).length === 1 ? 'field' : 'fields'}
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="frontmatter-content">
          <dl className="metadata-list">
            {Object.entries(metadata).map(([key, value]) => (
              <div key={key} className="metadata-item">
                <dt className="metadata-key">{key}:</dt>
                <dd className="metadata-value">{formatValue(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <style jsx>{`
        .frontmatter-display {
          margin-bottom: 1.5rem;
          border: 2px solid rgba(100, 116, 139, 0.2);
          border-radius: 0.75rem;
          overflow: hidden;
          background: linear-gradient(
            135deg,
            rgba(248, 250, 252, 0.6) 0%,
            rgba(241, 245, 249, 0.6) 100%
          );
          box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }

        :global(.dark) .frontmatter-display {
          background: linear-gradient(
            135deg,
            rgba(15, 23, 42, 0.6) 0%,
            rgba(30, 41, 59, 0.6) 100%
          );
          border-color: rgba(148, 163, 184, 0.15);
          box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .frontmatter-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
          color: rgb(71, 85, 105);
        }

        :global(.dark) .frontmatter-header {
          color: rgb(203, 213, 225);
        }

        .frontmatter-header:hover {
          background-color: rgba(0, 0, 0, 0.02);
        }

        :global(.dark) .frontmatter-header:hover {
          background-color: rgba(255, 255, 255, 0.03);
        }

        .frontmatter-content {
          padding: 0 1rem 1rem 1rem;
          border-top: 1px solid rgba(100, 116, 139, 0.15);
        }

        :global(.dark) .frontmatter-content {
          border-top-color: rgba(148, 163, 184, 0.1);
        }

        .metadata-list {
          margin: 0.5rem 0 0 0;
          padding: 0;
        }

        .metadata-item {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.75rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(100, 116, 139, 0.08);
        }

        .metadata-item:last-child {
          border-bottom: none;
        }

        :global(.dark) .metadata-item {
          border-bottom-color: rgba(148, 163, 184, 0.05);
        }

        .metadata-key {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.813rem;
          font-weight: 600;
          color: rgb(99, 102, 241);
          margin: 0;
          white-space: nowrap;
        }

        :global(.dark) .metadata-key {
          color: rgb(167, 139, 250);
        }

        .metadata-value {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.813rem;
          color: rgb(71, 85, 105);
          margin: 0;
          word-break: break-word;
          white-space: pre-wrap;
        }

        :global(.dark) .metadata-value {
          color: rgb(203, 213, 225);
        }
      `}</style>
    </div>
  )
}
