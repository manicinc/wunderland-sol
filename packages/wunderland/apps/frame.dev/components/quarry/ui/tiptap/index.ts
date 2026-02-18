/**
 * Tiptap Extensions Module
 * @module quarry/ui/tiptap
 */

export { SlashCommandExtension, deleteSlashQuery } from './SlashCommandExtension'
export type { SlashCommandOptions, SlashCommandStorage } from './SlashCommandExtension'

export { FocusLineExtension, focusLineStyles } from './FocusLineExtension'
export type { FocusLineOptions, FocusLineStorage } from './FocusLineExtension'

export {
  MentionTriggerExtension,
  MentionNode,
  deleteMentionQuery,
  mentionTriggerPluginKey,
} from './MentionExtension'
export type {
  MentionTriggerOptions,
  MentionTriggerStorage,
  MentionNodeOptions,
  MentionAttributes,
} from './MentionExtension'
