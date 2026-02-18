/**
 * Write Mode Types
 * @module lib/write/types
 *
 * Types for the Write mode project management system.
 * Supports stories, essays, articles, and other long-form content.
 */

// ============================================================================
// PROJECT TYPES
// ============================================================================

/**
 * Types of writing projects
 */
export type ProjectType = 'story' | 'essay' | 'article' | 'poem' | 'script' | 'journal' | 'other'

/**
 * Project status
 */
export type ProjectStatus = 'draft' | 'in_progress' | 'editing' | 'complete' | 'archived'

/**
 * A writing project (collection of parts/chapters)
 */
export interface WritingProject {
  /** Unique project ID */
  id: string
  /** Project title */
  title: string
  /** Project description/summary */
  description?: string
  /** Type of project */
  type: ProjectType
  /** Current status */
  status: ProjectStatus
  /** Cover image URL */
  coverImage?: string
  /** Word count goal (optional) */
  wordGoal?: number
  /** Daily word goal (optional) */
  dailyGoal?: number
  /** Target completion date (optional) */
  targetDate?: string
  /** Project parts/chapters */
  parts: ProjectPart[]
  /** Tags for categorization */
  tags?: string[]
  /** When the project was created */
  createdAt: string
  /** When the project was last updated */
  updatedAt: string
  /** When the project was last worked on */
  lastWorkedOn?: string
  /** Publishing status (if published as strand) */
  publishing?: ProjectPublishStatus
}

/**
 * A part of a project (for organizing chapters)
 */
export interface ProjectPart {
  /** Unique part ID */
  id: string
  /** Part title (e.g., "Part One", "Act I") */
  title: string
  /** Part description/summary */
  description?: string
  /** Order within the project */
  order: number
  /** Chapters in this part */
  chapters: ProjectChapter[]
  /** Whether this part is collapsed in the UI */
  collapsed?: boolean
}

/**
 * A chapter/section within a part
 */
export interface ProjectChapter {
  /** Unique chapter ID */
  id: string
  /** Chapter title */
  title: string
  /** Chapter synopsis */
  synopsis?: string
  /** Path to the strand file */
  strandPath: string
  /** Order within the part */
  order: number
  /** Word count (synced from strand) */
  wordCount: number
  /** Chapter status */
  status: 'outline' | 'draft' | 'revision' | 'complete'
  /** Writing prompts used */
  prompts?: string[]
  /** When last edited */
  lastEditedAt: string
}

// ============================================================================
// WORD COUNT & GOALS
// ============================================================================

/**
 * Word count tracking for a day
 */
export interface DailyWordCount {
  /** Date (YYYY-MM-DD) */
  date: string
  /** Words written this day */
  wordsWritten: number
  /** Daily goal (if any) */
  dailyGoal?: number
  /** Projects worked on */
  projectsWorked: string[]
  /** Writing sessions */
  sessions: WritingSession[]
}

/**
 * A writing session
 */
export interface WritingSession {
  /** Session ID */
  id: string
  /** Project ID */
  projectId: string
  /** Chapter ID (if applicable) */
  chapterId?: string
  /** Start time */
  startTime: string
  /** End time */
  endTime?: string
  /** Words written in this session */
  wordsWritten: number
  /** Duration in minutes */
  durationMinutes: number
}

/**
 * Word count statistics
 */
export interface WordCountStats {
  /** Total words across all projects */
  totalWords: number
  /** Words written today */
  wordsToday: number
  /** Words written this week */
  wordsThisWeek: number
  /** Words written this month */
  wordsThisMonth: number
  /** Current streak (consecutive days writing) */
  currentStreak: number
  /** Longest streak ever */
  longestStreak: number
  /** Average words per day (when writing) */
  avgWordsPerDay: number
  /** Average session duration in minutes */
  avgSessionDuration: number
}

// ============================================================================
// PROJECT TEMPLATES
// ============================================================================

/**
 * Template for creating a new project
 */
