// @ts-nocheck
/**
 * Strand Relationships Routes
 * 
 * CRUD operations for strand-to-strand relationships (Zettelkasten link context).
 * 
 * @module lib/api/routes/relationships
 */

import { FastifyInstance } from 'fastify'
import { 
  getDatabase,
  upsertStrandRelationship,
  getStrandRelationships,
  getStrandBacklinks,
  type StrandRelationType,
  type StrandRelationshipRecord
} from '@/lib/codexDatabase'
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
// SCHEMAS
// ============================================================================

const relationTypeEnum = [
  'extends', 'contrasts', 'supports', 'example-of', 'implements',
  'questions', 'refines', 'applies', 'summarizes', 'prerequisite',
  'related', 'follows', 'references', 'contradicts', 'updates',
  'parallels', 'synthesizes', 'custom'
]

const relationshipSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    sourceStrandPath: { type: 'string' },
    sourceStrandId: { type: 'string', nullable: true },
    targetStrandPath: { type: 'string' },
    targetStrandId: { type: 'string', nullable: true },
    relationType: { type: 'string', enum: relationTypeEnum },
    context: { type: 'string', nullable: true },
    sourceBlockId: { type: 'string', nullable: true },
    bidirectional: { type: 'boolean' },
    strength: { type: 'number' },
    autoDetected: { type: 'boolean' },
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
// ROUTES
// ============================================================================

