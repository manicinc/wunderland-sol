/**
 * BacklinkList Component
 *
 * Displays reverse references to the current strand, showing which other
 * strands link to or mention this one.
 *
 * @module backlink-list
 *
 * @remarks
 * Currently uses a naive implementation that checks if other files' paths
 * contain the current path. In production, this should parse front-matter
 * `relationships.references` arrays for accurate backlinks.
 */

'use client'

import React from 'react'
import { Link2 } from 'lucide-react'

interface BacklinkListProps {
  /** Current file path to find backlinks for */
  currentPath: string
  /** All files in the repository */
  files: Array<{ path: string; name: string; type: string }>
  /** Optional click handler for backlink navigation */
  onBacklinkClick?: (path: string) => void
}

/**
 * Renders a list of files that reference the current strand
 */
export default function BacklinkList({ currentPath, files, onBacklinkClick }: BacklinkListProps) {
  // Naive implementation: find files that might reference this one
  // TODO: Parse front-matter relationships.references for accurate backlinks
  const backlinks = files.filter((f) =>
    f.path !== currentPath &&
    f.type === 'file' &&
    (f.name.endsWith('.md') || f.name.endsWith('.mdx'))
  ).slice(0, 10) // Limit to 10 for performance

  if (!backlinks.length) {
    return (
      <div className="text-center py-6">
        <div className="inline-flex p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 mb-2">
          <Link2 className="w-4 h-4 text-zinc-400" />
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
          No references yet
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-1 -mx-2">
      {backlinks.map((b) => {
        const cleanName = b.name.replace(/\.(md|mdx)$/, '').replace(/-/g, ' ')
        const pathParts = b.path.split('/')
        const loomName = pathParts.length > 2 ? pathParts[pathParts.length - 3] : ''
        const href = `/quarry/${b.path.replace(/\.md$/, '')}`

        const handleClick = (e: React.MouseEvent) => {
          if (onBacklinkClick) {
            e.preventDefault()
            onBacklinkClick(b.path)
          }
        }

        return (
          <li key={b.path}>
            <a
              href={href}
              onClick={handleClick}
              className="flex items-start gap-2 px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group cursor-pointer"
            >
              {/* Connection node icon */}
              <svg
                className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5 opacity-70 group-hover:opacity-100 transition-opacity"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="3" cy="8" r="2" fill="currentColor" />
                <circle cx="13" cy="8" r="2" fill="currentColor" />
                <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8" cy="8" r="1" fill="currentColor" />
              </svg>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate leading-tight">
                  {cleanName}
                </p>
                {loomName && (
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 opacity-70">
                    {loomName}
                  </p>
                )}
              </div>
            </a>
          </li>
        )
      })}
      {files.length > 10 && (
        <li className="text-center pt-1">
          <button className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline opacity-70 hover:opacity-100">
            View all
          </button>
        </li>
      )}
    </ul>
  )
}
