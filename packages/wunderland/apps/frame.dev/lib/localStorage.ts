/**
 * Type-safe localStorage utilities for Quarry Codex
 * @module lib/localStorage
 * 
 * @remarks
 * - All data stored client-side only (GDPR compliant)
 * - Automatic JSON serialization/deserialization
 * - Safe fallbacks for SSR and quota exceeded errors
 * - No telemetry or tracking
 */

import type { ThemeName } from '@/types/theme'
import type { StrandLicense } from '@/lib/strand/licenseTypes'
import type { MLAutoTriggerSettings } from '@/lib/settings/mlAutoTriggerSettings'

/**
 * Bookmark entry for a Codex file
 */
export interface Bookmark {
  /** Full path from repo root */
  path: string
  /** Display title */
  title: string
  /** When bookmarked */
  addedAt: string
  /** Optional notes */
  notes?: string
  /** User who added the bookmark (display name) */
  addedBy?: string
}

/**
 * Reading history entry
 */
export interface HistoryEntry {
  /** Full path from repo root */
  path: string
  /** Display title */
  title: string
  /** Last viewed timestamp */
  viewedAt: string
  /** View count */
  viewCount: number
}

/**
 * Highlight color options
 */
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'orange'

/**
 * Highlight entry for saved text selections
 */
export interface Highlight {
  /** Unique ID */
  id: string
  /** Source file path */
  filePath: string
  /** Highlighted text content */
  content: string
  /** Selection type */
  selectionType: 'text' | 'block'
  /** For text selections: start offset */
  startOffset?: number
  /** For text selections: end offset */
  endOffset?: number
  /** For block selections: block identifier */
  blockId?: string
  /** Highlight color */
  color: HighlightColor
  /** Category/group ID */
  groupId?: string
  /** User notes about this highlight */
  notes?: string
  /** When created */
  createdAt: string
  /** When last updated */
  updatedAt: string
  /** User who created */
  createdBy?: string
}

/**
 * Highlight group/category
 */
export interface HighlightGroup {
  /** Unique ID */
  id: string
  /** Display name */
  name: string
  /** Description */
  description?: string
  /** Group type: default (auto-generated) or custom (user-created) */
  type: 'default' | 'custom'
  /** Badge color (hex) */
  color?: string
  /** Display order */
  order: number
  /** When created */
  createdAt: string
}

/**
 * Text-to-Speech settings
 */
export interface TTSPreferences {
  /** Preferred voice URI */
  voiceURI?: string
  /** Speech rate (0.5 - 2.0, default 1.0) */
  rate: number
  /** Volume (0 - 1, default 1.0) */
  volume: number
  /** Pitch (0 - 2, default 1.0) */
  pitch: number
}

/**
 * STT engine type
 */
export type STTEngine = 'web-speech' | 'whisper'

/**
 * Media embed mode
 */
export type MediaEmbedMode = 'inline' | 'linked'

/**
 * Audio capture mode
 */
export type AudioCaptureMode = 'mic' | 'mic+tab' | 'mic+screen' | 'mic+system'

/**
 * Voice recording preferences
 */
export interface VoiceRecordingPreferences {
  /** STT engine to use (default: 'web-speech') */
  sttEngine: STTEngine
  /** Whether to save the original audio file (default: false) */
  saveOriginalAudio: boolean
  /** Audio quality: low (64kbps), medium (128kbps), high (256kbps) */
  quality: 'low' | 'medium' | 'high'
  /** Language for speech recognition (default: 'en-US') */
  language: string
  /** Preferred microphone device ID (optional) */
  preferredMicrophoneId?: string
  /** Audio capture mode (default: 'mic') */
  audioSource: AudioCaptureMode
  /** Microphone gain (0-2, default: 1.0) */
  micGain: number
  /** System audio gain (0-2, default: 0.8) */
  systemGain: number
  /** Auto-transcribe recordings (default: false) */
  autoTranscribe: boolean
}

/**
 * Image capture preferences
 */
export interface ImageCapturePreferences {
  /** Whether to embed as base64 or link to file (default: 'inline') */
  embedMode: MediaEmbedMode
  /** JPEG compression quality 0-1 (default: 0.85) */
  compressionQuality: number
  /** Max dimension for resizing (default: 2048) */
  maxDimension: number
}

/**
 * Media capture preferences
 */
export interface MediaCapturePreferences {
  /** Voice recording settings */
  voice: VoiceRecordingPreferences
  /** Image/photo capture settings */
  image: ImageCapturePreferences
  /** Drawing embed mode (default: 'inline') */
  drawingEmbedMode: MediaEmbedMode
}

/**
 * User preferences for Codex viewer
 */
