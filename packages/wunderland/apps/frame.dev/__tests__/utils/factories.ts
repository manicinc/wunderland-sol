/**
 * Test Factories
 * @description Factory functions for creating test data and mock objects
 */

import type {
  TaxonomyHierarchyConfig,
  TaxonomyLevel,
  TaxonomyCheckResult,
  TaxonomyChange,
} from '@/lib/taxonomy'

/**
 * Create a TaxonomyHierarchyConfig with defaults and overrides
 */
export function createTaxonomyConfig(
  overrides?: Partial<TaxonomyHierarchyConfig>
): TaxonomyHierarchyConfig {
  return {
    maxSubjectsPerDoc: 2,
    maxTopicsPerDoc: 5,
    maxTagsPerDoc: 15,
    maxTotalSubjects: 20,
    maxTotalTopics: 100,
    levenshteinThreshold: 2,
    substringMinLength: 4,
    enforceOnSave: true,
    enforceOnImport: true,
    autoPromoteToSubject: false,
    autoDemoteToTopic: false,
    enablePhoneticMatching: true,
    enableNgramMatching: true,
    ngramThreshold: 0.6,
    enableAcronymExpansion: true,
    enablePluralNormalization: true,
    enableCompoundDecomposition: true,
    similarityScoreThreshold: 0.7,
    ...overrides,
  }
}

/**
 * Create a TaxonomyCheckResult
 */
export function createTaxonomyCheckResult(
  overrides?: Partial<TaxonomyCheckResult>
): TaxonomyCheckResult {
  return {
    level: 'tag' as TaxonomyLevel,
    reasoning: 'Test result',
    ...overrides,
  }
}

/**
 * Create a TaxonomyChange for testing reclassification
 */
export function createTaxonomyChange(
  overrides?: Partial<TaxonomyChange>
): TaxonomyChange {
  return {
    strandPath: '/test/strand',
    field: 'tags',
    action: 'keep',
    term: 'test-term',
    reason: 'Test change',
    ...overrides,
  }
}

/**
 * Strand metadata factory
 */
export interface StrandMetadata {
  title: string
  slug: string
  description?: string
  taxonomy?: {
    subjects?: string[]
    topics?: string[]
  }
  tags?: string[]
  createdAt: string
  updatedAt: string
  author?: string
  status?: 'draft' | 'published' | 'archived'
}

export function createStrandMetadata(
  overrides?: Partial<StrandMetadata>
): StrandMetadata {
  const now = new Date().toISOString()
  return {
    title: 'Test Strand',
    slug: 'test-strand',
    description: 'A test strand for unit testing',
    taxonomy: {
      subjects: [],
      topics: [],
    },
    tags: [],
    createdAt: now,
    updatedAt: now,
    author: 'test-user',
    status: 'draft',
    ...overrides,
  }
}

/**
 * Glossary edit factory
 */
export interface GlossaryEdit {
  id: string
  contentHash: string
  strandSlug?: string
  originalTerm: string
  editedTerm?: string
  definition?: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
}

export function createGlossaryEdit(
  overrides?: Partial<GlossaryEdit>
): GlossaryEdit {
  const now = new Date().toISOString()
  return {
    id: `edit-${Math.random().toString(36).substring(7)}`,
    contentHash: `hash-${Math.random().toString(36).substring(7)}`,
    originalTerm: 'test term',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/**
 * User factory
 */
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: string
}

export function createUser(overrides?: Partial<User>): User {
  return {
    id: `user-${Math.random().toString(36).substring(7)}`,
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Job factory
 */
export interface Job {
  id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  payload: Record<string, unknown>
  progress: number
  createdAt: string
  updatedAt: string
  completedAt?: string
  error?: string
}

export function createJob(overrides?: Partial<Job>): Job {
  const now = new Date().toISOString()
  return {
    id: `job-${Math.random().toString(36).substring(7)}`,
    type: 'test-job',
    status: 'pending',
    payload: {},
    progress: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}
