// @ts-nocheck
/**
 * Knowledge Base Routes
 * 
 * CRUD operations for weaves, looms, and strands.
 * 
 * @module lib/api/routes/knowledge
 */

import { FastifyInstance } from 'fastify'
import { getDatabase } from '@/lib/codexDatabase'
import { requireAuth } from '../auth/plugin'
import { 
  withCache, 
  generateCacheKey, 
  entityCacheKey,
  CacheTTL, 
  CachePrefix,
  HttpCachePresets 
} from '../cache'

// ============================================================================
// SCHEMAS
// ============================================================================

const weaveSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    slug: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    path: { type: 'string' },
    strandCount: { type: 'number' },
    loomCount: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
}

const loomSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    weaveId: { type: 'string' },
    parentLoomId: { type: 'string', nullable: true },
    slug: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    path: { type: 'string' },
    depth: { type: 'number' },
    strandCount: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
}

// Maturity schema for Zettelkasten workflow
const maturitySchema = {
  type: 'object',
  nullable: true,
  properties: {
    status: { type: 'string', enum: ['fleeting', 'literature', 'permanent', 'evergreen'] },
    lastRefinedAt: { type: 'string', format: 'date-time', nullable: true },
    refinementCount: { type: 'number', nullable: true },
    futureValue: { type: 'string', enum: ['low', 'medium', 'high', 'core'], nullable: true }
  }
}

// Quality checks schema
const qualityChecksSchema = {
  type: 'object',
  nullable: true,
  properties: {
    hasContext: { type: 'boolean', nullable: true },
    hasConnections: { type: 'boolean', nullable: true },
    isAtomic: { type: 'boolean', nullable: true },
    isSelfContained: { type: 'boolean', nullable: true }
  }
}

// MOC configuration schema
const mocConfigSchema = {
  type: 'object',
  nullable: true,
  properties: {
    topic: { type: 'string' },
    scope: { type: 'string', enum: ['subject', 'topic', 'project'] },
    autoUpdate: { type: 'boolean', nullable: true }
  }
}

const strandSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    weaveId: { type: 'string' },
    loomId: { type: 'string', nullable: true },
    slug: { type: 'string' },
    title: { type: 'string' },
    path: { type: 'string' },
    content: { type: 'string' },
    wordCount: { type: 'number' },
    version: { type: 'string', nullable: true },
    difficulty: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['draft', 'published', 'archived'] },
    subjects: { type: 'array', items: { type: 'string' }, nullable: true },
    topics: { type: 'array', items: { type: 'string' }, nullable: true },
    tags: { type: 'array', items: { type: 'string' }, nullable: true },
    summary: { type: 'string', nullable: true },
    // Zettelkasten workflow fields
    strandType: { type: 'string', enum: ['file', 'folder', 'supernote', 'moc'], nullable: true },
    maturity: maturitySchema,
    qualityChecks: qualityChecksSchema,
    isMOC: { type: 'boolean', nullable: true },
    mocConfig: mocConfigSchema,
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

function parseJsonField(field: string | null): string[] | null {
  if (!field) return null
  try {
    return JSON.parse(field)
  } catch {
    return null
  }
}

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