export async function registerRelationshipsRoutes(fastify: FastifyInstance): Promise<void> {

  // ========================================================================
  // LIST RELATIONSHIPS
  // ========================================================================

  fastify.get('/relationships', {
    schema: {
      description: 'List all strand relationships with optional filters',
      tags: ['Relationships'],
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: relationTypeEnum, description: 'Filter by relationship type' },
          source: { type: 'string', description: 'Filter by source strand path' },
          target: { type: 'string', description: 'Filter by target strand path' },
          bidirectional: { type: 'boolean', description: 'Filter by bidirectional flag' },
          limit: { type: 'number', default: 50, maximum: 100 },
          offset: { type: 'number', default: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: relationshipSchema },
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
      type?: StrandRelationType
      source?: string
      target?: string
      bidirectional?: boolean
      limit?: number
      offset?: number
    }
    const limit = query.limit || 50
    const offset = query.offset || 0

    const cacheKey = generateCacheKey(CachePrefix.STRANDS, { 
      rel: true, 
      type: query.type, 
      source: query.source, 
      target: query.target, 
      limit, 
      offset 
    })

    const result = await withCache(cacheKey, async () => {
      const conditions: string[] = []
      const params: (string | number)[] = []
      const countParams: (string | number)[] = []

      if (query.type) {
        conditions.push('relation_type = ?')
        params.push(query.type)
        countParams.push(query.type)
      }
      if (query.source) {
        conditions.push('source_strand_path = ?')
        params.push(query.source)
        countParams.push(query.source)
      }
      if (query.target) {
        conditions.push('target_strand_path = ?')
        params.push(query.target)
        countParams.push(query.target)
      }
      if (query.bidirectional !== undefined) {
        conditions.push('bidirectional = ?')
        params.push(query.bidirectional ? 1 : 0)
        countParams.push(query.bidirectional ? 1 : 0)
      }

      const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await db.all(
        `SELECT * FROM strand_relationships${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ) as any[]

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countRows = await db.all(
        `SELECT COUNT(*) as total FROM strand_relationships${whereClause}`,
        countParams
      ) as any[]
      const total = countRows?.[0]?.total || 0

      const relationships = (rows || []).map(row => ({
        id: row.id,
        sourceStrandPath: row.source_strand_path,
        sourceStrandId: row.source_strand_id || null,
        targetStrandPath: row.target_strand_path,
        targetStrandId: row.target_strand_id || null,
        relationType: row.relation_type,
        context: row.context || null,
        sourceBlockId: row.source_block_id || null,
        bidirectional: row.bidirectional === 1,
        strength: row.strength,
        autoDetected: row.auto_detected === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))

      return {
        data: relationships,
        meta: {
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + relationships.length < total
          }
        }
      }
    }, CacheTTL.MEDIUM)

    reply.header('Cache-Control', HttpCachePresets.LIST)
    return result
  })

  // ========================================================================
  // CREATE RELATIONSHIP
  // ========================================================================

  fastify.post('/relationships', {
    schema: {
      description: 'Create a new strand relationship',
      tags: ['Relationships'],
      body: {
        type: 'object',
        required: ['sourceStrandPath', 'targetStrandPath', 'relationType'],
        properties: {
          sourceStrandPath: { type: 'string' },
          sourceStrandId: { type: 'string' },
          targetStrandPath: { type: 'string' },
          targetStrandId: { type: 'string' },
          relationType: { type: 'string', enum: relationTypeEnum },
          context: { type: 'string' },
          sourceBlockId: { type: 'string' },
          bidirectional: { type: 'boolean', default: false },
          strength: { type: 'number', default: 1.0 },
          autoDetected: { type: 'boolean', default: false }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            id: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const body = request.body as {
      sourceStrandPath: string
      sourceStrandId?: string
      targetStrandPath: string
      targetStrandId?: string
      relationType: StrandRelationType
      context?: string
      sourceBlockId?: string
      bidirectional?: boolean
      strength?: number
      autoDetected?: boolean
    }

    const id = await upsertStrandRelationship({
      sourceStrandPath: body.sourceStrandPath,
      sourceStrandId: body.sourceStrandId,
      targetStrandPath: body.targetStrandPath,
      targetStrandId: body.targetStrandId,
      relationType: body.relationType,
      context: body.context,
      sourceBlockId: body.sourceBlockId,
      bidirectional: body.bidirectional,
      strength: body.strength,
      autoDetected: body.autoDetected
    })

    if (!id) {
      return reply.status(500).send({ 
        error: 'CREATE_FAILED', 
        message: 'Failed to create relationship' 
      })
    }

    // Invalidate cache
    invalidateByPrefix(CachePrefix.STRANDS)

    return reply.status(201).send({
      success: true,
      id,
      message: 'Relationship created successfully'
    })
  })

  // ========================================================================
  // DELETE RELATIONSHIP
  // ========================================================================

  fastify.delete('/relationships/:id', {
    schema: {
      description: 'Delete a strand relationship',
      tags: ['Relationships'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
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

    const { id } = request.params as { id: string }

    try {
      await db.run('DELETE FROM strand_relationships WHERE id = ?', [id])
      
      // Invalidate cache
      invalidateByPrefix(CachePrefix.STRANDS)

      return {
        success: true,
        message: 'Relationship deleted successfully'
      }
    } catch (error) {
      return reply.status(500).send({
        error: 'DELETE_FAILED',
        message: 'Failed to delete relationship'
      })
    }
  })

  // ========================================================================
  // GET STRAND RELATIONSHIPS (outgoing)
  // ========================================================================

  fastify.get('/strands/:slug/relationships', {
    schema: {
      description: 'Get all outgoing relationships for a strand',
      tags: ['Relationships'],
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
            data: { type: 'array', items: relationshipSchema },
            meta: {
              type: 'object',
              properties: {
                strandSlug: { type: 'string' },
                direction: { type: 'string', enum: ['outgoing'] },
                total: { type: 'number' }
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

    // Get strand path from slug
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const strandRows = await db.all('SELECT path FROM strands WHERE slug = ?', [slug]) as any[]
    if (!strandRows || strandRows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Strand not found' })
    }

    const strandPath = strandRows[0].path
    const relationships = await getStrandRelationships(strandPath)

    reply.header('Cache-Control', HttpCachePresets.LIST)
    return {
      data: relationships,
      meta: {
        strandSlug: slug,
        direction: 'outgoing',
        total: relationships.length
      }
    }
  })

  // ========================================================================
  // GET STRAND BACKLINKS (incoming)
  // ========================================================================

  fastify.get('/strands/:slug/backlinks', {
    schema: {
      description: 'Get all incoming relationships (backlinks) for a strand',
      tags: ['Relationships'],
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
            data: { type: 'array', items: relationshipSchema },
            meta: {
              type: 'object',
              properties: {
                strandSlug: { type: 'string' },
                direction: { type: 'string', enum: ['incoming'] },
                total: { type: 'number' }
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

    // Get strand path from slug
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const strandRows = await db.all('SELECT path FROM strands WHERE slug = ?', [slug]) as any[]
    if (!strandRows || strandRows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Strand not found' })
    }

    const strandPath = strandRows[0].path
    const backlinks = await getStrandBacklinks(strandPath)

    reply.header('Cache-Control', HttpCachePresets.LIST)
    return {
      data: backlinks,
      meta: {
        strandSlug: slug,
        direction: 'incoming',
        total: backlinks.length
      }
    }
  })

  // ========================================================================
  // GET RELATIONSHIP STATISTICS
  // ========================================================================

  fastify.get('/relationships/stats', {
    schema: {
      description: 'Get relationship statistics',
      tags: ['Relationships'],
      response: {
        200: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            byType: { type: 'object', additionalProperties: { type: 'number' } },
            bidirectionalCount: { type: 'number' },
            autoDetectedCount: { type: 'number' },
            averageStrength: { type: 'number' }
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

    const cacheKey = generateCacheKey(CachePrefix.STRANDS, { relStats: true })

    const result = await withCache(cacheKey, async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalRows = await db.all('SELECT COUNT(*) as total FROM strand_relationships') as any[]
      const total = totalRows?.[0]?.total || 0

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const typeRows = await db.all(
        'SELECT relation_type, COUNT(*) as count FROM strand_relationships GROUP BY relation_type'
      ) as any[]
      const byType: Record<string, number> = {}
      for (const row of typeRows || []) {
        byType[row.relation_type] = row.count
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const biRows = await db.all(
        'SELECT COUNT(*) as count FROM strand_relationships WHERE bidirectional = 1'
      ) as any[]
      const bidirectionalCount = biRows?.[0]?.count || 0

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const autoRows = await db.all(
        'SELECT COUNT(*) as count FROM strand_relationships WHERE auto_detected = 1'
      ) as any[]
      const autoDetectedCount = autoRows?.[0]?.count || 0

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const avgRows = await db.all(
        'SELECT AVG(strength) as avg FROM strand_relationships'
      ) as any[]
      const averageStrength = avgRows?.[0]?.avg || 1.0

      return {
        total,
        byType,
        bidirectionalCount,
        autoDetectedCount,
        averageStrength: Math.round(averageStrength * 100) / 100
      }
    }, CacheTTL.MEDIUM)

    reply.header('Cache-Control', HttpCachePresets.LIST)
    return result
  })
}

