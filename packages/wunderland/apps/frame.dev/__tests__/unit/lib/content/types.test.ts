/**
 * Content Types Tests
 * @module __tests__/unit/lib/content/types.test
 *
 * Tests for content management type definitions and interfaces.
 */

import { describe, it, expect } from 'vitest'

import type {
  ContentSource,
  SyncOptions,
  SyncProgress,
  SyncResult,
  KnowledgeNodeType,
  KnowledgeTreeNode,
  StrandMetadata,
  StrandContent,
  SearchOptions,
  SemanticSearchOptions,
  SearchResult,
  ContentManager,
  ContentStore,
  ContentChange,
  ContentStats,
} from '@/lib/content/types'

// ============================================================================
// ContentSource Interface Tests
// ============================================================================

describe('ContentSource', () => {
  it('creates source with sqlite type', () => {
    const source: ContentSource = {
      type: 'sqlite',
      isOnline: false,
      lastSync: new Date(),
      pendingChanges: 0,
    }

    expect(source.type).toBe('sqlite')
    expect(source.isOnline).toBe(false)
  })

  it('creates source with github type', () => {
    const source: ContentSource = {
      type: 'github',
      isOnline: true,
      lastSync: null,
      pendingChanges: 0,
    }

    expect(source.type).toBe('github')
    expect(source.isOnline).toBe(true)
  })

  it('creates source with hybrid type', () => {
    const source: ContentSource = {
      type: 'hybrid',
      isOnline: true,
      lastSync: new Date(),
      pendingChanges: 5,
    }

    expect(source.type).toBe('hybrid')
    expect(source.pendingChanges).toBe(5)
  })

  it('creates source with filesystem type', () => {
    const source: ContentSource = {
      type: 'filesystem',
      isOnline: false,
      lastSync: null,
      pendingChanges: 0,
      strandCount: 150,
      displayPath: '/path/to/content',
    }

    expect(source.type).toBe('filesystem')
    expect(source.strandCount).toBe(150)
    expect(source.displayPath).toBe('/path/to/content')
  })

  it('creates source with bundled type', () => {
    const source: ContentSource = {
      type: 'bundled',
      isOnline: false,
      lastSync: null,
      pendingChanges: 0,
    }

    expect(source.type).toBe('bundled')
  })

  it('accepts all source types', () => {
    const types: ContentSource['type'][] = ['sqlite', 'github', 'hybrid', 'filesystem', 'bundled']

    types.forEach((type) => {
      const source: ContentSource = {
        type,
        isOnline: false,
        lastSync: null,
        pendingChanges: 0,
      }
      expect(source.type).toBe(type)
    })
  })

  it('lastSync can be Date or null', () => {
    const withDate: ContentSource = {
      type: 'sqlite',
      isOnline: false,
      lastSync: new Date('2025-01-01'),
      pendingChanges: 0,
    }
    expect(withDate.lastSync).toBeInstanceOf(Date)

    const withNull: ContentSource = {
      type: 'github',
      isOnline: true,
      lastSync: null,
      pendingChanges: 0,
    }
    expect(withNull.lastSync).toBeNull()
  })
})

// ============================================================================
// SyncOptions Interface Tests
// ============================================================================

describe('SyncOptions', () => {
  it('creates empty options', () => {
    const options: SyncOptions = {}
    expect(options.force).toBeUndefined()
    expect(options.weaves).toBeUndefined()
    expect(options.onProgress).toBeUndefined()
  })

  it('creates options with force flag', () => {
    const options: SyncOptions = {
      force: true,
    }
    expect(options.force).toBe(true)
  })

  it('creates options with weave filter', () => {
    const options: SyncOptions = {
      weaves: ['typescript', 'react'],
    }
    expect(options.weaves).toEqual(['typescript', 'react'])
  })

  it('creates options with progress callback', () => {
    const progressCallback = (progress: SyncProgress) => {
      // Handle progress
    }

    const options: SyncOptions = {
      onProgress: progressCallback,
    }
    expect(options.onProgress).toBe(progressCallback)
  })

  it('creates options with all fields', () => {
    const options: SyncOptions = {
      force: true,
      weaves: ['math'],
      onProgress: () => {},
    }

    expect(options.force).toBe(true)
    expect(options.weaves).toHaveLength(1)
    expect(options.onProgress).toBeDefined()
  })
})

