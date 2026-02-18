/**
 * AI Selection Menu Component
 * @module components/quarry/ui/AISelectionMenu
 *
 * Dropdown menu for AI text transformation actions.
 * Appears when user clicks AI button in the floating toolbar.
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Minimize2,
  Maximize2,
  Check,
  Briefcase,
  MessageCircle,
  Building,
  HelpCircle,
  BookOpen,
  FileText,
  PlusCircle,
  Globe,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type SelectionAction,
  SELECTION_ACTIONS,
  TRANSLATION_LANGUAGES,
  getActionsByCategory,
} from '@/lib/ai/selectionActions'

// ============================================================================
// TYPES
// ============================================================================

export interface AISelectionMenuProps {
  /** Selected text to transform */
  selectedText: string
  /** Callback when action is selected */
  onAction: (action: SelectionAction, options?: { language?: string }) => Promise<void>
  /** Callback to close menu */
  onClose: () => void
  /** Dark mode */
  isDark: boolean
  /** Currently loading action */
  isLoading?: boolean
  /** Currently active action being processed */
  activeAction?: SelectionAction | null
  /** Position of the menu */
  position?: { top: number; left: number }
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const ACTION_ICONS: Record<SelectionAction, React.ElementType> = {
  improve: Sparkles,
  shorten: Minimize2,
  lengthen: Maximize2,
  grammar: Check,
  tone_formal: Briefcase,
  tone_casual: MessageCircle,
  tone_professional: Building,
  explain: HelpCircle,
  define: BookOpen,
  summarize: FileText,
  expand: PlusCircle,
  translate: Globe,
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface MenuItemProps {
  action: SelectionAction
  onClick: () => void
  isDark: boolean
  isLoading?: boolean
  hasSubmenu?: boolean
  onSubmenuOpen?: () => void
}

function MenuItem({
  action,
  onClick,
  isDark,
  isLoading,
  hasSubmenu,
  onSubmenuOpen,
}: MenuItemProps) {
  const metadata = SELECTION_ACTIONS[action]
  const Icon = ACTION_ICONS[action]

  return (
    <button
      onClick={hasSubmenu ? onSubmenuOpen : onClick}
      disabled={isLoading}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors touch-manipulation',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/50',
        isLoading && 'opacity-50 cursor-not-allowed',
        isDark
          ? 'hover:bg-zinc-700/50 text-zinc-200'
          : 'hover:bg-zinc-100 text-zinc-800'
      )}
    >
      <Icon className={cn('w-4 h-4 flex-shrink-0', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{metadata.label}</div>
        <div className={cn('text-xs truncate', isDark ? 'text-zinc-500' : 'text-zinc-500')}>
          {metadata.description}
        </div>
      </div>
      {hasSubmenu && <ChevronRight className="w-4 h-4 text-zinc-400" />}
      {isLoading && <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />}
    </button>
  )
}

interface MenuSectionProps {
  title: string
  children: React.ReactNode
  isDark: boolean
}

function MenuSection({ title, children, isDark }: MenuSectionProps) {
  return (
    <div className="py-1">
      <div
        className={cn(
          'px-3 py-1 text-[10px] font-medium uppercase tracking-wider',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AISelectionMenu({
  selectedText,
  onAction,
  onClose,
  isDark,
  isLoading = false,
  activeAction = null,
  position,
}: AISelectionMenuProps) {
  const [showToneSubmenu, setShowToneSubmenu] = useState(false)
  const [showTranslateSubmenu, setShowTranslateSubmenu] = useState(false)

  const handleAction = useCallback(
    async (action: SelectionAction, options?: { language?: string }) => {
      await onAction(action, options)
    },
    [onAction]
  )

  const categories = getActionsByCategory()

  // Transform actions (excluding tone changes)
  const transformActions = categories.transform.filter(
    (a) => !a.startsWith('tone_')
  )

  // Tone actions
  const toneActions = categories.tone

  // Analyze actions
  const analyzeActions = categories.analyze

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'w-72 max-w-[calc(100vw-2rem)] rounded-xl shadow-2xl border overflow-hidden',
        isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'
      )}
      style={position ? { position: 'fixed', top: position.top, left: position.left } : undefined}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 border-b',
          isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'
        )}
      >
        <div className="flex items-center gap-2">
          <Sparkles className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
          <span className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
            AI Actions
          </span>
        </div>
        <button
          onClick={onClose}
          className={cn(
            'p-2 rounded-md transition-colors touch-manipulation',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
            isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selected text preview */}
      <div className={cn('px-3 py-2 border-b', isDark ? 'border-zinc-700' : 'border-zinc-200')}>
        <div className={cn('text-[10px] uppercase tracking-wide mb-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          Selected Text
        </div>
        <div
          className={cn(
            'text-xs line-clamp-2 italic',
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          )}
        >
          "{selectedText.slice(0, 100)}{selectedText.length > 100 ? '...' : ''}"
        </div>
      </div>

      {/* Menu content */}
      <div className="max-h-80 overflow-y-auto">
        {/* Transform Section */}
        <MenuSection title="Transform" isDark={isDark}>
          {transformActions.map((action) => (
            <MenuItem
              key={action}
              action={action}
              onClick={() => handleAction(action)}
              isDark={isDark}
              isLoading={activeAction === action}
            />
          ))}
        </MenuSection>

        {/* Tone Section with Submenu */}
        <MenuSection title="Change Tone" isDark={isDark}>
          <div className="relative">
            <button
              onClick={() => setShowToneSubmenu(!showToneSubmenu)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors touch-manipulation',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/50',
                isDark
                  ? 'hover:bg-zinc-700/50 text-zinc-200'
                  : 'hover:bg-zinc-100 text-zinc-800'
              )}
            >
              <Briefcase className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
              <span className="flex-1 text-sm font-medium">Change Tone</span>
              <ChevronRight
                className={cn('w-4 h-4 text-zinc-400 transition-transform', showToneSubmenu && 'rotate-90')}
              />
            </button>

            <AnimatePresence>
              {showToneSubmenu && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden ml-4"
                >
                  {toneActions.map((action) => (
                    <MenuItem
                      key={action}
                      action={action}
                      onClick={() => handleAction(action)}
                      isDark={isDark}
                      isLoading={activeAction === action}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </MenuSection>

        {/* Analyze Section */}
        <MenuSection title="Analyze" isDark={isDark}>
          {analyzeActions.map((action) => (
            <MenuItem
              key={action}
              action={action}
              onClick={() => handleAction(action)}
              isDark={isDark}
              isLoading={activeAction === action}
            />
          ))}
        </MenuSection>

        {/* Translate Section with Submenu */}
        <MenuSection title="Translate" isDark={isDark}>
          <div className="relative">
            <button
              onClick={() => setShowTranslateSubmenu(!showTranslateSubmenu)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors touch-manipulation',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/50',
                isDark
                  ? 'hover:bg-zinc-700/50 text-zinc-200'
                  : 'hover:bg-zinc-100 text-zinc-800'
              )}
            >
              <Globe className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
              <span className="flex-1 text-sm font-medium">Translate to...</span>
              <ChevronRight
                className={cn('w-4 h-4 text-zinc-400 transition-transform', showTranslateSubmenu && 'rotate-90')}
              />
            </button>

            <AnimatePresence>
              {showTranslateSubmenu && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden ml-4"
                >
                  {TRANSLATION_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleAction('translate', { language: lang.name })}
                      disabled={isLoading}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors touch-manipulation',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/50',
                        isDark
                          ? 'hover:bg-zinc-700/50 text-zinc-200'
                          : 'hover:bg-zinc-100 text-zinc-800'
                      )}
                    >
                      <span className="text-sm">{lang.native}</span>
                      <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                        {lang.name}
                      </span>
                      {activeAction === 'translate' && (
                        <Loader2 className="w-4 h-4 ml-auto animate-spin text-cyan-500" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </MenuSection>
      </div>

      {/* Footer with keyboard hint */}
      <div
        className={cn(
          'px-3 py-2 border-t text-center',
          isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'
        )}
      >
        <span className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          Press <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-mono">Esc</kbd> to close
        </span>
      </div>
    </motion.div>
  )
}

export default AISelectionMenu