export interface UserPreferences {
  /** Theme: light, dark, sepia, terminal */
  theme: ThemeName
  /** Font size scale (0.8 - 1.5) */
  fontSize: number
  /** Tree density: compact, normal, comfortable */
  treeDensity: 'compact' | 'normal' | 'comfortable'
  /** Default sidebar mode */
  defaultSidebarMode: 'tree' | 'toc' | 'tags' | 'query'
  /** Whether sidebar is open by default on mobile */
  sidebarOpenMobile: boolean
  /** Whether to track reading history locally */
  historyTrackingEnabled: boolean
  /** GitHub Personal Access Token (optional, for publishing) */
  githubPAT?: string
  /** Whether to auto-merge PRs when publishing (requires PAT with merge permissions) */
  autoMergePRs: boolean
  /** Preferred metadata panel size */
  metadataPanelSize: 's' | 'm' | 'l'
  /** Whether to remember scroll position per strand (default: true) */
  rememberScrollPosition: boolean
  /** Whether to auto-expand backlinks section when backlinks are found (default: true) */
  autoExpandBacklinks: boolean
  /** Text-to-Speech settings */
  tts?: TTSPreferences
  /** Left sidebar font size: 0=xs, 1=sm, 2=base, 3=lg (default: 2=base/medium) */
  leftSidebarFontSize: number
  /** Right sidebar font size: 0=xs, 1=sm, 2=base, 3=lg (default: 1=sm/small) */
  rightSidebarFontSize: number
  /** Last expanded paths in sidebar for session restoration */
  lastExpandedPaths?: string[]
  /** Content source mode: github, local, or hybrid */
  contentSource?: 'github' | 'local' | 'hybrid'
  /** Last sync timestamp for hybrid mode */
  lastSyncAt?: string
  /** Auto-transcribe voice recordings on canvas (default: false) */
  autoTranscribeVoiceNotes: boolean
  /** Media capture preferences */
  mediaCapture?: MediaCapturePreferences
  /** User display name (default: "Traveler") */
  displayName: string
  /** Optional user avatar (base64 data URL or external URL) */
  avatarUrl?: string
  /** When the profile was first created */
  profileCreatedAt?: string
  /** Whether sidebar is collapsed (persisted across sessions) */
  sidebarCollapsed?: boolean
  /** Whether right panel is collapsed (persisted across sessions) */
  rightPanelCollapsed?: boolean
  /** Default license for new strands */
  defaultLicense: StrandLicense
  /** Whether to auto-detect licenses from imported content */
  autoDetectLicense: boolean
  /** Whether to show license picker when creating strands */
  showLicenseOnCreate: boolean
  /** Link and backlink preferences */
  linkPreferences?: LinkPreferences
  /** ML auto-trigger settings for block tagging and embeddings */
  mlAutoTrigger?: MLAutoTriggerSettings
  /** Whether to show inline block tags (#hashtags) in content (default: true) */
  showBlockTags: boolean
}

/**
 * Preferences for bidirectional links and transclusion
 */
export interface LinkPreferences {
  /** Auto-update backlinks when content changes */
  autoUpdateBacklinks: boolean
  /** Show hover preview for links */
  showHoverPreview: boolean
  /** Hover preview delay in milliseconds (100-1000) */
  hoverPreviewDelay: number
  /** Backlink indicator style in editor */
  backlinkIndicatorStyle: 'dot' | 'count' | 'none'
  /** Maximum transclusion depth (1-5) */
  maxTransclusionDepth: number
  /** Enable experimental mirror sync */
  enableMirrorSync: boolean
  /** Show unlinked mentions suggestions */
  showUnlinkedMentions: boolean
}

/** Default link preferences */
export const DEFAULT_LINK_PREFERENCES: LinkPreferences = {
  autoUpdateBacklinks: true,
  showHoverPreview: true,
  hoverPreviewDelay: 300,
  backlinkIndicatorStyle: 'count',
  maxTransclusionDepth: 3,
  enableMirrorSync: false,
  showUnlinkedMentions: false,
}

/**
 * localStorage keys
 */
const KEYS = {
  BOOKMARKS: 'quarry-codex-bookmarks',
  HISTORY: 'quarry-codex-history',
  PREFERENCES: 'quarry-codex-preferences',
  NOTES: 'quarry-codex-notes',
  SCROLL_POSITIONS: 'quarry-codex-scroll-positions',
  PERSONAL_TAGS: 'quarry-codex-personal-tags',
  LAST_VIEWED: 'quarry-codex-last-viewed',
  DRAFTS: 'quarry-codex-drafts',
  VISITS: 'quarry-codex-visits',
  HIGHLIGHTS: 'quarry-codex-highlights',
  HIGHLIGHT_GROUPS: 'quarry-codex-highlight-groups',
  LEARNING_FILTERS: 'quarry-codex-learning-filters',
} as const

/**
 * Draft entry for unpublished edits
 */
export interface DraftEntry {
  /** Original file path */
  path: string
  /** Draft content */
  content: string
  /** Original content hash to detect if source changed */
  originalHash: string
  /** Last modified timestamp */
  modifiedAt: string
  /** Created timestamp */
  createdAt: string
  /** Draft status */
  status: 'editing' | 'saved' | 'conflict'
}

/**
 * Last viewed location in Codex
 */
export interface LastViewedLocation {
  /** Directory path */
  path: string
  /** File path (if a file was open) */
  file?: string
  /** Timestamp */
  viewedAt: string
}

/**
 * Check if localStorage is available (SSR safe)
 * @returns true if localStorage can be used
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const test = '__frame_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Get typed data from localStorage
 * @param key - localStorage key
 * @param defaultValue - Fallback if key doesn't exist
 * @returns Parsed data or default
 */
function getItem<T>(key: string, defaultValue: T): T {
  if (!isLocalStorageAvailable()) return defaultValue
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Set typed data in localStorage
 * @param key - localStorage key
 * @param value - Data to store
 */
function setItem<T>(key: string, value: T): void {
  if (!isLocalStorageAvailable()) return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('localStorage quota exceeded or unavailable:', error)
  }
}

/**
 * Remove item from localStorage
 * @param key - localStorage key
 */
function removeItem(key: string): void {
  if (!isLocalStorageAvailable()) return
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore errors
  }
}

// ========== Generic Storage Functions (exported) ==========