// ============================================================================
// SyncProgress Interface Tests
// ============================================================================

describe('SyncProgress', () => {
  it('creates progress at preparing phase', () => {
    const progress: SyncProgress = {
      phase: 'preparing',
      current: 0,
      total: 100,
    }

    expect(progress.phase).toBe('preparing')
    expect(progress.current).toBe(0)
    expect(progress.total).toBe(100)
  })

  it('creates progress at fetching phase', () => {
    const progress: SyncProgress = {
      phase: 'fetching',
      current: 25,
      total: 100,
      currentItem: 'typescript/generics.md',
    }

    expect(progress.phase).toBe('fetching')
    expect(progress.currentItem).toBe('typescript/generics.md')
  })

  it('creates progress with byte tracking', () => {
    const progress: SyncProgress = {
      phase: 'processing',
      current: 50,
      total: 100,
      bytesProcessed: 1024 * 500,
      estimatedTotalBytes: 1024 * 1000,
    }

    expect(progress.bytesProcessed).toBe(512000)
    expect(progress.estimatedTotalBytes).toBe(1024000)
  })

  it('accepts all phase values', () => {
    const phases: SyncProgress['phase'][] = [
      'preparing',
      'fetching',
      'processing',
      'storing',
      'indexing',
      'complete',
    ]

    phases.forEach((phase, index) => {
      const progress: SyncProgress = {
        phase,
        current: index * 20,
        total: 100,
      }
      expect(progress.phase).toBe(phase)
    })
  })
})

// ============================================================================
// SyncResult Interface Tests
// ============================================================================

describe('SyncResult', () => {
  it('creates successful sync result', () => {
    const result: SyncResult = {
      success: true,
      strandsAdded: 10,
      strandsUpdated: 5,
      strandsRemoved: 2,
      duration: 1500,
    }

    expect(result.success).toBe(true)
    expect(result.strandsAdded).toBe(10)
    expect(result.strandsUpdated).toBe(5)
    expect(result.strandsRemoved).toBe(2)
    expect(result.duration).toBe(1500)
  })

  it('creates failed sync result with errors', () => {
    const result: SyncResult = {
      success: false,
      strandsAdded: 0,
      strandsUpdated: 0,
      strandsRemoved: 0,
      duration: 500,
      errors: ['Network timeout', 'Auth failed'],
    }

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(2)
    expect(result.errors![0]).toBe('Network timeout')
  })

  it('creates empty successful sync', () => {
    const result: SyncResult = {
      success: true,
      strandsAdded: 0,
      strandsUpdated: 0,
      strandsRemoved: 0,
      duration: 100,
    }

    expect(result.success).toBe(true)
    expect(result.strandsAdded + result.strandsUpdated + result.strandsRemoved).toBe(0)
  })
})

// ============================================================================
// KnowledgeNodeType Tests
// ============================================================================

describe('KnowledgeNodeType', () => {
  it('accepts fabric value', () => {
    const type: KnowledgeNodeType = 'fabric'
    expect(type).toBe('fabric')
  })

  it('accepts weave value', () => {
    const type: KnowledgeNodeType = 'weave'
    expect(type).toBe('weave')
  })

  it('accepts loom value', () => {
    const type: KnowledgeNodeType = 'loom'
    expect(type).toBe('loom')
  })

  it('accepts strand value', () => {
    const type: KnowledgeNodeType = 'strand'
    expect(type).toBe('strand')
  })
})

// ============================================================================
// KnowledgeTreeNode Interface Tests
// ============================================================================

