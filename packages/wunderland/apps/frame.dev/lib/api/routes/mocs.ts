// @ts-nocheck
/**
 * MOC (Map of Content) Routes
 * 
 * Endpoints for managing Maps of Content - topic entry points that
 * organize and link related strands together.
 * 
 * @module lib/api/routes/mocs
 */

import { FastifyInstance } from 'fastify'
import { getDatabase } from '@/lib/codexDatabase'
import { requireAuth } from '../auth/plugin'
import { 
  withCache, 
  generateCacheKey, 
  CacheTTL, 
  CachePrefix,
  HttpCachePresets,
  invalidateByPrefix
} from '../cache'

// ============================================================================
// TYPES
// ============================================================================

interface MOCConfig {
  topic: string
  scope: 'subject' | 'topic' | 'project'
  autoUpdate?: boolean
}

interface MOCStrand {
  slug: string
  path: string
  title: string
  mocConfig: MOCConfig | null
  linkedCount: number
  createdAt: string
  updatedAt: string
}

// ============================================================================
// SCHEMAS
// ============================================================================

const mocConfigSchema = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    scope: { type: 'string', enum: ['subject', 'topic', 'project'] },
    autoUpdate: { type: 'boolean', nullable: true }
  }
}

const mocStrandSchema = {
  type: 'object',
  properties: {
    slug: { type: 'string' },
    path: { type: 'string' },
    title: { type: 'string' },
    mocConfig: mocConfigSchema,
    linkedCount: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
}

const paginationSchema = {
  type: 'object',
  properties: {
    total: { type: 'number' },
    limit: { type: 'number' },
    offset: { type: 'number' },
    hasMore: { type: 'boolean' }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseJsonObject<T>(field: string | null): T | null {
  if (!field) return null
  try {
    return JSON.parse(field) as T
  } catch {
    return null
  }
}

// ============================================================================
// ROUTES
// ============================================================================

export async function registerMOCsRoutes(fastify: FastifyInstance): Promise<void> {

  // ========================================================================
  // LIST ALL MOCs
  // ========================================================================

  fastify.get('/mocs', {
    schema: {
      description: 'List all MOC (Map of Content) strands',
      tags: ['MOCs'],
      querystring: {
        type: 'object',
        properties: {
          scope: { type: 'string', enum: ['subject', 'topic', 'project'], description: 'Filter by MOC scope' },
          limit: { type: 'number', default: 50, maximum: 100 },
          offset: { type: 'number', default: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: mocStrandSchema },
            meta: { type: 'object', properties: { pagination: paginationSchema } }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const db = await getDatabase()
    if (!db) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE', message: 'Database not available' })
    }

    const query = request.query as {
      scope?: 'subject' | 'topic' | 'project'
      limit?: number
      offset?: number
    }
    const limit = query.limit || 50
    const offset = query.offset || 0

    const cacheKey = generateCacheKey(CachePrefix.STRANDS, { mocs: true, scope: query.scope, limit, offset })

    const result = await withCache(cacheKey, async () => {
      let sqlQuery = `
        SELECT s.slug, s.path, s.title, s.moc_config, s.created_at, s.updated_at,
               (SELECT COUNT(*) FROM strand_relationships r WHERE r.source_strand_path = s.path) as linked_count
        FROM strands s
        WHERE s.is_moc = 1
      `
      const params: (string | number)[] = []
      const countParams: (string | number)[] = []

      let countQuery = `SELECT COUNT(*) as total FROM strands WHERE is_moc = 1`

      if (query.scope) {
        sqlQuery += ` AND s.moc_config LIKE ?`
        countQuery += ` AND moc_config LIKE ?`
        params.push(`%"scope":"${query.scope}"%`)
        countParams.push(`%"scope":"${query.scope}"%`)
      }

      sqlQuery += ` ORDER BY s.updated_at DESC LIMIT ? OFFSET ?`
      params.push(limit, offset)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await db.all(sqlQuery, params) as any[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countRows = await db.all(countQuery, countParams) as any[]
      const total = countRows?.[0]?.total || 0

      const mocs: MOCStrand[] = (rows || []).map(row => ({
        slug: row.slug,
        path: row.path,
        title: row.title,
        mocConfig: parseJsonObject<MOCConfig>(row.moc_config),
        linkedCount: row.linked_count || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))

      return {
        data: mocs,
        meta: {
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + mocs.length < total
          }
        }
      }
    }, CacheTTL.MEDIUM)

    reply.header('Cache-Control', HttpCachePresets.LIST)
    return result
  })

  // ========================================================================
  // GET MOC DETAILS WITH LINKED STRANDS
  // ========================================================================

  fastify.get('/mocs/:slug', {
    schema: {
      description: 'Get a specific MOC with all linked strands',
      tags: ['MOCs'],
      params: {
        type: 'object',
        properties: {
          slug: { type: 'string' }
        },
        required: ['slug']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            moc: mocStrandSchema,
            linkedStrands: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  slug: { type: 'string' },
                  path: { type: 'string' },
                  title: { type: 'string' },
                  relationType: { type: 'string' },
                  context: { type: 'string', nullable: true }
                }
              }
            }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const db = await getDatabase()
    if (!db) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE', message: 'Database not available' })
    }

    const { slug } = request.params as { slug: string }

    // Get MOC strand
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mocRows = await db.all(
      `SELECT slug, path, title, moc_config, created_at, updated_at
       FROM strands WHERE slug = ? AND is_moc = 1`,
      [slug]
    ) as any[]

    if (!mocRows || mocRows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'MOC not found' })
    }

    const mocRow = mocRows[0]

    // Get linked strands via relationships
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linkedRows = await db.all(
      `SELECT s.slug, s.path, s.title, r.relation_type, r.context
       FROM strand_relationships r
       JOIN strands s ON r.target_strand_path = s.path
       WHERE r.source_strand_path = ?
       ORDER BY r.relation_type, s.title`,
      [mocRow.path]
    ) as any[]

    // Get linked count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countRows = await db.all(
      `SELECT COUNT(*) as count FROM strand_relationships WHERE source_strand_path = ?`,
      [mocRow.path]
    ) as any[]

    reply.header('Cache-Control', HttpCachePresets.CONTENT)
    return {
      moc: {
        slug: mocRow.slug,
        path: mocRow.path,
        title: mocRow.title,
        mocConfig: parseJsonObject<MOCConfig>(mocRow.moc_config),
        linkedCount: countRows?.[0]?.count || 0,
        createdAt: mocRow.created_at,
        updatedAt: mocRow.updated_at
      },
      linkedStrands: (linkedRows || []).map(row => ({
        slug: row.slug,
        path: row.path,
        title: row.title,
        relationType: row.relation_type,
        context: row.context || null
      }))
    }
  })

  // ========================================================================
  // GENERATE MOC FROM TOPIC
  // ========================================================================

  fastify.post('/mocs/generate', {
    schema: {
      description: 'Generate a MOC (Map of Content) for a topic by finding related strands',
      tags: ['MOCs'],
      body: {
        type: 'object',
        required: ['topic'],
        properties: {
          topic: { type: 'string', description: 'Topic to generate MOC for' },
          scope: { type: 'string', enum: ['subject', 'topic', 'project'], default: 'topic' },
          autoUpdate: { type: 'boolean', default: false },
          title: { type: 'string', description: 'Custom title for the MOC strand' },
          weaveSlug: { type: 'string', description: 'Weave to create the MOC in' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            candidateStrands: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  slug: { type: 'string' },
                  path: { type: 'string' },
                  title: { type: 'string' },
                  matchScore: { type: 'number' },
                  matchReason: { type: 'string' }
                }
              }
            },
            totalCandidates: { type: 'number' }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const db = await getDatabase()
    if (!db) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE', message: 'Database not available' })
    }

    const body = request.body as {
      topic: string
      scope?: 'subject' | 'topic' | 'project'
      autoUpdate?: boolean
      title?: string
      weaveSlug?: string
    }

    const topic = body.topic.toLowerCase()
    const scope = body.scope || 'topic'

    // Find strands that match the topic
    // Search in title, tags, subjects, topics, and content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidateRows = await db.all(
      `SELECT slug, path, title, tags, subjects, topics, summary
       FROM strands
       WHERE 
         LOWER(title) LIKE ? OR
         LOWER(tags) LIKE ? OR
         LOWER(subjects) LIKE ? OR
         LOWER(topics) LIKE ? OR
         LOWER(summary) LIKE ?
       ORDER BY 
         CASE 
           WHEN LOWER(title) LIKE ? THEN 1
           WHEN LOWER(subjects) LIKE ? THEN 2
           WHEN LOWER(topics) LIKE ? THEN 3
           WHEN LOWER(tags) LIKE ? THEN 4
           ELSE 5
         END,
         updated_at DESC
       LIMIT 100`,
      [
        `%${topic}%`, `%${topic}%`, `%${topic}%`, `%${topic}%`, `%${topic}%`,
        `%${topic}%`, `%${topic}%`, `%${topic}%`, `%${topic}%`
      ]
    ) as any[]

    // Score and categorize candidates
    const candidates = (candidateRows || []).map(row => {
      let matchScore = 0
      let matchReason = ''

      const titleLower = (row.title || '').toLowerCase()
      const tagsLower = (row.tags || '').toLowerCase()
      const subjectsLower = (row.subjects || '').toLowerCase()
      const topicsLower = (row.topics || '').toLowerCase()

      if (titleLower.includes(topic)) {
        matchScore += 10
        matchReason = 'title match'
      }
      if (subjectsLower.includes(topic)) {
        matchScore += 8
        matchReason = matchReason ? `${matchReason}, subject match` : 'subject match'
      }
      if (topicsLower.includes(topic)) {
        matchScore += 6
        matchReason = matchReason ? `${matchReason}, topic match` : 'topic match'
      }
      if (tagsLower.includes(topic)) {
        matchScore += 4
        matchReason = matchReason ? `${matchReason}, tag match` : 'tag match'
      }
      if (!matchReason) {
        matchScore = 1
        matchReason = 'content match'
      }

      return {
        slug: row.slug,
        path: row.path,
        title: row.title,
        matchScore,
        matchReason
      }
    })

    // Sort by score descending
    candidates.sort((a, b) => b.matchScore - a.matchScore)

    return {
      success: true,
      message: `Found ${candidates.length} candidate strands for MOC on "${body.topic}"`,
      candidateStrands: candidates.slice(0, 50), // Return top 50
      totalCandidates: candidates.length
    }
  })

  // ========================================================================
  // CREATE MOC FROM STRANDS
  // ========================================================================

  fastify.post('/mocs', {
    schema: {
      description: 'Create a new MOC strand and link it to specified strands',
      tags: ['MOCs'],
      body: {
        type: 'object',
        required: ['topic', 'strandPaths'],
        properties: {
          topic: { type: 'string' },
          scope: { type: 'string', enum: ['subject', 'topic', 'project'], default: 'topic' },
          autoUpdate: { type: 'boolean', default: false },
          strandPaths: { type: 'array', items: { type: 'string' }, minItems: 1 },
          relationType: { type: 'string', default: 'related' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            mocSlug: { type: 'string' },
            linkedCount: { type: 'number' }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const db = await getDatabase()
    if (!db) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE', message: 'Database not available' })
    }

    const body = request.body as {
      topic: string
      scope?: 'subject' | 'topic' | 'project'
      autoUpdate?: boolean
      strandPaths: string[]
      relationType?: string
    }

    // Generate slug from topic
    const slug = `moc-${body.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
    const now = new Date().toISOString()
    const id = `strand_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const mocConfig: MOCConfig = {
      topic: body.topic,
      scope: body.scope || 'topic',
      autoUpdate: body.autoUpdate
    }

    try {
      // Check if MOC already exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = await db.all('SELECT id FROM strands WHERE slug = ?', [slug]) as any[]
      if (existing && existing.length > 0) {
        return reply.status(409).send({
          error: 'MOC_EXISTS',
          message: `MOC with slug "${slug}" already exists`
        })
      }

      // Get weave_id from first strand
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const firstStrand = await db.all(
        'SELECT weave_id FROM strands WHERE path = ?',
        [body.strandPaths[0]]
      ) as any[]

      if (!firstStrand || firstStrand.length === 0) {
        return reply.status(400).send({
          error: 'INVALID_STRAND',
          message: 'First strand path not found'
        })
      }

      const weaveId = firstStrand[0].weave_id

      // Create MOC strand
      await db.run(
        `INSERT INTO strands (id, weave_id, slug, title, path, content, word_count, is_moc, moc_config, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          weaveId,
          slug,
          `Map of Content: ${body.topic}`,
          `/${slug}.md`,
          `# ${body.topic}\n\nThis is a Map of Content for organizing knowledge about ${body.topic}.`,
          10,
          1,
          JSON.stringify(mocConfig),
          'published',
          now,
          now
        ]
      )

      // Create relationships to linked strands
      let linkedCount = 0
      for (const strandPath of body.strandPaths) {
        const relId = `rel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        await db.run(
          `INSERT INTO strand_relationships (id, source_strand_path, target_strand_path, relation_type, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [relId, `/${slug}.md`, strandPath, body.relationType || 'related', now, now]
        )
        linkedCount++
      }

      // Invalidate cache
      invalidateByPrefix(CachePrefix.STRANDS)

      return reply.status(201).send({
        success: true,
        message: 'MOC created successfully',
        mocSlug: slug,
        linkedCount
      })
    } catch (error) {
      console.error('[MOCs API] Create error:', error)
      return reply.status(500).send({
        error: 'CREATE_FAILED',
        message: 'Failed to create MOC'
      })
    }
  })

  // ========================================================================
  // UPDATE MOC CONFIG
  // ========================================================================

  fastify.put('/mocs/:slug', {
    schema: {
      description: 'Update MOC configuration',
      tags: ['MOCs'],
      params: {
        type: 'object',
        properties: {
          slug: { type: 'string' }
        },
        required: ['slug']
      },
      body: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          scope: { type: 'string', enum: ['subject', 'topic', 'project'] },
          autoUpdate: { type: 'boolean' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            mocConfig: mocConfigSchema
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const db = await getDatabase()
    if (!db) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE', message: 'Database not available' })
    }

    const { slug } = request.params as { slug: string }
    const body = request.body as Partial<MOCConfig>

    // Get current MOC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await db.all(
      'SELECT id, moc_config FROM strands WHERE slug = ? AND is_moc = 1',
      [slug]
    ) as any[]

    if (!rows || rows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'MOC not found' })
    }

    const strandId = rows[0].id
    const currentConfig = parseJsonObject<MOCConfig>(rows[0].moc_config) || { topic: '', scope: 'topic' as const }

    // Merge config
    const newConfig: MOCConfig = {
      topic: body.topic || currentConfig.topic,
      scope: body.scope || currentConfig.scope,
      autoUpdate: body.autoUpdate !== undefined ? body.autoUpdate : currentConfig.autoUpdate
    }

    const now = new Date().toISOString()

    try {
      await db.run(
        'UPDATE strands SET moc_config = ?, updated_at = ? WHERE id = ?',
        [JSON.stringify(newConfig), now, strandId]
      )

      // Invalidate cache
      invalidateByPrefix(CachePrefix.STRANDS)

      return {
        success: true,
        message: 'MOC config updated successfully',
        mocConfig: newConfig
      }
    } catch (error) {
      return reply.status(500).send({
        error: 'UPDATE_FAILED',
        message: 'Failed to update MOC config'
      })
    }
  })

  // ========================================================================
  // ADD STRAND TO MOC
  // ========================================================================

  fastify.post('/mocs/:slug/strands', {
    schema: {
      description: 'Add a strand to a MOC',
      tags: ['MOCs'],
      params: {
        type: 'object',
        properties: {
          slug: { type: 'string' }
        },
        required: ['slug']
      },
      body: {
        type: 'object',
        required: ['strandPath'],
        properties: {
          strandPath: { type: 'string' },
          relationType: { type: 'string', default: 'related' },
          context: { type: 'string' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            relationshipId: { type: 'string' }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const db = await getDatabase()
    if (!db) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE', message: 'Database not available' })
    }

    const { slug } = request.params as { slug: string }
    const body = request.body as {
      strandPath: string
      relationType?: string
      context?: string
    }

    // Get MOC path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mocRows = await db.all(
      'SELECT path FROM strands WHERE slug = ? AND is_moc = 1',
      [slug]
    ) as any[]

    if (!mocRows || mocRows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'MOC not found' })
    }

    const mocPath = mocRows[0].path
    const now = new Date().toISOString()
    const relId = `rel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    try {
      await db.run(
        `INSERT INTO strand_relationships (id, source_strand_path, target_strand_path, relation_type, context, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(source_strand_path, target_strand_path, relation_type) DO UPDATE SET
           context = excluded.context,
           updated_at = excluded.updated_at`,
        [relId, mocPath, body.strandPath, body.relationType || 'related', body.context || null, now, now]
      )

      // Invalidate cache
      invalidateByPrefix(CachePrefix.STRANDS)

      return reply.status(201).send({
        success: true,
        message: 'Strand added to MOC successfully',
        relationshipId: relId
      })
    } catch (error) {
      return reply.status(500).send({
        error: 'ADD_FAILED',
        message: 'Failed to add strand to MOC'
      })
    }
  })

  // ========================================================================
  // REMOVE STRAND FROM MOC
  // ========================================================================

  fastify.delete('/mocs/:slug/strands/:strandSlug', {
    schema: {
      description: 'Remove a strand from a MOC',
      tags: ['MOCs'],
      params: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          strandSlug: { type: 'string' }
        },
        required: ['slug', 'strandSlug']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const db = await getDatabase()
    if (!db) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE', message: 'Database not available' })
    }

    const { slug, strandSlug } = request.params as { slug: string; strandSlug: string }

    // Get MOC and strand paths
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mocRows = await db.all(
      'SELECT path FROM strands WHERE slug = ? AND is_moc = 1',
      [slug]
    ) as any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const strandRows = await db.all(
      'SELECT path FROM strands WHERE slug = ?',
      [strandSlug]
    ) as any[]

    if (!mocRows || mocRows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'MOC not found' })
    }
    if (!strandRows || strandRows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Strand not found' })
    }

    const mocPath = mocRows[0].path
    const strandPath = strandRows[0].path

    try {
      await db.run(
        'DELETE FROM strand_relationships WHERE source_strand_path = ? AND target_strand_path = ?',
        [mocPath, strandPath]
      )

      // Invalidate cache
      invalidateByPrefix(CachePrefix.STRANDS)

      return {
        success: true,
        message: 'Strand removed from MOC successfully'
      }
    } catch (error) {
      return reply.status(500).send({
        error: 'REMOVE_FAILED',
        message: 'Failed to remove strand from MOC'
      })
    }
  })
}

