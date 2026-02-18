// @ts-nocheck
/**
 * Questions Routes
 * 
 * API endpoints for suggested questions generation and retrieval.
 * 
 * @module lib/api/routes/questions
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { requireAuth } from '../auth/plugin'
import { 
  withCache, 
  generateCacheKey, 
  CacheTTL, 
  CachePrefix,
} from '../cache'
import {
  generateQuestionsFromContent,
  analyzeContent,
  parseFrontmatter,
  extractManualQuestions,
  prebuiltToGenerated,
  type GeneratedQuestion,
  type PrebuiltQuestion,
  type ContentAnalysis,
} from '@/lib/questions'
import * as fs from 'fs/promises'
import * as path from 'path'

// ============================================================================
// TYPES
// ============================================================================

interface PrebuiltEntry {
  source: 'manual' | 'auto'
  analysis?: ContentAnalysis
  questions: PrebuiltQuestion[]
}

interface SuggestedQuestionsData {
  generatedAt: string
  repo: string
  branch: string
  stats?: {
    total: number
    manual: number
    auto: number
  }
  questions: Record<string, PrebuiltEntry>
}

// Cache for prebuilt questions
let prebuiltCache: SuggestedQuestionsData | null = null
let prebuiltLoadTime = 0
const PREBUILT_CACHE_TTL = 60 * 1000 // 1 minute

// ============================================================================
// SCHEMAS
// ============================================================================

const questionSchema = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    type: { type: 'string', enum: ['definition', 'comparison', 'application', 'exploration', 'code', 'concept'] },
    confidence: { type: 'number' },
    source: { type: 'string' },
  }
}

const prebuiltQuestionSchema = {
  type: 'object',
  properties: {
    question: { type: 'string' },
    difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
    tags: { type: 'array', items: { type: 'string' } },
  }
}

const analysisSchema = {
  type: 'object',
  properties: {
    words: { type: 'number' },
    headings: { type: 'number' },
    codeBlocks: { type: 'number' },
    links: { type: 'number' },
    significance: { type: 'number' },
    difficulty: { type: 'number' },
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Load prebuilt questions from JSON file
 */
async function loadPrebuiltQuestions(): Promise<SuggestedQuestionsData | null> {
  const now = Date.now()
  
  // Return cached if still valid
  if (prebuiltCache && now - prebuiltLoadTime < PREBUILT_CACHE_TTL) {
    return prebuiltCache
  }
  
  try {
    const filePath = path.join(process.cwd(), 'public', 'assets', 'suggested-questions.json')
    const content = await fs.readFile(filePath, 'utf-8')
    prebuiltCache = JSON.parse(content)
    prebuiltLoadTime = now
    return prebuiltCache
  } catch (err) {
    console.warn('[Questions API] Could not load prebuilt questions:', err)
    return null
  }
}

/**
 * Get prebuilt questions for a strand path
 */
async function getPrebuiltForStrand(strandPath: string): Promise<{
  questions: GeneratedQuestion[]
  isManual: boolean
  analysis?: ContentAnalysis
} | null> {
  const data = await loadPrebuiltQuestions()
  if (!data?.questions) return null
  
  // Normalize path for lookup
  let normalizedPath = strandPath
  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.slice(1)
  }
  
  // Try various path formats
  const pathVariants = [
    normalizedPath,
    `weaves/${normalizedPath}`,
    normalizedPath.replace(/^weaves\//, ''),
  ]
  
  let entry: PrebuiltEntry | undefined
  for (const variant of pathVariants) {
    entry = data.questions[variant]
    if (entry) break
  }
  
  if (!entry?.questions?.length) return null
  
  const isManual = entry.source === 'manual'
  
  const questions: GeneratedQuestion[] = entry.questions.map(q => 
    prebuiltToGenerated(q, isManual)
  )
  
  return {
    questions,
    isManual,
    analysis: entry.analysis,
  }
}

// ============================================================================
// ROUTES
// ============================================================================

