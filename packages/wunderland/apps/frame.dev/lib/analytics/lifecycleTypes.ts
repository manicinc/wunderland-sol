/**
 * Lifecycle Types
 * 
 * TypeScript interfaces for strand lifecycle tracking and decay management.
 * Strands progress through stages: Fresh → Active → Faded
 * 
 * @module lib/analytics/lifecycleTypes
 */

// ============================================================================
// LIFECYCLE STAGES
// ============================================================================

/**
 * Lifecycle stages for strands
 * - fresh: Recently created or accessed, highly engaged
 * - active: Regular use, maintained engagement
 * - faded: Not accessed recently, low engagement (but never deleted)
 */
export type LifecycleStage = 'fresh' | 'active' | 'faded'

/**
 * Stage metadata for display
 */
export const LIFECYCLE_STAGE_META: Record<LifecycleStage, {
  label: string
  description: string
  color: string
  bgColor: string
  icon: string
}> = {
  fresh: {
    label: 'Fresh',
    description: 'Recently created or actively engaged',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    icon: 'Sparkles',
  },
  active: {
    label: 'Active',
    description: 'Regular use, maintained over time',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    icon: 'Activity',
  },
  faded: {
    label: 'Faded',
    description: 'Not accessed recently, may need review',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/10',
    icon: 'Clock',
  },
}

// ============================================================================
// STRAND LIFECYCLE
// ============================================================================

/**
 * Lifecycle tracking data for a single strand
 */
export interface StrandLifecycle {
  /** Unique path to the strand */
  strandPath: string
  
  /** Current lifecycle stage */
  stage: LifecycleStage
  
  /** Decay score from 0-100 (100 = fully fresh, 0 = completely faded) */
  decayScore: number
  
  /** Last time the strand was accessed (viewed or edited) */
  lastAccessedAt: string // ISO date
  
  /** Number of times the strand has been viewed */
  viewCount: number
  
  /** Number of times the strand has been edited */
  editCount: number
  
  /** Number of connections (links to/from other strands) */
  connectionCount: number
  
  /** Weighted engagement score combining views, edits, and connections */
  engagementScore: number
  
  /** When the strand was first created/tracked */
  createdAt: string // ISO date
  
  /** When the lifecycle data was last updated */
  updatedAt: string // ISO date
}

/**
 * Strand lifecycle with additional computed fields
 */
export interface StrandLifecycleWithMeta extends StrandLifecycle {
  /** Strand title extracted from path */
  title: string
  
  /** Days since last access */
  daysSinceAccess: number
  
  /** Whether the strand is at risk of fading soon */
  atRisk: boolean
  
  /** Suggested for resurfacing (faded but connected to recent activity) */
  suggestResurface: boolean
}

// ============================================================================
// LIFECYCLE SETTINGS
// ============================================================================

/**
 * User-configurable lifecycle settings
 */
export interface LifecycleSettings {
  /** Days before a fresh strand becomes active (default: 7) */
  freshThresholdDays: number
  
  /** Days before an active strand becomes faded (default: 30) */
  fadeThresholdDays: number
  
  /** How much engagement affects decay score (0-1, default: 0.3) */
  engagementWeight: number
  
  /** Auto-surface fading notes in rituals */
  autoResurface: boolean
  
  /** Show ritual reminders for morning/evening */
  ritualReminders: boolean
  
  /** Number of strands to show in resurface suggestions */
  resurfaceLimit: number
}

/**
 * Default lifecycle settings
 */
export const DEFAULT_LIFECYCLE_SETTINGS: LifecycleSettings = {
  freshThresholdDays: 7,
  fadeThresholdDays: 30,
  engagementWeight: 0.3,
  autoResurface: true,
  ritualReminders: true,
  resurfaceLimit: 5,
}

// ============================================================================
// LIFECYCLE EVENTS
// ============================================================================

/**
 * Types of lifecycle events that can occur
 */
export type LifecycleEventType = 
  | 'view'           // Strand was viewed
  | 'edit'           // Strand was edited
  | 'link_added'     // Connection added to/from strand
  | 'link_removed'   // Connection removed
  | 'resurfaced'     // Strand was manually resurfaced
  | 'ritual_review'  // Strand was reviewed during a ritual

/**
 * A lifecycle event for tracking
 */
export interface LifecycleEvent {
  id: string
  strandPath: string
  eventType: LifecycleEventType
  timestamp: string // ISO date
  metadata?: Record<string, unknown>
}

// ============================================================================
// LIFECYCLE STATS
// ============================================================================

/**
 * Aggregate statistics about lifecycle stages
 */
export interface LifecycleStats {
  /** Total number of tracked strands */
  totalStrands: number
  
  /** Count by stage */
  byStage: Record<LifecycleStage, number>
  
  /** Percentage by stage */
  percentageByStage: Record<LifecycleStage, number>
  
  /** Average decay score across all strands */
  averageDecayScore: number
  
  /** Number of strands at risk of fading */
  atRiskCount: number
  
  /** Number of strands suggested for resurfacing */
  resurfaceSuggestionCount: number
  
  /** Most recent activity timestamp */
  lastActivityAt: string | null
}

/**
 * Time series data point for lifecycle visualization
 */
export interface LifecycleTimeSeriesPoint {
  date: string // ISO date
  fresh: number
  active: number
  faded: number
  total: number
}

// ============================================================================
// RESURFACE SUGGESTIONS
// ============================================================================

/**
 * A suggestion to resurface a faded strand
 */
export interface ResurfaceSuggestion {
  strand: StrandLifecycleWithMeta
  
  /** Why this strand is being suggested */
  reason: string
  
  /** Relevance score (0-100) */
  relevanceScore: number
  
  /** Tags that connect to recent activity */
  connectedTags: string[]
  
  /** Recent strands that link to this one */
  connectedStrands: string[]
}

// ============================================================================
// RITUAL TYPES
// ============================================================================

/**
 * Types of rituals
 */
export type RitualType = 'morning' | 'evening'

/**
 * Ritual session data
 */
export interface RitualSession {
  id: string
  type: RitualType
  startedAt: string // ISO date
  completedAt?: string // ISO date
  
  /** Strands surfaced during the ritual */
  surfacedStrands: string[]
  
  /** Strands the user reviewed/interacted with */
  reviewedStrands: string[]
  
  /** Intentions captured (morning) */
  intentions?: string[]
  
  /** Reflections captured (evening) */
  reflections?: string[]
  
  /** New connections formed */
  connectionsFormed: Array<{ from: string; to: string }>
}

/**
 * Ritual prompt data passed to the modal
 */
export interface RitualPromptData {
  type: RitualType
  
  /** Strands relevant to today (based on calendar, tags, recent edits) */
  relevantStrands: StrandLifecycleWithMeta[]
  
  /** Faded strands worth revisiting */
  fadingStrands: StrandLifecycleWithMeta[]
  
  /** Strands accessed/edited today (for evening ritual) */
  todayStrands: StrandLifecycleWithMeta[]
  
  /** Suggested connections to form */
  suggestedConnections: Array<{
    from: StrandLifecycleWithMeta
    to: StrandLifecycleWithMeta
    reason: string
  }>
}

