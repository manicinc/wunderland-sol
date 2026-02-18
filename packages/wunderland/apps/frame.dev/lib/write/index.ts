/**
 * Write Mode
 * @module lib/write
 *
 * Project-based writing management for stories, essays, and other long-form content.
 */

// Types
export type {
  ProjectType,
  ProjectStatus,
  WritingProject,
  ProjectPart,
  ProjectChapter,
  DailyWordCount,
  WritingSession,
  WordCountStats,
  ProjectTemplate,
  // Publishing types
  ProjectPublishFormat,
  ProjectPublishStatus,
  PublishProjectOptions,
  PublishProjectResult,
} from './types'

export {
  PROJECT_TEMPLATES,
  PROJECTS_STORAGE_KEY,
  WORD_COUNT_STORAGE_KEY,
  SESSIONS_STORAGE_KEY,
  WRITE_PROJECTS_WEAVE,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPE_ICONS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
} from './types'

// Store
export {
  // Projects
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  archiveProject,

  // Parts
  addPart,
  updatePart,
  deletePart,
  reorderParts,

  // Chapters
  addChapter,
  updateChapter,
  deleteChapter,
  moveChapter,

  // Word count
  getWordCountHistory,
  recordWordsWritten,
  getWordCountStats,

  // Templates
  getProjectTemplates,
  getProjectTemplate,
  getTemplatesForType,
} from './projectStore'

// Publisher
export {
  publishProject,
  publishProjectAsStrand,
  publishProjectAsFolderStrand,
} from './projectPublisher'
