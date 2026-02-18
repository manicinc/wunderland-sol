/**
 * BlockCommandPalette - Unified command menu for block insertion
 * @module quarry/ui/blockCommands/BlockCommandPalette
 *
 * Floating command palette that appears when:
 * 1. User clicks the "+" insert handle (insert mode)
 * 2. User types "/" in the editor (slash mode)
 *
 * Features:
 * - Fuzzy search filtering
 * - Category grouping
 * - Keyboard navigation
 * - Smooth animations
 */

'use client'

import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import { useBlockCommands } from '../../hooks/useBlockCommands'
import {
  filterCommands,
  getCommandsByCategory,
  BLOCK_COMMAND_CATEGORIES,
} from './registry'
import type { BlockCommand, BlockCommandPaletteProps } from './types'

/**
 * Command item in the palette
 */
interface CommandItemProps {
  command: BlockCommand
  isSelected: boolean
  onSelect: () => void
  onHover: () => void
  isDark: boolean
}

const CommandItem = React.memo(function CommandItem({
  command,
  isSelected,
  onSelect,
  onHover,
  isDark,
}: CommandItemProps) {
  const Icon = command.icon

  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      className={[
        'w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors',
        isSelected
          ? isDark
            ? 'bg-cyan-600/30 text-white'
            : 'bg-cyan-100 text-cyan-900'
          : isDark
            ? 'text-zinc-300 hover:bg-zinc-700/50'
            : 'text-zinc-700 hover:bg-zinc-100',
      ].join(' ')}
    >
      <span className={[
        'flex-shrink-0 w-8 h-8 flex items-center justify-center rounded',
        isDark ? 'bg-zinc-700' : 'bg-zinc-100',
      ].join(' ')}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{command.name}</div>
        <div className={[
          'text-xs truncate',
          isDark ? 'text-zinc-400' : 'text-zinc-500',
        ].join(' ')}>
          {command.description}
        </div>
      </div>
      {command.shortcut && (
        <span className={[
          'flex-shrink-0 text-xs px-1.5 py-0.5 rounded',
          isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500',
        ].join(' ')}>
          {command.shortcut}
        </span>
      )}
    </button>
  )
})

/**
 * Category header in the palette
 */
interface CategoryHeaderProps {
  name: string
  isDark: boolean
}

const CategoryHeader = React.memo(function CategoryHeader({
  name,
  isDark,
}: CategoryHeaderProps) {
  return (
    <div className={[
      'px-3 py-1.5 text-xs font-semibold uppercase tracking-wider',
      isDark ? 'text-zinc-500' : 'text-zinc-400',
    ].join(' ')}>
      {name}
    </div>
  )
})

/**
 * Block Command Palette Component
 */