export interface ProjectTemplate {
  /** Template ID */
  id: string
  /** Template name */
  name: string
  /** Template description */
  description: string
  /** Project type this template is for */
  type: ProjectType
  /** Default structure */
  structure: {
    parts: Array<{
      title: string
      chapters: Array<{
        title: string
        synopsis?: string
      }>
    }>
  }
  /** Default word goal */
  wordGoal?: number
  /** Template icon */
  icon?: string
}

/**
 * Built-in project templates
 */
export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'novel-3act',
    name: 'Novel (3-Act)',
    description: 'Classic three-act structure for novels',
    type: 'story',
    structure: {
      parts: [
        {
          title: 'Act I - Setup',
          chapters: [
            { title: 'Chapter 1', synopsis: 'Opening hook and introduction' },
            { title: 'Chapter 2', synopsis: 'Establish the world and protagonist' },
            { title: 'Chapter 3', synopsis: 'Inciting incident' },
          ],
        },
        {
          title: 'Act II - Confrontation',
          chapters: [
            { title: 'Chapter 4', synopsis: 'Rising action begins' },
            { title: 'Chapter 5', synopsis: 'Obstacles and complications' },
            { title: 'Chapter 6', synopsis: 'Midpoint twist' },
            { title: 'Chapter 7', synopsis: 'Stakes escalate' },
            { title: 'Chapter 8', synopsis: 'Dark night of the soul' },
          ],
        },
        {
          title: 'Act III - Resolution',
          chapters: [
            { title: 'Chapter 9', synopsis: 'Climax preparation' },
            { title: 'Chapter 10', synopsis: 'Climax' },
            { title: 'Chapter 11', synopsis: 'Resolution and denouement' },
          ],
        },
      ],
    },
    wordGoal: 80000,
    icon: '📚',
  },
  {
    id: 'short-story',
    name: 'Short Story',
    description: 'Simple structure for short fiction',
    type: 'story',
    structure: {
      parts: [
        {
          title: 'Story',
          chapters: [
            { title: 'Opening', synopsis: 'Hook and setup' },
            { title: 'Rising Action', synopsis: 'Complications build' },
            { title: 'Climax', synopsis: 'Story peak' },
            { title: 'Resolution', synopsis: 'Wrap up' },
          ],
        },
      ],
    },
    wordGoal: 5000,
    icon: '📝',
  },
  {
    id: 'essay-5para',
    name: 'Essay (5-Paragraph)',
    description: 'Classic essay structure',
    type: 'essay',
    structure: {
      parts: [
        {
          title: 'Essay',
          chapters: [
            { title: 'Introduction', synopsis: 'Hook, context, thesis' },
            { title: 'Body 1', synopsis: 'First supporting argument' },
            { title: 'Body 2', synopsis: 'Second supporting argument' },
            { title: 'Body 3', synopsis: 'Third supporting argument' },
            { title: 'Conclusion', synopsis: 'Summary and final thoughts' },
          ],
        },
      ],
    },
    wordGoal: 2000,
    icon: '✍️',
  },
  {
    id: 'article',
    name: 'Article',
    description: 'Structure for blog posts and articles',
    type: 'article',
    structure: {
      parts: [
        {
          title: 'Article',
          chapters: [
            { title: 'Introduction', synopsis: 'Hook and overview' },
            { title: 'Main Content', synopsis: 'Core information' },
            { title: 'Supporting Details', synopsis: 'Examples and evidence' },
            { title: 'Conclusion', synopsis: 'Summary and call to action' },
          ],
        },
      ],
    },
    wordGoal: 1500,
    icon: '📰',
  },
  {
    id: 'screenplay',
    name: 'Screenplay',
    description: 'Three-act structure for scripts',
    type: 'script',
    structure: {
      parts: [
        {
          title: 'Act I',
          chapters: [
            { title: 'Opening Scene' },
            { title: 'Inciting Incident' },
            { title: 'First Act Break' },
          ],
        },
        {
          title: 'Act II',
          chapters: [
            { title: 'Rising Action' },
            { title: 'Midpoint' },
            { title: 'Complications' },
            { title: 'Second Act Break' },
          ],
        },
        {
          title: 'Act III',
          chapters: [
            { title: 'Climax' },
            { title: 'Resolution' },
          ],
        },
      ],
    },
    wordGoal: 25000,
    icon: '🎬',
  },
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start from scratch with no structure',
    type: 'other',
    structure: {
      parts: [
        {
          title: 'Part 1',
          chapters: [
            { title: 'Chapter 1' },
          ],
        },
      ],
    },
    icon: '📄',
  },
]

