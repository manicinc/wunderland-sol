/**
 * Flashcard Worker Types Tests
 * @module __tests__/unit/lib/flashcards/workerTypes.test
 *
 * Tests for flashcard generation worker type definitions and interfaces.
 */

import { describe, it, expect } from 'vitest'

import type {
  FlashcardAlgorithm,
  FlashcardDifficulty,
  FlashcardStage,
  GeneratedFlashcard,
  ExtractedConcept,
  FlashcardTask,
  FlashcardResult,
  FlashcardProgress,
  FlashcardWorkerMessage,
  FlashcardWorkerResponse,
  DefinitionPattern,
  ClozeDeletion,
} from '@/lib/flashcards/workerTypes'

// ============================================================================
// FlashcardAlgorithm Type Tests
// ============================================================================

describe('FlashcardAlgorithm', () => {
  it('accepts bert value', () => {
    const algo: FlashcardAlgorithm = 'bert'
    expect(algo).toBe('bert')
  })

  it('accepts nlp value', () => {
    const algo: FlashcardAlgorithm = 'nlp'
    expect(algo).toBe('nlp')
  })

  it('accepts hybrid value', () => {
    const algo: FlashcardAlgorithm = 'hybrid'
    expect(algo).toBe('hybrid')
  })
})

// ============================================================================
// FlashcardDifficulty Type Tests
// ============================================================================

describe('FlashcardDifficulty', () => {
  it('accepts easy value', () => {
    const diff: FlashcardDifficulty = 'easy'
    expect(diff).toBe('easy')
  })

  it('accepts medium value', () => {
    const diff: FlashcardDifficulty = 'medium'
    expect(diff).toBe('medium')
  })

  it('accepts hard value', () => {
    const diff: FlashcardDifficulty = 'hard'
    expect(diff).toBe('hard')
  })
})

// ============================================================================
// FlashcardStage Type Tests
// ============================================================================

describe('FlashcardStage', () => {
  const stages: FlashcardStage[] = [
    'initializing',
    'loading_model',
    'chunking',
    'computing_embeddings',
    'extracting_concepts',
    'generating_cards',
    'deduplicating',
    'complete',
  ]

  it('includes all expected stages', () => {
    expect(stages).toHaveLength(8)
  })

  it('has initializing as first stage', () => {
    expect(stages[0]).toBe('initializing')
  })

  it('has complete as final stage', () => {
    expect(stages[stages.length - 1]).toBe('complete')
  })

  it.each(stages)('accepts %s as valid stage', (stage) => {
    const s: FlashcardStage = stage
    expect(s).toBe(stage)
  })
})

// ============================================================================
// GeneratedFlashcard Interface Tests
// ============================================================================

describe('GeneratedFlashcard', () => {
  it('creates minimal flashcard with required fields', () => {
    const card: GeneratedFlashcard = {
      id: 'fc-123',
      front: 'What is TypeScript?',
      back: 'A typed superset of JavaScript',
      difficulty: 'medium',
      confidence: 0.85,
      method: 'question',
    }

    expect(card.id).toBe('fc-123')
    expect(card.front).toBeDefined()
    expect(card.back).toBeDefined()
    expect(card.difficulty).toBe('medium')
    expect(card.confidence).toBe(0.85)
    expect(card.method).toBe('question')
  })

  it('creates flashcard with optional tags', () => {
    const card: GeneratedFlashcard = {
      id: 'fc-456',
      front: 'Define monorepo',
      back: 'A repository containing multiple projects',
      difficulty: 'easy',
      tags: ['architecture', 'git'],
      confidence: 0.9,
      method: 'definition',
    }

    expect(card.tags).toEqual(['architecture', 'git'])
  })

  it('creates flashcard with source text', () => {
    const card: GeneratedFlashcard = {
      id: 'fc-789',
      front: 'Explain cloze deletion',
      back: 'A learning technique using fill-in-the-blank',
      difficulty: 'hard',
      sourceText: 'Cloze deletion is a learning technique...',
      confidence: 0.75,
      method: 'cloze',
    }

    expect(card.sourceText).toBeDefined()
    expect(card.method).toBe('cloze')
  })

  it('accepts all method types', () => {
    const methods: GeneratedFlashcard['method'][] = ['definition', 'cloze', 'concept', 'question']

    methods.forEach((method) => {
      const card: GeneratedFlashcard = {
        id: `fc-${method}`,
        front: 'Test',
        back: 'Answer',
        difficulty: 'medium',
        confidence: 0.5,
        method,
      }
      expect(card.method).toBe(method)
    })
  })

  it('accepts confidence from 0 to 1', () => {
    const lowConfidence: GeneratedFlashcard = {
      id: 'fc-low',
      front: 'Q',
      back: 'A',
      difficulty: 'easy',
      confidence: 0,
      method: 'question',
    }
    expect(lowConfidence.confidence).toBe(0)

    const highConfidence: GeneratedFlashcard = {
      id: 'fc-high',
      front: 'Q',
      back: 'A',
      difficulty: 'hard',
      confidence: 1,
      method: 'question',
    }
    expect(highConfidence.confidence).toBe(1)
  })
})