export async function registerQuestionsRoutes(fastify: FastifyInstance): Promise<void> {
  
  // ========================================================================
  // GET /questions/prebuilt
  // ========================================================================
  
  fastify.get('/questions/prebuilt', {
    schema: {
      description: 'Get all prebuilt questions from the JSON cache',
      tags: ['Questions'],
      response: {
        200: {
          type: 'object',
          properties: {
            generatedAt: { type: 'string' },
            repo: { type: 'string' },
            branch: { type: 'string' },
            stats: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                manual: { type: 'number' },
                auto: { type: 'number' },
              }
            },
            questions: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  source: { type: 'string', enum: ['manual', 'auto'] },
                  analysis: analysisSchema,
                  questions: { type: 'array', items: prebuiltQuestionSchema },
                }
              }
            }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await loadPrebuiltQuestions()
    
    if (!data) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Prebuilt questions not available. Run generate-suggested-questions.js first.',
      })
    }
    
    return data
  })
  
  // ========================================================================
  // GET /questions/strand/:path
  // ========================================================================
  
  fastify.get('/questions/strand/*', {
    schema: {
      description: 'Get suggested questions for a specific strand',
      tags: ['Questions'],
      params: {
        type: 'object',
        properties: {
          '*': { type: 'string', description: 'Strand path (e.g., weaves/docs/intro.md)' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          maxQuestions: { type: 'number', default: 4 },
          includeAnalysis: { type: 'boolean', default: false },
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            strandPath: { type: 'string' },
            source: { type: 'string', enum: ['manual', 'prebuilt', 'dynamic'] },
            questions: { type: 'array', items: questionSchema },
            analysis: analysisSchema,
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request: FastifyRequest<{
    Params: { '*': string }
    Querystring: { maxQuestions?: number; includeAnalysis?: boolean }
  }>, reply: FastifyReply) => {
    const strandPath = request.params['*']
    const { maxQuestions = 4, includeAnalysis = false } = request.query
    
    if (!strandPath) {
      return reply.status(400).send({
        error: 'INVALID_PATH',
        message: 'Strand path is required',
      })
    }
    
    // Cache key for this strand
    const cacheKey = generateCacheKey(CachePrefix.STRANDS, {
      path: strandPath,
      max: maxQuestions,
      analysis: includeAnalysis,
    })
    
    const result = await withCache(cacheKey, async () => {
      // 1. Try prebuilt questions first
      const prebuilt = await getPrebuiltForStrand(strandPath)
      
      if (prebuilt && prebuilt.questions.length > 0) {
        return {
          strandPath,
          source: prebuilt.isManual ? 'manual' : 'prebuilt',
          questions: prebuilt.questions.slice(0, maxQuestions),
          ...(includeAnalysis && prebuilt.analysis ? { analysis: prebuilt.analysis } : {}),
        }
      }
      
      // 2. Try to fetch content and generate dynamically
      try {
        const repoOwner = process.env.NEXT_PUBLIC_CODEX_REPO_OWNER || 'framersai'
        const repoName = process.env.NEXT_PUBLIC_CODEX_REPO_NAME || 'codex'
        const repoBranch = process.env.NEXT_PUBLIC_CODEX_REPO_BRANCH || 'main'
        
        const contentUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${repoBranch}/${strandPath}`
        const response = await fetch(contentUrl)
        
        if (!response.ok) {
          return {
            strandPath,
            source: 'dynamic' as const,
            questions: [],
            error: 'Content not found',
          }
        }
        
        const rawContent = await response.text()
        const { frontmatter, content } = parseFrontmatter(rawContent)
        const analysis = analyzeContent(content)
        
        // Check for manual questions in frontmatter
        const manualQuestions = extractManualQuestions(frontmatter)
        if (manualQuestions && manualQuestions.length > 0) {
          return {
            strandPath,
            source: 'manual' as const,
            questions: manualQuestions.slice(0, maxQuestions).map(q => prebuiltToGenerated(q, true)),
            ...(includeAnalysis ? { analysis } : {}),
          }
        }
        
        // Generate dynamically
        const generated = generateQuestionsFromContent(content, strandPath, { maxQuestions })
        
        return {
          strandPath,
          source: 'dynamic' as const,
          questions: generated,
          ...(includeAnalysis ? { analysis } : {}),
        }
      } catch (err) {
        console.error('[Questions API] Error fetching strand content:', err)
        return {
          strandPath,
          source: 'dynamic' as const,
          questions: [],
          error: 'Failed to fetch content',
        }
      }
    }, CacheTTL.SHORT)
    
    return result
  })
  
  // ========================================================================
  // POST /questions/generate
  // ========================================================================
  
  fastify.post('/questions/generate', {
    schema: {
      description: 'Generate questions from provided content using NLP',
      tags: ['Questions'],
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', description: 'Markdown content to analyze' },
          strandPath: { type: 'string', description: 'Optional path for context' },
          maxQuestions: { type: 'number', default: 4 },
          includeCodeQuestions: { type: 'boolean', default: true },
          includeComparisonQuestions: { type: 'boolean', default: true },
          includeExplorationQuestions: { type: 'boolean', default: true },
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            questions: { type: 'array', items: questionSchema },
            analysis: analysisSchema,
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request: FastifyRequest<{
    Body: {
      content: string
      strandPath?: string
      maxQuestions?: number
      includeCodeQuestions?: boolean
      includeComparisonQuestions?: boolean
      includeExplorationQuestions?: boolean
    }
  }>, reply: FastifyReply) => {
    const {
      content,
      strandPath,
      maxQuestions = 4,
      includeCodeQuestions = true,
      includeComparisonQuestions = true,
      includeExplorationQuestions = true,
    } = request.body
    
    if (!content || content.length < 50) {
      return reply.status(400).send({
        error: 'INVALID_CONTENT',
        message: 'Content must be at least 50 characters',
      })
    }
    
    // Parse frontmatter if present
    const { frontmatter, content: bodyContent } = parseFrontmatter(content)
    
    // Check for manual questions first
    const manualQuestions = extractManualQuestions(frontmatter)
    if (manualQuestions && manualQuestions.length > 0) {
      const analysis = analyzeContent(bodyContent)
      return {
        questions: manualQuestions.slice(0, maxQuestions).map(q => prebuiltToGenerated(q, true)),
        analysis,
        source: 'manual',
      }
    }
    
    // Generate dynamically
    const analysis = analyzeContent(bodyContent)
    const questions = generateQuestionsFromContent(bodyContent, strandPath, {
      maxQuestions,
      includeCodeQuestions,
      includeComparisonQuestions,
      includeExplorationQuestions,
    })
    
    return {
      questions,
      analysis,
      source: 'dynamic',
    }
  })
  
  // ========================================================================
  // POST /questions/analyze
  // ========================================================================
  
  fastify.post('/questions/analyze', {
    schema: {
      description: 'Analyze content to determine significance and difficulty',
      tags: ['Questions'],
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', description: 'Markdown content to analyze' },
        }
      },
      response: {
        200: analysisSchema
      }
    },
    preHandler: requireAuth
  }, async (request: FastifyRequest<{
    Body: { content: string }
  }>, reply: FastifyReply) => {
    const { content } = request.body
    
    if (!content) {
      return reply.status(400).send({
        error: 'INVALID_CONTENT',
        message: 'Content is required',
      })
    }
    
    // Strip frontmatter if present
    const { content: bodyContent } = parseFrontmatter(content)
    
    return analyzeContent(bodyContent)
  })
}