/**
 * Get typed data from localStorage (exported version)
 * @param key - localStorage key
 * @param defaultValue - Optional fallback if key doesn't exist
 * @returns Parsed data or default/null
 */
export function getLocalStorage<T>(key: string, defaultValue?: T): T | null {
  if (!isLocalStorageAvailable()) return defaultValue ?? null
  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultValue ?? null
    return JSON.parse(item) as T
  } catch {
    return defaultValue ?? null
  }
}

/**
 * Set typed data in localStorage (exported version)
 * @param key - localStorage key
 * @param value - Data to store
 */
export function setLocalStorage<T>(key: string, value: T): void {
  if (!isLocalStorageAvailable()) return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('localStorage quota exceeded or unavailable:', error)
  }
}

/**
 * Remove item from localStorage (exported version)
 * @param key - localStorage key
 */
export function removeLocalStorage(key: string): void {
  if (!isLocalStorageAvailable()) return
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore errors
  }
}

// ========== Bookmarks ==========

/**
 * Get all bookmarks
 * @returns Array of bookmarks, sorted by most recent
 */
export function getBookmarks(): Bookmark[] {
  return getItem<Bookmark[]>(KEYS.BOOKMARKS, [])
}

/**
 * Add a bookmark
 * @param path - File path
 * @param title - Display title
 * @param notes - Optional notes
 */
export function addBookmark(path: string, title: string, notes?: string): void {
  const bookmarks = getBookmarks()
  const prefs = getPreferences()
  const addedBy = prefs.displayName || 'Traveler'

  // Check if already bookmarked
  const existing = bookmarks.findIndex((b) => b.path === path)
  if (existing >= 0) {
    // Update existing
    bookmarks[existing] = {
      ...bookmarks[existing],
      title,
      notes,
      addedAt: new Date().toISOString(),
      addedBy,
    }
  } else {
    // Add new
    bookmarks.unshift({
      path,
      title,
      addedAt: new Date().toISOString(),
      notes,
      addedBy,
    })
  }
  setItem(KEYS.BOOKMARKS, bookmarks)
}

/**
 * Remove a bookmark
 * @param path - File path to unbookmark
 */
export function removeBookmark(path: string): void {
  const bookmarks = getBookmarks().filter((b) => b.path !== path)
  setItem(KEYS.BOOKMARKS, bookmarks)
}

/**
 * Check if a path is bookmarked
 * @param path - File path
 * @returns true if bookmarked
 */
export function isBookmarked(path: string): boolean {
  return getBookmarks().some((b) => b.path === path)
}

/**
 * Clear all bookmarks
 */
export function clearBookmarks(): void {
  removeItem(KEYS.BOOKMARKS)
}

// ========== Strand Notes ==========

/**
 * Individual note entry with author information
 */
export interface StrandNote {
  /** The note content */
  content: string
  /** When the note was created */
  createdAt: string
  /** User who created the note (display name) */
  author?: string
}

type StrandNotesMap = Record<string, StrandNote[]>

// Legacy support: convert old string[] format to new StrandNote[] format
function migrateNotesIfNeeded(map: Record<string, unknown>): StrandNotesMap {
  const migrated: StrandNotesMap = {}
  for (const [path, notes] of Object.entries(map)) {
    if (Array.isArray(notes)) {
      if (notes.length > 0 && typeof notes[0] === 'string') {
        // Old format: string[]
        migrated[path] = (notes as string[]).map((content) => ({
          content,
          createdAt: new Date().toISOString(),
          author: 'Traveler', // Default for migrated notes
        }))
      } else {
        // New format: StrandNote[]
        migrated[path] = notes as StrandNote[]
      }
    }
  }
  return migrated
}

function getNotesMap(): StrandNotesMap {
  const raw = getItem<Record<string, unknown>>(KEYS.NOTES, {})
  return migrateNotesIfNeeded(raw)
}

function saveNotesMap(map: StrandNotesMap): void {
  setItem(KEYS.NOTES, map)
}

/**
 * Get strand notes as StrandNote array
 */
export function getStrandNotes(path: string): StrandNote[] {
  const map = getNotesMap()
  return map[path] || []
}

/**
 * Get strand notes as simple string array (for backwards compatibility)
 */
export function getStrandNotesText(path: string): string[] {
  return getStrandNotes(path).map((n) => n.content)
}

/**
 * Add a single note to a strand
 */
export function addStrandNote(path: string, content: string): void {
  const prefs = getPreferences()
  const author = prefs.displayName || 'Traveler'
  const map = getNotesMap()
  const notes = map[path] || []

  notes.push({
    content: content.trim(),
    createdAt: new Date().toISOString(),
    author,
  })

  map[path] = notes
  saveNotesMap(map)
}

/**
 * Save strand notes (replaces all notes for this path)
 * @deprecated Use addStrandNote for new notes, this is for backwards compatibility
 */
export function saveStrandNotes(path: string, notes: string[]): void {
  const prefs = getPreferences()
  const author = prefs.displayName || 'Traveler'
  const trimmed = notes.map((note) => note.trim()).filter(Boolean)
  const map = getNotesMap()

  if (trimmed.length === 0) {
    delete map[path]
  } else {
    map[path] = trimmed.map((content) => ({
      content,
      createdAt: new Date().toISOString(),
      author,
    }))
  }
  saveNotesMap(map)
}

export function clearAllNotes(): void {
  removeItem(KEYS.NOTES)
}

// ========== Personal Tags ==========

type PersonalTagsMap = Record<string, string[]>