// ============================================================================
// ExtractedConcept Interface Tests
// ============================================================================

describe('ExtractedConcept', () => {
  it('creates concept with required fields', () => {
    const concept: ExtractedConcept = {
      term: 'TypeScript',
      definition: 'A typed programming language',
      context: 'TypeScript extends JavaScript with types...',
      importance: 0.9,
    }

    expect(concept.term).toBe('TypeScript')
    expect(concept.definition).toBeDefined()
    expect(concept.context).toBeDefined()
    expect(concept.importance).toBe(0.9)
  })

  it('creates concept with optional embedding', () => {
    const embedding = new Float32Array([0.1, 0.2, 0.3])
    const concept: ExtractedConcept = {
      term: 'BERT',
      definition: 'Bidirectional Encoder Representations from Transformers',
      context: 'BERT is a transformer model...',
      embedding,
      importance: 0.95,
    }

    expect(concept.embedding).toEqual(embedding)
    expect(concept.embedding?.length).toBe(3)
  })

  it('importance ranges from 0 to 1', () => {
    const lowImportance: ExtractedConcept = {
      term: 'test',
      definition: 'def',
      context: 'ctx',
      importance: 0,
    }
    expect(lowImportance.importance).toBe(0)

    const highImportance: ExtractedConcept = {
      term: 'test',
      definition: 'def',
      context: 'ctx',
      importance: 1,
    }
    expect(highImportance.importance).toBe(1)
  })
})

// ============================================================================
// FlashcardTask Interface Tests
// ============================================================================

describe('FlashcardTask', () => {
  it('creates minimal task with required fields', () => {
    const task: FlashcardTask = {
      id: 'task-123',
      content: 'Learn about TypeScript generics...',
    }

    expect(task.id).toBe('task-123')
    expect(task.content).toBeDefined()
  })

  it('creates task with all optional fields', () => {
    const task: FlashcardTask = {
      id: 'task-full',
      content: 'TypeScript is a programming language...',
      title: 'TypeScript Introduction',
      algorithm: 'hybrid',
      maxCards: 10,
      difficulty: 'mixed',
      topics: ['types', 'generics'],
      includeTags: true,
      cacheKey: 'ts-intro-v1',
      strandPath: '/notes/typescript.md',
      minConfidence: 0.7,
    }

    expect(task.title).toBe('TypeScript Introduction')
    expect(task.algorithm).toBe('hybrid')
    expect(task.maxCards).toBe(10)
    expect(task.difficulty).toBe('mixed')
    expect(task.topics).toEqual(['types', 'generics'])
    expect(task.includeTags).toBe(true)
    expect(task.cacheKey).toBe('ts-intro-v1')
    expect(task.strandPath).toBe('/notes/typescript.md')
    expect(task.minConfidence).toBe(0.7)
  })

  it('accepts all algorithm values', () => {
    const algorithms: FlashcardAlgorithm[] = ['bert', 'nlp', 'hybrid']

    algorithms.forEach((algo) => {
      const task: FlashcardTask = {
        id: `task-${algo}`,
        content: 'Test content',
        algorithm: algo,
      }
      expect(task.algorithm).toBe(algo)
    })
  })

  it('accepts all difficulty values including mixed', () => {
    const difficulties = ['easy', 'medium', 'hard', 'mixed'] as const

    difficulties.forEach((diff) => {
      const task: FlashcardTask = {
        id: `task-${diff}`,
        content: 'Test content',
        difficulty: diff,
      }
      expect(task.difficulty).toBe(diff)
    })
  })
})

