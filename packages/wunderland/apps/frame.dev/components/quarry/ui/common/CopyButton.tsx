/**
 * CopyButton - Icon-only copy button with tooltip
 * 
 * Shows just an icon with "Copy" tooltip on hover
 * Shows checkmark + "Copied!" on success
 * Optional dropdown for multiple formats
 * 
 * @module codex/ui/CopyButton
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Copy, Check, ChevronDown, FileJson, FileText, FileCode } from 'lucide-react'
import { createPortal } from 'react-dom'

export interface CopyOption {
  id: string
  label: string
  icon?: React.ReactNode
  getData: () => string
}

interface CopyButtonProps {
  /** Primary copy action - what happens on main button click */
  primary: CopyOption
  /** Additional copy options shown in dropdown */
  options?: CopyOption[]
  /** Size variant */
  size?: 'xs' | 'sm'
  /** Optional className */
  className?: string
}

export default function CopyButton({
  primary,
  options = [],
  size = 'xs',
  className = '',
}: CopyButtonProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const hasOptions = options.length > 0
  const isCopied = copiedId === primary.id

  // Calculate dropdown position when opened
  const updateDropdownPosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 140), // 140px = min-width, 8px from edge
      })
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    
    const handleScroll = () => {
      if (dropdownOpen) updateDropdownPosition()
    }
    
    if (dropdownOpen) {
      updateDropdownPosition()
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', updateDropdownPosition)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', updateDropdownPosition)
      }
    }
  }, [dropdownOpen, updateDropdownPosition])

  const handleCopy = async (option: CopyOption) => {
    try {
      const data = option.getData()
      await navigator.clipboard.writeText(data)
      setCopiedId(option.id)
      setTimeout(() => setCopiedId(null), 1500)
      setDropdownOpen(false)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const iconSize = size === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const buttonSize = size === 'xs' ? 'p-1' : 'p-1.5'

  return (
    <div className={`relative inline-flex ${className}`} ref={dropdownRef}>
      {/* Main copy button - icon only */}
      <button
        onClick={() => handleCopy(primary)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          relative inline-flex items-center justify-center ${buttonSize}
          rounded ${!hasOptions ? '' : 'rounded-r-none'}
          text-zinc-500 dark:text-zinc-400 
          hover:bg-zinc-100 dark:hover:bg-zinc-800 
          hover:text-zinc-700 dark:hover:text-zinc-200
          transition-colors
        `}
        aria-label={primary.label}
      >
        {isCopied ? (
          <Check className={`${iconSize} text-emerald-500`} />
        ) : (
          <Copy className={iconSize} />
        )}
        
        {/* Tooltip */}
        {(showTooltip || isCopied) && !dropdownOpen && (
          <span className={`
            absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5
            px-2 py-1 text-[10px] font-medium whitespace-nowrap
            rounded shadow-lg z-50
            ${isCopied 
              ? 'bg-emerald-600 text-white' 
              : 'bg-zinc-800 dark:bg-zinc-700 text-white'
            }
          `}>
            {isCopied ? 'Copied!' : 'Copy'}
            {/* Arrow */}
            <span className={`
              absolute top-full left-1/2 -translate-x-1/2
              border-4 border-transparent
              ${isCopied ? 'border-t-emerald-600' : 'border-t-zinc-800 dark:border-t-zinc-700'}
            `} />
          </span>
        )}
      </button>

      {/* Dropdown trigger */}
      {hasOptions && (
        <>
          <button
            ref={triggerRef}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`
              inline-flex items-center justify-center px-0.5 ${buttonSize}
              rounded-r border-l border-zinc-200 dark:border-zinc-700
              text-zinc-400 dark:text-zinc-500 
              hover:bg-zinc-100 dark:hover:bg-zinc-800 
              hover:text-zinc-600 dark:hover:text-zinc-300
              transition-colors
            `}
            title="More copy options"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown menu - rendered via portal for z-index escape */}
          {dropdownOpen && typeof document !== 'undefined' && createPortal(
            <div 
              ref={dropdownRef}
              className="fixed z-[9999] min-w-[140px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl py-1"
              style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
            >
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleCopy(option)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {option.icon || <FileText className="w-3.5 h-3.5 text-zinc-400" />}
                  <span className="flex-1">{option.label}</span>
                  {copiedId === option.id && <Check className="w-3 h-3 text-emerald-500" />}
                </button>
              ))}
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  )
}

// Pre-built icon components for common formats
export const CopyIcons = {
  json: <FileJson className="w-3 h-3 text-amber-500" />,
  text: <FileText className="w-3 h-3 text-zinc-500" />,
  markdown: <FileCode className="w-3 h-3 text-blue-500" />,
  code: <FileCode className="w-3 h-3 text-emerald-500" />,
}




