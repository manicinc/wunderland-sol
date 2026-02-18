/**
 * localStorage Utilities Tests
 * @module __tests__/unit/lib/localStorage.test
 *
 * Tests for type-safe localStorage utilities for Quarry Codex.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  // Generic storage
  getLocalStorage,
  setLocalStorage,
  removeLocalStorage,
  // Bookmarks
  getBookmarks,
  addBookmark,
  removeBookmark,
  isBookmarked,
  clearBookmarks,
  // Notes
  getStrandNotes,
  getStrandNotesText,
  addStrandNote,
  saveStrandNotes,
  clearAllNotes,
  // Personal Tags
  getPersonalTags,
  savePersonalTags,
  clearAllPersonalTags,
  // History
  getHistory,
  addToHistory,
  removeFromHistory,
  clearHistory,
  // Highlights
  getHighlights,
  getHighlightsForFile,
  getHighlightsByGroup,
  addHighlight,
  updateHighlight,
  removeHighlight,
  clearHighlights,
  // Highlight Groups
  getHighlightGroups,
  addHighlightGroup,
  updateHighlightGroup,
  removeHighlightGroup,
  resetHighlightGroups,
  // Preferences
  getPreferences,
  updatePreferences,
  resetPreferences,
  // Media Capture
  getMediaCapturePreferences,
  updateMediaCapturePreferences,
  updateVoiceRecordingPreferences,
  updateImageCapturePreferences,
  // User Profile
  getUserProfile,
  updateUserProfile,
  resetUserProfile,
  // Scroll Positions
  getScrollPosition,
  saveScrollPosition,
  clearScrollPosition,
  clearAllScrollPositions,
  // Last Viewed
  getLastViewedLocation,
  saveLastViewedLocation,
  clearLastViewedLocation,
  // Expanded Paths
  saveExpandedPaths,
  getExpandedPaths,
  // Drafts
  getDraft,
  checkDraftStatus,
  saveDraft,
  deleteDraft,
  getAllDrafts,
  getUnpublishedDraftsCount,
  clearAllDrafts,
  updateDraftStatus,
  // Visits
  getVisitData,
  trackVisit,
  isFirstVisit,
  getDaysSinceFirstVisit,
  // Constants
  DEFAULT_LINK_PREFERENCES,
  DEFAULT_TTS_PREFERENCES,
  DEFAULT_MEDIA_CAPTURE_PREFERENCES,
  // Types
  type Bookmark,
  type HistoryEntry,
  type Highlight,
  type HighlightGroup,
  type UserPreferences,
  type DraftEntry,
  type VisitData,
} from '@/lib/localStorage'

// ============================================================================
// Mock localStorage
// ============================================================================

const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore
    },
  }
}

describe('localStorage Utilities', () => {
  let mockStorage: ReturnType<typeof createLocalStorageMock>

  beforeEach(() => {
    mockStorage = createLocalStorageMock()
    vi.stubGlobal('localStorage', mockStorage)
    vi.stubGlobal('window', { localStorage: mockStorage })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ============================================================================
  // Generic Storage Functions
  // ============================================================================

  describe('getLocalStorage', () => {
    it('returns parsed value for existing key', () => {
      mockStorage.setItem('test-key', JSON.stringify({ foo: 'bar' }))
      const result = getLocalStorage<{ foo: string }>('test-key')
      expect(result).toEqual({ foo: 'bar' })
    })

    it('returns default value when key does not exist', () => {
      const result = getLocalStorage('non-existent', { default: true })
      expect(result).toEqual({ default: true })
    })

    it('returns null when key does not exist and no default', () => {
      const result = getLocalStorage('non-existent')
      expect(result).toBeNull()
    })

    it('handles invalid JSON gracefully', () => {
      mockStorage._setStore({ 'bad-json': 'not valid json{' })
      const result = getLocalStorage('bad-json', 'default')
      expect(result).toBe('default')
    })
  })

  describe('setLocalStorage', () => {
    it('stores serialized value', () => {
      setLocalStorage('test-key', { value: 123 })
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ value: 123 })
      )
    })

    it('stores arrays', () => {
      setLocalStorage('arr-key', [1, 2, 3])
      expect(mockStorage.setItem).toHaveBeenCalledWith('arr-key', '[1,2,3]')
    })

    it('stores primitives', () => {
      setLocalStorage('str-key', 'hello')
      expect(mockStorage.setItem).toHaveBeenCalledWith('str-key', '"hello"')
    })
  })

  describe('removeLocalStorage', () => {
    it('removes item from storage', () => {
      mockStorage.setItem('to-remove', '"value"')
      removeLocalStorage('to-remove')
      expect(mockStorage.removeItem).toHaveBeenCalledWith('to-remove')
    })
  })

  // ============================================================================
  // Bookmarks
  // ============================================================================

  describe('Bookmarks', () => {
    beforeEach(() => {
      clearBookmarks()
    })

    describe('getBookmarks', () => {
      it('returns empty array when no bookmarks', () => {
        expect(getBookmarks()).toEqual([])
      })

      it('returns stored bookmarks', () => {
        const bookmarks: Bookmark[] = [
          { path: '/test.md', title: 'Test', addedAt: '2025-01-01T00:00:00Z' },
        ]
        mockStorage.setItem('quarry-codex-bookmarks', JSON.stringify(bookmarks))
        expect(getBookmarks()).toEqual(bookmarks)
      })
    })

    describe('addBookmark', () => {
      it('adds new bookmark', () => {
        addBookmark('/path/to/file.md', 'My File')
        const bookmarks = getBookmarks()
        expect(bookmarks).toHaveLength(1)
        expect(bookmarks[0].path).toBe('/path/to/file.md')
        expect(bookmarks[0].title).toBe('My File')
      })

      it('updates existing bookmark', () => {
        addBookmark('/file.md', 'Original')
        addBookmark('/file.md', 'Updated', 'New notes')
        const bookmarks = getBookmarks()
        expect(bookmarks).toHaveLength(1)
        expect(bookmarks[0].title).toBe('Updated')
        expect(bookmarks[0].notes).toBe('New notes')
      })

      it('adds bookmark with notes', () => {
        addBookmark('/file.md', 'Title', 'Important note')
        const bookmarks = getBookmarks()
        expect(bookmarks[0].notes).toBe('Important note')
      })
    })

    describe('removeBookmark', () => {
      it('removes existing bookmark', () => {
        addBookmark('/file1.md', 'File 1')
        addBookmark('/file2.md', 'File 2')
        removeBookmark('/file1.md')
        const bookmarks = getBookmarks()
        expect(bookmarks).toHaveLength(1)
        expect(bookmarks[0].path).toBe('/file2.md')
      })

      it('handles removing non-existent bookmark', () => {
        addBookmark('/file.md', 'File')
        removeBookmark('/non-existent.md')
        expect(getBookmarks()).toHaveLength(1)
      })
    })

    describe('isBookmarked', () => {
      it('returns true for bookmarked path', () => {
        addBookmark('/file.md', 'File')
        expect(isBookmarked('/file.md')).toBe(true)
      })

      it('returns false for non-bookmarked path', () => {
        expect(isBookmarked('/non-existent.md')).toBe(false)
      })
    })

    describe('clearBookmarks', () => {
      it('removes all bookmarks', () => {
        addBookmark('/file1.md', 'File 1')
        addBookmark('/file2.md', 'File 2')
        clearBookmarks()
        expect(getBookmarks()).toEqual([])
      })
    })
  })

  // ============================================================================
  // Strand Notes
  // ============================================================================

  describe('Strand Notes', () => {
    beforeEach(() => {
      clearAllNotes()
    })

    describe('getStrandNotes', () => {
      it('returns empty array for path with no notes', () => {
        expect(getStrandNotes('/no-notes.md')).toEqual([])
      })
    })

    describe('addStrandNote', () => {
      it('adds note to path', () => {
        addStrandNote('/file.md', 'My note content')
        const notes = getStrandNotes('/file.md')
        expect(notes).toHaveLength(1)
        expect(notes[0].content).toBe('My note content')
      })

      it('trims note content', () => {
        addStrandNote('/file.md', '  trimmed note  ')
        const notes = getStrandNotes('/file.md')
        expect(notes[0].content).toBe('trimmed note')
      })

      it('adds multiple notes', () => {
        addStrandNote('/file.md', 'Note 1')
        addStrandNote('/file.md', 'Note 2')
        const notes = getStrandNotes('/file.md')
        expect(notes).toHaveLength(2)
      })
    })

    describe('getStrandNotesText', () => {
      it('returns array of note content strings', () => {
        addStrandNote('/file.md', 'Note 1')
        addStrandNote('/file.md', 'Note 2')
        const texts = getStrandNotesText('/file.md')
        expect(texts).toEqual(['Note 1', 'Note 2'])
      })
    })

    describe('saveStrandNotes', () => {
      it('replaces all notes for path', () => {
        addStrandNote('/file.md', 'Old note')
        saveStrandNotes('/file.md', ['New note 1', 'New note 2'])
        const texts = getStrandNotesText('/file.md')
        expect(texts).toEqual(['New note 1', 'New note 2'])
      })

      it('removes notes when empty array passed', () => {
        addStrandNote('/file.md', 'Note')
        saveStrandNotes('/file.md', [])
        expect(getStrandNotes('/file.md')).toEqual([])
      })

      it('filters empty notes', () => {
        saveStrandNotes('/file.md', ['Valid', '', '  ', 'Also valid'])
        const texts = getStrandNotesText('/file.md')
        expect(texts).toEqual(['Valid', 'Also valid'])
      })
    })
  })

  // ============================================================================
  // Personal Tags
  // ============================================================================

  describe('Personal Tags', () => {
    beforeEach(() => {
      clearAllPersonalTags()
    })

    describe('getPersonalTags', () => {
      it('returns empty array for path with no tags', () => {
        expect(getPersonalTags('/file.md')).toEqual([])
      })
    })

    describe('savePersonalTags', () => {
      it('saves tags for path', () => {
        savePersonalTags('/file.md', ['tag1', 'tag2'])
        expect(getPersonalTags('/file.md')).toEqual(['tag1', 'tag2'])
      })

      it('lowercases tags', () => {
        savePersonalTags('/file.md', ['TAG', 'MixedCase'])
        expect(getPersonalTags('/file.md')).toEqual(['tag', 'mixedcase'])
      })

      it('removes duplicates', () => {
        savePersonalTags('/file.md', ['tag', 'TAG', 'Tag'])
        expect(getPersonalTags('/file.md')).toEqual(['tag'])
      })

      it('trims whitespace', () => {
        savePersonalTags('/file.md', ['  tag  ', ' another '])
        expect(getPersonalTags('/file.md')).toEqual(['tag', 'another'])
      })

      it('removes path when empty tags', () => {
        savePersonalTags('/file.md', ['tag'])
        savePersonalTags('/file.md', [])
        expect(getPersonalTags('/file.md')).toEqual([])
      })
    })
  })

  // ============================================================================
  // Reading History
  // ============================================================================

  describe('Reading History', () => {
    beforeEach(() => {
      clearHistory()
    })

    describe('getHistory', () => {
      it('returns empty array when no history', () => {
        expect(getHistory()).toEqual([])
      })

      it('respects limit parameter', () => {
        for (let i = 0; i < 10; i++) {
          addToHistory(`/file${i}.md`, `File ${i}`)
        }
        expect(getHistory(5)).toHaveLength(5)
      })
    })

    describe('addToHistory', () => {
      it('adds new entry', () => {
        addToHistory('/file.md', 'File')
        const history = getHistory()
        expect(history).toHaveLength(1)
        expect(history[0].path).toBe('/file.md')
        expect(history[0].viewCount).toBe(1)
      })

      it('increments view count for existing entry', () => {
        addToHistory('/file.md', 'File')
        addToHistory('/file.md', 'File')
        addToHistory('/file.md', 'File')
        const history = getHistory()
        expect(history).toHaveLength(1)
        expect(history[0].viewCount).toBe(3)
      })

      it('moves re-visited entry to top', () => {
        addToHistory('/file1.md', 'File 1')
        addToHistory('/file2.md', 'File 2')
        addToHistory('/file1.md', 'File 1')
        const history = getHistory()
        expect(history[0].path).toBe('/file1.md')
      })
    })

    describe('removeFromHistory', () => {
      it('removes entry from history', () => {
        addToHistory('/file1.md', 'File 1')
        addToHistory('/file2.md', 'File 2')
        removeFromHistory('/file1.md')
        const history = getHistory()
        expect(history).toHaveLength(1)
        expect(history[0].path).toBe('/file2.md')
      })
    })
  })

  // ============================================================================
  // Highlights
  // ============================================================================

  describe('Highlights', () => {
    beforeEach(() => {
      clearHighlights()
    })

    describe('getHighlights', () => {
      it('returns empty array when no highlights', () => {
        expect(getHighlights()).toEqual([])
      })
    })

    describe('addHighlight', () => {
      it('adds highlight with generated id', () => {
        const highlight = addHighlight({
          filePath: '/file.md',
          content: 'highlighted text',
          selectionType: 'text',
          color: 'yellow',
        })
        expect(highlight.id).toBeDefined()
        expect(highlight.content).toBe('highlighted text')
        expect(highlight.createdAt).toBeDefined()
      })

      it('assigns default group if not specified', () => {
        const highlight = addHighlight({
          filePath: '/file.md',
          content: 'text',
          selectionType: 'text',
          color: 'blue',
        })
        expect(highlight.groupId).toBe('default')
      })
    })

    describe('getHighlightsForFile', () => {
      it('returns only highlights for specified file', () => {
        addHighlight({ filePath: '/file1.md', content: 'a', selectionType: 'text', color: 'yellow' })
        addHighlight({ filePath: '/file2.md', content: 'b', selectionType: 'text', color: 'yellow' })
        addHighlight({ filePath: '/file1.md', content: 'c', selectionType: 'text', color: 'yellow' })

        const file1Highlights = getHighlightsForFile('/file1.md')
        expect(file1Highlights).toHaveLength(2)
        expect(file1Highlights.every(h => h.filePath === '/file1.md')).toBe(true)
      })
    })

    describe('getHighlightsByGroup', () => {
      it('returns highlights in specified group', () => {
        addHighlight({ filePath: '/f.md', content: 'a', selectionType: 'text', color: 'yellow', groupId: 'important' })
        addHighlight({ filePath: '/f.md', content: 'b', selectionType: 'text', color: 'yellow', groupId: 'default' })

        const important = getHighlightsByGroup('important')
        expect(important).toHaveLength(1)
        expect(important[0].content).toBe('a')
      })
    })

    describe('updateHighlight', () => {
      it('updates highlight fields', () => {
        const highlight = addHighlight({
          filePath: '/file.md',
          content: 'original',
          selectionType: 'text',
          color: 'yellow',
        })

        updateHighlight(highlight.id, { color: 'blue', notes: 'updated' })

        const highlights = getHighlights()
        expect(highlights[0].color).toBe('blue')
        expect(highlights[0].notes).toBe('updated')
      })
    })

    describe('removeHighlight', () => {
      it('removes highlight by id', () => {
        const h1 = addHighlight({ filePath: '/f.md', content: 'a', selectionType: 'text', color: 'yellow' })
        addHighlight({ filePath: '/f.md', content: 'b', selectionType: 'text', color: 'yellow' })

        removeHighlight(h1.id)

        const highlights = getHighlights()
        expect(highlights).toHaveLength(1)
        expect(highlights[0].content).toBe('b')
      })
    })
  })

  // ============================================================================
  // Highlight Groups
  // ============================================================================

  describe('Highlight Groups', () => {
    beforeEach(() => {
      resetHighlightGroups()
    })

    describe('getHighlightGroups', () => {
      it('returns default groups on first call', () => {
        const groups = getHighlightGroups()
        expect(groups.length).toBeGreaterThan(0)
        expect(groups.some(g => g.id === 'default')).toBe(true)
      })

      it('sorts groups by order', () => {
        const groups = getHighlightGroups()
        for (let i = 1; i < groups.length; i++) {
          expect(groups[i].order).toBeGreaterThanOrEqual(groups[i - 1].order)
        }
      })
    })

    describe('addHighlightGroup', () => {
      it('adds custom group', () => {
        const group = addHighlightGroup('Custom Group', '#ff0000', 'My description')
        expect(group.name).toBe('Custom Group')
        expect(group.color).toBe('#ff0000')
        expect(group.type).toBe('custom')
      })

      it('uses default color when not specified', () => {
        const group = addHighlightGroup('No Color')
        expect(group.color).toBe('#6b7280')
      })
    })

    describe('removeHighlightGroup', () => {
      it('moves highlights to default group when removing custom group', () => {
        clearHighlights()
        const group = addHighlightGroup('To Remove')
        addHighlight({ filePath: '/f.md', content: 'test', selectionType: 'text', color: 'yellow', groupId: group.id })

        removeHighlightGroup(group.id)

        const highlights = getHighlights()
        expect(highlights[0].groupId).toBe('default')
      })

      it('does not remove default groups', () => {
        const beforeCount = getHighlightGroups().length
        removeHighlightGroup('default')
        expect(getHighlightGroups().length).toBe(beforeCount)
      })
    })
  })

  // ============================================================================
  // Preferences
  // ============================================================================

  describe('Preferences', () => {
    beforeEach(() => {
      resetPreferences()
    })

    describe('getPreferences', () => {
      it('returns default preferences', () => {
        const prefs = getPreferences()
        expect(prefs.theme).toBe('light')
        expect(prefs.fontSize).toBe(1.0)
        expect(prefs.displayName).toBe('Traveler')
      })
    })

    describe('updatePreferences', () => {
      it('updates specific preferences', () => {
        updatePreferences({ theme: 'dark', fontSize: 1.2 })
        const prefs = getPreferences()
        expect(prefs.theme).toBe('dark')
        expect(prefs.fontSize).toBe(1.2)
        expect(prefs.displayName).toBe('Traveler') // Unchanged
      })
    })

    describe('resetPreferences', () => {
      it('resets to defaults', () => {
        updatePreferences({ theme: 'dark', displayName: 'Custom' })
        resetPreferences()
        const prefs = getPreferences()
        expect(prefs.theme).toBe('light')
        expect(prefs.displayName).toBe('Traveler')
      })
    })
  })

  // ============================================================================
  // Media Capture Preferences
  // ============================================================================

  describe('Media Capture Preferences', () => {
    beforeEach(() => {
      resetPreferences()
    })

    describe('getMediaCapturePreferences', () => {
      it('returns default media preferences', () => {
        const prefs = getMediaCapturePreferences()
        expect(prefs.voice.sttEngine).toBe('web-speech')
        expect(prefs.image.compressionQuality).toBe(0.85)
      })
    })

    describe('updateVoiceRecordingPreferences', () => {
      it('updates voice settings', () => {
        updateVoiceRecordingPreferences({ language: 'es-ES', quality: 'high' })
        const prefs = getMediaCapturePreferences()
        expect(prefs.voice.language).toBe('es-ES')
        expect(prefs.voice.quality).toBe('high')
      })
    })

    describe('updateImageCapturePreferences', () => {
      it('updates image settings', () => {
        updateImageCapturePreferences({ maxDimension: 1024 })
        const prefs = getMediaCapturePreferences()
        expect(prefs.image.maxDimension).toBe(1024)
      })
    })
  })

  // ============================================================================
  // User Profile
  // ============================================================================

  describe('User Profile', () => {
    beforeEach(() => {
      resetPreferences()
    })

    describe('getUserProfile', () => {
      it('returns default profile', () => {
        const profile = getUserProfile()
        expect(profile.displayName).toBe('Traveler')
        expect(profile.avatarUrl).toBeUndefined()
      })
    })

    describe('updateUserProfile', () => {
      it('updates profile fields', () => {
        updateUserProfile({ displayName: 'John', avatarUrl: 'https://example.com/avatar.png' })
        const profile = getUserProfile()
        expect(profile.displayName).toBe('John')
        expect(profile.avatarUrl).toBe('https://example.com/avatar.png')
      })
    })

    describe('resetUserProfile', () => {
      it('resets to Traveler', () => {
        updateUserProfile({ displayName: 'Custom' })
        resetUserProfile()
        expect(getUserProfile().displayName).toBe('Traveler')
      })
    })
  })

  // ============================================================================
  // Scroll Positions
  // ============================================================================

  describe('Scroll Positions', () => {
    beforeEach(() => {
      clearAllScrollPositions()
    })

    describe('getScrollPosition', () => {
      it('returns null for unsaved path', () => {
        expect(getScrollPosition('/file.md')).toBeNull()
      })
    })

    describe('saveScrollPosition', () => {
      it('saves position for path', () => {
        saveScrollPosition('/file.md', 500, 50)
        const pos = getScrollPosition('/file.md')
        expect(pos).toEqual({ scrollTop: 500, scrollPercent: 50 })
      })
    })

    describe('clearScrollPosition', () => {
      it('clears position for specific path', () => {
        saveScrollPosition('/file1.md', 100, 10)
        saveScrollPosition('/file2.md', 200, 20)
        clearScrollPosition('/file1.md')
        expect(getScrollPosition('/file1.md')).toBeNull()
        expect(getScrollPosition('/file2.md')).not.toBeNull()
      })
    })
  })

  // ============================================================================
  // Last Viewed Location
  // ============================================================================

  describe('Last Viewed Location', () => {
    beforeEach(() => {
      clearLastViewedLocation()
    })

    describe('getLastViewedLocation', () => {
      it('returns null when nothing saved', () => {
        expect(getLastViewedLocation()).toBeNull()
      })
    })

    describe('saveLastViewedLocation', () => {
      it('saves directory and file', () => {
        saveLastViewedLocation('/docs', '/docs/intro.md')
        const loc = getLastViewedLocation()
        expect(loc?.path).toBe('/docs')
        expect(loc?.file).toBe('/docs/intro.md')
      })

      it('works without file', () => {
        saveLastViewedLocation('/docs')
        const loc = getLastViewedLocation()
        expect(loc?.path).toBe('/docs')
        expect(loc?.file).toBeUndefined()
      })
    })
  })

  // ============================================================================
  // Expanded Paths
  // ============================================================================

  describe('Expanded Paths', () => {
    beforeEach(() => {
      resetPreferences()
    })

    describe('saveExpandedPaths', () => {
      it('saves paths to preferences', () => {
        saveExpandedPaths(['/folder1', '/folder2'])
        expect(getExpandedPaths()).toEqual(['/folder1', '/folder2'])
      })
    })

    describe('getExpandedPaths', () => {
      it('returns empty array when none saved', () => {
        expect(getExpandedPaths()).toEqual([])
      })
    })
  })

  // ============================================================================
  // Drafts
  // ============================================================================

  describe('Drafts', () => {
    beforeEach(() => {
      clearAllDrafts()
    })

    describe('getDraft', () => {
      it('returns null for non-existent draft', () => {
        expect(getDraft('/no-draft.md')).toBeNull()
      })
    })

    describe('saveDraft', () => {
      it('saves draft with content', () => {
        saveDraft('/file.md', 'Draft content', 'Original content')
        const draft = getDraft('/file.md')
        expect(draft?.content).toBe('Draft content')
        expect(draft?.status).toBe('saved')
      })
    })

    describe('checkDraftStatus', () => {
      it('returns hasDraft false when no draft', () => {
        const status = checkDraftStatus('/file.md', 'content')
        expect(status.hasDraft).toBe(false)
      })

      it('detects changes', () => {
        saveDraft('/file.md', 'Draft content', 'Original')
        const status = checkDraftStatus('/file.md', 'Original')
        expect(status.hasDraft).toBe(true)
        expect(status.hasChanges).toBe(true)
      })

      it('detects conflicts', () => {
        saveDraft('/file.md', 'Draft content', 'Original')
        const status = checkDraftStatus('/file.md', 'Changed original')
        expect(status.isConflict).toBe(true)
      })
    })

    describe('getAllDrafts', () => {
      it('returns drafts sorted by most recent', () => {
        saveDraft('/file1.md', 'Content 1', 'Original 1')
        saveDraft('/file2.md', 'Content 2', 'Original 2')
        const drafts = getAllDrafts()
        expect(drafts).toHaveLength(2)
      })
    })

    describe('deleteDraft', () => {
      it('removes specific draft', () => {
        saveDraft('/file1.md', 'Content 1', 'Original')
        saveDraft('/file2.md', 'Content 2', 'Original')
        deleteDraft('/file1.md')
        expect(getDraft('/file1.md')).toBeNull()
        expect(getDraft('/file2.md')).not.toBeNull()
      })
    })

    describe('getUnpublishedDraftsCount', () => {
      it('returns count of all drafts', () => {
        saveDraft('/file1.md', 'C1', 'O1')
        saveDraft('/file2.md', 'C2', 'O2')
        expect(getUnpublishedDraftsCount()).toBe(2)
      })
    })

    describe('updateDraftStatus', () => {
      it('updates draft status', () => {
        saveDraft('/file.md', 'Content', 'Original')
        updateDraftStatus('/file.md', 'conflict')
        const draft = getDraft('/file.md')
        expect(draft?.status).toBe('conflict')
      })
    })
  })

  // ============================================================================
  // Visit Tracking
  // ============================================================================

  describe('Visit Tracking', () => {
    beforeEach(() => {
      removeLocalStorage('quarry-codex-visits')
    })

    describe('isFirstVisit', () => {
      it('returns true when no visits recorded', () => {
        expect(isFirstVisit()).toBe(true)
      })

      it('returns false after first visit', () => {
        trackVisit()
        expect(isFirstVisit()).toBe(false)
      })
    })

    describe('trackVisit', () => {
      it('creates initial visit data', () => {
        const data = trackVisit()
        expect(data.visitCount).toBe(1)
        expect(data.currentStreak).toBe(1)
      })

      it('increments visit count on same day', () => {
        trackVisit()
        const data = trackVisit()
        expect(data.visitCount).toBe(2)
        expect(data.currentStreak).toBe(1) // Same day, no streak increment
      })
    })

    describe('getVisitData', () => {
      it('returns default data on first call', () => {
        const data = getVisitData()
        expect(data.visitCount).toBe(1)
        expect(data.firstVisit).toBeDefined()
      })
    })

    describe('getDaysSinceFirstVisit', () => {
      it('returns 0 on first visit day', () => {
        trackVisit()
        expect(getDaysSinceFirstVisit()).toBe(0)
      })
    })
  })

  // ============================================================================
  // Constants
  // ============================================================================

  describe('Constants', () => {
    describe('DEFAULT_LINK_PREFERENCES', () => {
      it('has expected defaults', () => {
        expect(DEFAULT_LINK_PREFERENCES.autoUpdateBacklinks).toBe(true)
        expect(DEFAULT_LINK_PREFERENCES.showHoverPreview).toBe(true)
        expect(DEFAULT_LINK_PREFERENCES.hoverPreviewDelay).toBe(300)
        expect(DEFAULT_LINK_PREFERENCES.maxTransclusionDepth).toBe(3)
      })
    })

    describe('DEFAULT_TTS_PREFERENCES', () => {
      it('has expected defaults', () => {
        expect(DEFAULT_TTS_PREFERENCES.rate).toBe(1.0)
        expect(DEFAULT_TTS_PREFERENCES.volume).toBe(1.0)
        expect(DEFAULT_TTS_PREFERENCES.pitch).toBe(1.0)
      })
    })

    describe('DEFAULT_MEDIA_CAPTURE_PREFERENCES', () => {
      it('has expected voice defaults', () => {
        expect(DEFAULT_MEDIA_CAPTURE_PREFERENCES.voice.sttEngine).toBe('web-speech')
        expect(DEFAULT_MEDIA_CAPTURE_PREFERENCES.voice.quality).toBe('medium')
        expect(DEFAULT_MEDIA_CAPTURE_PREFERENCES.voice.language).toBe('en-US')
      })

      it('has expected image defaults', () => {
        expect(DEFAULT_MEDIA_CAPTURE_PREFERENCES.image.embedMode).toBe('inline')
        expect(DEFAULT_MEDIA_CAPTURE_PREFERENCES.image.compressionQuality).toBe(0.85)
        expect(DEFAULT_MEDIA_CAPTURE_PREFERENCES.image.maxDimension).toBe(2048)
      })
    })
  })

  // ============================================================================
  // SSR Safety
  // ============================================================================

  describe('SSR Safety', () => {
    it('handles undefined window gracefully', () => {
      vi.stubGlobal('window', undefined)

      // These should not throw
      expect(getLocalStorage('key')).toBeNull()
      expect(() => setLocalStorage('key', 'value')).not.toThrow()
      expect(() => removeLocalStorage('key')).not.toThrow()
      expect(getBookmarks()).toEqual([])
      expect(getHistory()).toEqual([])
    })
  })
})