// ============================================================================
// FlashcardResult Interface Tests
// ============================================================================

describe('FlashcardResult', () => {
  it('creates minimal result with required fields', () => {
    const result: FlashcardResult = {
      taskId: 'task-123',
      cards: [],
      algorithm: 'nlp',
      durationMs: 150,
      cached: false,
    }

    expect(result.taskId).toBe('task-123')
    expect(result.cards).toEqual([])
    expect(result.algorithm).toBe('nlp')
    expect(result.durationMs).toBe(150)
    expect(result.cached).toBe(false)
  })

  it('creates result with cards', () => {
    const cards: GeneratedFlashcard[] = [
      {
        id: 'fc-1',
        front: 'Q1',
        back: 'A1',
        difficulty: 'easy',
        confidence: 0.9,
        method: 'question',
      },
      {
        id: 'fc-2',
        front: 'Q2',
        back: 'A2',
        difficulty: 'medium',
        confidence: 0.8,
        method: 'definition',
      },
    ]

    const result: FlashcardResult = {
      taskId: 'task-with-cards',
      cards,
      algorithm: 'bert',
      durationMs: 500,
      cached: false,
    }

    expect(result.cards).toHaveLength(2)
    expect(result.cards[0].front).toBe('Q1')
  })

  it('creates result with optional fields', () => {
    const concepts: ExtractedConcept[] = [
      { term: 'A', definition: 'B', context: 'C', importance: 0.5 },
    ]

    const result: FlashcardResult = {
      taskId: 'task-full',
      cards: [],
      concepts,
      algorithm: 'hybrid',
      durationMs: 1000,
      cached: true,
      modelLoadTimeMs: 250,
      duplicatesRemoved: 3,
    }

    expect(result.concepts).toEqual(concepts)
    expect(result.cached).toBe(true)
    expect(result.modelLoadTimeMs).toBe(250)
    expect(result.duplicatesRemoved).toBe(3)
  })
})

// ============================================================================
// FlashcardProgress Interface Tests
// ============================================================================

describe('FlashcardProgress', () => {
  it('creates minimal progress update', () => {
    const progress: FlashcardProgress = {
      taskId: 'task-123',
      progress: 50,
      stage: 'extracting_concepts',
      message: 'Extracting key concepts from content...',
    }

    expect(progress.taskId).toBe('task-123')
    expect(progress.progress).toBe(50)
    expect(progress.stage).toBe('extracting_concepts')
    expect(progress.message).toBeDefined()
  })

  it('creates progress with item counts', () => {
    const progress: FlashcardProgress = {
      taskId: 'task-456',
      progress: 75,
      stage: 'generating_cards',
      message: 'Generating flashcard 3 of 4...',
      currentItem: 3,
      totalItems: 4,
    }

    expect(progress.currentItem).toBe(3)
    expect(progress.totalItems).toBe(4)
  })

  it('progress ranges from 0 to 100', () => {
    const start: FlashcardProgress = {
      taskId: 'task',
      progress: 0,
      stage: 'initializing',
      message: 'Starting...',
    }
    expect(start.progress).toBe(0)

    const complete: FlashcardProgress = {
      taskId: 'task',
      progress: 100,
      stage: 'complete',
      message: 'Done!',
    }
    expect(complete.progress).toBe(100)
  })
})

// ============================================================================
// FlashcardWorkerMessage Type Tests
// ============================================================================

describe('FlashcardWorkerMessage', () => {
  it('creates generate message', () => {
    const msg: FlashcardWorkerMessage = {
      type: 'generate',
      task: {
        id: 'task-gen',
        content: 'Test content',
      },
    }

    expect(msg.type).toBe('generate')
    if (msg.type === 'generate') {
      expect(msg.task.id).toBe('task-gen')
    }
  })

  it('creates cancel message', () => {
    const msg: FlashcardWorkerMessage = {
      type: 'cancel',
      taskId: 'task-to-cancel',
    }

    expect(msg.type).toBe('cancel')
    if (msg.type === 'cancel') {
      expect(msg.taskId).toBe('task-to-cancel')
    }
  })

  it('creates preload_model message', () => {
    const msg: FlashcardWorkerMessage = {
      type: 'preload_model',
    }

    expect(msg.type).toBe('preload_model')
  })

  it('creates clear_cache message', () => {
    const msg: FlashcardWorkerMessage = {
      type: 'clear_cache',
    }

    expect(msg.type).toBe('clear_cache')
  })
})