export async function registerKnowledgeRoutes(fastify: FastifyInstance): Promise<void> {
  
  // ========================================================================
  // WEAVES
  // ========================================================================

  fastify.get('/weaves', {
    schema: {
      description: 'List all weaves (knowledge universes)',
      tags: ['Knowledge'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50, maximum: 100 },
          offset: { type: 'number', default: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: weaveSchema },
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

    const query = request.query as { limit?: number; offset?: number }
    const limit = query.limit || 50
    const offset = query.offset || 0

    // Cache key based on query params
    const cacheKey = generateCacheKey(CachePrefix.WEAVES, { limit, offset })

    const result = await withCache(cacheKey, async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await db.all(
        `SELECT * FROM weaves ORDER BY sort_order, name LIMIT ? OFFSET ?`,
        [limit, offset]
      ) as any[]

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countRows = await db.all(`SELECT COUNT(*) as total FROM weaves`) as any[]
      const total = countRows?.[0]?.total || 0

      const weaves = (rows || []).map(row => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        path: row.path,
        strandCount: row.strand_count,
        loomCount: row.loom_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))

      return {
        data: weaves,
        meta: {
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + weaves.length < total
          }
        }
      }
    }, CacheTTL.LONG) // 30 min cache for weaves list

    // Set HTTP cache headers
    reply.header('Cache-Control', HttpCachePresets.LIST)
    return result
  })

  fastify.get('/weaves/:slug', {
    schema: {
      description: 'Get a specific weave by slug',
      tags: ['Knowledge'],
      params: {
        type: 'object',
        properties: {
          slug: { type: 'string' }
        },
        required: ['slug']
      },
      response: {
        200: { type: 'object', properties: { data: weaveSchema } }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const db = await getDatabase()
    if (!db) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE', message: 'Database not available' })
    }

    const { slug } = request.params as { slug: string }
    const cacheKey = entityCacheKey(CachePrefix.WEAVES, slug)

    const result = await withCache(cacheKey, async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await db.all(
        `SELECT * FROM weaves WHERE slug = ?`,
        [slug]
      ) as any[]

      if (!rows || rows.length === 0) {
        return null
      }

      const row = rows[0]
      return {
        data: {
          id: row.id,
          slug: row.slug,
          name: row.name,
          description: row.description,
          path: row.path,
          strandCount: row.strand_count,
          loomCount: row.loom_count,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }
      }
    }, CacheTTL.LONG)

    if (!result) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Weave not found' })
    }

    reply.header('Cache-Control', HttpCachePresets.CONTENT)
    return result
  })

  // ========================================================================
  // LOOMS
  // ========================================================================

  fastify.get('/looms', {
    schema: {
      description: 'List looms (subdirectories), optionally filtered by weave',
      tags: ['Knowledge'],
      querystring: {
        type: 'object',
        properties: {
          weave: { type: 'string', description: 'Filter by weave slug' },
          limit: { type: 'number', default: 50, maximum: 100 },
          offset: { type: 'number', default: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: loomSchema },
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

    const queryParams = request.query as { weave?: string; limit?: number; offset?: number }
    const limit = queryParams.limit || 50
    const offset = queryParams.offset || 0
    const weaveSlug = queryParams.weave

    const cacheKey = generateCacheKey(CachePrefix.LOOMS, { weave: weaveSlug, limit, offset })

    const result = await withCache(cacheKey, async () => {
      let sqlQuery = `SELECT l.* FROM looms l`
      let countQuery = `SELECT COUNT(*) as total FROM looms l`
      const params: (string | number)[] = []
      const countParams: (string | number)[] = []

      if (weaveSlug) {
        sqlQuery += ` JOIN weaves w ON l.weave_id = w.id WHERE w.slug = ?`
        countQuery += ` JOIN weaves w ON l.weave_id = w.id WHERE w.slug = ?`
        params.push(weaveSlug)
        countParams.push(weaveSlug)
      }

      sqlQuery += ` ORDER BY l.sort_order, l.name LIMIT ? OFFSET ?`
      params.push(limit, offset)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await db.all(sqlQuery, params) as any[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countRows = await db.all(countQuery, countParams) as any[]
      const total = countRows?.[0]?.total || 0

      const looms = (rows || []).map(row => ({
        id: row.id,
        weaveId: row.weave_id,
        parentLoomId: row.parent_loom_id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        path: row.path,
        depth: row.depth,
        strandCount: row.strand_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))

      return {
        data: looms,
        meta: {
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + looms.length < total
          }
        }
      }
    }, CacheTTL.LONG)

    reply.header('Cache-Control', HttpCachePresets.LIST)
    return result
  })

  // ========================================================================
  // STRANDS
  // ========================================================================

  fastify.get('/strands', {
    schema: {
      description: 'List strands (knowledge units) with filtering options',
      tags: ['Knowledge'],
      querystring: {
        type: 'object',
        properties: {
          weave: { type: 'string', description: 'Filter by weave slug' },
          loom: { type: 'string', description: 'Filter by loom slug' },
          status: { type: 'string', enum: ['draft', 'published', 'archived'] },
          tag: { type: 'string', description: 'Filter by tag' },
          q: { type: 'string', description: 'Search query' },
          limit: { type: 'number', default: 20, maximum: 100 },
          offset: { type: 'number', default: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: strandSchema },
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

    const queryParams = request.query as { 
      weave?: string
      loom?: string
      status?: string
      tag?: string
      q?: string
      limit?: number
      offset?: number 
    }
    const limit = queryParams.limit || 20
    const offset = queryParams.offset || 0
    const { weave, loom, status, tag, q } = queryParams

    // Use shorter TTL for filtered/searched queries
    const ttl = q ? CacheTTL.SHORT : CacheTTL.MEDIUM
    const cacheKey = generateCacheKey(CachePrefix.STRANDS, { weave, loom, status, tag, q, limit, offset })

    const result = await withCache(cacheKey, async () => {
      let query = `SELECT s.* FROM strands s`
      let countQuery = `SELECT COUNT(*) as total FROM strands s`
      const conditions: string[] = []
      const params: (string | number)[] = []
      const countParams: (string | number)[] = []

      // Join with weaves if filtering by weave
      if (weave) {
        query = `SELECT s.* FROM strands s JOIN weaves w ON s.weave_id = w.id`
        countQuery = `SELECT COUNT(*) as total FROM strands s JOIN weaves w ON s.weave_id = w.id`
        conditions.push(`w.slug = ?`)
        params.push(weave)
        countParams.push(weave)
      }

      // Join with looms if filtering by loom
      if (loom) {
        if (!weave) {
          query = `SELECT s.* FROM strands s JOIN looms l ON s.loom_id = l.id`
          countQuery = `SELECT COUNT(*) as total FROM strands s JOIN looms l ON s.loom_id = l.id`
        } else {
          query += ` JOIN looms l ON s.loom_id = l.id`
          countQuery += ` JOIN looms l ON s.loom_id = l.id`
        }
        conditions.push(`l.slug = ?`)
        params.push(loom)
        countParams.push(loom)
      }

      if (status) {
        conditions.push(`s.status = ?`)
        params.push(status)
        countParams.push(status)
      }

      if (tag) {
        conditions.push(`s.tags LIKE ?`)
        params.push(`%"${tag}"%`)
        countParams.push(`%"${tag}"%`)
      }

      if (q) {
        conditions.push(`(s.title LIKE ? OR s.content LIKE ? OR s.summary LIKE ?)`)
        const searchTerm = `%${q}%`
        params.push(searchTerm, searchTerm, searchTerm)
        countParams.push(searchTerm, searchTerm, searchTerm)
      }

      if (conditions.length > 0) {
        const whereClause = ` WHERE ${conditions.join(' AND ')}`
        query += whereClause
        countQuery += whereClause
      }

      query += ` ORDER BY s.updated_at DESC LIMIT ? OFFSET ?`
      params.push(limit, offset)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await db.all(query, params) as any[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countRows = await db.all(countQuery, countParams) as any[]
      const total = countRows?.[0]?.total || 0

      const strands = (rows || []).map(row => ({
        id: row.id,
        weaveId: row.weave_id,
        loomId: row.loom_id,
        slug: row.slug,
        title: row.title,
        path: row.path,
        content: row.content,
        wordCount: row.word_count,
        version: row.version,
        difficulty: row.difficulty,
        status: row.status,
        subjects: parseJsonField(row.subjects),
        topics: parseJsonField(row.topics),
        tags: parseJsonField(row.tags),
        summary: row.summary,
        // Zettelkasten workflow fields
        strandType: row.strand_type || null,
        maturity: parseJsonObject(row.maturity_status),
        qualityChecks: parseJsonObject(row.quality_checks),
        isMOC: row.is_moc === 1 || row.is_moc === true || null,
        mocConfig: parseJsonObject(row.moc_config),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))

      return {
        data: strands,
        meta: {
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + strands.length < total
          }
        }
      }
    }, ttl)

    reply.header('Cache-Control', q ? HttpCachePresets.SEARCH : HttpCachePresets.LIST)
    return result
  })

  fastify.get('/strands/:slug', {
    schema: {
      description: 'Get a specific strand by slug',
      tags: ['Knowledge'],
      params: {
        type: 'object',
        properties: {
          slug: { type: 'string' }
        },
        required: ['slug']
      },
      response: {
        200: { type: 'object', properties: { data: strandSchema } }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const db = await getDatabase()
    if (!db) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE', message: 'Database not available' })
    }

    const { slug } = request.params as { slug: string }
    const cacheKey = entityCacheKey(CachePrefix.STRANDS, slug)

    const result = await withCache(cacheKey, async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await db.all(
        `SELECT * FROM strands WHERE slug = ?`,
        [slug]
      ) as any[]

      if (!rows || rows.length === 0) {
        return null
      }

      const row = rows[0]
      return {
        data: {
          id: row.id,
          weaveId: row.weave_id,
          loomId: row.loom_id,
          slug: row.slug,
          title: row.title,
          path: row.path,
          content: row.content,
          wordCount: row.word_count,
          version: row.version,
          difficulty: row.difficulty,
          status: row.status,
          subjects: parseJsonField(row.subjects),
          topics: parseJsonField(row.topics),
          tags: parseJsonField(row.tags),
          summary: row.summary,
          // Zettelkasten workflow fields
          strandType: row.strand_type || null,
          maturity: parseJsonObject(row.maturity_status),
          qualityChecks: parseJsonObject(row.quality_checks),
          isMOC: row.is_moc === 1 || row.is_moc === true || null,
          mocConfig: parseJsonObject(row.moc_config),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }
      }
    }, CacheTTL.LONG)

    if (!result) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Strand not found' })
    }

    reply.header('Cache-Control', HttpCachePresets.CONTENT)
    return result
  })

  // ========================================================================
  // SEARCH
  // ========================================================================

  fastify.get('/search', {
    schema: {
      description: 'Search across all strands',
      tags: ['Search'],
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search query' },
          weave: { type: 'string', description: 'Filter by weave slug' },
          limit: { type: 'number', default: 20, maximum: 50 }
        },
        required: ['q']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { 
              type: 'array', 
              items: {
                type: 'object',
                properties: {
                  slug: { type: 'string' },
                  title: { type: 'string' },
                  path: { type: 'string' },
                  summary: { type: 'string', nullable: true },
                  snippet: { type: 'string' },
                  score: { type: 'number' }
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                total: { type: 'number' },
                took: { type: 'number' }
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

    const queryParams = request.query as { q: string; weave?: string; limit?: number }
    const startTime = Date.now()
    const { q, weave } = queryParams
    const limit = queryParams.limit || 20

    // Cache search results with shorter TTL
    const cacheKey = generateCacheKey(CachePrefix.SEARCH, { q, weave, limit })

    const result = await withCache(cacheKey, async () => {
      let query = `
        SELECT s.slug, s.title, s.path, s.summary, s.content
        FROM strands s
      `
      const params: (string | number)[] = []

      if (weave) {
        query += ` JOIN weaves w ON s.weave_id = w.id WHERE w.slug = ? AND `
        params.push(weave)
      } else {
        query += ` WHERE `
      }

      query += `(s.title LIKE ? OR s.content LIKE ? OR s.summary LIKE ?)`
      const searchTerm = `%${q}%`
      params.push(searchTerm, searchTerm, searchTerm)
      query += ` LIMIT ?`
      params.push(limit)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await db.all(query, params) as any[]
      const took = Date.now() - startTime

      const results = (rows || []).map(row => {
        // Extract snippet around the match
        let snippet = row.summary || ''
        if (!snippet && row.content) {
          const lowerContent = row.content.toLowerCase()
          const lowerQuery = q.toLowerCase()
          const matchIndex = lowerContent.indexOf(lowerQuery)
          if (matchIndex !== -1) {
            const start = Math.max(0, matchIndex - 50)
            const end = Math.min(row.content.length, matchIndex + q.length + 100)
            snippet = (start > 0 ? '...' : '') + row.content.slice(start, end) + (end < row.content.length ? '...' : '')
          } else {
            snippet = row.content.slice(0, 150) + '...'
          }
        }

        return {
          slug: row.slug,
          title: row.title,
          path: row.path,
          summary: row.summary,
          snippet,
          score: 1.0 // Simple relevance for now
        }
      })

      return {
        data: results,
        meta: {
          query: q,
          total: results.length,
          took
        }
      }
    }, CacheTTL.SHORT) // Short cache for search (30 seconds)

    reply.header('Cache-Control', HttpCachePresets.SEARCH)
    return result
  })
}