describe('KnowledgeTreeNode', () => {
  it('creates minimal node', () => {
    const node: KnowledgeTreeNode = {
      id: 'node-1',
      type: 'weave',
      slug: 'typescript',
      name: 'TypeScript',
      path: '/typescript',
    }

    expect(node.id).toBe('node-1')
    expect(node.type).toBe('weave')
    expect(node.slug).toBe('typescript')
  })

  it('creates node with description', () => {
    const node: KnowledgeTreeNode = {
      id: 'node-2',
      type: 'loom',
      slug: 'generics',
      name: 'Generics',
      path: '/typescript/generics',
      description: 'Learn about TypeScript generics',
    }

    expect(node.description).toBe('Learn about TypeScript generics')
  })

  it('creates node with children', () => {
    const child: KnowledgeTreeNode = {
      id: 'child-1',
      type: 'strand',
      slug: 'intro',
      name: 'Introduction',
      path: '/typescript/intro',
    }

    const parent: KnowledgeTreeNode = {
      id: 'parent-1',
      type: 'weave',
      slug: 'typescript',
      name: 'TypeScript',
      path: '/typescript',
      children: [child],
    }

    expect(parent.children).toHaveLength(1)
    expect(parent.children![0].slug).toBe('intro')
  })

  it('creates node with strand count', () => {
    const node: KnowledgeTreeNode = {
      id: 'node-3',
      type: 'weave',
      slug: 'react',
      name: 'React',
      path: '/react',
      strandCount: 25,
    }

    expect(node.strandCount).toBe(25)
  })

  it('creates node with metadata', () => {
    const node: KnowledgeTreeNode = {
      id: 'node-4',
      type: 'strand',
      slug: 'hooks',
      name: 'React Hooks',
      path: '/react/hooks',
      metadata: {
        difficulty: 'intermediate',
        status: 'published',
        tags: ['react', 'hooks', 'state'],
      },
    }

    expect(node.metadata!.difficulty).toBe('intermediate')
    expect(node.metadata!.status).toBe('published')
    expect(node.metadata!.tags).toContain('hooks')
  })

  it('creates deeply nested tree', () => {
    const strand: KnowledgeTreeNode = {
      id: 'strand-1',
      type: 'strand',
      slug: 'type-guards',
      name: 'Type Guards',
      path: '/ts/advanced/type-guards',
    }

    const loom: KnowledgeTreeNode = {
      id: 'loom-1',
      type: 'loom',
      slug: 'advanced',
      name: 'Advanced TypeScript',
      path: '/ts/advanced',
      children: [strand],
    }

    const weave: KnowledgeTreeNode = {
      id: 'weave-1',
      type: 'weave',
      slug: 'ts',
      name: 'TypeScript',
      path: '/ts',
      children: [loom],
    }

    const fabric: KnowledgeTreeNode = {
      id: 'fabric-1',
      type: 'fabric',
      slug: 'programming',
      name: 'Programming',
      path: '/',
      children: [weave],
    }

    expect(fabric.children![0].children![0].children![0].slug).toBe('type-guards')
  })
})

// ============================================================================
// StrandMetadata Interface Tests
// ============================================================================

