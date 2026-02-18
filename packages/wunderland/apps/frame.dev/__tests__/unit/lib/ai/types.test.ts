/**
 * AI Types Tests
 * @module __tests__/unit/lib/ai/types.test
 *
 * Tests for AI module type definitions and constants.
 */

import { describe, it, expect } from 'vitest'
import {
  IMAGE_GENERATION_STYLES,
  DEFAULT_AI_PREFERENCES,
  type AIPreferences,
  type ImageGenerationStyle,
  type ImageStyleInfo,
  type AIFeatureStatus,
  type AIStatusInfo,
  type ImageSourceType,
  type ImageMetadata,
  type ObjectDetection,
  type ScreenshotDetectionResult,
  type ImageAnalysisResult,
  type ImageAnalysisOptions,
  type VisionAnalysisResult,
  type VisionAnalysisOptions,
  type RAGMode,
  type RAGOptions,
  type RAGCitation,
  type RAGSearchResult,
  type WritingContext,
  type WritingSuggestion,
  type WritingSuggestionOptions,
} from '@/lib/ai/types'

// ============================================================================
// IMAGE_GENERATION_STYLES
// ============================================================================

describe('IMAGE_GENERATION_STYLES', () => {
  it('is an array', () => {
    expect(Array.isArray(IMAGE_GENERATION_STYLES)).toBe(true)
  })

  it('contains style objects', () => {
    expect(IMAGE_GENERATION_STYLES.length).toBeGreaterThan(0)

    IMAGE_GENERATION_STYLES.forEach((style) => {
      expect(style).toHaveProperty('id')
      expect(style).toHaveProperty('name')
      expect(style).toHaveProperty('description')
      expect(style).toHaveProperty('promptPrefix')
    })
  })

  it('has unique ids', () => {
    const ids = IMAGE_GENERATION_STYLES.map((s) => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('has unique names', () => {
    const names = IMAGE_GENERATION_STYLES.map((s) => s.name)
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(names.length)
  })

  describe('individual styles', () => {
    it('contains illustration style', () => {
      const style = IMAGE_GENERATION_STYLES.find((s) => s.id === 'illustration')
      expect(style).toBeDefined()
      expect(style?.name).toBe('Illustration')
    })

    it('contains photo style', () => {
      const style = IMAGE_GENERATION_STYLES.find((s) => s.id === 'photo')
      expect(style).toBeDefined()
      expect(style?.name).toBe('Photo')
    })

    it('contains diagram style', () => {
      const style = IMAGE_GENERATION_STYLES.find((s) => s.id === 'diagram')
      expect(style).toBeDefined()
      expect(style?.name).toBe('Diagram')
    })

    it('contains sketch style', () => {
      const style = IMAGE_GENERATION_STYLES.find((s) => s.id === 'sketch')
      expect(style).toBeDefined()
      expect(style?.name).toBe('Sketch')
    })

    it('contains watercolor style', () => {
      const style = IMAGE_GENERATION_STYLES.find((s) => s.id === 'watercolor')
      expect(style).toBeDefined()
      expect(style?.name).toBe('Watercolor')
    })

    it('contains 3d style', () => {
      const style = IMAGE_GENERATION_STYLES.find((s) => s.id === '3d')
      expect(style).toBeDefined()
      expect(style?.name).toBe('3D Render')
    })

    it('contains pixel style', () => {
      const style = IMAGE_GENERATION_STYLES.find((s) => s.id === 'pixel')
      expect(style).toBeDefined()
      expect(style?.name).toBe('Pixel Art')
    })
  })

  describe('style properties', () => {
    it('all styles have non-empty id', () => {
      IMAGE_GENERATION_STYLES.forEach((style) => {
        expect(typeof style.id).toBe('string')
        expect(style.id.length).toBeGreaterThan(0)
      })
    })

    it('all styles have non-empty name', () => {
      IMAGE_GENERATION_STYLES.forEach((style) => {
        expect(typeof style.name).toBe('string')
        expect(style.name.length).toBeGreaterThan(0)
      })
    })

    it('all styles have non-empty description', () => {
      IMAGE_GENERATION_STYLES.forEach((style) => {
        expect(typeof style.description).toBe('string')
        expect(style.description.length).toBeGreaterThan(0)
      })
    })

    it('all styles have promptPrefix', () => {
      IMAGE_GENERATION_STYLES.forEach((style) => {
        expect(typeof style.promptPrefix).toBe('string')
        expect(style.promptPrefix.length).toBeGreaterThan(0)
      })
    })
  })
})

// ============================================================================
// DEFAULT_AI_PREFERENCES
// ============================================================================

describe('DEFAULT_AI_PREFERENCES', () => {
  it('is an object', () => {
    expect(typeof DEFAULT_AI_PREFERENCES).toBe('object')
    expect(DEFAULT_AI_PREFERENCES).not.toBeNull()
  })

  describe('vision settings', () => {
    it('has vision object', () => {
      expect(DEFAULT_AI_PREFERENCES).toHaveProperty('vision')
      expect(typeof DEFAULT_AI_PREFERENCES.vision).toBe('object')
    })

    it('vision is disabled by default', () => {
      expect(DEFAULT_AI_PREFERENCES.vision.enabled).toBe(false)
    })

    it('has provider setting', () => {
      expect(DEFAULT_AI_PREFERENCES.vision.provider).toBe('openai')
    })

    it('has autoAnalyze setting', () => {
      expect(typeof DEFAULT_AI_PREFERENCES.vision.autoAnalyze).toBe('boolean')
    })

    it('has analysisFeatures object', () => {
      expect(DEFAULT_AI_PREFERENCES.vision.analysisFeatures).toBeDefined()
      expect(DEFAULT_AI_PREFERENCES.vision.analysisFeatures).toHaveProperty('aiCaption')
      expect(DEFAULT_AI_PREFERENCES.vision.analysisFeatures).toHaveProperty('screenshotDetection')
      expect(DEFAULT_AI_PREFERENCES.vision.analysisFeatures).toHaveProperty('exifExtraction')
      expect(DEFAULT_AI_PREFERENCES.vision.analysisFeatures).toHaveProperty('objectDetection')
    })
  })

  describe('rag settings', () => {
    it('has rag object', () => {
      expect(DEFAULT_AI_PREFERENCES).toHaveProperty('rag')
      expect(typeof DEFAULT_AI_PREFERENCES.rag).toBe('object')
    })

    it('rag is disabled by default', () => {
      expect(DEFAULT_AI_PREFERENCES.rag.enabled).toBe(false)
    })

    it('has rerank setting', () => {
      expect(typeof DEFAULT_AI_PREFERENCES.rag.rerank).toBe('boolean')
    })

    it('has synthesize setting', () => {
      expect(typeof DEFAULT_AI_PREFERENCES.rag.synthesize).toBe('boolean')
    })
  })

  describe('writingAssistant settings', () => {
    it('has writingAssistant object', () => {
      expect(DEFAULT_AI_PREFERENCES).toHaveProperty('writingAssistant')
      expect(typeof DEFAULT_AI_PREFERENCES.writingAssistant).toBe('object')
    })

    it('writingAssistant is disabled by default', () => {
      expect(DEFAULT_AI_PREFERENCES.writingAssistant.enabled).toBe(false)
    })

    it('has triggerDelay setting', () => {
      expect(typeof DEFAULT_AI_PREFERENCES.writingAssistant.triggerDelay).toBe('number')
      expect(DEFAULT_AI_PREFERENCES.writingAssistant.triggerDelay).toBeGreaterThan(0)
    })

    it('has suggestionLength setting', () => {
      expect(['short', 'medium', 'long']).toContain(
        DEFAULT_AI_PREFERENCES.writingAssistant.suggestionLength
      )
    })

    it('has autoTrigger setting', () => {
      expect(typeof DEFAULT_AI_PREFERENCES.writingAssistant.autoTrigger).toBe('boolean')
    })
  })

  describe('imageGeneration settings', () => {
    it('has imageGeneration object', () => {
      expect(DEFAULT_AI_PREFERENCES).toHaveProperty('imageGeneration')
      expect(typeof DEFAULT_AI_PREFERENCES.imageGeneration).toBe('object')
    })

    it('imageGeneration is disabled by default', () => {
      expect(DEFAULT_AI_PREFERENCES.imageGeneration.enabled).toBe(false)
    })

    it('has defaultStyle setting', () => {
      const validStyles = IMAGE_GENERATION_STYLES.map((s) => s.id)
      expect(validStyles).toContain(DEFAULT_AI_PREFERENCES.imageGeneration.defaultStyle)
    })

    it('has defaultSize setting', () => {
      expect(['square', 'landscape', 'portrait']).toContain(
        DEFAULT_AI_PREFERENCES.imageGeneration.defaultSize
      )
    })

    it('has showInToolbar setting', () => {
      expect(typeof DEFAULT_AI_PREFERENCES.imageGeneration.showInToolbar).toBe('boolean')
    })
  })
})

// ============================================================================
// Type structure tests (compile-time + runtime shape validation)
// ============================================================================

describe('type structures', () => {
  describe('AIPreferences', () => {
    it('can be created with required fields', () => {
      const prefs: AIPreferences = {
        ...DEFAULT_AI_PREFERENCES,
      }
      expect(prefs).toBeDefined()
      expect(prefs.vision).toBeDefined()
      expect(prefs.rag).toBeDefined()
      expect(prefs.writingAssistant).toBeDefined()
      expect(prefs.imageGeneration).toBeDefined()
    })

    it('accepts valid vision provider values', () => {
      const prefs: AIPreferences = {
        ...DEFAULT_AI_PREFERENCES,
        vision: {
          ...DEFAULT_AI_PREFERENCES.vision,
          provider: 'anthropic',
        },
      }
      expect(prefs.vision.provider).toBe('anthropic')
    })
  })

  describe('ImageGenerationStyle', () => {
    it('accepts valid style values', () => {
      const styles: ImageGenerationStyle[] = [
        'illustration',
        'photo',
        'diagram',
        'sketch',
        'watercolor',
        '3d',
        'pixel',
      ]
      styles.forEach((style) => {
        expect(typeof style).toBe('string')
      })
    })
  })

  describe('AIFeatureStatus', () => {
    it('accepts valid status values', () => {
      const statuses: AIFeatureStatus[] = ['ready', 'working', 'disabled', 'no-api-key', 'error']
      statuses.forEach((status) => {
        expect(typeof status).toBe('string')
      })
    })
  })

  describe('AIStatusInfo', () => {
    it('has expected shape', () => {
      const info: AIStatusInfo = {
        status: 'ready',
      }
      expect(info.status).toBe('ready')
    })

    it('accepts optional message', () => {
      const info: AIStatusInfo = {
        status: 'error',
        message: 'Something went wrong',
      }
      expect(info.message).toBe('Something went wrong')
    })

    it('accepts optional lastError', () => {
      const info: AIStatusInfo = {
        status: 'error',
        lastError: 'API timeout',
        lastErrorTime: new Date(),
      }
      expect(info.lastError).toBe('API timeout')
    })
  })

  describe('ImageSourceType', () => {
    it('accepts valid source types', () => {
      const types: ImageSourceType[] = ['camera', 'upload', 'screenshot', 'clipboard', 'unknown']
      types.forEach((type) => {
        expect(typeof type).toBe('string')
      })
    })
  })

  describe('ImageMetadata', () => {
    it('has expected shape', () => {
      const metadata: ImageMetadata = {
        dimensions: { width: 1920, height: 1080 },
        fileSize: 1024000,
        mimeType: 'image/jpeg',
      }
      expect(metadata.dimensions.width).toBe(1920)
      expect(metadata.dimensions.height).toBe(1080)
      expect(metadata.fileSize).toBe(1024000)
    })

    it('accepts optional EXIF data', () => {
      const metadata: ImageMetadata = {
        dimensions: { width: 800, height: 600 },
        fileSize: 500000,
        mimeType: 'image/png',
        exif: {
          make: 'Apple',
          model: 'iPhone 14 Pro',
          dateTime: '2024-01-15T10:30:00Z',
        },
      }
      expect(metadata.exif?.make).toBe('Apple')
      expect(metadata.exif?.model).toBe('iPhone 14 Pro')
    })
  })

  describe('ObjectDetection', () => {
    it('has expected shape', () => {
      const detection: ObjectDetection = {
        class: 'person',
        score: 0.95,
        bbox: { x: 100, y: 50, width: 200, height: 400 },
      }
      expect(detection.class).toBe('person')
      expect(detection.score).toBe(0.95)
      expect(detection.bbox.width).toBe(200)
    })
  })

  describe('ScreenshotDetectionResult', () => {
    it('has expected shape', () => {
      const result: ScreenshotDetectionResult = {
        isScreenshot: true,
        confidence: 0.92,
        reason: 'Has screenshot software metadata',
      }
      expect(result.isScreenshot).toBe(true)
      expect(result.confidence).toBe(0.92)
    })

    it('accepts optional factors', () => {
      const result: ScreenshotDetectionResult = {
        isScreenshot: true,
        confidence: 0.85,
        reason: 'Multiple factors detected',
        factors: {
          hasScreenshotSoftware: true,
          hasCommonResolution: true,
          hasSharpEdges: true,
        },
      }
      expect(result.factors?.hasScreenshotSoftware).toBe(true)
    })
  })

  describe('ImageAnalysisResult', () => {
    it('has expected shape', () => {
      const result: ImageAnalysisResult = {
        sourceType: 'upload',
        analyzedAt: '2024-01-15T10:30:00Z',
        status: 'done',
      }
      expect(result.sourceType).toBe('upload')
      expect(result.status).toBe('done')
    })

    it('accepts optional caption', () => {
      const result: ImageAnalysisResult = {
        sourceType: 'screenshot',
        analyzedAt: '2024-01-15T10:30:00Z',
        status: 'done',
        caption: 'A code editor showing JavaScript',
        captionConfidence: 0.88,
      }
      expect(result.caption).toBe('A code editor showing JavaScript')
    })
  })

  describe('ImageAnalysisOptions', () => {
    it('accepts all optional fields', () => {
      const options: ImageAnalysisOptions = {
        generateCaption: true,
        detectScreenshot: true,
        extractExif: true,
        detectObjects: false,
        customPrompt: 'Describe the technical diagram',
        provider: 'anthropic',
      }
      expect(options.generateCaption).toBe(true)
      expect(options.provider).toBe('anthropic')
    })
  })

  describe('VisionAnalysisResult', () => {
    it('has expected shape', () => {
      const result: VisionAnalysisResult = {
        description: 'A mountain landscape at sunset',
        imageType: 'photo',
        confidence: 0.95,
        provider: 'openai',
        latency: 1500,
      }
      expect(result.description).toBeDefined()
      expect(result.imageType).toBe('photo')
      expect(result.provider).toBe('openai')
    })

    it('accepts optional structure', () => {
      const result: VisionAnalysisResult = {
        description: 'A flowchart showing user authentication',
        imageType: 'diagram',
        confidence: 0.9,
        provider: 'anthropic',
        latency: 2000,
        elements: ['Login', 'Verify', 'Redirect'],
        structure: {
          type: 'flowchart',
          nodes: ['Start', 'Login', 'Verify', 'End'],
          relationships: ['Start->Login', 'Login->Verify', 'Verify->End'],
        },
      }
      expect(result.structure?.type).toBe('flowchart')
      expect(result.elements).toHaveLength(3)
    })
  })

  describe('RAGMode', () => {
    it('accepts valid mode values', () => {
      const modes: RAGMode[] = ['local', 'rerank', 'synthesize']
      modes.forEach((mode) => {
        expect(typeof mode).toBe('string')
      })
    })
  })

  describe('RAGOptions', () => {
    it('has expected shape', () => {
      const options: RAGOptions = {
        mode: 'synthesize',
      }
      expect(options.mode).toBe('synthesize')
    })

    it('accepts optional fields', () => {
      const options: RAGOptions = {
        mode: 'rerank',
        maxResults: 10,
        includeSnippets: true,
      }
      expect(options.maxResults).toBe(10)
      expect(options.includeSnippets).toBe(true)
    })
  })

  describe('RAGCitation', () => {
    it('has expected shape', () => {
      const citation: RAGCitation = {
        index: 1,
        path: '/notes/machine-learning.md',
        title: 'Machine Learning Basics',
        snippet: 'Machine learning is a subset of AI...',
        relevance: 92,
      }
      expect(citation.index).toBe(1)
      expect(citation.relevance).toBe(92)
    })
  })

  describe('RAGSearchResult', () => {
    it('has expected shape', () => {
      const result: RAGSearchResult = {
        mode: 'local',
        latency: 150,
        provider: 'local',
      }
      expect(result.mode).toBe('local')
      expect(result.latency).toBe(150)
    })

    it('accepts reranked results', () => {
      const result: RAGSearchResult = {
        mode: 'rerank',
        latency: 800,
        provider: 'openai',
        rerankedResults: [
          {
            path: '/notes/ai.md',
            title: 'AI Overview',
            snippet: 'Artificial Intelligence...',
            originalScore: 0.7,
            aiScore: 0.95,
          },
        ],
      }
      expect(result.rerankedResults).toHaveLength(1)
      expect(result.rerankedResults?.[0].aiScore).toBe(0.95)
    })

    it('accepts synthesized answer', () => {
      const result: RAGSearchResult = {
        mode: 'synthesize',
        latency: 2000,
        provider: 'openai',
        synthesizedAnswer: {
          answer: 'Machine learning is a type of AI [1] that enables computers to learn [2].',
          citations: [
            {
              index: 1,
              path: '/ml.md',
              title: 'ML Intro',
              snippet: 'ML is AI...',
              relevance: 95,
            },
            {
              index: 2,
              path: '/ai.md',
              title: 'AI Basics',
              snippet: 'Learning from data...',
              relevance: 88,
            },
          ],
        },
      }
      expect(result.synthesizedAnswer?.citations).toHaveLength(2)
    })
  })

  describe('WritingContext', () => {
    it('has expected shape', () => {
      const context: WritingContext = {
        textBefore: 'The quick brown fox ',
      }
      expect(context.textBefore).toBeDefined()
    })

    it('accepts optional fields', () => {
      const context: WritingContext = {
        textBefore: 'The quick brown fox ',
        textAfter: ' over the lazy dog.',
        currentParagraph: 'The quick brown fox jumps over the lazy dog.',
        metadata: {
          title: 'Pangram Examples',
          tags: ['writing', 'examples'],
        },
      }
      expect(context.textAfter).toBeDefined()
      expect(context.metadata?.tags).toHaveLength(2)
    })
  })

  describe('WritingSuggestion', () => {
    it('has expected shape', () => {
      const suggestion: WritingSuggestion = {
        text: 'jumps over the lazy dog.',
        confidence: 0.85,
        type: 'completion',
      }
      expect(suggestion.text).toBeDefined()
      expect(suggestion.type).toBe('completion')
    })

    it('accepts all suggestion types', () => {
      const types: WritingSuggestion['type'][] = ['completion', 'continuation', 'correction']
      types.forEach((type) => {
        const suggestion: WritingSuggestion = {
          text: 'text',
          confidence: 0.9,
          type,
        }
        expect(suggestion.type).toBe(type)
      })
    })
  })

  describe('WritingSuggestionOptions', () => {
    it('accepts all optional fields', () => {
      const options: WritingSuggestionOptions = {
        maxLength: 100,
        style: 'medium',
        temperature: 0.7,
      }
      expect(options.maxLength).toBe(100)
      expect(options.style).toBe('medium')
      expect(options.temperature).toBe(0.7)
    })
  })
})

// ============================================================================
// Defaults validation
// ============================================================================

describe('defaults are valid', () => {
  it('DEFAULT_AI_PREFERENCES has all features disabled by default', () => {
    expect(DEFAULT_AI_PREFERENCES.vision.enabled).toBe(false)
    expect(DEFAULT_AI_PREFERENCES.rag.enabled).toBe(false)
    expect(DEFAULT_AI_PREFERENCES.writingAssistant.enabled).toBe(false)
    expect(DEFAULT_AI_PREFERENCES.imageGeneration.enabled).toBe(false)
  })

  it('trigger delay is in reasonable range', () => {
    const delay = DEFAULT_AI_PREFERENCES.writingAssistant.triggerDelay
    expect(delay).toBeGreaterThanOrEqual(300)
    expect(delay).toBeLessThanOrEqual(1000)
  })

  it('all boolean analysis features are boolean', () => {
    const features = DEFAULT_AI_PREFERENCES.vision.analysisFeatures
    expect(typeof features.aiCaption).toBe('boolean')
    expect(typeof features.screenshotDetection).toBe('boolean')
    expect(typeof features.exifExtraction).toBe('boolean')
    expect(typeof features.objectDetection).toBe('boolean')
  })
})

// ============================================================================
// Edge cases
// ============================================================================

describe('edge cases', () => {
  it('IMAGE_GENERATION_STYLES has 7 styles', () => {
    expect(IMAGE_GENERATION_STYLES.length).toBe(7)
  })

  it('DEFAULT_AI_PREFERENCES is not null or undefined', () => {
    expect(DEFAULT_AI_PREFERENCES).not.toBeNull()
    expect(DEFAULT_AI_PREFERENCES).not.toBeUndefined()
  })

  it('all styles have valid prompt prefixes', () => {
    IMAGE_GENERATION_STYLES.forEach((style) => {
      expect(style.promptPrefix).toBeTruthy()
      expect(style.promptPrefix.length).toBeGreaterThan(5)
    })
  })
})