// ============================================================================
// STORAGE KEYS
// ============================================================================

/**
 * Storage key for projects
 */
export const PROJECTS_STORAGE_KEY = 'quarry-write-projects'

/**
 * Storage key for word count history
 */
export const WORD_COUNT_STORAGE_KEY = 'quarry-write-wordcount'

/**
 * Storage key for sessions
 */
export const SESSIONS_STORAGE_KEY = 'quarry-write-sessions'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default weave for write mode projects
 */
export const WRITE_PROJECTS_WEAVE = 'projects'

/**
 * Project type labels
 */
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  story: 'Story',
  essay: 'Essay',
  article: 'Article',
  poem: 'Poem',
  script: 'Script',
  journal: 'Journal',
  other: 'Other',
}

/**
 * Project type icons
 */
export const PROJECT_TYPE_ICONS: Record<ProjectType, string> = {
  story: '📚',
  essay: '✍️',
  article: '📰',
  poem: '🎭',
  script: '🎬',
  journal: '📓',
  other: '📄',
}

/**
 * Status labels
 */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  editing: 'Editing',
  complete: 'Complete',
  archived: 'Archived',
}

/**
 * Status colors (Tailwind classes)
 */
export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  draft: 'text-zinc-400 bg-zinc-500/10',
  in_progress: 'text-cyan-400 bg-cyan-500/10',
  editing: 'text-amber-400 bg-amber-500/10',
  complete: 'text-emerald-400 bg-emerald-500/10',
  archived: 'text-zinc-500 bg-zinc-600/10',
}

// ============================================================================
// PUBLISHING TYPES
// ============================================================================

/**
 * Format options for publishing a project as a strand
 */
export type ProjectPublishFormat = 'single-strand' | 'folder-strand'

/**
 * Publishing status tracking for a project
 */
export interface ProjectPublishStatus {
  /** Whether the project has been published as a strand */
  isPublished: boolean
  /** When the project was last published */
  publishedAt?: string
  /** Path to the published strand */
  publishedPath?: string
  /** Format used when publishing */
  publishFormat?: ProjectPublishFormat
  /** Type of strand created (file or folder) */
  strandType?: 'file' | 'folder'
}

/**
 * Options for publishing a project
 */
export interface PublishProjectOptions {
  /** Project ID to publish */
  projectId: string
  /** Publishing format */
  format: ProjectPublishFormat
  /** Target weave path (e.g., "weaves/writings") */
  targetWeave: string
  /** Custom slug (defaults to slugified project title) */
  slug?: string
  /** Include chapter synopses in TOC */
  includeSynopses?: boolean
  /** Include word counts per chapter */
  includeWordCounts?: boolean
  /** Run NLP pipeline after publish */
  runNLP?: boolean
  /** Dry run - preview without writing */
  dryRun?: boolean
}

/**
 * Result of a publishing operation
 */
export interface PublishProjectResult {
  /** Whether publishing succeeded */
  success: boolean
  /** Path to the published strand */
  strandPath?: string
  /** Type of strand created */
  strandType?: 'file' | 'folder'
  /** Total words published */
  totalWords: number
  /** Number of chapters published */
  chaptersPublished: number
  /** Duration in milliseconds */
  durationMs: number
  /** Any warnings during publishing */
  warnings?: string[]
  /** Error message if failed */
  error?: string
}
