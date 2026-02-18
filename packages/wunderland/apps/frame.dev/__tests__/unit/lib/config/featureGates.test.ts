/**
 * Feature Gates Tests
 * @module __tests__/unit/lib/config/featureGates.test
 *
 * Tests for feature gating types, constants, and utilities.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  Features,
  PREMIUM_FEATURES,
  FREE_FEATURES,
  getFeatureInfo,
  getPremiumFeatureList,
  type Feature,
  type FeatureGateProps,
  type PremiumGateProps,
  type FeatureInfo,
} from '@/lib/config/featureGates'

describe('Feature Gates', () => {
  // ============================================================================
  // Features constant
  // ============================================================================

  describe('Features constant', () => {
    describe('premium features', () => {
      it('has QUIZZES feature', () => {
        expect(Features.QUIZZES).toBe('quizzes')
      })

      it('has FLASHCARDS feature', () => {
        expect(Features.FLASHCARDS).toBe('flashcards')
      })

      it('has QNA feature', () => {
        expect(Features.QNA).toBe('qna')
      })

      it('has EXPORT feature', () => {
        expect(Features.EXPORT).toBe('export')
      })

      it('has ADVANCED_THEMES feature', () => {
        expect(Features.ADVANCED_THEMES).toBe('advanced_themes')
      })

      it('has OFFLINE_MODE feature', () => {
        expect(Features.OFFLINE_MODE).toBe('offline_mode')
      })

      it('has DESKTOP_APP feature', () => {
        expect(Features.DESKTOP_APP).toBe('desktop_app')
      })

      it('has MOBILE_APP feature', () => {
        expect(Features.MOBILE_APP).toBe('mobile_app')
      })

      it('has GAMIFICATION feature', () => {
        expect(Features.GAMIFICATION).toBe('gamification')
      })

      it('has AI_GENERATION feature', () => {
        expect(Features.AI_GENERATION).toBe('ai_generation')
      })

      it('has LEARNING_STUDIO feature', () => {
        expect(Features.LEARNING_STUDIO).toBe('learning_studio')
      })
    })

    describe('community features', () => {
      it('has PLUGINS feature', () => {
        expect(Features.PLUGINS).toBe('plugins')
      })
    })

    describe('free features', () => {
      it('has SPIRAL_PATH feature', () => {
        expect(Features.SPIRAL_PATH).toBe('spiral_path')
      })

      it('has SEMANTIC_SEARCH feature', () => {
        expect(Features.SEMANTIC_SEARCH).toBe('semantic_search')
      })

      it('has BOOKMARKS feature', () => {
        expect(Features.BOOKMARKS).toBe('bookmarks')
      })

      it('has KNOWLEDGE_GRAPH feature', () => {
        expect(Features.KNOWLEDGE_GRAPH).toBe('knowledge_graph')
      })

      it('has READING_PROGRESS feature', () => {
        expect(Features.READING_PROGRESS).toBe('reading_progress')
      })

      it('has GITHUB_INTEGRATION feature', () => {
        expect(Features.GITHUB_INTEGRATION).toBe('github_integration')
      })
    })
  })

  // ============================================================================
  // Feature type
  // ============================================================================

  describe('Feature type', () => {
    it('accepts premium feature values', () => {
      const features: Feature[] = [
        'quizzes',
        'flashcards',
        'qna',
        'export',
        'advanced_themes',
      ]
      expect(features).toHaveLength(5)
    })

    it('accepts free feature values', () => {
      const features: Feature[] = [
        'spiral_path',
        'semantic_search',
        'bookmarks',
        'knowledge_graph',
        'reading_progress',
      ]
      expect(features).toHaveLength(5)
    })
  })

  // ============================================================================
  // PREMIUM_FEATURES array
  // ============================================================================

  describe('PREMIUM_FEATURES', () => {
    it('contains quizzes', () => {
      expect(PREMIUM_FEATURES).toContain(Features.QUIZZES)
    })

    it('contains flashcards', () => {
      expect(PREMIUM_FEATURES).toContain(Features.FLASHCARDS)
    })

    it('contains qna', () => {
      expect(PREMIUM_FEATURES).toContain(Features.QNA)
    })

    it('contains export', () => {
      expect(PREMIUM_FEATURES).toContain(Features.EXPORT)
    })

    it('contains advanced_themes', () => {
      expect(PREMIUM_FEATURES).toContain(Features.ADVANCED_THEMES)
    })

    it('contains offline_mode', () => {
      expect(PREMIUM_FEATURES).toContain(Features.OFFLINE_MODE)
    })

    it('contains desktop_app', () => {
      expect(PREMIUM_FEATURES).toContain(Features.DESKTOP_APP)
    })

    it('contains mobile_app', () => {
      expect(PREMIUM_FEATURES).toContain(Features.MOBILE_APP)
    })

    it('contains gamification', () => {
      expect(PREMIUM_FEATURES).toContain(Features.GAMIFICATION)
    })

    it('contains ai_generation', () => {
      expect(PREMIUM_FEATURES).toContain(Features.AI_GENERATION)
    })

    it('contains learning_studio', () => {
      expect(PREMIUM_FEATURES).toContain(Features.LEARNING_STUDIO)
    })

    it('does not contain free features', () => {
      expect(PREMIUM_FEATURES).not.toContain(Features.SPIRAL_PATH)
      expect(PREMIUM_FEATURES).not.toContain(Features.SEMANTIC_SEARCH)
      expect(PREMIUM_FEATURES).not.toContain(Features.BOOKMARKS)
    })

    it('has 11 premium features', () => {
      expect(PREMIUM_FEATURES).toHaveLength(11)
    })
  })

  // ============================================================================
  // FREE_FEATURES array
  // ============================================================================

  describe('FREE_FEATURES', () => {
    it('contains spiral_path', () => {
      expect(FREE_FEATURES).toContain(Features.SPIRAL_PATH)
    })

    it('contains semantic_search', () => {
      expect(FREE_FEATURES).toContain(Features.SEMANTIC_SEARCH)
    })

    it('contains bookmarks', () => {
      expect(FREE_FEATURES).toContain(Features.BOOKMARKS)
    })

    it('contains knowledge_graph', () => {
      expect(FREE_FEATURES).toContain(Features.KNOWLEDGE_GRAPH)
    })

    it('contains reading_progress', () => {
      expect(FREE_FEATURES).toContain(Features.READING_PROGRESS)
    })

    it('contains github_integration', () => {
      expect(FREE_FEATURES).toContain(Features.GITHUB_INTEGRATION)
    })

    it('contains plugins as community feature', () => {
      expect(FREE_FEATURES).toContain(Features.PLUGINS)
    })

    it('does not contain premium features', () => {
      expect(FREE_FEATURES).not.toContain(Features.QUIZZES)
      expect(FREE_FEATURES).not.toContain(Features.FLASHCARDS)
      expect(FREE_FEATURES).not.toContain(Features.EXPORT)
    })

    it('has 7 free features', () => {
      expect(FREE_FEATURES).toHaveLength(7)
    })
  })

  // ============================================================================
  // FeatureInfo type
  // ============================================================================

  describe('FeatureInfo type', () => {
    it('creates valid feature info', () => {
      const info: FeatureInfo = {
        name: 'Test Feature',
        description: 'A test feature description',
        icon: 'test-icon',
      }
      expect(info.name).toBe('Test Feature')
      expect(info.description).toBe('A test feature description')
      expect(info.icon).toBe('test-icon')
    })
  })

  // ============================================================================
  // getFeatureInfo function
  // ============================================================================

  describe('getFeatureInfo', () => {
    describe('premium features', () => {
      it('returns info for quizzes', () => {
        const info = getFeatureInfo(Features.QUIZZES)
        expect(info.name).toBe('Quizzes')
        expect(info.description).toContain('quiz')
        expect(info.icon).toBe('help-circle')
      })

      it('returns info for flashcards', () => {
        const info = getFeatureInfo(Features.FLASHCARDS)
        expect(info.name).toBe('Flashcards')
        expect(info.description).toContain('FSRS')
        expect(info.icon).toBe('layers')
      })

      it('returns info for qna', () => {
        const info = getFeatureInfo(Features.QNA)
        expect(info.name).toBe('Q&A Generation')
        expect(info.description).toContain('AI')
        expect(info.icon).toBe('message-circle')
      })

      it('returns info for export', () => {
        const info = getFeatureInfo(Features.EXPORT)
        expect(info.name).toBe('Export/Import')
        expect(info.description).toContain('Backup')
        expect(info.icon).toBe('download')
      })

      it('returns info for advanced_themes', () => {
        const info = getFeatureInfo(Features.ADVANCED_THEMES)
        expect(info.name).toBe('Advanced Themes')
        expect(info.description).toContain('theme')
        expect(info.icon).toBe('palette')
      })

      it('returns info for offline_mode', () => {
        const info = getFeatureInfo(Features.OFFLINE_MODE)
        expect(info.name).toBe('Offline Mode')
        expect(info.description).toContain('internet')
        expect(info.icon).toBe('wifi-off')
      })

      it('returns info for desktop_app', () => {
        const info = getFeatureInfo(Features.DESKTOP_APP)
        expect(info.name).toBe('Desktop App')
        expect(info.description).toContain('Windows')
        expect(info.icon).toBe('monitor')
      })

      it('returns info for mobile_app', () => {
        const info = getFeatureInfo(Features.MOBILE_APP)
        expect(info.name).toBe('Mobile App')
        expect(info.description).toContain('iOS')
        expect(info.icon).toBe('smartphone')
      })

      it('returns info for gamification', () => {
        const info = getFeatureInfo(Features.GAMIFICATION)
        expect(info.name).toBe('Gamification')
        expect(info.description).toContain('XP')
        expect(info.icon).toBe('trophy')
      })

      it('returns info for ai_generation', () => {
        const info = getFeatureInfo(Features.AI_GENERATION)
        expect(info.name).toBe('AI Generation')
        expect(info.description).toContain('AI')
        expect(info.icon).toBe('sparkles')
      })

      it('returns info for learning_studio', () => {
        const info = getFeatureInfo(Features.LEARNING_STUDIO)
        expect(info.name).toBe('Learning Studio')
        expect(info.description).toContain('learning')
        expect(info.icon).toBe('graduation-cap')
      })
    })

    describe('free features', () => {
      it('returns info for spiral_path', () => {
        const info = getFeatureInfo(Features.SPIRAL_PATH)
        expect(info.name).toBe('Spiral Path')
        expect(info.description).toContain('learning')
        expect(info.icon).toBe('target')
      })

      it('returns info for semantic_search', () => {
        const info = getFeatureInfo(Features.SEMANTIC_SEARCH)
        expect(info.name).toBe('Semantic Search')
        expect(info.description).toContain('AI')
        expect(info.icon).toBe('search')
      })

      it('returns info for bookmarks', () => {
        const info = getFeatureInfo(Features.BOOKMARKS)
        expect(info.name).toBe('Bookmarks')
        expect(info.description).toContain('Save')
        expect(info.icon).toBe('bookmark')
      })

      it('returns info for knowledge_graph', () => {
        const info = getFeatureInfo(Features.KNOWLEDGE_GRAPH)
        expect(info.name).toBe('Knowledge Graph')
        expect(info.description).toContain('connections')
        expect(info.icon).toBe('git-branch')
      })

      it('returns info for reading_progress', () => {
        const info = getFeatureInfo(Features.READING_PROGRESS)
        expect(info.name).toBe('Reading Progress')
        expect(info.description).toContain('Track')
        expect(info.icon).toBe('book-open')
      })

      it('returns info for github_integration', () => {
        const info = getFeatureInfo(Features.GITHUB_INTEGRATION)
        expect(info.name).toBe('GitHub Integration')
        expect(info.description).toContain('GitHub')
        expect(info.icon).toBe('github')
      })

      it('returns info for plugins', () => {
        const info = getFeatureInfo(Features.PLUGINS)
        expect(info.name).toBe('Plugins')
        expect(info.description).toContain('plugin')
        expect(info.icon).toBe('puzzle')
      })
    })
  })

  // ============================================================================
  // getPremiumFeatureList function
  // ============================================================================

  describe('getPremiumFeatureList', () => {
    it('returns an array of FeatureInfo objects', () => {
      const list = getPremiumFeatureList()
      expect(Array.isArray(list)).toBe(true)
      expect(list.length).toBe(PREMIUM_FEATURES.length)
    })

    it('each item has name, description, and icon', () => {
      const list = getPremiumFeatureList()
      list.forEach((info) => {
        expect(info).toHaveProperty('name')
        expect(info).toHaveProperty('description')
        expect(info).toHaveProperty('icon')
        expect(typeof info.name).toBe('string')
        expect(typeof info.description).toBe('string')
        expect(typeof info.icon).toBe('string')
      })
    })

    it('contains quizzes info', () => {
      const list = getPremiumFeatureList()
      const quizzesInfo = list.find((info) => info.name === 'Quizzes')
      expect(quizzesInfo).toBeDefined()
    })

    it('contains flashcards info', () => {
      const list = getPremiumFeatureList()
      const flashcardsInfo = list.find((info) => info.name === 'Flashcards')
      expect(flashcardsInfo).toBeDefined()
    })

    it('does not contain free features', () => {
      const list = getPremiumFeatureList()
      const names = list.map((info) => info.name)
      expect(names).not.toContain('Spiral Path')
      expect(names).not.toContain('Bookmarks')
      expect(names).not.toContain('Knowledge Graph')
    })
  })

  // ============================================================================
  // FeatureGateProps type
  // ============================================================================

  describe('FeatureGateProps type', () => {
    it('creates props with single feature', () => {
      const props: FeatureGateProps = {
        feature: Features.QUIZZES,
        children: null,
      }
      expect(props.feature).toBe('quizzes')
    })

    it('creates props with multiple features', () => {
      const props: FeatureGateProps = {
        feature: [Features.QUIZZES, Features.FLASHCARDS],
        children: null,
      }
      expect(Array.isArray(props.feature)).toBe(true)
      expect(props.feature).toHaveLength(2)
    })

    it('supports requireAll option', () => {
      const props: FeatureGateProps = {
        feature: [Features.QUIZZES, Features.FLASHCARDS],
        requireAll: true,
        children: null,
      }
      expect(props.requireAll).toBe(true)
    })

    it('supports fallback', () => {
      const props: FeatureGateProps = {
        feature: Features.EXPORT,
        children: null,
        fallback: null,
      }
      expect(props.fallback).toBe(null)
    })
  })

  // ============================================================================
  // PremiumGateProps type
  // ============================================================================

  describe('PremiumGateProps type', () => {
    it('creates minimal props', () => {
      const props: PremiumGateProps = {
        children: null,
      }
      expect(props.children).toBe(null)
    })

    it('supports fallback', () => {
      const props: PremiumGateProps = {
        children: null,
        fallback: null,
      }
      expect(props.fallback).toBe(null)
    })
  })

  // ============================================================================
  // Feature categorization scenarios
  // ============================================================================

  describe('feature categorization scenarios', () => {
    it('premium and free features are mutually exclusive', () => {
      const premiumSet = new Set(PREMIUM_FEATURES)
      const freeSet = new Set(FREE_FEATURES)

      PREMIUM_FEATURES.forEach((feature) => {
        expect(freeSet.has(feature)).toBe(false)
      })

      FREE_FEATURES.forEach((feature) => {
        expect(premiumSet.has(feature)).toBe(false)
      })
    })

    it('all features in Features constant are categorized', () => {
      const allFeatures = Object.values(Features)
      const categorizedFeatures = [...PREMIUM_FEATURES, ...FREE_FEATURES]

      allFeatures.forEach((feature) => {
        expect(categorizedFeatures).toContain(feature)
      })
    })

    it('no duplicate features in categorization', () => {
      const allCategorized = [...PREMIUM_FEATURES, ...FREE_FEATURES]
      const uniqueFeatures = new Set(allCategorized)
      expect(uniqueFeatures.size).toBe(allCategorized.length)
    })
  })

  // ============================================================================
  // Icon consistency
  // ============================================================================

  describe('icon consistency', () => {
    it('all features have non-empty icons', () => {
      const allFeatures = Object.values(Features)
      allFeatures.forEach((feature) => {
        const info = getFeatureInfo(feature)
        expect(info.icon).toBeTruthy()
        expect(info.icon.length).toBeGreaterThan(0)
      })
    })

    it('icons are lowercase with hyphens', () => {
      const allFeatures = Object.values(Features)
      allFeatures.forEach((feature) => {
        const info = getFeatureInfo(feature)
        expect(info.icon).toMatch(/^[a-z0-9-]+$/)
      })
    })
  })
})
