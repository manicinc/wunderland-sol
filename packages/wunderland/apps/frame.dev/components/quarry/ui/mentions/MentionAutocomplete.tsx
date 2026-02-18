'use client'

/**
 * Mention Autocomplete Component
 * @module components/quarry/ui/mentions/MentionAutocomplete
 *
 * @description
 * Embark-inspired @-mention autocomplete for inline entity references.
 * Supports places, dates, people, strands, and other mentionable entities.
 *
 * Features:
 * - Keyboard navigation (up/down/enter/escape)
 * - Entity type filtering with icons
 * - Fuzzy search with highlighted matches
 * - Recent entities suggestion
 * - External data integration (places, calendar)
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Calendar,
  User,
  FileText,
  CalendarDays,
  Folder,
  Users,
  Lightbulb,
  Tag,
  HelpCircle,
  Search,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  MentionableEntity,
  MentionableEntityType,
  MentionSuggestion,
  MentionAutocompleteOptions,
} from '@/lib/mentions/types'
import {
  getAutocompleteSuggestions,
  searchEntities,
  getRecentEntities,
} from '@/lib/mentions/mentionResolver'

// ============================================================================
// TYPES
// ============================================================================

export interface MentionAutocompleteProps {
  /** Current query text (after @) */
  query: string
  /** Position to render the dropdown */
  position: { x: number; y: number }
  /** Whether the autocomplete is visible */
  isOpen: boolean
  /** Called when a mention is selected */
  onSelect: (entity: MentionableEntity) => void
  /** Called when autocomplete is dismissed */
  onDismiss: () => void
  /** Filter by entity types */
  filterTypes?: MentionableEntityType[]
  /** Maximum suggestions to show */
  maxSuggestions?: number
  /** Current strand path for context */
  strandPath?: string
  /** Custom className */
  className?: string
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const EntityIcon: React.FC<{ type: MentionableEntityType; className?: string }> = ({
  type,
  className,
}) => {
  const iconClass = cn('w-4 h-4', className)
  
  switch (type) {
    case 'place':
      return <MapPin className={iconClass} />
    case 'date':
      return <Calendar className={iconClass} />
    case 'person':
      return <User className={iconClass} />
    case 'strand':
      return <FileText className={iconClass} />
    case 'event':
      return <CalendarDays className={iconClass} />
    case 'project':
      return <Folder className={iconClass} />
    case 'team':
      return <Users className={iconClass} />
    case 'concept':
      return <Lightbulb className={iconClass} />
    case 'tag':
      return <Tag className={iconClass} />
    default:
      return <HelpCircle className={iconClass} />
  }
}

// ============================================================================
// ENTITY TYPE LABELS
// ============================================================================

const ENTITY_TYPE_LABELS: Record<MentionableEntityType, string> = {
  place: 'Place',
  date: 'Date',
  person: 'Person',
  strand: 'Strand',
  event: 'Event',
  project: 'Project',
  team: 'Team',
  concept: 'Concept',
  tag: 'Tag',
  unknown: 'Unknown',
}

// ============================================================================
// SUGGESTION ITEM
// ============================================================================

interface SuggestionItemProps {
  suggestion: MentionSuggestion
  isSelected: boolean
  onSelect: () => void
  onHover: () => void
}

