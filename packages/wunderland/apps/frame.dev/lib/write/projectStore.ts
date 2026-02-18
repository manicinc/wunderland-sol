/**
 * Project Store for Write Mode
 * @module lib/write/projectStore
 *
 * Storage and CRUD operations for writing projects.
 * Uses localStorage for client-side persistence.
 */

import { nanoid } from 'nanoid'
import {
  type WritingProject,
  type ProjectPart,
  type ProjectChapter,
  type ProjectType,
  type ProjectStatus,
  type DailyWordCount,
  type WritingSession,
  type WordCountStats,
  type ProjectTemplate,
  PROJECT_TEMPLATES,
  PROJECTS_STORAGE_KEY,
  WORD_COUNT_STORAGE_KEY,
  SESSIONS_STORAGE_KEY,
  WRITE_PROJECTS_WEAVE,
} from './types'

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get today's date key
 */
function getTodayKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Get start of week date
 */
function getWeekStart(): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day
  return new Date(now.setDate(diff))
}

/**
 * Get start of month date
 */
function getMonthStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

// ============================================================================
// PROJECT STORAGE
// ============================================================================

/**
 * Get all projects
 */
export function getAllProjects(): WritingProject[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Save all projects
 */
function saveAllProjects(projects: WritingProject[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects))
}

/**
 * Get a project by ID
 */
export function getProject(id: string): WritingProject | null {
  const projects = getAllProjects()
  return projects.find(p => p.id === id) || null
}

/**
 * Create a new project
 */
export function createProject(
  title: string,
  type: ProjectType,
  options?: {
    description?: string
    wordGoal?: number
    dailyGoal?: number
    targetDate?: string
    template?: ProjectTemplate
  }
): WritingProject {
  const now = new Date().toISOString()
  const id = nanoid()

  // Use template structure if provided
  let parts: ProjectPart[] = []
  if (options?.template) {
    parts = options.template.structure.parts.map((part, partIdx) => ({
      id: nanoid(),
      title: part.title,
      order: partIdx,
      chapters: part.chapters.map((chapter, chapterIdx) => ({
        id: nanoid(),
        title: chapter.title,
        synopsis: chapter.synopsis,
        strandPath: `weaves/${WRITE_PROJECTS_WEAVE}/${id}/${partIdx + 1}-${chapterIdx + 1}`,
        order: chapterIdx,
        wordCount: 0,
        status: 'outline' as const,
        lastEditedAt: now,
      })),
    }))
  } else {
    // Default single part with one chapter
    parts = [{
      id: nanoid(),
      title: 'Part 1',
      order: 0,
      chapters: [{
        id: nanoid(),
        title: 'Chapter 1',
        strandPath: `weaves/${WRITE_PROJECTS_WEAVE}/${id}/1-1`,
        order: 0,
        wordCount: 0,
        status: 'outline',
        lastEditedAt: now,
      }],
    }]
  }

  const project: WritingProject = {
    id,
    title,
    description: options?.description,
    type,
    status: 'draft',
    wordGoal: options?.wordGoal || options?.template?.wordGoal,
    dailyGoal: options?.dailyGoal,
    targetDate: options?.targetDate,
    parts,
    createdAt: now,
    updatedAt: now,
  }

  const projects = getAllProjects()
  projects.push(project)
  saveAllProjects(projects)

  return project
}

/**
 * Update a project
 */
