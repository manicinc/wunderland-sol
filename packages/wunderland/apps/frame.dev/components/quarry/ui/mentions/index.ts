/**
 * Mentions UI Components
 * @module components/quarry/ui/mentions
 *
 * Embark-inspired @-mention system for inline entity references.
 */

export { MentionAutocomplete } from './MentionAutocomplete'
export type { MentionAutocompleteProps } from './MentionAutocomplete'

export { MentionChip } from './MentionChip'
export type { MentionChipProps } from './MentionChip'

// Re-export types from lib
export type {
  MentionableEntity,
  MentionableEntityType,
  MentionReference,
  MentionSuggestion,
  MentionAutocompleteOptions,
} from '@/lib/mentions/types'