const SuggestionItem: React.FC<SuggestionItemProps> = ({
  suggestion,
  isSelected,
  onSelect,
  onHover,
}) => {
  const { entity, highlightedLabel, matchType, source } = suggestion
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors',
        'border-l-2 border-transparent',
        isSelected && 'bg-accent/50 border-l-primary'
      )}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      {/* Entity Icon */}
      <div
        className="flex items-center justify-center w-8 h-8 rounded-lg"
        style={{ backgroundColor: `${entity.color}20` }}
      >
        <span style={{ color: entity.color }}>
          <EntityIcon type={entity.type} className="opacity-80" />
        </span>
      </div>
      
      {/* Entity Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium truncate"
            dangerouslySetInnerHTML={{ __html: highlightedLabel }}
          />
          {source === 'recent' && (
            <Clock className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="capitalize">{ENTITY_TYPE_LABELS[entity.type]}</span>
          {matchType === 'exact' && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] uppercase">
              Exact
            </span>
          )}
          {entity.description && (
            <span className="truncate">{entity.description}</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// TYPE FILTER TABS
// ============================================================================

interface TypeFilterTabsProps {
  selectedTypes: MentionableEntityType[] | null
  onSelectType: (types: MentionableEntityType[] | null) => void
}

const TypeFilterTabs: React.FC<TypeFilterTabsProps> = ({
  selectedTypes,
  onSelectType,
}) => {
  const filterOptions: Array<{ types: MentionableEntityType[] | null; label: string; icon: React.ReactNode }> = [
    { types: null, label: 'All', icon: <Search className="w-3 h-3" /> },
    { types: ['person', 'team'], label: 'People', icon: <User className="w-3 h-3" /> },
    { types: ['place'], label: 'Places', icon: <MapPin className="w-3 h-3" /> },
    { types: ['date', 'event'], label: 'Dates', icon: <Calendar className="w-3 h-3" /> },
    { types: ['strand'], label: 'Strands', icon: <FileText className="w-3 h-3" /> },
  ]
  
  const isSelected = (types: MentionableEntityType[] | null) => {
    if (types === null && selectedTypes === null) return true
    if (types === null || selectedTypes === null) return false
    return types.length === selectedTypes.length && types.every(t => selectedTypes.includes(t))
  }
  
  return (
    <div className="flex items-center gap-1 p-1.5 border-b border-border/50">
      {filterOptions.map(option => (
        <button
          key={option.label}
          onClick={() => onSelectType(option.types)}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors',
            isSelected(option.types)
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
          )}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  query,
  position,
  isOpen,
  onSelect,
  onDismiss,
  filterTypes: initialFilterTypes,
  maxSuggestions = 8,
  strandPath,
  className,
}) => {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [filterTypes, setFilterTypes] = useState<MentionableEntityType[] | null>(
    initialFilterTypes || null
  )
  
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Fetch suggestions when query or filter changes
  useEffect(() => {
    if (!isOpen) return
    
    const fetchSuggestions = async () => {
      setIsLoading(true)
      try {
        const options: MentionAutocompleteOptions = {
          limit: maxSuggestions,
          types: filterTypes || undefined,
          currentStrandPath: strandPath,
          minScore: 0.2,
        }
        
        let results: MentionSuggestion[]
        
        if (query.length === 0) {
          // Show recent entities when no query
          const recent = await getRecentEntities(options)
          results = recent.map(entity => ({
            entity,
            score: 0.5,
            highlightedLabel: entity.label,
            matchType: 'fuzzy' as const,
            source: 'recent' as const,
          }))
        } else {
          results = await getAutocompleteSuggestions(query, options)
        }
        
        setSuggestions(results)
        setSelectedIndex(0)
      } catch (error) {
        console.error('[MentionAutocomplete] Failed to fetch suggestions:', error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }
    
    const debounceTimer = setTimeout(fetchSuggestions, 100)
    return () => clearTimeout(debounceTimer)
  }, [query, filterTypes, isOpen, maxSuggestions, strandPath])
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => (i + 1) % Math.max(1, suggestions.length))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => (i - 1 + suggestions.length) % Math.max(1, suggestions.length))
        break
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        if (suggestions[selectedIndex]) {
          onSelect(suggestions[selectedIndex].entity)
        }
        break
      case 'Escape':
        e.preventDefault()
        onDismiss()
        break
    }
  }, [isOpen, suggestions, selectedIndex, onSelect, onDismiss])
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onDismiss()
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onDismiss])
  
  // Scroll selected item into view
  useEffect(() => {
    if (containerRef.current && suggestions.length > 0) {
      const selectedEl = containerRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      selectedEl?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex, suggestions.length])
  
  if (!isOpen) return null
  
  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: -8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={cn(
          'fixed z-50 w-80 max-h-96 overflow-hidden',
          'bg-popover border border-border rounded-xl shadow-2xl',
          'backdrop-blur-sm',
          className
        )}
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {/* Type Filter Tabs */}
        <TypeFilterTabs
          selectedTypes={filterTypes}
          onSelectType={setFilterTypes}
        />
        
        {/* Suggestions List */}
        <div className="max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <HelpCircle className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No entities found</p>
              <p className="text-xs opacity-70">Try a different search term</p>
            </div>
          ) : (
            <div className="py-1">
              {suggestions.map((suggestion, index) => (
                <div key={suggestion.entity.id} data-index={index}>
                  <SuggestionItem
                    suggestion={suggestion}
                    isSelected={index === selectedIndex}
                    onSelect={() => onSelect(suggestion.entity)}
                    onHover={() => setSelectedIndex(index)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer with keyboard hints */}
        <div className="flex items-center justify-between px-3 py-2 text-[10px] text-muted-foreground border-t border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded">↑↓</kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded">↵</kbd>
            <span>Select</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-background border border-border rounded">Esc</kbd>
            <span>Dismiss</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default MentionAutocomplete