describe('StrandMetadata', () => {
  it('creates empty metadata', () => {
    const meta: StrandMetadata = {}
    expect(meta).toEqual({})
  })

  it('creates metadata with basic fields', () => {
    const meta: StrandMetadata = {
      id: 'strand-123',
      slug: 'intro-to-ts',
      title: 'Introduction to TypeScript',
      version: '1.0.0',
      contentType: 'tutorial',
    }

    expect(meta.id).toBe('strand-123')
    expect(meta.title).toBe('Introduction to TypeScript')
  })

  it('creates metadata with summary and skills', () => {
    const meta: StrandMetadata = {
      summary: 'Learn the basics of TypeScript',
      skills: ['typing', 'interfaces', 'generics'],
    }

    expect(meta.summary).toBeDefined()
    expect(meta.skills).toHaveLength(3)
  })

  it('creates metadata with string notes', () => {
    const meta: StrandMetadata = {
      notes: 'This is a beginner-friendly guide',
    }

    expect(meta.notes).toBe('This is a beginner-friendly guide')
  })

  it('creates metadata with array notes', () => {
    const meta: StrandMetadata = {
      notes: ['Note 1', 'Note 2', 'Note 3'],
    }

    expect(meta.notes).toHaveLength(3)
  })

  it('creates metadata with simple string difficulty', () => {
    const meta: StrandMetadata = {
      difficulty: 'intermediate',
    }

    expect(meta.difficulty).toBe('intermediate')
  })

  it('creates metadata with number difficulty', () => {
    const meta: StrandMetadata = {
      difficulty: 3,
    }

    expect(meta.difficulty).toBe(3)
  })

  it('creates metadata with complex difficulty object', () => {
    const meta: StrandMetadata = {
      difficulty: {
        overall: 'advanced',
        cognitive: 4,
        prerequisites: 3,
        conceptual: 5,
      },
    }

    expect(typeof meta.difficulty).toBe('object')
    if (typeof meta.difficulty === 'object') {
      expect(meta.difficulty.overall).toBe('advanced')
      expect(meta.difficulty.cognitive).toBe(4)
    }
  })

  it('creates metadata with simple taxonomy', () => {
    const meta: StrandMetadata = {
      taxonomy: {
        subject: 'Programming',
        topic: 'TypeScript',
        subtopic: 'Generics',
      },
    }

    expect(meta.taxonomy!.subject).toBe('Programming')
    expect(meta.taxonomy!.topic).toBe('TypeScript')
  })

  it('creates metadata with extended taxonomy', () => {
    const meta: StrandMetadata = {
      taxonomy: {
        subjects: ['Computer Science', 'Programming'],
        topics: ['TypeScript', 'JavaScript'],
        concepts: [
          { name: 'Types', weight: 0.8 },
          { name: 'Generics', weight: 0.6 },
        ],
      },
    }

    expect(meta.taxonomy!.subjects).toHaveLength(2)
    expect(meta.taxonomy!.concepts![0].weight).toBe(0.8)
  })

  it('creates metadata with simple relationships', () => {
    const meta: StrandMetadata = {
      relationships: {
        prerequisites: ['/ts/basics'],
        references: ['/ts/advanced'],
        seeAlso: ['/js/es6'],
      },
    }

    expect((meta.relationships as any).prerequisites).toHaveLength(1)
  })

  it('creates metadata with typed relationships', () => {
    const meta: StrandMetadata = {
      relationships: [
        { type: 'follows', target: '/ts/basics' },
        { type: 'extends', target: '/ts/advanced', bidirectional: true },
        { type: 'contrasts', target: '/js/types' },
      ],
    }

    expect(Array.isArray(meta.relationships)).toBe(true)
  })

  it('creates metadata with publishing info', () => {
    const meta: StrandMetadata = {
      publishing: {
        status: 'published',
        license: 'MIT',
        lastUpdated: '2025-01-01',
      },
    }

    expect(meta.publishing!.status).toBe('published')
    expect(meta.publishing!.license).toBe('MIT')
  })

  it('creates metadata with SEO settings', () => {
    const meta: StrandMetadata = {
      seo: {
        index: true,
        follow: true,
        metaDescription: 'Learn TypeScript generics',
        canonicalUrl: 'https://example.com/ts/generics',
        sitemapPriority: 0.8,
      },
    }

    expect(meta.seo!.index).toBe(true)
    expect(meta.seo!.sitemapPriority).toBe(0.8)
  })

  it('creates metadata with reader settings', () => {
    const meta: StrandMetadata = {
      readerSettings: {
        illustrationMode: 'per-block',
      },
    }

    expect(meta.readerSettings!.illustrationMode).toBe('per-block')
  })

  it('creates metadata with string tags', () => {
    const meta: StrandMetadata = {
      tags: 'typescript',
    }

    expect(meta.tags).toBe('typescript')
  })

  it('creates metadata with array tags', () => {
    const meta: StrandMetadata = {
      tags: ['typescript', 'generics', 'advanced'],
    }

    expect(meta.tags).toHaveLength(3)
  })

  it('accepts arbitrary additional fields', () => {
    const meta: StrandMetadata = {
      title: 'Test',
      customField: 'custom value',
      anotherField: { nested: true },
    }

    expect(meta.customField).toBe('custom value')
    expect(meta.anotherField).toEqual({ nested: true })
  })
})

