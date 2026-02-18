/**
 * Setup Library
 * Structure generation and template matching utilities
 * @module lib/setup
 */

export {
  generateProposedStructure,
  generateAIReasoning,
  type GenerateStructureOptions,
} from './structureGenerator'

export {
  matchTemplates,
  getTemplateById,
  getTemplateContent,
  getAllTemplates,
  getTemplatesByCategory,
  getTemplatesByGoal,
  searchTemplates,
  type MatchOptions,
  type TemplateDefinition,
} from './templateMatcher'
