/**
 * Help Content Types
 * @module codex/help/HelpContent
 *
 * @description
 * TypeScript interfaces and types for the help system.
 * Used by WizardTour, ContextualHelpPanel, and RichTooltip.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   FIELD HELP
═══════════════════════════════════════════════════════════════════════════ */

export interface FieldHelp {
  /** Field name/identifier */
  name: string
  /** Display label */
  label: string
  /** Short description */
  description: string
  /** Usage examples */
  examples?: string[]
  /** Things to avoid or be careful of */
  cautions?: string[]
  /** Link to documentation */
  docLink?: string
  /** Default or suggested value */
  suggestion?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEP HELP
═══════════════════════════════════════════════════════════════════════════ */

export interface StepHelp {
  /** Step identifier */
  id: string
  /** Step title */
  title: string
  /** Overview of what this step does */
  overview: string
  /** Detailed instructions */
  instructions?: string[]
  /** Tips for this step */
  tips?: string[]
  /** Common troubleshooting items */
  troubleshooting?: Array<{
    problem: string
    solution: string
  }>
  /** Fields available in this step */
  fields?: FieldHelp[]
  /** Quick reference items */
  quickRef?: Array<{
    term: string
    definition: string
  }>
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOUR STEP
═══════════════════════════════════════════════════════════════════════════ */

export interface WizardTourStep {
  /** Unique step ID */
  id: string
  /** Element selector to highlight (data-help attribute) */
  target: string
  /** Tour step title */
  title: string
  /** Tour step description */
  description: string
  /** Position of tooltip relative to target */
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  /** Whether to block interaction with page */
  blocking?: boolean
  /** Action button text */
  actionText?: string
  /** Skip button text */
  skipText?: string
  /** Callback when this step is shown */
  onShow?: () => void
  /** Callback when user advances past this step */
  onComplete?: () => void
}

/* ═══════════════════════════════════════════════════════════════════════════
   WIZARD HELP
═══════════════════════════════════════════════════════════════════════════ */

export interface WizardHelp {
  /** Wizard identifier */
  id: string
  /** Wizard title */
  title: string
  /** General description */
  description: string
  /** Steps in this wizard */
  steps: StepHelp[]
  /** Tour steps for first-time users */
  tourSteps: WizardTourStep[]
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELP PANEL SECTIONS
═══════════════════════════════════════════════════════════════════════════ */

export type HelpPanelSection =
  | 'overview'
  | 'fields'
  | 'tips'
  | 'troubleshooting'
  | 'quickRef'

export interface HelpPanelState {
  /** Currently active section */
  activeSection: HelpPanelSection
  /** Whether panel is open */
  isOpen: boolean
  /** Search query */
  searchQuery: string
  /** Current step context */
  currentStepId: string | null
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOUR STATE
═══════════════════════════════════════════════════════════════════════════ */

export interface TourState {
  /** Whether tour is active */
  isActive: boolean
  /** Current tour step index */
  currentStep: number
  /** Total steps in tour */
  totalSteps: number
  /** Tour ID */
  tourId: string | null
  /** Whether user has dismissed "don't show again" */
  dismissed: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELP SYSTEM STATE
═══════════════════════════════════════════════════════════════════════════ */

export interface HelpSystemState {
  /** Help panel state */
  panel: HelpPanelState
  /** Tour state */
  tour: TourState
  /** Whether user is a first-time visitor */
  isFirstTimeUser: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   RICH TOOLTIP PROPS
═══════════════════════════════════════════════════════════════════════════ */

export interface RichTooltipContent {
  /** Main description */
  description: string
  /** Usage examples */
  examples?: string[]
  /** Caution/warning text */
  caution?: string
  /** Link to documentation */
  docLink?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE KEYS
═══════════════════════════════════════════════════════════════════════════ */

export const HELP_STORAGE_KEYS = {
  /** Tour dismissed flag */
  TOUR_DISMISSED: 'codex-tour-dismissed',
  /** Help panel collapsed */
  PANEL_COLLAPSED: 'codex-help-panel-collapsed',
  /** First time user flag */
  FIRST_TIME_USER: 'codex-first-time-user',
  /** Last seen wizard ID */
  LAST_SEEN_WIZARD: 'codex-last-seen-wizard',
} as const

export default {
  HELP_STORAGE_KEYS,
}