// ============================================================================
// StrandContent Interface Tests
// ============================================================================

describe('StrandContent', () => {
  it('creates minimal strand content', () => {
    const strand: StrandContent = {
      id: 'strand-1',
      path: '/ts/intro',
      slug: 'intro',
      title: 'Introduction',
      content: '# Introduction\n\nWelcome to TypeScript.',
      frontmatter: {},
      weave: 'typescript',
      wordCount: 10,
      lastModified: '2025-01-01T00:00:00Z',
    }

    expect(strand.id).toBe('strand-1')
    expect(strand.path).toBe('/ts/intro')
    expect(strand.wordCount).toBe(10)
  })

  it('creates strand with all fields', () => {
    const strand: StrandContent = {
      id: 'strand-full',
      path: '/ts/generics/intro',
      slug: 'intro',
      title: 'Introduction to Generics',
      content: '# Generics\n\nGenerics allow...',
      frontmatter: { difficulty: 'intermediate' },
      weave: 'typescript',
      loom: 'generics',
      wordCount: 500,
      summary: 'Learn about TypeScript generics',
      lastModified: '2025-01-15T12:00:00Z',
      githubUrl: 'https://github.com/user/repo/blob/main/ts/generics/intro.md',
    }

    expect(strand.loom).toBe('generics')
    expect(strand.summary).toBeDefined()
    expect(strand.githubUrl).toContain('github.com')
  })
})

// ============================================================================
// SearchOptions Interface Tests
// ============================================================================

describe('SearchOptions', () => {
  it('creates empty search options', () => {
    const options: SearchOptions = {}
    expect(options).toEqual({})
  })

  it('creates options with limit and offset', () => {
    const options: SearchOptions = {
      limit: 20,
      offset: 40,
    }

    expect(options.limit).toBe(20)
    expect(options.offset).toBe(40)
  })

  it('creates options with filters', () => {
    const options: SearchOptions = {
      weave: 'typescript',
      loom: 'generics',
      difficulty: 'advanced',
      status: 'published',
      tags: ['types', 'generics'],
    }

    expect(options.weave).toBe('typescript')
    expect(options.status).toBe('published')
    expect(options.tags).toHaveLength(2)
  })

  it('creates options with content inclusion', () => {
    const options: SearchOptions = {
      includeContent: true,
    }

    expect(options.includeContent).toBe(true)
  })
})

// ============================================================================
// SemanticSearchOptions Interface Tests
// ============================================================================

describe('SemanticSearchOptions', () => {
  it('extends SearchOptions', () => {
    const options: SemanticSearchOptions = {
      limit: 10,
      weave: 'react',
      minScore: 0.7,
    }

    expect(options.limit).toBe(10)
    expect(options.weave).toBe('react')
    expect(options.minScore).toBe(0.7)
  })

  it('creates options with hybrid search', () => {
    const options: SemanticSearchOptions = {
      hybrid: true,
      semanticWeight: 0.8,
    }

    expect(options.hybrid).toBe(true)
    expect(options.semanticWeight).toBe(0.8)
  })

  it('minScore ranges from 0 to 1', () => {
    const lowScore: SemanticSearchOptions = { minScore: 0 }
    expect(lowScore.minScore).toBe(0)

    const highScore: SemanticSearchOptions = { minScore: 1 }
    expect(highScore.minScore).toBe(1)
  })

  it('semanticWeight ranges from 0 to 1', () => {
    const allLexical: SemanticSearchOptions = { semanticWeight: 0 }
    expect(allLexical.semanticWeight).toBe(0)

    const allSemantic: SemanticSearchOptions = { semanticWeight: 1 }
    expect(allSemantic.semanticWeight).toBe(1)
  })
})

// ============================================================================
// SearchResult Interface Tests
// ============================================================================

