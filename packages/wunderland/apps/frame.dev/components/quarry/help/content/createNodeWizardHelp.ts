/**
 * CreateNodeWizard Help Content
 * @module codex/help/content/createNodeWizardHelp
 *
 * @description
 * Help content for the Create Node Wizard including:
 * - Step-by-step instructions
 * - Field descriptions
 * - Tour steps for first-time users
 */

import type { WizardHelp, StepHelp, WizardTourStep } from '../HelpContent'

/* ═══════════════════════════════════════════════════════════════════════════
   STEP HELP
═══════════════════════════════════════════════════════════════════════════ */

const selectTypeStep: StepHelp = {
  id: 'select-type',
  title: 'Choose Node Type',
  overview: 'Select the type of content you want to create. Each type serves a different purpose in your knowledge structure.',
  instructions: [
    'Review the available node types',
    'Consider where in your knowledge hierarchy this content fits',
    'Click on a node type to proceed',
  ],
  tips: [
    'Weaves are for broad topics like "Machine Learning" or "Philosophy"',
    'Looms organize content within a weave, like "Neural Networks" within ML',
    'Strands are individual pieces of content like articles or notes',
  ],
  quickRef: [
    { term: 'Weave', definition: 'Top-level knowledge domain (folder)' },
    { term: 'Loom', definition: 'Topic or module within a weave (subfolder)' },
    { term: 'Strand', definition: 'Individual content piece (file)' },
    { term: 'Canvas', definition: 'Visual whiteboard drawing' },
    { term: 'Mind Map', definition: 'Node-based diagram' },
  ],
}

const selectTemplateStep: StepHelp = {
  id: 'select-template',
  title: 'Choose Template',
  overview: 'Templates provide pre-defined structure and fields for your content. Choose one that matches your needs.',
  instructions: [
    'Browse available templates by category',
    'Use search to find specific templates',
    'Star templates you use often for quick access',
    'Click "Use Template" to proceed',
  ],
  tips: [
    'Use the search bar to filter templates by name or category',
    'Starred templates appear at the top for easy access',
    'You can create custom templates in the Template Builder',
  ],
  troubleshooting: [
    {
      problem: 'Cannot find the right template',
      solution: 'Use the "Blank" template and customize it, or create a new template in Template Builder',
    },
  ],
}

const formStep: StepHelp = {
  id: 'form',
  title: 'Fill in Details',
  overview: 'Enter the information for your new content. Required fields are marked with a red asterisk (*)',
  instructions: [
    'Fill in all required fields (marked with *)',
    'Add optional information to improve discoverability',
    'Review your entries before creating',
  ],
  tips: [
    'The name field is used in URLs - use lowercase and hyphens',
    'Tags help with search and categorization',
    'You can inherit tags and difficulty from parent nodes',
  ],
  fields: [
    {
      name: 'name',
      label: 'Name / Filename',
      description: 'URL-safe identifier used in paths',
      examples: ['introduction', 'getting-started', 'neural-networks'],
      cautions: ['Use lowercase letters, numbers, and hyphens only', 'Avoid spaces and special characters'],
    },
    {
      name: 'title',
      label: 'Display Title',
      description: 'Human-readable title shown in navigation and headers',
      examples: ['Introduction to Machine Learning', 'Getting Started Guide'],
    },
    {
      name: 'description',
      label: 'Description',
      description: 'Brief summary for previews and search',
      suggestion: 'Keep it to 1-2 sentences',
    },
    {
      name: 'tags',
      label: 'Tags',
      description: 'Keywords for categorization and search',
      examples: ['beginner, tutorial, python'],
      suggestion: 'Separate tags with commas',
    },
    {
      name: 'difficulty',
      label: 'Difficulty Level',
      description: 'Helps readers find content matching their skill level',
      examples: ['beginner', 'intermediate', 'advanced'],
    },
  ],
  troubleshooting: [
    {
      problem: 'Cannot proceed - validation error',
      solution: 'Check that all required fields are filled and the name uses only valid characters',
    },
  ],
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOUR STEPS
═══════════════════════════════════════════════════════════════════════════ */

const tourSteps: WizardTourStep[] = [
  {
    id: 'welcome',
    target: '[data-help="wizard-header"]',
    title: 'Welcome to the Create Wizard',
    description: 'This wizard helps you create new content in your knowledge base. Let me show you around!',
    position: 'bottom',
    actionText: 'Start Tour',
    skipText: 'Skip Tour',
  },
  {
    id: 'node-types',
    target: '[data-help="node-types"]',
    title: 'Choose Your Content Type',
    description: 'Start by selecting what kind of content you want to create. Each type has a specific purpose in your knowledge hierarchy.',
    position: 'right',
    actionText: 'Next',
  },
  {
    id: 'templates',
    target: '[data-help="template-selector"]',
    title: 'Pick a Template',
    description: 'Templates provide pre-built structure for your content. You can browse by category or search for specific ones.',
    position: 'left',
    actionText: 'Next',
  },
  {
    id: 'form-fields',
    target: '[data-help="form-fields"]',
    title: 'Fill in the Details',
    description: 'Enter information about your content. Required fields are marked with an asterisk (*). Hover over the help icons for more info.',
    position: 'top',
    actionText: 'Next',
  },
  {
    id: 'inherited-values',
    target: '[data-help="inherited-hint"]',
    title: 'Smart Suggestions',
    description: 'When available, you can inherit tags and settings from parent content. Just click the suggestion to use it!',
    position: 'top',
    actionText: 'Got it!',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORT
═══════════════════════════════════════════════════════════════════════════ */

export const createNodeWizardHelp: WizardHelp = {
  id: 'create-node-wizard',
  title: 'Create Node Wizard',
  description: 'Create new content in your knowledge base with structured forms and templates.',
  steps: [selectTypeStep, selectTemplateStep, formStep],
  tourSteps,
}

export default createNodeWizardHelp
