// @ts-nocheck
/**
 * AI Generation Routes
 * 
 * Endpoints for AI-powered content generation.
 * 
 * @module lib/api/routes/generation
 */

import { FastifyInstance } from 'fastify'
import { requireAuth } from '../auth/plugin'
import { getDatabase } from '@/lib/codexDatabase'

// ============================================================================
// SCHEMAS
// ============================================================================

const flashcardSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    front: { type: 'string' },
    back: { type: 'string' },
    difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
    tags: { type: 'array', items: { type: 'string' } }
  }
}

const quizQuestionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    question: { type: 'string' },
    options: { type: 'array', items: { type: 'string' } },
    correctIndex: { type: 'number' },
    explanation: { type: 'string' },
    difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] }
  }
}

const glossaryTermSchema = {
  type: 'object',
  properties: {
    term: { type: 'string' },
    definition: { type: 'string' },
    category: { type: 'string', nullable: true },
    relatedTerms: { type: 'array', items: { type: 'string' } }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// Simple content extraction for demo purposes
// In production, this would use the actual LLM generation
function extractFlashcardsFromContent(content: string, count: number = 5): Array<{
  id: string
  front: string
  back: string
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
}> {
  // Split by headers or paragraphs
  const sections = content.split(/\n#+\s+|\n\n/).filter(s => s.trim().length > 50)
  
  return sections.slice(0, count).map((section, i) => {
    const sentences = section.split(/[.!?]+/).filter(s => s.trim().length > 10)
    const firstSentence = sentences[0]?.trim() || section.slice(0, 100)
    const rest = sentences.slice(1).join('. ').trim() || section
    
    return {
      id: generateId(),
      front: firstSentence.length > 100 ? firstSentence.slice(0, 100) + '...' : firstSentence,
      back: rest.length > 300 ? rest.slice(0, 300) + '...' : rest,
      difficulty: i < 2 ? 'easy' : i < 4 ? 'medium' : 'hard',
      tags: []
    }
  })
}

function extractQuizFromContent(content: string, count: number = 5): Array<{
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}> {
  const sections = content.split(/\n#+\s+|\n\n/).filter(s => s.trim().length > 30)
  
  return sections.slice(0, count).map((section, i) => {
    const sentences = section.split(/[.!?]+/).filter(s => s.trim().length > 5)
    const mainPoint = sentences[0]?.trim() || section.slice(0, 50)
    
    return {
      id: generateId(),
      question: `What is true about ${mainPoint.slice(0, 50).toLowerCase()}?`,
      options: [
        mainPoint.slice(0, 80),
        'This is an incorrect option A',
        'This is an incorrect option B', 
        'This is an incorrect option C'
      ],
      correctIndex: 0,
      explanation: section.slice(0, 200),
      difficulty: i < 2 ? 'easy' : i < 4 ? 'medium' : 'hard'
    }
  })
}

function extractGlossaryFromContent(content: string): Array<{
  term: string
  definition: string
  category: string | null
  relatedTerms: string[]
}> {
  // Look for definition patterns like "Term: definition" or bold terms
  const terms: Array<{
    term: string
    definition: string
    category: string | null
    relatedTerms: string[]
  }> = []
  
  // Match patterns like **term** or "term" followed by definition
  const patterns = [
    /\*\*([^*]+)\*\*[:\s-]+([^.\n]+)/g,
    /^([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)[:\s-]+([^.\n]+)/gm
  ]
  
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null && terms.length < 20) {
      const term = match[1].trim()
      const definition = match[2].trim()
      
      if (term.length > 2 && term.length < 50 && definition.length > 10) {
        terms.push({
          term,
          definition: definition.length > 200 ? definition.slice(0, 200) + '...' : definition,
          category: null,
          relatedTerms: []
        })
      }
    }
  }
  
  return terms
}

// ============================================================================
// ROUTES
// ============================================================================

export async function registerGenerationRoutes(fastify: FastifyInstance): Promise<void> {

  // ========================================================================
  // FLASHCARDS
  // ========================================================================

  fastify.post('/generate/flashcards', {
    schema: {
      description: 'Generate flashcards from strand content',
      tags: ['Generation'],
      body: {
        type: 'object',
        properties: {
          strandSlug: { type: 'string', description: 'Slug of the strand to generate from' },
          content: { type: 'string', description: 'Raw content to generate from (alternative to strandSlug)' },
          count: { type: 'number', default: 5, minimum: 1, maximum: 20 },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'mixed'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: flashcardSchema },
            meta: {
              type: 'object',
              properties: {
                source: { type: 'string' },
                generatedAt: { type: 'string', format: 'date-time' },
                count: { type: 'number' }
              }
            }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const body = request.body as { strandSlug?: string; content?: string; count?: number; difficulty?: string }
    const { strandSlug, content, count = 5 } = body

    let sourceContent = content
    let source = 'direct'

    // If strand slug provided, fetch content
    if (strandSlug && !content) {
      const db = await getDatabase()
      if (!db) {
        return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE', message: 'Database not available' })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await db.all(
        `SELECT content FROM strands WHERE slug = ?`,
        [strandSlug]
      ) as any[]

      if (!rows || rows.length === 0) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Strand not found' })
      }

      sourceContent = rows[0].content
      source = strandSlug
    }

    if (!sourceContent) {
      return reply.status(400).send({ 
        error: 'VALIDATION_ERROR', 
        message: 'Either strandSlug or content is required' 
      })
    }

    const flashcards = extractFlashcardsFromContent(sourceContent, count)

    return {
      data: flashcards,
      meta: {
        source,
        generatedAt: new Date().toISOString(),
        count: flashcards.length
      }
    }
  })

  // ========================================================================
  // QUIZ
  // ========================================================================

  fastify.post('/generate/quiz', {
    schema: {
      description: 'Generate quiz questions from strand content',
      tags: ['Generation'],
      body: {
        type: 'object',
        properties: {
          strandSlug: { type: 'string', description: 'Slug of the strand to generate from' },
          content: { type: 'string', description: 'Raw content to generate from' },
          count: { type: 'number', default: 5, minimum: 1, maximum: 20 },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'mixed'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: quizQuestionSchema },
            meta: {
              type: 'object',
              properties: {
                source: { type: 'string' },
                generatedAt: { type: 'string', format: 'date-time' },
                count: { type: 'number' }
              }
            }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const body = request.body as { strandSlug?: string; content?: string; count?: number; difficulty?: string }
    const { strandSlug, content, count = 5 } = body

    let sourceContent = content
    let source = 'direct'

    if (strandSlug && !content) {
      const db = await getDatabase()
      if (!db) {
        return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE', message: 'Database not available' })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await db.all(
        `SELECT content FROM strands WHERE slug = ?`,
        [strandSlug]
      ) as any[]

      if (!rows || rows.length === 0) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Strand not found' })
      }

      sourceContent = rows[0].content
      source = strandSlug
    }

    if (!sourceContent) {
      return reply.status(400).send({ 
        error: 'VALIDATION_ERROR', 
        message: 'Either strandSlug or content is required' 
      })
    }

    const questions = extractQuizFromContent(sourceContent, count)

    return {
      data: questions,
      meta: {
        source,
        generatedAt: new Date().toISOString(),
        count: questions.length
      }
    }
  })

  // ========================================================================
  // GLOSSARY
  // ========================================================================

  fastify.post('/generate/glossary', {
    schema: {
      description: 'Generate glossary terms from strand content',
      tags: ['Generation'],
      body: {
        type: 'object',
        properties: {
          strandSlug: { type: 'string', description: 'Slug of the strand to generate from' },
          content: { type: 'string', description: 'Raw content to generate from' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: glossaryTermSchema },
            meta: {
              type: 'object',
              properties: {
                source: { type: 'string' },
                generatedAt: { type: 'string', format: 'date-time' },
                count: { type: 'number' }
              }
            }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const body = request.body as { strandSlug?: string; content?: string }
    const { strandSlug, content } = body

    let sourceContent = content
    let source = 'direct'

    if (strandSlug && !content) {
      const db = await getDatabase()
      if (!db) {
        return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE', message: 'Database not available' })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await db.all(
        `SELECT content FROM strands WHERE slug = ?`,
        [strandSlug]
      ) as any[]

      if (!rows || rows.length === 0) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Strand not found' })
      }

      sourceContent = rows[0].content
      source = strandSlug
    }

    if (!sourceContent) {
      return reply.status(400).send({ 
        error: 'VALIDATION_ERROR', 
        message: 'Either strandSlug or content is required' 
      })
    }

    const terms = extractGlossaryFromContent(sourceContent)

    return {
      data: terms,
      meta: {
        source,
        generatedAt: new Date().toISOString(),
        count: terms.length
      }
    }
  })

  // ========================================================================
  // SUMMARY
  // ========================================================================

  fastify.post('/generate/summary', {
    schema: {
      description: 'Generate a summary of strand content',
      tags: ['Generation'],
      body: {
        type: 'object',
        properties: {
          strandSlug: { type: 'string', description: 'Slug of the strand to summarize' },
          content: { type: 'string', description: 'Raw content to summarize' },
          maxLength: { type: 'number', default: 300, minimum: 50, maximum: 1000 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                keyPoints: { type: 'array', items: { type: 'string' } },
                wordCount: { type: 'number' }
              }
            },
            meta: {
              type: 'object',
              properties: {
                source: { type: 'string' },
                generatedAt: { type: 'string', format: 'date-time' },
                originalLength: { type: 'number' }
              }
            }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const body = request.body as { strandSlug?: string; content?: string; maxLength?: number }
    const { strandSlug, content, maxLength = 300 } = body

    let sourceContent = content
    let source = 'direct'

    if (strandSlug && !content) {
      const db = await getDatabase()
      if (!db) {
        return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE', message: 'Database not available' })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await db.all(
        `SELECT content, summary FROM strands WHERE slug = ?`,
        [strandSlug]
      ) as any[]

      if (!rows || rows.length === 0) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Strand not found' })
      }

      // If strand already has a summary, return it
      if (rows[0].summary) {
        return {
          data: {
            summary: rows[0].summary,
            keyPoints: [],
            wordCount: rows[0].summary.split(/\s+/).length
          },
          meta: {
            source: strandSlug,
            generatedAt: new Date().toISOString(),
            originalLength: rows[0].content?.length || 0
          }
        }
      }

      sourceContent = rows[0].content
      source = strandSlug
    }

    if (!sourceContent) {
      return reply.status(400).send({ 
        error: 'VALIDATION_ERROR', 
        message: 'Either strandSlug or content is required' 
      })
    }

    // Simple extractive summary - get first few sentences
    const sentences = sourceContent.split(/[.!?]+/).filter(s => s.trim().length > 10)
    let summary = ''
    const keyPoints: string[] = []

    for (const sentence of sentences) {
      if (summary.length + sentence.length < maxLength) {
        summary += sentence.trim() + '. '
        keyPoints.push(sentence.trim())
        if (keyPoints.length >= 5) break
      } else {
        break
      }
    }

    return {
      data: {
        summary: summary.trim(),
        keyPoints: keyPoints.slice(0, 5),
        wordCount: summary.split(/\s+/).length
      },
      meta: {
        source,
        generatedAt: new Date().toISOString(),
        originalLength: sourceContent.length
      }
    }
  })
}