describe('SearchResult', () => {
  it('creates minimal search result', () => {
    const result: SearchResult = {
      docId: 'doc-1',
      path: '/ts/intro',
      title: 'Introduction',
      combinedScore: 0.85,
    }

    expect(result.docId).toBe('doc-1')
    expect(result.combinedScore).toBe(0.85)
  })

  it('creates result with all fields', () => {
    const result: SearchResult = {
      docId: 'doc-full',
      path: '/ts/generics',
      title: 'TypeScript Generics',
      summary: 'Learn about generics',
      excerpt: 'Generics allow you to write...',
      weave: 'typescript',
      loom: 'advanced',
      tags: ['generics', 'advanced'],
      bm25Score: 0.75,
      semanticScore: 0.92,
      combinedScore: 0.88,
    }

    expect(result.summary).toBeDefined()
    expect(result.excerpt).toBeDefined()
    expect(result.bm25Score).toBe(0.75)
    expect(result.semanticScore).toBe(0.92)
  })
})

// ============================================================================
// ContentChange Interface Tests
// ============================================================================

describe('ContentChange', () => {
  it('creates add change', () => {
    const change: ContentChange = {
      type: 'add',
      path: '/ts/new-file.md',
      sha: 'abc123',
      timestamp: '2025-01-01T00:00:00Z',
    }

    expect(change.type).toBe('add')
    expect(change.sha).toBe('abc123')
  })

  it('creates update change', () => {
    const change: ContentChange = {
      type: 'update',
      path: '/ts/existing.md',
      sha: 'def456',
      timestamp: '2025-01-02T00:00:00Z',
    }

    expect(change.type).toBe('update')
  })

  it('creates delete change', () => {
    const change: ContentChange = {
      type: 'delete',
      path: '/ts/removed.md',
      timestamp: '2025-01-03T00:00:00Z',
    }

    expect(change.type).toBe('delete')
    expect(change.sha).toBeUndefined()
  })
})

// ============================================================================
// ContentStats Interface Tests
// ============================================================================

describe('ContentStats', () => {
  it('creates content statistics', () => {
    const stats: ContentStats = {
      fabrics: 1,
      weaves: 5,
      looms: 20,
      strands: 150,
      totalWordCount: 75000,
      embeddings: 300,
      lastSync: new Date('2025-01-01'),
    }

    expect(stats.fabrics).toBe(1)
    expect(stats.weaves).toBe(5)
    expect(stats.looms).toBe(20)
    expect(stats.strands).toBe(150)
    expect(stats.totalWordCount).toBe(75000)
  })

  it('creates stats with null lastSync', () => {
    const stats: ContentStats = {
      fabrics: 0,
      weaves: 0,
      looms: 0,
      strands: 0,
      totalWordCount: 0,
      embeddings: 0,
      lastSync: null,
    }

    expect(stats.lastSync).toBeNull()
  })
})

// ============================================================================
// ContentManager Interface Tests
// ============================================================================

describe('ContentManager interface', () => {
  it('defines required methods', () => {
    // This is a type-level test - we're just checking the interface shape
    type RequiredMethods = keyof ContentManager
    const methods: RequiredMethods[] = [
      'getSource',
      'isOffline',
      'canSync',
      'getKnowledgeTree',
      'getStrand',
      'getStrands',
      'getWeaveStrands',
      'getLoomStrands',
      'getWeave',
      'getLoom',
      'searchStrands',
      'semanticSearch',
      'hybridSearch',
      'sync',
      'checkForUpdates',
      'getSyncStatus',
      'initialize',
      'close',
    ]

    expect(methods).toContain('getSource')
    expect(methods).toContain('searchStrands')
    expect(methods).toContain('sync')
  })
})

// ============================================================================
// ContentStore Interface Tests
// ============================================================================

describe('ContentStore interface', () => {
  it('extends ContentManager', () => {
    // ContentStore extends ContentManager, so it should have all ContentManager methods plus write operations
    type ContentStoreWriteMethods = Exclude<keyof ContentStore, keyof ContentManager>
    const writeMethods: ContentStoreWriteMethods[] = [
      'upsertFabric',
      'upsertWeave',
      'upsertLoom',
      'upsertStrand',
      'deleteStrand',
      'updateSyncStatus',
      'storeEmbedding',
      'getAllEmbeddings',
      'clearEmbeddings',
      'bulkImportStrands',
      'clearAllContent',
      'rebuildSearchIndex',
    ]

    expect(writeMethods).toContain('upsertStrand')
    expect(writeMethods).toContain('bulkImportStrands')
    expect(writeMethods).toContain('storeEmbedding')
  })
})

