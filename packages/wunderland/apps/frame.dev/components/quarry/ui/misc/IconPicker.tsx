/**
 * Icon Picker - Select Lucide icons for weaves/looms
 * @module codex/ui/IconPicker
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Check, ChevronDown } from 'lucide-react'
import DynamicIcon, { 
  RECOMMENDED_ICONS, 
  ALL_LUCIDE_ICONS,
  isValidIconName,
} from '../common/DynamicIcon'

interface IconPickerProps {
  value?: string
  onChange: (iconName: string | undefined) => void
  showAllIcons?: boolean
  placeholder?: string
  size?: 'sm' | 'md' | 'lg'
  theme?: string
}

const CATEGORY_LABELS: Record<keyof typeof RECOMMENDED_ICONS, string> = {
  knowledge: 'Knowledge & Learning',
  technology: 'Technology & Code',
  science: 'Science & Math',
  creative: 'Creative & Media',
  business: 'Business & Finance',
  nature: 'Nature & Health',
  communication: 'Communication',
  navigation: 'Navigation & Structure',
  tools: 'Tools & Settings',
  documents: 'Documents & Files',
}

export default function IconPicker({
  value,
  onChange,
  showAllIcons = false,
  placeholder = 'Select icon...',
  size = 'md',
  theme = 'light',
}: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>('knowledge')
  const [showAll, setShowAll] = useState(showAllIcons)

  const isDark = theme.includes('dark')

  const sizeClasses = {
    sm: { trigger: 'h-7 px-2 text-xs', icon: 'w-3.5 h-3.5', grid: 'grid-cols-8 gap-1', iconSize: 'w-5 h-5 p-0.5' },
    md: { trigger: 'h-8 px-3 text-sm', icon: 'w-4 h-4', grid: 'grid-cols-8 gap-1.5', iconSize: 'w-6 h-6 p-0.5' },
    lg: { trigger: 'h-10 px-4 text-base', icon: 'w-5 h-5', grid: 'grid-cols-10 gap-2', iconSize: 'w-8 h-8 p-1' },
  }[size]

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return RECOMMENDED_ICONS
    const query = search.toLowerCase()
    const filtered: Partial<typeof RECOMMENDED_ICONS> = {}
    for (const [category, icons] of Object.entries(RECOMMENDED_ICONS)) {
      const matching = icons.filter(icon => icon.toLowerCase().includes(query))
      if (matching.length > 0) {
        (filtered as Record<string, readonly string[]>)[category] = matching
      }
    }
    return filtered as typeof RECOMMENDED_ICONS
  }, [search])

  const filteredAllIcons = useMemo(() => {
    if (!showAll) return []
    if (!search.trim()) return ALL_LUCIDE_ICONS
    const query = search.toLowerCase()
    return ALL_LUCIDE_ICONS.filter(icon => icon.toLowerCase().includes(query))
  }, [search, showAll])

  const handleSelect = useCallback((iconName: string) => {
    onChange(iconName)
    setIsOpen(false)
    setSearch('')
  }, [onChange])

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(undefined)
  }, [onChange])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${sizeClasses.trigger}
          w-full flex items-center justify-between gap-2
          rounded-md border transition-all
          ${isDark 
            ? 'bg-zinc-800 border-zinc-700 hover:border-zinc-600 text-zinc-200' 
            : 'bg-white border-zinc-300 hover:border-zinc-400 text-zinc-800'
          }
          ${isOpen ? 'ring-2 ring-blue-500/30' : ''}
        `}
      >
        <span className="flex items-center gap-2 truncate">
          {value && isValidIconName(value) ? (
            <>
              <DynamicIcon name={value} className={sizeClasses.icon} />
              <span className="truncate">{value}</span>
            </>
          ) : (
            <span className="text-zinc-400">{placeholder}</span>
          )}
        </span>
        <span className="flex items-center gap-1">
          {value && (
            <button type="button" onClick={handleClear} className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded">
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={`
                absolute z-50 mt-1 w-[340px] max-h-[400px] overflow-hidden
                rounded-lg border shadow-xl
                ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
              `}
            >
              <div className="p-2 border-b border-zinc-200 dark:border-zinc-700">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search icons..."
                    className={`
                      w-full pl-9 pr-3 py-1.5 text-sm rounded-md border
                      ${isDark 
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500' 
                        : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400'
                      }
                      focus:outline-none focus:ring-2 focus:ring-blue-500/30
                    `}
                    autoFocus
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">
                    {showAll ? `${ALL_LUCIDE_ICONS.length} icons` : 'Recommended icons'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAll(!showAll)}
                    className={`text-[10px] px-2 py-0.5 rounded ${showAll ? 'bg-blue-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}`}
                  >
                    {showAll ? 'Show Recommended' : 'Show All Icons'}
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[320px] p-2 space-y-2">
                {showAll ? (
                  <div className={sizeClasses.grid}>
                    {filteredAllIcons.map(iconName => (
                      <IconButton key={iconName} name={iconName} isSelected={value === iconName} onClick={() => handleSelect(iconName)} className={sizeClasses.iconSize} isDark={isDark} />
                    ))}
                  </div>
                ) : (
                  Object.entries(filteredCategories).map(([category, icons]) => (
                    <div key={category}>
                      <button
                        type="button"
                        onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded text-[11px] font-medium ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-600'}`}
                      >
                        <span>{CATEGORY_LABELS[category as keyof typeof RECOMMENDED_ICONS] || category}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${expandedCategory === category ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {expandedCategory === category && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className={`${sizeClasses.grid} p-2`}>
                              {icons.map(iconName => (
                                <IconButton key={iconName} name={iconName} isSelected={value === iconName} onClick={() => handleSelect(iconName)} className={sizeClasses.iconSize} isDark={isDark} />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                )}
                {(showAll ? filteredAllIcons.length === 0 : Object.keys(filteredCategories).length === 0) && (
                  <div className="py-8 text-center text-sm text-zinc-400">No icons found for &ldquo;{search}&rdquo;</div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function IconButton({ name, isSelected, onClick, className, isDark }: { name: string; isSelected: boolean; onClick: () => void; className: string; isDark: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
      className={`${className} relative flex items-center justify-center rounded transition-all ${isSelected ? 'bg-blue-500 text-white ring-2 ring-blue-500/30' : isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-600'}`}
    >
      <DynamicIcon name={name} className="w-4 h-4" />
      {isSelected && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full flex items-center justify-center">
          <Check className="w-1.5 h-1.5 text-white" />
        </span>
      )}
    </button>
  )
}

export function InlineIconPicker({ value, onChange, label = 'Icon', theme = 'light' }: { value?: string; onChange: (iconName: string | undefined) => void; label?: string; theme?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</label>
      <IconPicker value={value} onChange={onChange} size="sm" theme={theme} />
    </div>
  )
}


















