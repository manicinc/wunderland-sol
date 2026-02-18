/**
 * BranchingTreePanel
 * 
 * Center panel of the journey view showing a branching tree visualization
 * with colored branches, nested sections, and entry nodes.
 * 
 * @module components/quarry/ui/evolution/journey/BranchingTreePanel
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  GripVertical,
  Folder,
  Book,
  GraduationCap,
  Briefcase,
  Heart,
  Star,
  Flag,
  Target,
  Lightbulb,
  Code,
  Music,
  Camera,
  Plane,
  Home,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  JourneyBranchWithMeta,
  JourneySectionWithMeta,
  JourneyEntryWithMeta,
  BranchIcon,
  BranchColorKey,
} from '@/lib/analytics/journeyTypes'
import { BRANCH_COLORS } from '@/lib/analytics/journeyTypes'
import { format, parseISO } from 'date-fns'

// ============================================================================
// TYPES
// ============================================================================

export interface BranchingTreePanelProps {
  branches: JourneyBranchWithMeta[]
  selectedEntryId: string | null
  onSelectEntry: (id: string) => void
  onAddEntry: (branchId: string, sectionId?: string | null) => void
  onAddBranch: (parentId?: string | null) => void
  onToggleBranch: (id: string) => void
  expandedBranchIds: Set<string>
  expandedSectionIds: Set<string>
  onToggleSection: (id: string) => void
  getSectionsForBranch: (branchId: string) => Promise<JourneySectionWithMeta[]>
  isDark: boolean
  className?: string
}

// ============================================================================
// ICON MAP
// ============================================================================

const ICON_MAP: Record<BranchIcon, React.FC<{ className?: string }>> = {
  folder: Folder,
  book: Book,
  graduation: GraduationCap,
  briefcase: Briefcase,
  heart: Heart,
  star: Star,
  flag: Flag,
  target: Target,
  lightbulb: Lightbulb,
  code: Code,
  music: Music,
  camera: Camera,
  plane: Plane,
  home: Home,
  users: Users,
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface BranchNodeProps {
  branch: JourneyBranchWithMeta
  selectedEntryId: string | null
  onSelectEntry: (id: string) => void
  onAddEntry: (branchId: string, sectionId?: string | null) => void
  onAddBranch: (parentId: string) => void
  onToggleBranch: (id: string) => void
  expandedBranchIds: Set<string>
  expandedSectionIds: Set<string>
  onToggleSection: (id: string) => void
  getSectionsForBranch: (branchId: string) => Promise<JourneySectionWithMeta[]>
  isDark: boolean
  level?: number
}

function BranchNode({
  branch,
  selectedEntryId,
  onSelectEntry,
  onAddEntry,
  onAddBranch,
  onToggleBranch,
  expandedBranchIds,
  expandedSectionIds,
  onToggleSection,
  getSectionsForBranch,
  isDark,
  level = 0,
}: BranchNodeProps) {
  const [sections, setSections] = useState<JourneySectionWithMeta[]>([])
  const [loadingSections, setLoadingSections] = useState(false)
  
  const isExpanded = expandedBranchIds.has(branch.id)
  const color = BRANCH_COLORS[branch.color]
  const Icon = ICON_MAP[branch.icon] || Folder

  const handleToggle = useCallback(async () => {
    onToggleBranch(branch.id)
    
    if (!isExpanded && sections.length === 0) {
      setLoadingSections(true)
      try {
        const loadedSections = await getSectionsForBranch(branch.id)
        setSections(loadedSections)
      } catch (err) {
        console.error('Failed to load sections:', err)
      } finally {
        setLoadingSections(false)
      }
    }
  }, [branch.id, isExpanded, sections.length, onToggleBranch, getSectionsForBranch])

  return (
    <div className={cn('relative', level > 0 && 'ml-6')}>
      {/* Connection line from parent */}
      {level > 0 && (
        <div
          className="absolute -left-4 top-0 bottom-0 w-0.5"
          style={{ backgroundColor: color.hex + '40' }}
        />
      )}
      
      {/* Branch header */}
      <div
        className={cn(
          'relative rounded-lg border-2 mb-2 overflow-hidden',
          isDark ? 'bg-zinc-800/50' : 'bg-white'
        )}
        style={{ borderColor: color.hex }}
      >
        {/* Header bar */}
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ backgroundColor: color.light }}
        >
          {/* Drag handle */}
          <GripVertical
            className="w-4 h-4 cursor-grab opacity-40 hover:opacity-80"
            style={{ color: color.hex }}
          />
          
          {/* Expand/Collapse */}
          <button onClick={handleToggle} className="p-0.5">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" style={{ color: color.hex }} />
            ) : (
              <ChevronRight className="w-4 h-4" style={{ color: color.hex }} />
            )}
          </button>
          
          {/* Branch label */}
          <span className="font-semibold text-sm" style={{ color: color.dark }}>
            Branch: {branch.name}
          </span>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className={cn(
                'p-3 space-y-3',
                isDark ? 'bg-zinc-800/30' : 'bg-zinc-50'
              )}>
                {/* Loading state */}
                {loadingSections && (
                  <div className={cn(
                    'text-sm',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}>
                    Loading...
                  </div>
                )}
                
                {/* Sections */}
                {sections.map((section) => (
                  <SectionNode
                    key={section.id}
                    section={section}
                    branchColor={branch.color}
                    selectedEntryId={selectedEntryId}
                    onSelectEntry={onSelectEntry}
                    onAddEntry={(sectionId) => onAddEntry(branch.id, sectionId)}
                    isExpanded={expandedSectionIds.has(section.id)}
                    onToggle={() => onToggleSection(section.id)}
                    isDark={isDark}
                  />
                ))}
                
                {/* Direct entries (no section) */}
                {!loadingSections && sections.length === 0 && branch.entryCount > 0 && (
                  <div className={cn(
                    'text-sm',
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  )}>
                    {branch.entryCount} entries
                  </div>
                )}
                
                {/* Add entry button */}
                <button
                  onClick={() => onAddEntry(branch.id, null)}
                  className={cn(
                    'flex items-center gap-2 text-sm px-2 py-1 rounded transition-colors',
                    isDark
                      ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
                      : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
                  )}
                >
                  <Plus className="w-3 h-3" />
                  Add entry
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Child branches */}
      {branch.childBranches.length > 0 && isExpanded && (
        <div className="ml-4 space-y-2">
          {branch.childBranches.map((child) => (
            <BranchNode
              key={child.id}
              branch={child}
              selectedEntryId={selectedEntryId}
              onSelectEntry={onSelectEntry}
              onAddEntry={onAddEntry}
              onAddBranch={onAddBranch}
              onToggleBranch={onToggleBranch}
              expandedBranchIds={expandedBranchIds}
              expandedSectionIds={expandedSectionIds}
              onToggleSection={onToggleSection}
              getSectionsForBranch={getSectionsForBranch}
              isDark={isDark}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface SectionNodeProps {
  section: JourneySectionWithMeta
  branchColor: BranchColorKey
  selectedEntryId: string | null
  onSelectEntry: (id: string) => void
  onAddEntry: (sectionId: string) => void
  isExpanded: boolean
  onToggle: () => void
  isDark: boolean
}

function SectionNode({
  section,
  branchColor,
  selectedEntryId,
  onSelectEntry,
  onAddEntry,
  isExpanded,
  onToggle,
  isDark,
}: SectionNodeProps) {
  const color = BRANCH_COLORS[branchColor]

  return (
    <div className="relative">
      {/* Connection dot */}
      <div
        className="absolute -left-3 top-3 w-2 h-2 rounded-full"
        style={{ backgroundColor: color.hex }}
      />
      
      {/* Section header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors',
          isDark
            ? 'hover:bg-zinc-700/50'
            : 'hover:bg-zinc-100'
        )}
      >
        {isExpanded ? (
          <ChevronDown className={cn('w-4 h-4', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
        ) : (
          <ChevronRight className={cn('w-4 h-4', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
        )}
        
        <span className={cn(
          'font-medium text-sm',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          {section.name}
        </span>
        
        {section.dateRange && (
          <span className={cn(
            'text-xs',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            {section.dateRange}
          </span>
        )}
        
        <span className={cn(
          'ml-auto text-xs',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )}>
          {section.entryCount} {section.entryCount === 1 ? 'entry' : 'entries'}
        </span>
      </button>

      {/* Entries */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-6 space-y-1 mt-1">
              {section.entries.map((entry) => (
                <EntryNode
                  key={entry.id}
                  entry={entry}
                  branchColor={branchColor}
                  isSelected={entry.id === selectedEntryId}
                  onSelect={() => onSelectEntry(entry.id)}
                  isDark={isDark}
                />
              ))}
              
              {/* Add entry button */}
              <button
                onClick={() => onAddEntry(section.id)}
                className={cn(
                  'flex items-center gap-2 text-xs px-2 py-1 rounded transition-colors',
                  isDark
                    ? 'text-zinc-500 hover:text-zinc-300'
                    : 'text-zinc-400 hover:text-zinc-600'
                )}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface EntryNodeProps {
  entry: JourneyEntryWithMeta
  branchColor: BranchColorKey
  isSelected: boolean
  onSelect: () => void
  isDark: boolean
}

function EntryNode({ entry, branchColor, isSelected, onSelect, isDark }: EntryNodeProps) {
  const color = BRANCH_COLORS[branchColor]

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-start gap-3 p-2 rounded-lg text-left transition-all',
        isSelected
          ? isDark
            ? 'bg-zinc-700/80 ring-1'
            : 'bg-white ring-1 shadow-sm'
          : isDark
            ? 'hover:bg-zinc-700/40'
            : 'hover:bg-white/80'
      )}
      style={{
        ['--tw-ring-color' as string]: isSelected ? color.hex : undefined,
      }}
    >
      {/* Connection dot */}
      <div
        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
        style={{ backgroundColor: color.hex }}
      />
      
      <div className="flex-1 min-w-0">
        {/* Title */}
        <h4 className={cn(
          'font-medium text-sm',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          {entry.title}
        </h4>
        
        {/* Date */}
        <p className={cn(
          'text-xs',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )}>
          {format(parseISO(entry.date), 'MMM d, yyyy')}
        </p>
        
        {/* Snippet */}
        {entry.snippet && (
          <p className={cn(
            'text-xs mt-1 line-clamp-2',
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          )}>
            {entry.snippet}
          </p>
        )}
      </div>
    </button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BranchingTreePanel({
  branches,
  selectedEntryId,
  onSelectEntry,
  onAddEntry,
  onAddBranch,
  onToggleBranch,
  expandedBranchIds,
  expandedSectionIds,
  onToggleSection,
  getSectionsForBranch,
  isDark,
  className,
}: BranchingTreePanelProps) {
  return (
    <div className={cn(
      'flex flex-col h-full',
      isDark ? 'bg-zinc-900/50' : 'bg-white',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between p-4 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <h2 className={cn(
          'text-lg font-bold',
          isDark ? 'text-zinc-100' : 'text-zinc-900'
        )}>
          Branches
        </h2>
        
        <button
          onClick={() => onAddBranch(null)}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            isDark
              ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          )}
        >
          <Plus className="w-4 h-4" />
          Add Branch
        </button>
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {branches.length === 0 ? (
          <div className={cn(
            'flex flex-col items-center justify-center py-12 text-center',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            <Folder className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm mb-4">No branches yet</p>
            <button
              onClick={() => onAddBranch(null)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isDark
                  ? 'bg-teal-600 text-white hover:bg-teal-500'
                  : 'bg-teal-500 text-white hover:bg-teal-600'
              )}
            >
              <Plus className="w-4 h-4" />
              Create first branch
            </button>
          </div>
        ) : (
          branches.map((branch) => (
            <BranchNode
              key={branch.id}
              branch={branch}
              selectedEntryId={selectedEntryId}
              onSelectEntry={onSelectEntry}
              onAddEntry={onAddEntry}
              onAddBranch={onAddBranch}
              onToggleBranch={onToggleBranch}
              expandedBranchIds={expandedBranchIds}
              expandedSectionIds={expandedSectionIds}
              onToggleSection={onToggleSection}
              getSectionsForBranch={getSectionsForBranch}
              isDark={isDark}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default BranchingTreePanel