// ============================================================================
// Integration Pattern Tests
// ============================================================================

describe('integration patterns', () => {
  it('knowledge tree structure is valid', () => {
    const fabric: KnowledgeTreeNode = {
      id: 'fabric-1',
      type: 'fabric',
      slug: 'main',
      name: 'Main Fabric',
      path: '/',
      children: [
        {
          id: 'weave-1',
          type: 'weave',
          slug: 'typescript',
          name: 'TypeScript',
          path: '/typescript',
          strandCount: 25,
          children: [
            {
              id: 'loom-1',
              type: 'loom',
              slug: 'basics',
              name: 'Basics',
              path: '/typescript/basics',
              children: [
                {
                  id: 'strand-1',
                  type: 'strand',
                  slug: 'intro',
                  name: 'Introduction',
                  path: '/typescript/basics/intro',
                },
              ],
            },
          ],
        },
      ],
    }

    // Validate tree structure
    expect(fabric.type).toBe('fabric')
    expect(fabric.children![0].type).toBe('weave')
    expect(fabric.children![0].children![0].type).toBe('loom')
    expect(fabric.children![0].children![0].children![0].type).toBe('strand')
  })

  it('sync workflow produces valid result', () => {
    // Simulate sync progress updates
    const progressUpdates: SyncProgress[] = [
      { phase: 'preparing', current: 0, total: 100 },
      { phase: 'fetching', current: 10, total: 100, currentItem: 'file1.md' },
      { phase: 'processing', current: 50, total: 100 },
      { phase: 'storing', current: 80, total: 100 },
      { phase: 'indexing', current: 95, total: 100 },
      { phase: 'complete', current: 100, total: 100 },
    ]

    // Simulate final result
    const result: SyncResult = {
      success: true,
      strandsAdded: 10,
      strandsUpdated: 5,
      strandsRemoved: 0,
      duration: 5000,
    }

    // Progress should end at complete
    expect(progressUpdates[progressUpdates.length - 1].phase).toBe('complete')

    // Result should reflect changes
    expect(result.strandsAdded + result.strandsUpdated).toBe(15)
  })

  it('search result ordering', () => {
    const results: SearchResult[] = [
      { docId: '1', path: '/a', title: 'A', combinedScore: 0.95 },
      { docId: '2', path: '/b', title: 'B', combinedScore: 0.85 },
      { docId: '3', path: '/c', title: 'C', combinedScore: 0.75 },
    ]

    // Results should be ordered by combinedScore
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].combinedScore).toBeGreaterThanOrEqual(results[i].combinedScore)
    }
  })

  it('strand content with rich metadata', () => {
    const strand: StrandContent = {
      id: 'rich-strand',
      path: '/ts/advanced/conditional-types',
      slug: 'conditional-types',
      title: 'Conditional Types in TypeScript',
      content: '# Conditional Types\n\nConditional types select...',
      frontmatter: {
        title: 'Conditional Types',
        difficulty: {
          overall: 'advanced',
          cognitive: 5,
          prerequisites: 4,
          conceptual: 5,
        },
        taxonomy: {
          subject: 'Programming',
          topic: 'TypeScript',
          subtopic: 'Advanced Types',
        },
        relationships: [
          { type: 'follows', target: '/ts/generics' },
          { type: 'extends', target: '/ts/mapped-types' },
        ],
        tags: ['typescript', 'advanced', 'types'],
      },
      weave: 'typescript',
      loom: 'advanced',
      wordCount: 1500,
      summary: 'Deep dive into TypeScript conditional types',
      lastModified: '2025-01-15T00:00:00Z',
    }

    expect(strand.frontmatter.difficulty).toBeDefined()
    expect(strand.frontmatter.taxonomy).toBeDefined()
    expect(Array.isArray(strand.frontmatter.relationships)).toBe(true)
  })
})