function getPersonalTagsMap(): PersonalTagsMap {
  return getItem<PersonalTagsMap>(KEYS.PERSONAL_TAGS, {})
}

function savePersonalTagsMap(map: PersonalTagsMap): void {
  setItem(KEYS.PERSONAL_TAGS, map)
}

/**
 * Get personal tags for a strand (user-added, separate from metadata tags)
 */
export function getPersonalTags(path: string): string[] {
  const map = getPersonalTagsMap()
  return map[path] || []
}

/**
 * Save personal tags for a strand
 */
export function savePersonalTags(path: string, tags: string[]): void {
  const cleaned = tags.map((t) => t.trim().toLowerCase()).filter(Boolean)
  const unique = [...new Set(cleaned)]
  const map = getPersonalTagsMap()
  if (unique.length === 0) {
    delete map[path]
  } else {
    map[path] = unique
  }
  savePersonalTagsMap(map)
}

/**
 * Clear all personal tags
 */
export function clearAllPersonalTags(): void {
  removeItem(KEYS.PERSONAL_TAGS)
}

// ========== Reading History ==========

/**
 * Get reading history
 * @param limit - Max entries to return (default: 50)
 * @returns Array of history entries, sorted by most recent
 */
export function getHistory(limit = 50): HistoryEntry[] {
  const history = getItem<HistoryEntry[]>(KEYS.HISTORY, [])
  return history.slice(0, limit)
}

/**
 * Add or update reading history entry
 * @param path - File path
 * @param title - Display title
 */
export function addToHistory(path: string, title: string): void {
  const history = getHistory(100) // Keep more than we display
  const existing = history.findIndex((h) => h.path === path)
  
  if (existing >= 0) {
    // Move to top and increment count
    const entry = history.splice(existing, 1)[0]
    entry.viewedAt = new Date().toISOString()
    entry.viewCount++
    history.unshift(entry)
  } else {
    // Add new entry at top
    history.unshift({
      path,
      title,
      viewedAt: new Date().toISOString(),
      viewCount: 1,
    })
  }
  
  // Keep only last 100 entries
  setItem(KEYS.HISTORY, history.slice(0, 100))
}

/**
 * Remove a history entry
 * @param path - File path to remove
 */
export function removeFromHistory(path: string): void {
  const history = getHistory(100).filter((h) => h.path !== path)
  setItem(KEYS.HISTORY, history)
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  removeItem(KEYS.HISTORY)
}

// ========== Highlights ==========

/**
 * Default highlight groups
 */
const DEFAULT_HIGHLIGHT_GROUPS: HighlightGroup[] = [
  {
    id: 'default',
    name: 'All Highlights',
    description: 'Default category for all highlights',
    type: 'default',
    color: '#f59e0b', // amber
    order: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'important',
    name: 'Important',
    description: 'Key insights and important points',
    type: 'default',
    color: '#ef4444', // red
    order: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'review',
    name: 'Review Later',
    description: 'Items to revisit and study',
    type: 'default',
    color: '#8b5cf6', // violet
    order: 2,
    createdAt: new Date().toISOString(),
  },
]

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Get all highlights
 * @returns Array of highlights, sorted by most recent
 */
export function getHighlights(): Highlight[] {
  return getItem<Highlight[]>(KEYS.HIGHLIGHTS, [])
}

/**
 * Get highlights for a specific file
 * @param filePath - The file path
 * @returns Array of highlights for that file
 */
export function getHighlightsForFile(filePath: string): Highlight[] {
  return getHighlights().filter(h => h.filePath === filePath)
}

/**
 * Get highlights by group
 * @param groupId - The group ID
 * @returns Array of highlights in that group
 */
export function getHighlightsByGroup(groupId: string): Highlight[] {
  return getHighlights().filter(h => h.groupId === groupId || (!h.groupId && groupId === 'default'))
}

/**
 * Add a new highlight
 * @param highlight - Highlight data (without id, createdAt, updatedAt)
 * @returns The created highlight with generated fields
 */
export function addHighlight(highlight: Omit<Highlight, 'id' | 'createdAt' | 'updatedAt'>): Highlight {
  const highlights = getHighlights()
  const prefs = getPreferences()
  const now = new Date().toISOString()

  const newHighlight: Highlight = {
    ...highlight,
    id: generateId(),
    groupId: highlight.groupId || 'default',
    createdAt: now,
    updatedAt: now,
    createdBy: highlight.createdBy || prefs.displayName || 'Traveler',
  }

  highlights.unshift(newHighlight)
  setItem(KEYS.HIGHLIGHTS, highlights)

  return newHighlight
}

/**
 * Update a highlight
 * @param id - Highlight ID
 * @param updates - Fields to update
 */
