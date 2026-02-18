/**
 * Structure Generator
 * Generates weave/loom/strand structure based on user preferences
 * @module lib/setup/structureGenerator
 */

import type {
  GoalType,
  OrganizationMethod,
  OrganizationPreferences,
  ProposedStructure,
  ProposedWeave,
  ProposedLoom,
  ProposedStrand,
  TemplateRecommendation,
} from '@/components/quarry/ui/setup/types'

// ============================================================================
// CONFIGURATION
// ============================================================================

interface GoalConfig {
  suggestedWeaves: ProposedWeave[]
  suggestedTemplates: TemplateRecommendation[]
}

const GOAL_CONFIGS: Record<GoalType, GoalConfig> = {
  productivity: {
    suggestedWeaves: [
      {
        name: 'Work',
        description: 'Professional work and career',
        emoji: '💼',
        looms: [
          { name: 'Projects', description: 'Active work projects' },
          { name: 'Meetings', description: 'Meeting notes and agendas' },
          { name: 'Quick Notes', description: 'Quick captures and ideas' },
        ],
      },
      {
        name: 'Inbox',
        description: 'Quick capture inbox',
        emoji: '📥',
        looms: [],
      },
    ],
    suggestedTemplates: [
      {
        id: 'meeting-notes',
        name: 'Meeting Notes',
        category: 'Productivity',
        description: 'Structured template for meeting notes with attendees and action items',
        matchScore: 0.95,
        matchReason: 'Perfect for capturing meeting discussions',
      },
      {
        id: 'daily-note',
        name: 'Daily Note',
        category: 'Productivity',
        description: 'Daily planning and reflection template',
        matchScore: 0.9,
        matchReason: 'Helps maintain daily focus',
      },
    ],
  },
  learning: {
    suggestedWeaves: [
      {
        name: 'Learning',
        description: 'Study materials and courses',
        emoji: '🎓',
        looms: [
          { name: 'Courses', description: 'Course notes and materials' },
          { name: 'Books', description: 'Book summaries and highlights' },
          { name: 'Concepts', description: 'Key concepts and definitions' },
        ],
      },
      {
        name: 'Flashcards',
        description: 'Spaced repetition study',
        emoji: '🃏',
        looms: [],
      },
    ],
    suggestedTemplates: [
      {
        id: 'lecture-notes',
        name: 'Lecture Notes',
        category: 'Learning',
        description: 'Cornell-style lecture notes with summary section',
        matchScore: 0.95,
        matchReason: 'Optimized for learning retention',
      },
      {
        id: 'book-summary',
        name: 'Book Summary',
        category: 'Learning',
        description: 'Template for capturing book insights',
        matchScore: 0.85,
        matchReason: 'Great for book learning',
      },
    ],
  },
  journaling: {
    suggestedWeaves: [
      {
        name: 'Journal',
        description: 'Personal reflections and diary',
        emoji: '📓',
        looms: [
          { name: 'Daily', description: 'Daily journal entries' },
          { name: 'Reflections', description: 'Weekly and monthly reflections' },
          { name: 'Gratitude', description: 'Gratitude journaling' },
        ],
      },
    ],
    suggestedTemplates: [
      {
        id: 'daily-journal',
        name: 'Daily Journal',
        category: 'Journaling',
        description: 'Morning and evening reflection prompts',
        matchScore: 0.98,
        matchReason: 'Perfect for daily journaling',
      },
      {
        id: 'weekly-reflection',
        name: 'Weekly Reflection',
        category: 'Journaling',
        description: 'Weekly review and planning template',
        matchScore: 0.85,
        matchReason: 'Great for weekly reviews',
      },
    ],
  },
  projects: {
    suggestedWeaves: [
      {
        name: 'Projects',
        description: 'Project documentation and planning',
        emoji: '🚀',
        looms: [
          { name: 'Active', description: 'In-progress projects' },
          { name: 'Planning', description: 'Project planning and roadmaps' },
          { name: 'Archive', description: 'Completed projects' },
        ],
      },
    ],
    suggestedTemplates: [
      {
        id: 'project-brief',
        name: 'Project Brief',
        category: 'Projects',
        description: 'Project overview with goals and timeline',
        matchScore: 0.95,
        matchReason: 'Essential for project kickoffs',
      },
      {
        id: 'decision-record',
        name: 'Decision Record',
        category: 'Projects',
        description: 'Document important project decisions',
        matchScore: 0.8,
        matchReason: 'Useful for tracking decisions',
      },
    ],
  },
  research: {
    suggestedWeaves: [
      {
        name: 'Research',
        description: 'Research projects and notes',
        emoji: '🔬',
        looms: [
          { name: 'Topics', description: 'Research topics' },
          { name: 'Sources', description: 'Papers and references' },
          { name: 'Analysis', description: 'Analysis and synthesis' },
        ],
      },
      {
        name: 'Bibliography',
        description: 'Reference management',
        emoji: '📚',
        looms: [],
      },
    ],
    suggestedTemplates: [
      {
        id: 'research-note',
        name: 'Research Note',
        category: 'Research',
        description: 'Structured research note with methodology',
        matchScore: 0.95,
        matchReason: 'Optimized for research workflow',
      },
      {
        id: 'literature-review',
        name: 'Literature Review',
        category: 'Research',
        description: 'Template for reviewing academic papers',
        matchScore: 0.9,
        matchReason: 'Great for literature synthesis',
      },
    ],
  },
  'creative-writing': {
    suggestedWeaves: [
      {
        name: 'Writing',
        description: 'Creative writing projects',
        emoji: '✍️',
        looms: [
          { name: 'Stories', description: 'Story drafts and outlines' },
          { name: 'Characters', description: 'Character profiles' },
          { name: 'World Building', description: 'Settings and lore' },
        ],
      },
      {
        name: 'Ideas',
        description: 'Story ideas and prompts',
        emoji: '💡',
        looms: [],
      },
    ],
    suggestedTemplates: [
      {
        id: 'story-outline',
        name: 'Story Outline',
        category: 'Writing',
        description: 'Three-act story structure template',
        matchScore: 0.95,
        matchReason: 'Essential for story planning',
      },
      {
        id: 'character-profile',
        name: 'Character Profile',
        category: 'Writing',
        description: 'Detailed character development template',
        matchScore: 0.9,
        matchReason: 'Great for character development',
      },
    ],
  },
  'knowledge-base': {
    suggestedWeaves: [
      {
        name: 'Wiki',
        description: 'Personal wiki and knowledge base',
        emoji: '📖',
        looms: [
          { name: 'Topics', description: 'Topic pages' },
          { name: 'How-Tos', description: 'Guides and tutorials' },
          { name: 'References', description: 'Quick references' },
        ],
      },
    ],
    suggestedTemplates: [
      {
        id: 'wiki-page',
        name: 'Wiki Page',
        category: 'Knowledge',
        description: 'Standard wiki page with sections',
        matchScore: 0.95,
        matchReason: 'Perfect for wiki entries',
      },
      {
        id: 'how-to-guide',
        name: 'How-To Guide',
        category: 'Knowledge',
        description: 'Step-by-step instructional guide',
        matchScore: 0.85,
        matchReason: 'Great for documenting processes',
      },
    ],
  },
  'task-management': {
    suggestedWeaves: [
      {
        name: 'Tasks',
        description: 'Task tracking and management',
        emoji: '✅',
        looms: [
          { name: 'Inbox', description: 'Incoming tasks' },
          { name: 'Active', description: 'Current tasks' },
          { name: 'Completed', description: 'Finished tasks' },
        ],
      },
      {
        name: 'Goals',
        description: 'Long-term goals and objectives',
        emoji: '🎯',
        looms: [],
      },
    ],
    suggestedTemplates: [
      {
        id: 'task-list',
        name: 'Task List',
        category: 'Tasks',
        description: 'Simple task list with checkboxes',
        matchScore: 0.95,
        matchReason: 'Essential for task tracking',
      },
      {
        id: 'weekly-plan',
        name: 'Weekly Plan',
        category: 'Tasks',
        description: 'Weekly planning and goal setting',
        matchScore: 0.85,
        matchReason: 'Great for weekly planning',
      },
    ],
  },
}