export function updateProject(
  id: string,
  updates: Partial<Omit<WritingProject, 'id' | 'createdAt'>>
): WritingProject | null {
  const projects = getAllProjects()
  const index = projects.findIndex(p => p.id === id)

  if (index === -1) return null

  const updated = {
    ...projects[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  projects[index] = updated
  saveAllProjects(projects)

  return updated
}

/**
 * Delete a project
 */
export function deleteProject(id: string): boolean {
  const projects = getAllProjects()
  const filtered = projects.filter(p => p.id !== id)

  if (filtered.length === projects.length) return false

  saveAllProjects(filtered)
  return true
}

/**
 * Archive a project
 */
export function archiveProject(id: string): WritingProject | null {
  return updateProject(id, { status: 'archived' })
}

// ============================================================================
// PART OPERATIONS
// ============================================================================

/**
 * Add a part to a project
 */
export function addPart(projectId: string, title: string): ProjectPart | null {
  const project = getProject(projectId)
  if (!project) return null

  const now = new Date().toISOString()
  const newPart: ProjectPart = {
    id: nanoid(),
    title,
    order: project.parts.length,
    chapters: [{
      id: nanoid(),
      title: 'Chapter 1',
      strandPath: `weaves/${WRITE_PROJECTS_WEAVE}/${projectId}/${project.parts.length + 1}-1`,
      order: 0,
      wordCount: 0,
      status: 'outline',
      lastEditedAt: now,
    }],
  }

  project.parts.push(newPart)
  updateProject(projectId, { parts: project.parts })

  return newPart
}

/**
 * Update a part
 */
export function updatePart(
  projectId: string,
  partId: string,
  updates: Partial<Omit<ProjectPart, 'id' | 'chapters'>>
): ProjectPart | null {
  const project = getProject(projectId)
  if (!project) return null

  const partIndex = project.parts.findIndex(p => p.id === partId)
  if (partIndex === -1) return null

  project.parts[partIndex] = {
    ...project.parts[partIndex],
    ...updates,
  }

  updateProject(projectId, { parts: project.parts })
  return project.parts[partIndex]
}

/**
 * Delete a part
 */
export function deletePart(projectId: string, partId: string): boolean {
  const project = getProject(projectId)
  if (!project || project.parts.length <= 1) return false

  const filtered = project.parts.filter(p => p.id !== partId)
  if (filtered.length === project.parts.length) return false

  // Re-order remaining parts
  filtered.forEach((part, idx) => {
    part.order = idx
  })

  updateProject(projectId, { parts: filtered })
  return true
}

/**
 * Reorder parts
 */
export function reorderParts(projectId: string, partIds: string[]): boolean {
  const project = getProject(projectId)
  if (!project) return false

  const reordered = partIds.map((id, idx) => {
    const part = project.parts.find(p => p.id === id)
    if (!part) return null
    return { ...part, order: idx }
  }).filter(Boolean) as ProjectPart[]

  if (reordered.length !== project.parts.length) return false

  updateProject(projectId, { parts: reordered })
  return true
}

// ============================================================================
// CHAPTER OPERATIONS
// ============================================================================

/**
 * Add a chapter to a part
 */
export function addChapter(
  projectId: string,
  partId: string,
  title: string,
  synopsis?: string
): ProjectChapter | null {
  const project = getProject(projectId)
  if (!project) return null

  const partIndex = project.parts.findIndex(p => p.id === partId)
  if (partIndex === -1) return null

  const now = new Date().toISOString()
  const chapterCount = project.parts[partIndex].chapters.length

  const newChapter: ProjectChapter = {
    id: nanoid(),
    title,
    synopsis,
    strandPath: `weaves/${WRITE_PROJECTS_WEAVE}/${projectId}/${partIndex + 1}-${chapterCount + 1}`,
    order: chapterCount,
    wordCount: 0,
    status: 'outline',
    lastEditedAt: now,
  }

  project.parts[partIndex].chapters.push(newChapter)
  updateProject(projectId, { parts: project.parts })

  return newChapter
}

/**
 * Update a chapter
 */
export function updateChapter(
  projectId: string,
  partId: string,
  chapterId: string,
  updates: Partial<Omit<ProjectChapter, 'id'>>
): ProjectChapter | null {
  const project = getProject(projectId)
  if (!project) return null

  const partIndex = project.parts.findIndex(p => p.id === partId)
  if (partIndex === -1) return null

  const chapterIndex = project.parts[partIndex].chapters.findIndex(c => c.id === chapterId)
  if (chapterIndex === -1) return null

  project.parts[partIndex].chapters[chapterIndex] = {
    ...project.parts[partIndex].chapters[chapterIndex],
    ...updates,
    lastEditedAt: new Date().toISOString(),
  }

  updateProject(projectId, { parts: project.parts })
  return project.parts[partIndex].chapters[chapterIndex]
}

/**
 * Delete a chapter
 */
export function deleteChapter(
  projectId: string,
  partId: string,
  chapterId: string
): boolean {
  const project = getProject(projectId)
  if (!project) return false

  const partIndex = project.parts.findIndex(p => p.id === partId)
  if (partIndex === -1) return false

  const filtered = project.parts[partIndex].chapters.filter(c => c.id !== chapterId)
  if (filtered.length === project.parts[partIndex].chapters.length) return false

  // Re-order remaining chapters
  filtered.forEach((chapter, idx) => {
    chapter.order = idx
  })

  project.parts[partIndex].chapters = filtered
  updateProject(projectId, { parts: project.parts })

  return true
}

/**
 * Move a chapter to a different part
 */
export function moveChapter(
  projectId: string,
  chapterId: string,
  fromPartId: string,
  toPartId: string,
  newOrder: number
): boolean {
  const project = getProject(projectId)
  if (!project) return false

  const fromPartIndex = project.parts.findIndex(p => p.id === fromPartId)
  const toPartIndex = project.parts.findIndex(p => p.id === toPartId)

  if (fromPartIndex === -1 || toPartIndex === -1) return false

  const chapterIndex = project.parts[fromPartIndex].chapters.findIndex(c => c.id === chapterId)
  if (chapterIndex === -1) return false

  // Remove from source part
  const [chapter] = project.parts[fromPartIndex].chapters.splice(chapterIndex, 1)

  // Update chapter's strand path
  chapter.strandPath = `weaves/${WRITE_PROJECTS_WEAVE}/${projectId}/${toPartIndex + 1}-${newOrder + 1}`
  chapter.order = newOrder

  // Insert into target part
  project.parts[toPartIndex].chapters.splice(newOrder, 0, chapter)

  // Re-order chapters in both parts
  project.parts[fromPartIndex].chapters.forEach((c, idx) => {
    c.order = idx
  })
  project.parts[toPartIndex].chapters.forEach((c, idx) => {
    c.order = idx
  })

  updateProject(projectId, { parts: project.parts })
  return true
}

// ============================================================================
// WORD COUNT TRACKING
// ============================================================================

/**
 * Get word count history
 */
export function getWordCountHistory(days: number = 30): DailyWordCount[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(WORD_COUNT_STORAGE_KEY)
    const all: DailyWordCount[] = stored ? JSON.parse(stored) : []

    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - days)
    const startKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`

    return all.filter(d => d.date >= startKey).sort((a, b) => b.date.localeCompare(a.date))
  } catch {
    return []
  }
}

/**
 * Record words written
 */
export function recordWordsWritten(
  projectId: string,
  chapterId: string,
  wordsDelta: number
): void {
  if (typeof window === 'undefined') return

  const today = getTodayKey()

  try {
    const stored = localStorage.getItem(WORD_COUNT_STORAGE_KEY)
    const all: DailyWordCount[] = stored ? JSON.parse(stored) : []

    let todayRecord = all.find(d => d.date === today)
    if (!todayRecord) {
      todayRecord = {
        date: today,
        wordsWritten: 0,
        projectsWorked: [],
        sessions: [],
      }
      all.push(todayRecord)
    }

    todayRecord.wordsWritten += wordsDelta

    if (!todayRecord.projectsWorked.includes(projectId)) {
      todayRecord.projectsWorked.push(projectId)
    }

    localStorage.setItem(WORD_COUNT_STORAGE_KEY, JSON.stringify(all))
  } catch {
    console.error('[ProjectStore] Failed to record words')
  }
}

/**
 * Get word count statistics
 */
export function getWordCountStats(): WordCountStats {
  const history = getWordCountHistory(365)
  const today = getTodayKey()
  const weekStart = getWeekStart()
  const monthStart = getMonthStart()

  const weekStartKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`
  const monthStartKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-${String(monthStart.getDate()).padStart(2, '0')}`

  // Calculate totals
  const projects = getAllProjects()
  const totalWords = projects.reduce((sum, p) => {
    return sum + p.parts.reduce((partSum, part) => {
      return partSum + part.chapters.reduce((chapterSum, ch) => chapterSum + ch.wordCount, 0)
    }, 0)
  }, 0)

  const todayRecord = history.find(d => d.date === today)
  const wordsToday = todayRecord?.wordsWritten || 0

  const wordsThisWeek = history
    .filter(d => d.date >= weekStartKey)
    .reduce((sum, d) => sum + d.wordsWritten, 0)

  const wordsThisMonth = history
    .filter(d => d.date >= monthStartKey)
    .reduce((sum, d) => sum + d.wordsWritten, 0)

  // Calculate streaks
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0

  const dates = history.map(d => d.date).sort().reverse()
  const checkDate = new Date()

  for (let i = 0; i < 365; i++) {
    const dateKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`

    if (dates.includes(dateKey)) {
      if (i === 0 || currentStreak > 0) {
        currentStreak++
      }
      tempStreak++
    } else if (i > 0) {
      longestStreak = Math.max(longestStreak, tempStreak)
      tempStreak = 0
      if (currentStreak > 0) currentStreak = 0
    }

    checkDate.setDate(checkDate.getDate() - 1)
  }
  longestStreak = Math.max(longestStreak, tempStreak)

  // Calculate averages
  const daysWithWriting = history.filter(d => d.wordsWritten > 0).length
  const avgWordsPerDay = daysWithWriting > 0
    ? Math.round(history.reduce((sum, d) => sum + d.wordsWritten, 0) / daysWithWriting)
    : 0

  const allSessions = history.flatMap(d => d.sessions)
  const avgSessionDuration = allSessions.length > 0
    ? Math.round(allSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / allSessions.length)
    : 0

  return {
    totalWords,
    wordsToday,
    wordsThisWeek,
    wordsThisMonth,
    currentStreak,
    longestStreak,
    avgWordsPerDay,
    avgSessionDuration,
  }
}

// ============================================================================
// TEMPLATE HELPERS
// ============================================================================

/**
 * Get all project templates
 */
export function getProjectTemplates(): ProjectTemplate[] {
  return PROJECT_TEMPLATES
}

/**
 * Get a template by ID
 */
export function getProjectTemplate(id: string): ProjectTemplate | null {
  return PROJECT_TEMPLATES.find(t => t.id === id) || null
}

/**
 * Get templates by project type
 */
export function getTemplatesForType(type: ProjectType): ProjectTemplate[] {
  return PROJECT_TEMPLATES.filter(t => t.type === type || t.type === 'other')
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
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
}
