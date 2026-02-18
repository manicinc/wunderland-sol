/**
 * Link Settings Tests
 * Tests for link preferences storage and defaults
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_LINK_PREFERENCES,
  type LinkPreferences,
} from '@/lib/localStorage'

describe('LinkSettings', () => {
  describe('DEFAULT_LINK_PREFERENCES', () => {
    it('should have auto-update backlinks enabled by default', () => {
      expect(DEFAULT_LINK_PREFERENCES.autoUpdateBacklinks).toBe(true)
    })

    it('should have hover preview enabled by default', () => {
      expect(DEFAULT_LINK_PREFERENCES.showHoverPreview).toBe(true)
    })

    it('should have 300ms hover preview delay by default', () => {
      expect(DEFAULT_LINK_PREFERENCES.hoverPreviewDelay).toBe(300)
    })

    it('should have count as default backlink indicator style', () => {
      expect(DEFAULT_LINK_PREFERENCES.backlinkIndicatorStyle).toBe('count')
    })

    it('should have transclusion depth of 3 by default', () => {
      expect(DEFAULT_LINK_PREFERENCES.maxTransclusionDepth).toBe(3)
    })

    it('should have mirror sync disabled by default', () => {
      expect(DEFAULT_LINK_PREFERENCES.enableMirrorSync).toBe(false)
    })

    it('should have unlinked mentions disabled by default', () => {
      expect(DEFAULT_LINK_PREFERENCES.showUnlinkedMentions).toBe(false)
    })
  })

  describe('LinkPreferences type', () => {
    it('should accept valid preference values', () => {
      const prefs: LinkPreferences = {
        autoUpdateBacklinks: true,
        showHoverPreview: false,
        hoverPreviewDelay: 500,
        backlinkIndicatorStyle: 'dot',
        maxTransclusionDepth: 5,
        enableMirrorSync: true,
        showUnlinkedMentions: true,
      }

      expect(prefs.autoUpdateBacklinks).toBe(true)
      expect(prefs.showHoverPreview).toBe(false)
      expect(prefs.hoverPreviewDelay).toBe(500)
      expect(prefs.backlinkIndicatorStyle).toBe('dot')
      expect(prefs.maxTransclusionDepth).toBe(5)
      expect(prefs.enableMirrorSync).toBe(true)
      expect(prefs.showUnlinkedMentions).toBe(true)
    })

    it('should allow all valid backlink indicator styles', () => {
      const styles: LinkPreferences['backlinkIndicatorStyle'][] = ['dot', 'count', 'none']
      
      for (const style of styles) {
        const prefs: LinkPreferences = {
          ...DEFAULT_LINK_PREFERENCES,
          backlinkIndicatorStyle: style,
        }
        expect(prefs.backlinkIndicatorStyle).toBe(style)
      }
    })

    it('should merge with defaults correctly', () => {
      const partial: Partial<LinkPreferences> = {
        showHoverPreview: false,
        hoverPreviewDelay: 600,
      }

      const merged: LinkPreferences = {
        ...DEFAULT_LINK_PREFERENCES,
        ...partial,
      }

      // Overridden values
      expect(merged.showHoverPreview).toBe(false)
      expect(merged.hoverPreviewDelay).toBe(600)

      // Default values preserved
      expect(merged.autoUpdateBacklinks).toBe(true)
      expect(merged.backlinkIndicatorStyle).toBe('count')
    })
  })

  describe('preference bounds', () => {
    it('should have reasonable delay range (100-1000ms)', () => {
      expect(DEFAULT_LINK_PREFERENCES.hoverPreviewDelay).toBeGreaterThanOrEqual(100)
      expect(DEFAULT_LINK_PREFERENCES.hoverPreviewDelay).toBeLessThanOrEqual(1000)
    })

    it('should have reasonable transclusion depth (1-5)', () => {
      expect(DEFAULT_LINK_PREFERENCES.maxTransclusionDepth).toBeGreaterThanOrEqual(1)
      expect(DEFAULT_LINK_PREFERENCES.maxTransclusionDepth).toBeLessThanOrEqual(5)
    })
  })
})

