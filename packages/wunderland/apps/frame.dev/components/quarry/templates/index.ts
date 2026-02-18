/**
 * Template System Exports
 * @module codex/templates
 * 
 * @remarks
 * Modular template system for strand creation with:
 * - External JSON templates in /public/templates
 * - Rich template metadata and validation
 * - Search, favorites, and recent templates
 * - Preview and form generation
 */

// Types
export * from './types'

// Service
export {
  loadTemplateIndex,
  loadTemplate,
  loadAllTemplates,
  getCategories,
  filterTemplates,
  getTemplatePreferences,
  saveTemplatePreferences,
  toggleFavorite,
  recordTemplateUsage,
  getRecentTemplates,
  getFavoriteTemplates,
  validateFormData,
  generateFrontmatter,
  getTemplateById,
  searchTemplates,
  getTemplatesByCategory,
  getFeaturedTemplates,
  clearTemplateCache,
} from './templateService'

// Components
export { default as TemplateCard } from './TemplateCard'
export { default as TemplateSelector } from './TemplateSelector'
export { default as TemplatePreview } from './TemplatePreview'





