// ============================================================================
// ORGANIZATION METHOD STRUCTURES
// ============================================================================

interface OrganizationConfig {
  baseWeaves: ProposedWeave[]
  applyPreferences: (weaves: ProposedWeave[], prefs: OrganizationPreferences) => ProposedWeave[]
}

const ORGANIZATION_CONFIGS: Record<OrganizationMethod, OrganizationConfig> = {
  'by-project': {
    baseWeaves: [
      {
        name: 'Projects',
        description: 'Project-based organization',
        emoji: '📁',
        looms: [
          { name: 'Active', description: 'Currently active projects' },
          { name: 'Archive', description: 'Completed and archived projects' },
        ],
      },
    ],
    applyPreferences: (weaves, prefs) => weaves,
  },
  'by-topic': {
    baseWeaves: [
      {
        name: 'Topics',
        description: 'Topic-based organization',
        emoji: '🏷️',
        looms: [],
      },
    ],
    applyPreferences: (weaves, prefs) => weaves,
  },
  chronological: {
    baseWeaves: [],
    applyPreferences: (weaves, prefs) => {
      const year = new Date().getFullYear()
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December']
      const currentMonth = new Date().getMonth()

      const chronoWeave: ProposedWeave = {
        name: String(year),
        description: 'This year',
        emoji: '📅',
        looms: months.slice(0, currentMonth + 1).map(month => ({
          name: month,
          description: `${month} ${year}`,
        })),
      }

      return [chronoWeave, ...weaves]
    },
  },
  gtd: {
    baseWeaves: [
      { name: 'Inbox', description: 'Capture everything', emoji: '📥', looms: [] },
      { name: 'Next Actions', description: 'Actionable items', emoji: '⚡', looms: [] },
      { name: 'Waiting', description: 'Delegated items', emoji: '⏳', looms: [] },
      { name: 'Projects', description: 'Multi-step outcomes', emoji: '📋', looms: [] },
      { name: 'Someday', description: 'Future possibilities', emoji: '💭', looms: [] },
      { name: 'Reference', description: 'Information storage', emoji: '📚', looms: [] },
    ],
    applyPreferences: (weaves, prefs) => {
      if (prefs.gtdContexts && prefs.gtdContexts.length > 0) {
        const nextActionsIndex = weaves.findIndex(w => w.name === 'Next Actions')
        if (nextActionsIndex !== -1) {
          weaves[nextActionsIndex].looms = prefs.gtdContexts.map(ctx => ({
            name: ctx,
            description: `Actions for ${ctx}`,
          }))
        }
      }
      return weaves
    },
  },
  zettelkasten: {
    baseWeaves: [
      { name: 'Permanent Notes', description: 'Atomic ideas', emoji: '💡', looms: [] },
      { name: 'Literature Notes', description: 'Source summaries', emoji: '📚', looms: [] },
      { name: 'Fleeting Notes', description: 'Quick captures', emoji: '✏️', looms: [] },
      { name: 'Index', description: 'Entry points', emoji: '🔍', looms: [] },
    ],
    applyPreferences: (weaves, prefs) => weaves,
  },
  para: {
    baseWeaves: [
      { name: 'Projects', description: 'Active projects with deadlines', emoji: '🚀', looms: [] },
      { name: 'Areas', description: 'Ongoing responsibilities', emoji: '🎯', looms: [] },
      { name: 'Resources', description: 'Topic references', emoji: '📖', looms: [] },
      { name: 'Archives', description: 'Inactive items', emoji: '🗄️', looms: [] },
    ],
    applyPreferences: (weaves, prefs) => {
      if (prefs.paraAreas && prefs.paraAreas.length > 0) {
        const areasIndex = weaves.findIndex(w => w.name === 'Areas')
        if (areasIndex !== -1) {
          weaves[areasIndex].looms = prefs.paraAreas.map(area => ({
            name: area,
            description: `Notes about ${area}`,
          }))
        }
      }
      return weaves
    },
  },
  custom: {
    baseWeaves: [],
    applyPreferences: (weaves, prefs) => {
      if (prefs.customWeaves && prefs.customWeaves.length > 0) {
        const customWeaves: ProposedWeave[] = prefs.customWeaves.map(name => ({
          name,
          description: `Custom weave: ${name}`,
          emoji: '📁',
          looms: [],
        }))
        return [...customWeaves, ...weaves]
      }
      return weaves
    },
  },
}