// ============================================================================
// FlashcardWorkerResponse Type Tests
// ============================================================================

describe('FlashcardWorkerResponse', () => {
  it('creates progress response', () => {
    const msg: FlashcardWorkerResponse = {
      type: 'progress',
      data: {
        taskId: 'task-123',
        progress: 30,
        stage: 'chunking',
        message: 'Processing chunks...',
      },
    }

    expect(msg.type).toBe('progress')
    if (msg.type === 'progress') {
      expect(msg.data.progress).toBe(30)
    }
  })

  it('creates complete response', () => {
    const msg: FlashcardWorkerResponse = {
      type: 'complete',
      data: {
        taskId: 'task-done',
        cards: [],
        algorithm: 'nlp',
        durationMs: 200,
        cached: false,
      },
    }

    expect(msg.type).toBe('complete')
    if (msg.type === 'complete') {
      expect(msg.data.taskId).toBe('task-done')
    }
  })

  it('creates error response', () => {
    const msg: FlashcardWorkerResponse = {
      type: 'error',
      taskId: 'task-failed',
      error: 'Failed to load model',
    }

    expect(msg.type).toBe('error')
    if (msg.type === 'error') {
      expect(msg.error).toBe('Failed to load model')
    }
  })

  it('creates model_ready response', () => {
    const msg: FlashcardWorkerResponse = {
      type: 'model_ready',
      modelName: 'gte-small',
      loadTimeMs: 1500,
    }

    expect(msg.type).toBe('model_ready')
    if (msg.type === 'model_ready') {
      expect(msg.modelName).toBe('gte-small')
      expect(msg.loadTimeMs).toBe(1500)
    }
  })

  it('creates cache_cleared response', () => {
    const msg: FlashcardWorkerResponse = {
      type: 'cache_cleared',
    }

    expect(msg.type).toBe('cache_cleared')
  })
})

// ============================================================================
// DefinitionPattern Interface Tests
// ============================================================================

describe('DefinitionPattern', () => {
  it('creates definition pattern with required fields', () => {
    const pattern: DefinitionPattern = {
      term: 'TypeScript',
      definition: 'a typed superset of JavaScript',
      confidence: 0.85,
      patternType: 'is_a',
    }

    expect(pattern.term).toBe('TypeScript')
    expect(pattern.definition).toBeDefined()
    expect(pattern.confidence).toBe(0.85)
    expect(pattern.patternType).toBe('is_a')
  })

  it('accepts all pattern types', () => {
    const patternTypes: DefinitionPattern['patternType'][] = [
      'is_a',
      'refers_to',
      'defined_as',
      'means',
      'colon',
    ]

    patternTypes.forEach((type) => {
      const pattern: DefinitionPattern = {
        term: 'test',
        definition: 'test def',
        confidence: 0.5,
        patternType: type,
      }
      expect(pattern.patternType).toBe(type)
    })
  })

  it('confidence is a number between 0 and 1', () => {
    const lowConfidence: DefinitionPattern = {
      term: 'term',
      definition: 'def',
      confidence: 0.1,
      patternType: 'colon',
    }
    expect(lowConfidence.confidence).toBe(0.1)

    const highConfidence: DefinitionPattern = {
      term: 'term',
      definition: 'def',
      confidence: 0.99,
      patternType: 'means',
    }
    expect(highConfidence.confidence).toBe(0.99)
  })
})

// ============================================================================
// ClozeDeletion Interface Tests
// ============================================================================