export function updateHighlight(id: string, updates: Partial<Omit<Highlight, 'id' | 'createdAt'>>): void {
  const highlights = getHighlights()
  const index = highlights.findIndex(h => h.id === id)

  if (index >= 0) {
    highlights[index] = {
      ...highlights[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    setItem(KEYS.HIGHLIGHTS, highlights)
  }
}

/**
 * Remove a highlight
 * @param id - Highlight ID
 */
export function removeHighlight(id: string): void {
  const highlights = getHighlights().filter(h => h.id !== id)
  setItem(KEYS.HIGHLIGHTS, highlights)
}

/**
 * Clear all highlights
 */
export function clearHighlights(): void {
  removeItem(KEYS.HIGHLIGHTS)
}

// ========== Highlight Groups ==========

/**
 * Get all highlight groups
 * @returns Array of groups, sorted by order
 */
export function getHighlightGroups(): HighlightGroup[] {
  const groups = getItem<HighlightGroup[]>(KEYS.HIGHLIGHT_GROUPS, [])

  // Ensure default groups exist
  if (groups.length === 0) {
    setItem(KEYS.HIGHLIGHT_GROUPS, DEFAULT_HIGHLIGHT_GROUPS)
    return DEFAULT_HIGHLIGHT_GROUPS
  }

  return groups.sort((a, b) => a.order - b.order)
}

/**
 * Add a custom highlight group
 * @param name - Group name
 * @param color - Optional color (hex)
 * @param description - Optional description
 * @returns The created group
 */
export function addHighlightGroup(name: string, color?: string, description?: string): HighlightGroup {
  const groups = getHighlightGroups()
  const maxOrder = Math.max(...groups.map(g => g.order), 0)

  const newGroup: HighlightGroup = {
    id: generateId(),
    name,
    description,
    type: 'custom',
    color: color || '#6b7280', // gray default
    order: maxOrder + 1,
    createdAt: new Date().toISOString(),
  }

  groups.push(newGroup)
  setItem(KEYS.HIGHLIGHT_GROUPS, groups)

  return newGroup
}

/**
 * Update a highlight group
 * @param id - Group ID
 * @param updates - Fields to update
 */
export function updateHighlightGroup(id: string, updates: Partial<Omit<HighlightGroup, 'id' | 'createdAt' | 'type'>>): void {
  const groups = getHighlightGroups()
  const index = groups.findIndex(g => g.id === id)

  if (index >= 0) {
    groups[index] = {
      ...groups[index],
      ...updates,
    }
    setItem(KEYS.HIGHLIGHT_GROUPS, groups)
  }
}

/**
 * Remove a highlight group (moves highlights to default)
 * @param id - Group ID
 */
export function removeHighlightGroup(id: string): void {
  // Don't allow removing default groups
  const groups = getHighlightGroups()
  const group = groups.find(g => g.id === id)
  if (!group || group.type === 'default') return

  // Move highlights in this group to default
  const highlights = getHighlights()
  const updatedHighlights = highlights.map(h =>
    h.groupId === id ? { ...h, groupId: 'default', updatedAt: new Date().toISOString() } : h
  )
  setItem(KEYS.HIGHLIGHTS, updatedHighlights)

  // Remove the group
  const filteredGroups = groups.filter(g => g.id !== id)
  setItem(KEYS.HIGHLIGHT_GROUPS, filteredGroups)
}

/**
 * Reset highlight groups to defaults
 */
export function resetHighlightGroups(): void {
  setItem(KEYS.HIGHLIGHT_GROUPS, DEFAULT_HIGHLIGHT_GROUPS)
}

// ========== Preferences ==========

/**
 * Default TTS preferences
 */
export const DEFAULT_TTS_PREFERENCES: TTSPreferences = {
  rate: 1.0,
  volume: 1.0,
  pitch: 1.0,
}

/**
 * Default media capture preferences
 */
export const DEFAULT_MEDIA_CAPTURE_PREFERENCES: MediaCapturePreferences = {
  voice: {
    sttEngine: 'web-speech',
    saveOriginalAudio: false,
    quality: 'medium',
    language: 'en-US',
    audioSource: 'mic',
    micGain: 1.0,
    systemGain: 0.8,
    autoTranscribe: false,
  },
  image: {
    embedMode: 'inline',
    compressionQuality: 0.85,
    maxDimension: 2048,
  },
  drawingEmbedMode: 'inline',
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  fontSize: 1.0,
  treeDensity: 'normal',
  defaultSidebarMode: 'tree',
  sidebarOpenMobile: false,
  historyTrackingEnabled: true,
  metadataPanelSize: 's',
  rememberScrollPosition: true,
  autoExpandBacklinks: true,
  autoMergePRs: false,
  leftSidebarFontSize: 2,  // base/medium
  rightSidebarFontSize: 1, // sm/small
  autoTranscribeVoiceNotes: false, // Off by default, user can enable per-recording or globally
  displayName: 'Traveler', // Default profile name - inspired by hitchhiker's guide
  tts: DEFAULT_TTS_PREFERENCES,
  mediaCapture: DEFAULT_MEDIA_CAPTURE_PREFERENCES,
  // Content licensing defaults
  defaultLicense: 'none',  // No license specified by default
  autoDetectLicense: true, // Auto-detect from imported content
  showLicenseOnCreate: true, // Show picker in strand creation
  // Block tags display
  showBlockTags: true, // Show inline #hashtags in content by default
}

/**
 * Get user preferences
 * @returns Current preferences or defaults
 */
export function getPreferences(): UserPreferences {
  return getItem<UserPreferences>(KEYS.PREFERENCES, DEFAULT_PREFERENCES)
}

/**
 * Update user preferences
 * @param updates - Partial preferences to update
 */
export function updatePreferences(updates: Partial<UserPreferences>): void {
  const current = getPreferences()
  setItem(KEYS.PREFERENCES, { ...current, ...updates })
}

/**
 * Reset preferences to defaults
 */
export function resetPreferences(): void {
  setItem(KEYS.PREFERENCES, DEFAULT_PREFERENCES)
}

// ========== Media Capture Preferences ==========

/**
 * Get media capture preferences with defaults
 */
export function getMediaCapturePreferences(): MediaCapturePreferences {
  const prefs = getPreferences()
  return prefs.mediaCapture ?? DEFAULT_MEDIA_CAPTURE_PREFERENCES
}

/**
 * Update media capture preferences
 * @param updates - Partial media capture preferences to update
 */
export function updateMediaCapturePreferences(updates: Partial<MediaCapturePreferences>): void {
  const current = getMediaCapturePreferences()
  updatePreferences({
    mediaCapture: {
      ...current,
      ...updates,
      // Deep merge voice and image
      voice: updates.voice ? { ...current.voice, ...updates.voice } : current.voice,
      image: updates.image ? { ...current.image, ...updates.image } : current.image,
    },
  })
}

/**
 * Update voice recording preferences
 */
export function updateVoiceRecordingPreferences(updates: Partial<VoiceRecordingPreferences>): void {
  const current = getMediaCapturePreferences()
  updatePreferences({
    mediaCapture: {
      ...current,
      voice: { ...current.voice, ...updates },
    },
  })
}

/**
 * Update image capture preferences
 */
export function updateImageCapturePreferences(updates: Partial<ImageCapturePreferences>): void {
  const current = getMediaCapturePreferences()
  updatePreferences({
    mediaCapture: {
      ...current,
      image: { ...current.image, ...updates },
    },
  })
}

// ========== User Profile Helpers ==========

/**
 * User profile data (subset of preferences)
 */
export interface UserProfile {
  displayName: string
  avatarUrl?: string
  profileCreatedAt?: string
}

/**
 * Get current user's profile
 */
export function getUserProfile(): UserProfile {
  const prefs = getPreferences()
  return {
    displayName: prefs.displayName || 'Traveler',
    avatarUrl: prefs.avatarUrl,
    profileCreatedAt: prefs.profileCreatedAt,
  }
}

/**
 * Update user profile
 */
export function updateUserProfile(profile: Partial<UserProfile>): void {
  const current = getPreferences()
  const now = new Date().toISOString()

  updatePreferences({
    displayName: profile.displayName ?? current.displayName,
    avatarUrl: profile.avatarUrl ?? current.avatarUrl,
    profileCreatedAt: current.profileCreatedAt ?? now,
  })
}

/**
 * Reset profile to default (Traveler)
 */
export function resetUserProfile(): void {
  updatePreferences({
    displayName: 'Traveler',
    avatarUrl: undefined,
    profileCreatedAt: undefined,
  })
}

// ============================================================================
// Scroll Position Persistence
// ============================================================================

type ScrollPositionMap = Record<string, { scrollTop: number; scrollPercent: number; timestamp: number }>

const MAX_SCROLL_ENTRIES = 100 // Limit stored positions to prevent bloat

/**
 * Get all stored scroll positions
 */
function getScrollPositionsMap(): ScrollPositionMap {
  return getItem<ScrollPositionMap>(KEYS.SCROLL_POSITIONS, {})
}

/**
 * Save scroll positions map
 */
function saveScrollPositionsMap(map: ScrollPositionMap): void {
  // Prune old entries if over limit
  const entries = Object.entries(map)
  if (entries.length > MAX_SCROLL_ENTRIES) {
    // Sort by timestamp, keep most recent
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
    const pruned = Object.fromEntries(entries.slice(0, MAX_SCROLL_ENTRIES))
    setItem(KEYS.SCROLL_POSITIONS, pruned)
  } else {
    setItem(KEYS.SCROLL_POSITIONS, map)
  }
}

/**
 * Get scroll position for a specific strand path
 * @param path - The strand file path
 * @returns Scroll position data or null if not found
 */
export function getScrollPosition(path: string): { scrollTop: number; scrollPercent: number } | null {
  const map = getScrollPositionsMap()
  const entry = map[path]
  if (!entry) return null
  return { scrollTop: entry.scrollTop, scrollPercent: entry.scrollPercent }
}

/**
 * Save scroll position for a strand
 * @param path - The strand file path
 * @param scrollTop - Scroll offset in pixels
 * @param scrollPercent - Scroll percentage (0-100)
 */
export function saveScrollPosition(path: string, scrollTop: number, scrollPercent: number): void {
  const map = getScrollPositionsMap()
  map[path] = {
    scrollTop,
    scrollPercent,
    timestamp: Date.now(),
  }
  saveScrollPositionsMap(map)
}

/**
 * Clear scroll position for a specific strand
 */
export function clearScrollPosition(path: string): void {
  const map = getScrollPositionsMap()
  delete map[path]
  saveScrollPositionsMap(map)
}

/**
 * Clear all scroll positions
 */
export function clearAllScrollPositions(): void {
  removeItem(KEYS.SCROLL_POSITIONS)
}

// ========== Last Viewed Location ==========

/**
 * Get the last viewed location in Codex
 * @returns Last viewed location or null if none saved
 */
export function getLastViewedLocation(): LastViewedLocation | null {
  return getItem<LastViewedLocation | null>(KEYS.LAST_VIEWED, null)
}

/**
 * Save the last viewed location in Codex
 * @param path - Directory path
 * @param file - Optional file path
 */
export function saveLastViewedLocation(path: string, file?: string): void {
  const location: LastViewedLocation = {
    path,
    file,
    viewedAt: new Date().toISOString(),
  }
  setItem(KEYS.LAST_VIEWED, location)
}

/**
 * Clear the last viewed location
 */
export function clearLastViewedLocation(): void {
  removeItem(KEYS.LAST_VIEWED)
}

// ========== Expanded Paths (Session Restoration) ==========

/**
 * Save expanded paths for sidebar session restoration
 * @param paths - Array of expanded folder/loom/weave paths
 */
export function saveExpandedPaths(paths: string[]): void {
  const prefs = getPreferences()
  updatePreferences({ ...prefs, lastExpandedPaths: paths })
}

/**
 * Get last expanded paths for sidebar restoration
 * @returns Array of paths that were expanded, or empty array
 */
export function getExpandedPaths(): string[] {
  const prefs = getPreferences()
  return prefs.lastExpandedPaths || []
}

/**
 * Clear all Quarry Codex data from localStorage and IndexedDB
 * @param reloadAfter - If true, will prompt to reload the page after clearing
 */
export async function clearAllCodexData(reloadAfter = true): Promise<void> {
  // Clear localStorage items
  clearBookmarks()
  clearHistory()
  clearHighlights()
  resetHighlightGroups()
  clearAllNotes()
  clearAllPersonalTags()
  clearAllScrollPositions()
  clearLastViewedLocation()
  clearAllDrafts()
  resetPreferences()

  // Clear all IndexedDB databases
  try {
    if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
      const databases = await indexedDB.databases()

      for (const db of databases) {
        if (db.name) {
          await new Promise<void>((resolve) => {
            const request = indexedDB.deleteDatabase(db.name!)
            request.onsuccess = () => resolve()
            request.onerror = () => {
              console.warn(`Failed to delete database: ${db.name}`)
              resolve()
            }
            request.onblocked = () => {
              console.warn(`Database deletion blocked: ${db.name}`)
              resolve()
            }
          })
        }
      }
    }
  } catch (err) {
    console.error('Failed to clear IndexedDB:', err)
  }

  // Prompt for reload to ensure clean state
  if (reloadAfter && typeof window !== 'undefined') {
    setTimeout(() => {
      if (window.confirm('All data cleared. Reload the page to complete the reset?')) {
        window.location.reload()
      }
    }, 100)
  }
}

// ============================================================================
// Draft Storage for Inline Editing
// ============================================================================

type DraftsMap = Record<string, DraftEntry>

const MAX_DRAFTS = 50 // Limit stored drafts

/**
 * Simple hash function for content comparison
 */
function hashContent(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}

/**
 * Get all drafts
 */
function getDraftsMap(): DraftsMap {
  return getItem<DraftsMap>(KEYS.DRAFTS, {})
}

/**
 * Save drafts map
 */
function saveDraftsMap(map: DraftsMap): void {
  // Prune old drafts if over limit
  const entries = Object.entries(map)
  if (entries.length > MAX_DRAFTS) {
    // Sort by modified timestamp, keep most recent
    entries.sort((a, b) => 
      new Date(b[1].modifiedAt).getTime() - new Date(a[1].modifiedAt).getTime()
    )
    const pruned = Object.fromEntries(entries.slice(0, MAX_DRAFTS))
    setItem(KEYS.DRAFTS, pruned)
  } else {
    setItem(KEYS.DRAFTS, map)
  }
}

/**
 * Get a draft for a specific file path
 * @param path - The file path
 * @returns Draft entry or null if not found
 */
export function getDraft(path: string): DraftEntry | null {
  const map = getDraftsMap()
  return map[path] || null
}

/**
 * Check if a draft exists and has unpublished changes
 * @param path - The file path
 * @param currentContent - Current content to compare against
 * @returns Object with hasDraft and hasChanges flags
 */
export function checkDraftStatus(path: string, currentContent: string): { 
  hasDraft: boolean
  hasChanges: boolean
  isConflict: boolean
  draft: DraftEntry | null 
} {
  const draft = getDraft(path)
  if (!draft) {
    return { hasDraft: false, hasChanges: false, isConflict: false, draft: null }
  }
  
  const currentHash = hashContent(currentContent)
  const hasChanges = draft.content !== currentContent
  const isConflict = draft.originalHash !== currentHash && hasChanges
  
  return { 
    hasDraft: true, 
    hasChanges,
    isConflict,
    draft 
  }
}

/**
 * Save or update a draft
 * @param path - The file path
 * @param content - Draft content
 * @param originalContent - Original content (for conflict detection)
 */
export function saveDraft(path: string, content: string, originalContent: string): void {
  const map = getDraftsMap()
  const existing = map[path]
  const now = new Date().toISOString()
  const originalHash = hashContent(originalContent)
  
  // Check for conflict
  const status: DraftEntry['status'] = 
    existing && existing.originalHash !== originalHash ? 'conflict' : 'saved'
  
  map[path] = {
    path,
    content,
    originalHash,
    modifiedAt: now,
    createdAt: existing?.createdAt || now,
    status,
  }
  
  saveDraftsMap(map)
}

/**
 * Delete a draft
 * @param path - The file path
 */
export function deleteDraft(path: string): void {
  const map = getDraftsMap()
  delete map[path]
  saveDraftsMap(map)
}

/**
 * Get all drafts as array (for listing)
 * @returns Array of draft entries sorted by most recent
 */
export function getAllDrafts(): DraftEntry[] {
  const map = getDraftsMap()
  return Object.values(map).sort((a, b) => 
    new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
  )
}

/**
 * Get count of drafts with unpublished changes
 */
export function getUnpublishedDraftsCount(): number {
  return getAllDrafts().length
}

/**
 * Clear all drafts
 */
export function clearAllDrafts(): void {
  removeItem(KEYS.DRAFTS)
}

/**
 * Update draft status
 * @param path - The file path
 * @param status - New status
 */
export function updateDraftStatus(path: string, status: DraftEntry['status']): void {
  const map = getDraftsMap()
  if (map[path]) {
    map[path].status = status
    map[path].modifiedAt = new Date().toISOString()
    saveDraftsMap(map)
  }
}

// ============================================================================
// Visit Tracking - For personalized greetings
// ============================================================================

/**
 * Visit tracking data structure
 */
export interface VisitData {
  /** First visit timestamp */
  firstVisit: string
  /** Last visit timestamp */
  lastVisit: string
  /** Total visit count */
  visitCount: number
  /** Current streak (consecutive days) */
  currentStreak: number
  /** Longest streak ever */
  longestStreak: number
  /** Last streak calculation date (YYYY-MM-DD) */
  lastStreakDate: string
}

const DEFAULT_VISIT_DATA: VisitData = {
  firstVisit: new Date().toISOString(),
  lastVisit: new Date().toISOString(),
  visitCount: 1,
  currentStreak: 1,
  longestStreak: 1,
  lastStreakDate: new Date().toISOString().split('T')[0],
}

/**
 * Get visit data
 */
export function getVisitData(): VisitData {
  return getItem<VisitData>(KEYS.VISITS, DEFAULT_VISIT_DATA)
}

/**
 * Track a new visit and update streaks
 * Call this when the Codex home page loads
 */
export function trackVisit(): VisitData {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const existing = getItem<VisitData | null>(KEYS.VISITS, null)

  if (!existing) {
    // First ever visit
    const data: VisitData = {
      firstVisit: now.toISOString(),
      lastVisit: now.toISOString(),
      visitCount: 1,
      currentStreak: 1,
      longestStreak: 1,
      lastStreakDate: todayStr,
    }
    setItem(KEYS.VISITS, data)
    return data
  }

  // Calculate streak
  const lastDate = new Date(existing.lastStreakDate)
  const lastDateStr = existing.lastStreakDate
  const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

  let newStreak = existing.currentStreak

  if (todayStr === lastDateStr) {
    // Same day, don't increment streak
    // Just update last visit time
    const data: VisitData = {
      ...existing,
      lastVisit: now.toISOString(),
      visitCount: existing.visitCount + 1,
    }
    setItem(KEYS.VISITS, data)
    return data
  } else if (daysDiff === 1) {
    // Consecutive day - increment streak
    newStreak = existing.currentStreak + 1
  } else if (daysDiff > 1) {
    // Streak broken
    newStreak = 1
  }

  const data: VisitData = {
    ...existing,
    lastVisit: now.toISOString(),
    visitCount: existing.visitCount + 1,
    currentStreak: newStreak,
    longestStreak: Math.max(existing.longestStreak, newStreak),
    lastStreakDate: todayStr,
  }
  setItem(KEYS.VISITS, data)
  return data
}

/**
 * Check if this is the user's first ever visit
 */
export function isFirstVisit(): boolean {
  const data = getItem<VisitData | null>(KEYS.VISITS, null)
  return data === null
}

/**
 * Get days since first visit
 */
export function getDaysSinceFirstVisit(): number {
  const data = getVisitData()
  const firstVisit = new Date(data.firstVisit)
  const now = new Date()
  return Math.floor((now.getTime() - firstVisit.getTime()) / (1000 * 60 * 60 * 24))
}

// ============================================================================
// ML Auto-Trigger Settings
// ============================================================================

/**
 * Get ML auto-trigger settings with defaults
 */
export function getMLAutoTriggerSettings(): MLAutoTriggerSettings {
  const prefs = getPreferences()
  if (prefs.mlAutoTrigger) {
    return prefs.mlAutoTrigger
  }
  // Return defaults from the settings module
  const { DEFAULT_ML_AUTO_TRIGGER_SETTINGS } = require('@/lib/settings/mlAutoTriggerSettings')
  return DEFAULT_ML_AUTO_TRIGGER_SETTINGS
}

/**
 * Update ML auto-trigger settings
 * @param updates - Partial settings to update
 */
export function updateMLAutoTriggerSettings(updates: Partial<MLAutoTriggerSettings>): void {
  const current = getMLAutoTriggerSettings()
  updatePreferences({
    mlAutoTrigger: { ...current, ...updates },
  })
}

/**
 * Enable/disable ML auto-trigger globally
 */
export function setMLAutoTriggerEnabled(enabled: boolean): void {
  updateMLAutoTriggerSettings({ enabled })
}

/**
 * Check if ML auto-trigger is enabled
 */
export function isMLAutoTriggerEnabled(): boolean {
  const settings = getMLAutoTriggerSettings()
  return settings.enabled
}

// ============================================================================
// Learning Studio Filters Persistence
// ============================================================================

/**
 * Learning filters for Learning Studio
 */
export interface LearningFiltersStorage {
  tags: string[]
  subjects: string[]
  topics: string[]
}

const DEFAULT_LEARNING_FILTERS: LearningFiltersStorage = {
  tags: [],
  subjects: [],
  topics: [],
}

/**
 * Get saved learning filters
 */
export function getLearningFilters(): LearningFiltersStorage {
  return getItem<LearningFiltersStorage>(KEYS.LEARNING_FILTERS, DEFAULT_LEARNING_FILTERS)
}

/**
 * Save learning filters
 */
export function saveLearningFilters(filters: LearningFiltersStorage): void {
  setItem(KEYS.LEARNING_FILTERS, filters)
}

/**
 * Clear learning filters
 */
export function clearLearningFilters(): void {
  removeItem(KEYS.LEARNING_FILTERS)
}