// ============================================================================
// STRUCTURE GENERATOR
// ============================================================================

export interface GenerateStructureOptions {
  goals: GoalType[]
  customGoals: string[]
  organizationMethod: OrganizationMethod | null
  preferences: OrganizationPreferences
}

export function generateProposedStructure(options: GenerateStructureOptions): ProposedStructure {
  const { goals, customGoals, organizationMethod, preferences } = options

  // Start with organization method structure
  let weaves: ProposedWeave[] = []
  const allTemplates: TemplateRecommendation[] = []

  // Apply organization method
  if (organizationMethod) {
    const orgConfig = ORGANIZATION_CONFIGS[organizationMethod]
    weaves = [...orgConfig.baseWeaves]
    weaves = orgConfig.applyPreferences(weaves, preferences)
  }

  // Add goal-specific weaves and templates
  const addedWeaveNames = new Set(weaves.map(w => w.name))

  for (const goal of goals) {
    const goalConfig = GOAL_CONFIGS[goal]

    // Add weaves that don't already exist
    for (const suggestedWeave of goalConfig.suggestedWeaves) {
      if (!addedWeaveNames.has(suggestedWeave.name)) {
        weaves.push(suggestedWeave)
        addedWeaveNames.add(suggestedWeave.name)
      }
    }

    // Add templates
    for (const template of goalConfig.suggestedTemplates) {
      if (!allTemplates.find(t => t.id === template.id)) {
        allTemplates.push(template)
      }
    }
  }

  // Add custom goals as weaves
  for (const customGoal of customGoals) {
    if (!addedWeaveNames.has(customGoal)) {
      weaves.push({
        name: customGoal,
        description: `Custom: ${customGoal}`,
        emoji: '✨',
        looms: [],
      })
      addedWeaveNames.add(customGoal)
    }
  }

  // Add starter strands if enabled
  if (preferences.createStarterStrands) {
    for (const weave of weaves) {
      if (weave.looms.length === 0) {
        weave.looms.push({
          name: 'Getting Started',
          description: 'Start here',
          strands: [
            { name: 'Welcome', templateId: 'blank', description: 'Welcome to ' + weave.name },
          ],
        })
      }
    }
  }

  // Add README if enabled
  if (preferences.includeReadme) {
    for (const weave of weaves) {
      const hasReadme = weave.looms.some(l =>
        l.strands?.some(s => s.name.toLowerCase().includes('readme'))
      )
      if (!hasReadme && weave.looms.length > 0) {
        weave.looms[0].strands = weave.looms[0].strands || []
        weave.looms[0].strands.unshift({
          name: 'README',
          description: `About ${weave.name}`,
        })
      }
    }
  }

  // Calculate totals
  const totalLooms = weaves.reduce((sum, w) => sum + w.looms.length, 0)
  const totalStrands = weaves.reduce(
    (sum, w) => sum + w.looms.reduce((s, l) => s + (l.strands?.length || 0), 0),
    0
  )

  // Sort templates by match score
  allTemplates.sort((a, b) => b.matchScore - a.matchScore)

  return {
    weaves,
    totalLooms,
    totalStrands,
    suggestedTemplates: allTemplates.slice(0, 8), // Limit to top 8
  }
}