describe('ClozeDeletion', () => {
  it('creates cloze deletion with required fields', () => {
    const cloze: ClozeDeletion = {
      sentence: 'TypeScript is a typed superset of JavaScript.',
      term: 'TypeScript',
      clozeText: '{{c1::TypeScript}} is a typed superset of JavaScript.',
      importance: 0.8,
    }

    expect(cloze.sentence).toBeDefined()
    expect(cloze.term).toBe('TypeScript')
    expect(cloze.clozeText).toContain('{{c1::')
    expect(cloze.importance).toBe(0.8)
  })

  it('importance ranges from 0 to 1', () => {
    const lowImportance: ClozeDeletion = {
      sentence: 'Test sentence.',
      term: 'Test',
      clozeText: '{{c1::Test}} sentence.',
      importance: 0,
    }
    expect(lowImportance.importance).toBe(0)

    const highImportance: ClozeDeletion = {
      sentence: 'Important concept here.',
      term: 'Important',
      clozeText: '{{c1::Important}} concept here.',
      importance: 1,
    }
    expect(highImportance.importance).toBe(1)
  })

  it('cloze text format is consistent', () => {
    const cloze: ClozeDeletion = {
      sentence: 'The sky is blue.',
      term: 'blue',
      clozeText: 'The sky is {{c1::blue}}.',
      importance: 0.5,
    }

    // clozeText should contain the term in cloze format
    expect(cloze.clozeText).toMatch(/\{\{c\d+::.*\}\}/)
  })
})

// ============================================================================
// Type Guard Tests
// ============================================================================

describe('type discrimination', () => {
  it('discriminates worker messages by type', () => {
    const messages: FlashcardWorkerMessage[] = [
      { type: 'generate', task: { id: '1', content: 'c' } },
      { type: 'cancel', taskId: '2' },
      { type: 'preload_model' },
      { type: 'clear_cache' },
    ]

    const generateMsgs = messages.filter((m) => m.type === 'generate')
    expect(generateMsgs).toHaveLength(1)

    const cancelMsgs = messages.filter((m) => m.type === 'cancel')
    expect(cancelMsgs).toHaveLength(1)
  })

  it('discriminates worker responses by type', () => {
    const responses: FlashcardWorkerResponse[] = [
      { type: 'progress', data: { taskId: '1', progress: 50, stage: 'chunking', message: 'm' } },
      { type: 'complete', data: { taskId: '2', cards: [], algorithm: 'nlp', durationMs: 100, cached: false } },
      { type: 'error', taskId: '3', error: 'err' },
      { type: 'model_ready', modelName: 'model', loadTimeMs: 500 },
      { type: 'cache_cleared' },
    ]

    const errorResponses = responses.filter((r) => r.type === 'error')
    expect(errorResponses).toHaveLength(1)

    const completeResponses = responses.filter((r) => r.type === 'complete')
    expect(completeResponses).toHaveLength(1)
  })
})

// ============================================================================
// Integration Pattern Tests
// ============================================================================

describe('integration patterns', () => {
  it('task flows from input to result', () => {
    const task: FlashcardTask = {
      id: 'integration-task',
      content: 'TypeScript adds types to JavaScript',
      title: 'TypeScript Basics',
      algorithm: 'hybrid',
      maxCards: 3,
    }

    const card: GeneratedFlashcard = {
      id: 'fc-result-1',
      front: 'What does TypeScript add to JavaScript?',
      back: 'Types',
      difficulty: 'easy',
      confidence: 0.92,
      method: 'question',
    }

    const result: FlashcardResult = {
      taskId: task.id,
      cards: [card],
      algorithm: task.algorithm!,
      durationMs: 350,
      cached: false,
    }

    expect(result.taskId).toBe(task.id)
    expect(result.cards[0].front).toBeDefined()
    expect(result.algorithm).toBe(task.algorithm)
  })

  it('progress updates during generation', () => {
    const task: FlashcardTask = {
      id: 'progress-task',
      content: 'Content',
    }

    const progressUpdates: FlashcardProgress[] = [
      { taskId: task.id, progress: 0, stage: 'initializing', message: 'Starting' },
      { taskId: task.id, progress: 25, stage: 'chunking', message: 'Splitting content' },
      { taskId: task.id, progress: 50, stage: 'extracting_concepts', message: 'Finding concepts' },
      { taskId: task.id, progress: 75, stage: 'generating_cards', message: 'Creating cards', currentItem: 2, totalItems: 3 },
      { taskId: task.id, progress: 100, stage: 'complete', message: 'Done' },
    ]

    // All updates should reference the same task
    progressUpdates.forEach((p) => {
      expect(p.taskId).toBe(task.id)
    })

    // Progress should increase
    for (let i = 1; i < progressUpdates.length; i++) {
      expect(progressUpdates[i].progress).toBeGreaterThanOrEqual(progressUpdates[i - 1].progress)
    }
  })
})
