/**
 * Setup Wizard Types
 * @module quarry/ui/setup/types
 */

// ============================================================================
// GOAL TYPES
// ============================================================================

export type GoalType =
  | 'productivity'
  | 'learning'
  | 'journaling'
  | 'projects'
  | 'research'
  | 'creative-writing'
  | 'knowledge-base'
  | 'task-management'

export interface GoalOption {
  id: GoalType
  title: string
  description: string
  icon: string // Lucide icon name
  suggestedWeaves: string[]
  suggestedTemplates: string[]
}

// ============================================================================
// ORGANIZATION TYPES
// ============================================================================

export type OrganizationMethod =
  | 'by-project'
  | 'by-topic'
  | 'chronological'
  | 'gtd'
  | 'zettelkasten'
  | 'para'
  | 'custom'

export interface OrganizationOption {
  id: OrganizationMethod
  title: string
  description: string
  structure: string
  tooltip: string
  icon: string
}

export interface OrganizationPreferences {
  // Common preferences
  createStarterStrands: boolean
  includeReadme: boolean

  // GTD-specific
  gtdContexts?: string[]

  // PARA-specific
  paraAreas?: string[]

  // Zettelkasten-specific
  zettelIdFormat?: 'date' | 'sequence' | 'uuid'

  // Chronological-specific
  chronoFormat?: 'daily' | 'weekly' | 'monthly'

  // Custom
  customWeaves?: string[]
}

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

export type IntegrationId =
  | 'notion'
  | 'obsidian'
  | 'evernote'
  | 'google-docs'
  | 'bleep'
  | 'shorthand'
  | 'markdown-files'

export interface Integration {
  id: IntegrationId
  name: string
  description: string
  icon: string
  importFormat: string
  instructions: string
  fileTypes: string[]
  requiresAuth?: boolean
  comingSoon?: boolean
}

export interface ImportConfig {
  integrationId: IntegrationId
  enabled: boolean
  files?: File[]
  authToken?: string
  options: {
    preserveStructure: boolean
    mergeTags: boolean
    skipDuplicates: boolean
  }
}

export interface ImportedData {
  integration: IntegrationId
  items: ImportedItem[]
  structure?: ImportedStructure
}

export interface ImportedItem {
  id: string
  title: string
  content: string
  path?: string
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface ImportedStructure {
  folders: { name: string; path: string; children?: ImportedStructure['folders'] }[]
}

// ============================================================================
// PROPOSED STRUCTURE TYPES
// ============================================================================

export interface ProposedWeave {
  name: string
  description: string
  emoji?: string
  coverColor?: string
  looms: ProposedLoom[]
}

export interface ProposedLoom {
  name: string
  description: string
  emoji?: string
  depth?: number
  path?: string
  strands?: ProposedStrand[]
}

export interface ProposedStrand {
  name: string
  templateId?: string
  description?: string
}

export interface ProposedStructure {
  weaves: ProposedWeave[]
  totalLooms: number
  totalStrands: number
  suggestedTemplates: TemplateRecommendation[]
}

export interface TemplateRecommendation {
  id: string
  name: string
  category: string
  description: string
  matchScore: number
  matchReason: string
}

// ============================================================================
// WIZARD STATE TYPES
// ============================================================================

export type WizardStep = 'goals' | 'organization' | 'integrations' | 'preview' | 'generate'

export interface GenerationProgress {
  phase: 'idle' | 'creating-weaves' | 'creating-looms' | 'creating-strands' | 'processing-imports' | 'finalizing' | 'complete' | 'error'
  currentPhase: number
  completedPhases: number[]
  percentage: number
  currentItem?: string
  error?: string
}

export interface GeneratedIds {
  weaves: string[]
  looms: string[]
  strands: string[]
}

export interface SetupWizardState {
  // Current step
  currentStep: WizardStep

  // Step 1: Goals
  selectedGoals: GoalType[]
  customGoals: string[]

  // Step 2: Organization
  organizationMethod: OrganizationMethod | null
  organizationPreferences: OrganizationPreferences

  // Step 3: Integrations
  selectedIntegrations: IntegrationId[]
  importConfigs: Record<IntegrationId, ImportConfig>
  importedData: ImportedData[]

  // Step 4: Preview
  proposedStructure: ProposedStructure | null
  aiReasoning: string
  selectedTemplates: string[]
  structureEdits: StructureEdit[]

  // Step 5: Generate
  generationProgress: GenerationProgress
  generatedIds: GeneratedIds | null

  // UI State
  expandedSections: Set<string>
  errors: Record<string, string>
  isLoading: boolean
  aiSuggestionsLoading: boolean
}

export interface StructureEdit {
  type: 'rename' | 'remove' | 'add' | 'move'
  path: string
  value?: string | ProposedWeave | ProposedLoom
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export type SetupWizardAction =
  | { type: 'SET_STEP'; payload: WizardStep }
  | { type: 'TOGGLE_GOAL'; payload: GoalType }
  | { type: 'ADD_CUSTOM_GOAL'; payload: string }
  | { type: 'REMOVE_CUSTOM_GOAL'; payload: string }
  | { type: 'SET_ORGANIZATION'; payload: OrganizationMethod }
  | { type: 'SET_PREFERENCES'; payload: Partial<OrganizationPreferences> }
  | { type: 'TOGGLE_INTEGRATION'; payload: IntegrationId }
  | { type: 'SET_IMPORT_CONFIG'; payload: { id: IntegrationId; config: Partial<ImportConfig> } }
  | { type: 'ADD_IMPORTED_DATA'; payload: ImportedData }
  | { type: 'SET_PROPOSED_STRUCTURE'; payload: { structure: ProposedStructure; reasoning: string } }
  | { type: 'TOGGLE_TEMPLATE'; payload: string }
  | { type: 'EDIT_STRUCTURE'; payload: StructureEdit }
  | { type: 'SET_GENERATION_PROGRESS'; payload: Partial<GenerationProgress> }
  | { type: 'SET_GENERATED_IDS'; payload: GeneratedIds }
  | { type: 'TOGGLE_SECTION'; payload: string }
  | { type: 'SET_ERROR'; payload: { key: string; message: string } }
  | { type: 'CLEAR_ERROR'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_AI_LOADING'; payload: boolean }
  | { type: 'RESET' }