// ============================================================================
// AI REASONING GENERATOR
// ============================================================================

export function generateAIReasoning(options: GenerateStructureOptions): string {
  const { goals, customGoals, organizationMethod, preferences } = options

  const goalNames = goals.map(g => {
    const config = GOAL_CONFIGS[g]
    return config.suggestedTemplates[0]?.category || g
  })

  const allGoals = [...goalNames, ...customGoals]
  const goalList = allGoals.join(', ')

  let reasoning = `Based on your selected goals (${goalList})`

  if (organizationMethod) {
    const methodNames: Record<OrganizationMethod, string> = {
      'by-project': 'project-based',
      'by-topic': 'topic-based',
      chronological: 'chronological',
      gtd: 'Getting Things Done (GTD)',
      zettelkasten: 'Zettelkasten',
      para: 'PARA method',
      custom: 'custom',
    }
    reasoning += ` and your preference for ${methodNames[organizationMethod]} organization`
  }

  reasoning += `, I've created a structure designed to support your workflow. `

  if (goals.includes('productivity') && goals.includes('learning')) {
    reasoning += 'The combination of productivity and learning goals means you\'ll have dedicated spaces for both work output and knowledge acquisition. '
  }

  if (organizationMethod === 'gtd') {
    reasoning += 'The GTD system will help you capture everything, clarify actionable items, and maintain clear project boundaries. '
  } else if (organizationMethod === 'zettelkasten') {
    reasoning += 'The Zettelkasten method will enable you to build a network of interconnected ideas over time. '
  } else if (organizationMethod === 'para') {
    reasoning += 'The PARA method provides clear separation between active work and reference material. '
  }

  if (preferences.createStarterStrands) {
    reasoning += 'Starter strands have been added to help you get started quickly. '
  }

  reasoning += 'You can customize this structure by editing, adding, or removing weaves and looms.'

  return reasoning
}