export function BlockCommandPalette({
  isOpen,
  position,
  query,
  onQueryChange,
  onSelect,
  onClose,
  isDark,
  mode,
}: BlockCommandPaletteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const {
    selectedIndex,
    setSelectedIndex,
    selectPrevious,
    selectNext,
    resetSelection,
  } = useBlockCommands()

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    return filterCommands(query)
  }, [query])

  // Reset selection when query changes
  useEffect(() => {
    resetSelection()
  }, [query, resetSelection])

  // Focus input on open (insert mode only)
  useEffect(() => {
    if (isOpen && mode === 'insert' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, mode])

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    // Small delay to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          selectNext(filteredCommands.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          selectPrevious(filteredCommands.length)
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'Tab':
          e.preventDefault()
          if (e.shiftKey) {
            selectPrevious(filteredCommands.length)
          } else {
            selectNext(filteredCommands.length)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex, selectNext, selectPrevious, onSelect, onClose])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selectedEl = listRef.current.querySelector('[data-selected="true"]')
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex])

  // Handle command selection
  const handleSelect = useCallback((command: BlockCommand) => {
    onSelect(command)
  }, [onSelect])

  // Handle hover to update selection
  const handleHover = useCallback((index: number) => {
    setSelectedIndex(index)
  }, [setSelectedIndex])

  // Render commands with category headers
  const renderCommands = useCallback(() => {
    if (filteredCommands.length === 0) {
      return (
        <div className={[
          'px-3 py-8 text-center text-sm',
          isDark ? 'text-zinc-500' : 'text-zinc-400',
        ].join(' ')}>
          No blocks match "{query}"
        </div>
      )
    }

    // If searching, show flat list
    if (query.trim()) {
      return filteredCommands.map((cmd, index) => (
        <CommandItem
          key={cmd.id}
          command={cmd}
          isSelected={index === selectedIndex}
          onSelect={() => handleSelect(cmd)}
          onHover={() => handleHover(index)}
          isDark={isDark}
        />
      ))
    }

    // Otherwise, show grouped by category
    const grouped = getCommandsByCategory()
    const elements: React.ReactNode[] = []
    let globalIndex = 0

    for (const category of BLOCK_COMMAND_CATEGORIES) {
      const commands = grouped.get(category.id)
      if (!commands || commands.length === 0) continue

      elements.push(
        <CategoryHeader key={`cat-${category.id}`} name={category.name} isDark={isDark} />
      )

      for (const cmd of commands) {
        const currentIndex = globalIndex
        elements.push(
          <div key={cmd.id} data-selected={currentIndex === selectedIndex}>
            <CommandItem
              command={cmd}
              isSelected={currentIndex === selectedIndex}
              onSelect={() => handleSelect(cmd)}
              onHover={() => handleHover(currentIndex)}
              isDark={isDark}
            />
          </div>
        )
        globalIndex++
      }
    }

    return elements
  }, [filteredCommands, query, selectedIndex, handleSelect, handleHover, isDark])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={[
          'fixed z-50 w-72 rounded-xl shadow-2xl border overflow-hidden',
          isDark
            ? 'bg-zinc-800 border-zinc-700'
            : 'bg-white border-zinc-200',
        ].join(' ')}
        style={{
          top: position.y,
          left: position.x,
        }}
      >
        {/* Search input (only in insert mode) */}
        {mode === 'insert' && (
          <div className={[
            'flex items-center gap-2 px-3 py-2 border-b',
            isDark ? 'border-zinc-700' : 'border-zinc-200',
          ].join(' ')}>
            <Search className={[
              'w-4 h-4 flex-shrink-0',
              isDark ? 'text-zinc-500' : 'text-zinc-400',
            ].join(' ')} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange?.(e.target.value)}
              placeholder="Filter blocks..."
              className={[
                'flex-1 bg-transparent text-sm outline-none',
                isDark ? 'text-white placeholder-zinc-500' : 'text-zinc-900 placeholder-zinc-400',
              ].join(' ')}
            />
          </div>
        )}

        {/* Slash mode header */}
        {mode === 'slash' && query && (
          <div className={[
            'px-3 py-2 border-b text-sm',
            isDark ? 'border-zinc-700 text-zinc-400' : 'border-zinc-200 text-zinc-500',
          ].join(' ')}>
            /{query}
          </div>
        )}

        {/* Command list */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto py-1"
        >
          {renderCommands()}
        </div>

        {/* Footer with keyboard hints */}
        <div className={[
          'flex items-center gap-4 px-3 py-2 text-xs border-t',
          isDark ? 'border-zinc-700 text-zinc-500' : 'border-zinc-200 text-zinc-400',
        ].join(' ')}>
          <span className="flex items-center gap-1">
            <kbd className={[
              'px-1 py-0.5 rounded',
              isDark ? 'bg-zinc-700' : 'bg-zinc-100',
            ].join(' ')}>↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className={[
              'px-1 py-0.5 rounded',
              isDark ? 'bg-zinc-700' : 'bg-zinc-100',
            ].join(' ')}>↵</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className={[
              'px-1 py-0.5 rounded',
              isDark ? 'bg-zinc-700' : 'bg-zinc-100',
            ].join(' ')}>Esc</kbd>
            Close
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default BlockCommandPalette
