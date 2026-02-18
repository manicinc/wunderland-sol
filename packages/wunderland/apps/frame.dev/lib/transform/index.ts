/**
 * Transform Module
 * @module lib/transform
 *
 * Exports for strand transformation system.
 */

// Types
export type {
  ExtractionSource,
  ExtractedFieldValue,
  ExtractionOptions,
  FieldMappingConfig,
  FieldMappings,
  TagMatchMode,
  DateField,
  TransformFilters,
  TransformPostAction,
  TransformConfig,
  TransformResult,
  BatchTransformResult,
  TransformStep,
  TransformModalState,
  SelectionMode,
  ExtendedSelectionState,
  TransformWorkflowPreset,
} from './types'

// Constants
export { WORKFLOW_PRESETS } from './types'

// Content Extractor
export {
  extractFieldsFromStrand,
  extractFieldValue,
  extractTitle,
  parseFrontmatter,
  suggestFieldMappings,
} from './contentExtractor'

// Transform Service
export {
  transformStrands,
  previewTransformation,
  applyFilters,
  batchApplySupertag,
  batchRemoveSupertag,
  getAvailableSupertagSchemas,
  getSuggestedMappings,
  createDefaultTransformConfig,
} from './transformService'
