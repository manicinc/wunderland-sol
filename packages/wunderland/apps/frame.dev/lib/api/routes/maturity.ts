// @ts-nocheck
/**
 * Note Maturity Routes
 * 
 * Endpoints for managing strand maturity status (Zettelkasten workflow).
 * Tracks note progression: fleeting → literature → permanent → evergreen
 * 
 * @module lib/api/routes/maturity
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

type NoteMaturityStatus = 'fleeting' | 'literature' | 'permanent' | 'evergreen'
type FutureValue = 'low' | 'medium' | 'high' | 'core'

interface NoteMaturity {
  status: NoteMaturityStatus
  lastRefinedAt?: string
  refinementCount?: number
  futureValue?: FutureValue
}

interface QualityChecks {
  hasContext?: boolean
  hasConnections?: boolean
  isAtomic?: boolean
  isSelfContained?: boolean
}

// ============================================================================
// SCHEMAS
// ============================================================================

const maturityStatusEnum = ['fleeting', 'literature', 'permanent', 'evergreen']
const futureValueEnum = ['low', 'medium', 'high', 'core']

// Common error response schemas
const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' }
  }
}

const maturitySchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: maturityStatusEnum },
    lastRefinedAt: { type: 'string', format: 'date-time', nullable: true },
    refinementCount: { type: 'number', nullable: true },
    futureValue: { type: 'string', enum: futureValueEnum, nullable: true }
  }
}

const qualityChecksSchema = {
  type: 'object',
  properties: {
    hasContext: { type: 'boolean', nullable: true },
    hasConnections: { type: 'boolean', nullable: true },
    isAtomic: { type: 'boolean', nullable: true },
    isSelfContained: { type: 'boolean', nullable: true }
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

export async function registerMaturityRoutes(fastify: FastifyInstance): Promise<void> {

  // ========================================================================
  // GET STRAND MATURITY
  // ========================================================================

  fastify.get('/strands/:slug/maturity', {
    schema: {
      description: 'Get maturity status and quality checks for a strand',
      tags: ['Maturity'],
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
            strandSlug: { type: 'string' },
            strandPath: { type: 'string' },
            strandTitle: { type: 'string' },
            maturity: maturitySchema,
            qualityChecks: qualityChecksSchema,
            isMOC: { type: 'boolean', nullable: true },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' }, message: { type: 'string' } } },
        503: { type: 'object', properties: { error: { type: 'string' }, message: { type: 'string' } } }
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const db = await getDatabase()
    if (!db) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE', message: 'Database not available' })
    }

    const { slug } = request.params as { slug: string }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await db.all(
      'SELECT slug, path, title, maturity_status, quality_checks, is_moc, updated_at FROM strands WHERE slug = ?',
      [slug]
    ) as any[]

    if (!rows || rows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Strand not found' })
    }

    const row = rows[0]

    reply.header('Cache-Control', HttpCachePresets.CONTENT)
    return {
      strandSlug: row.slug,
      strandPath: row.path,
      strandTitle: row.title,
      maturity: parseJsonObject<NoteMaturity>(row.maturity_status),
      qualityChecks: parseJsonObject<QualityChecks>(row.quality_checks),
      isMOC: row.is_moc === 1 || row.is_moc === true || null,
      updatedAt: row.updated_at
    }
  })

  // ========================================================================
  // UPDATE STRAND MATURITY
  // ========================================================================

  fastify.put('/strands/:slug/maturity', {
    schema: {
      description: 'Update maturity status for a strand',
      tags: ['Maturity'],
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
          status: { type: 'string', enum: maturityStatusEnum },
          futureValue: { type: 'string', enum: futureValueEnum },
          qualityChecks: qualityChecksSchema
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            maturity: maturitySchema,
            qualityChecks: qualityChecksSchema
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
      status?: NoteMaturityStatus
      futureValue?: FutureValue
      qualityChecks?: QualityChecks
    }

    // Get current strand
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await db.all(
      'SELECT id, maturity_status, quality_checks FROM strands WHERE slug = ?',
      [slug]
    ) as any[]

    if (!rows || rows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Strand not found' })
    }

    const strandId = rows[0].id
    const currentMaturity = parseJsonObject<NoteMaturity>(rows[0].maturity_status) || { status: 'fleeting' }
    const currentQuality = parseJsonObject<QualityChecks>(rows[0].quality_checks) || {}

    // Update maturity
    const newMaturity: NoteMaturity = {
      status: body.status || currentMaturity.status,
      lastRefinedAt: new Date().toISOString(),
      refinementCount: (currentMaturity.refinementCount || 0) + 1,
      futureValue: body.futureValue || currentMaturity.futureValue
    }

    // Update quality checks
    const newQuality: QualityChecks = {
      ...currentQuality,
      ...body.qualityChecks
    }

    const now = new Date().toISOString()

    try {
      await db.run(
        `UPDATE strands SET 
          maturity_status = ?, 
          quality_checks = ?,
          updated_at = ?
        WHERE id = ?`,
        [JSON.stringify(newMaturity), JSON.stringify(newQuality), now, strandId]
      )

      // Invalidate cache
      invalidateByPrefix(CachePrefix.STRANDS)

      return {
        success: true,
        message: 'Maturity updated successfully',
        maturity: newMaturity,
        qualityChecks: newQuality
      }
    } catch (error) {
      return reply.status(500).send({
        error: 'UPDATE_FAILED',
        message: 'Failed to update maturity status'
      })
    }
  })

  // ========================================================================
  // GET MATURITY SUMMARY (distribution stats)
  // ========================================================================

  fastify.get('/maturity/summary', {
    schema: {
      description: 'Get maturity distribution statistics across all strands',
      tags: ['Maturity'],
      response: {
        200: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            byStatus: {
              type: 'object',
              properties: {
                fleeting: { type: 'number' },
                literature: { type: 'number' },
                permanent: { type: 'number' },
                evergreen: { type: 'number' },
                unknown: { type: 'number' }
              }
            },
            byFutureValue: {
              type: 'object',
              properties: {
                low: { type: 'number' },
                medium: { type: 'number' },
                high: { type: 'number' },
                core: { type: 'number' },
                unset: { type: 'number' }
              }
            },
            qualityStats: {
              type: 'object',
              properties: {
                withContext: { type: 'number' },
                withConnections: { type: 'number' },
                atomic: { type: 'number' },
                selfContained: { type: 'number' }
              }
            },
            averageRefinementCount: { type: 'number' },
            mocCount: { type: 'number' }
          }
        },
        503: errorResponseSchema
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const db = await getDatabase()
    if (!db) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE', message: 'Database not available' })
    }

    const cacheKey = generateCacheKey(CachePrefix.STRANDS, { maturitySummary: true })

    const result = await withCache(cacheKey, async () => {
      // Get all strands with maturity data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await db.all(
        'SELECT maturity_status, quality_checks, is_moc FROM strands'
      ) as any[]

      const byStatus = {
        fleeting: 0,
        literature: 0,
        permanent: 0,
        evergreen: 0,
        unknown: 0
      }

      const byFutureValue = {
        low: 0,
        medium: 0,
        high: 0,
        core: 0,
        unset: 0
      }

      const qualityStats = {
        withContext: 0,
        withConnections: 0,
        atomic: 0,
        selfContained: 0
      }

      let totalRefinementCount = 0
      let refinementCountEntries = 0
      let mocCount = 0

      for (const row of rows || []) {
        const maturity = parseJsonObject<NoteMaturity>(row.maturity_status)
        const quality = parseJsonObject<QualityChecks>(row.quality_checks)

        // Count by status
        if (maturity?.status && maturity.status in byStatus) {
          byStatus[maturity.status as NoteMaturityStatus]++
        } else {
          byStatus.unknown++
        }

        // Count by future value
        if (maturity?.futureValue && maturity.futureValue in byFutureValue) {
          byFutureValue[maturity.futureValue as FutureValue]++
        } else {
          byFutureValue.unset++
        }

        // Count refinements
        if (maturity?.refinementCount) {
          totalRefinementCount += maturity.refinementCount
          refinementCountEntries++
        }

        // Count quality checks
        if (quality?.hasContext) qualityStats.withContext++
        if (quality?.hasConnections) qualityStats.withConnections++
        if (quality?.isAtomic) qualityStats.atomic++
        if (quality?.isSelfContained) qualityStats.selfContained++

        // Count MOCs
        if (row.is_moc === 1 || row.is_moc === true) mocCount++
      }

      const averageRefinementCount = refinementCountEntries > 0
        ? Math.round((totalRefinementCount / refinementCountEntries) * 100) / 100
        : 0

      return {
        total: rows?.length || 0,
        byStatus,
        byFutureValue,
        qualityStats,
        averageRefinementCount,
        mocCount
      }
    }, CacheTTL.MEDIUM)

    reply.header('Cache-Control', HttpCachePresets.LIST)
    return result
  })

  // ========================================================================
  // GET STRANDS BY MATURITY STATUS
  // ========================================================================

  fastify.get('/maturity/:status', {
    schema: {
      description: 'Get all strands with a specific maturity status',
      tags: ['Maturity'],
      params: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: maturityStatusEnum }
        },
        required: ['status']
      },
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
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  slug: { type: 'string' },
                  path: { type: 'string' },
                  title: { type: 'string' },
                  maturity: maturitySchema,
                  qualityChecks: qualityChecksSchema,
                  updatedAt: { type: 'string', format: 'date-time' }
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                total: { type: 'number' },
                limit: { type: 'number' },
                offset: { type: 'number' }
              }
            }
          }
        },
        503: errorResponseSchema
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const db = await getDatabase()
    if (!db) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE', message: 'Database not available' })
    }

    const { status } = request.params as { status: NoteMaturityStatus }
    const query = request.query as { limit?: number; offset?: number }
    const limit = query.limit || 50
    const offset = query.offset || 0

    const cacheKey = generateCacheKey(CachePrefix.STRANDS, { maturityStatus: status, limit, offset })

    const result = await withCache(cacheKey, async () => {
      // SQLite JSON extraction - find strands where maturity_status JSON contains the status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await db.all(
        `SELECT slug, path, title, maturity_status, quality_checks, updated_at 
         FROM strands 
         WHERE maturity_status LIKE ?
         ORDER BY updated_at DESC
         LIMIT ? OFFSET ?`,
        [`%"status":"${status}"%`, limit, offset]
      ) as any[]

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countRows = await db.all(
        `SELECT COUNT(*) as total FROM strands WHERE maturity_status LIKE ?`,
        [`%"status":"${status}"%`]
      ) as any[]
      const total = countRows?.[0]?.total || 0

      const strands = (rows || []).map(row => ({
        slug: row.slug,
        path: row.path,
        title: row.title,
        maturity: parseJsonObject<NoteMaturity>(row.maturity_status),
        qualityChecks: parseJsonObject<QualityChecks>(row.quality_checks),
        updatedAt: row.updated_at
      }))

      return {
        data: strands,
        meta: {
          status,
          total,
          limit,
          offset
        }
      }
    }, CacheTTL.MEDIUM)

    reply.header('Cache-Control', HttpCachePresets.LIST)
    return result
  })

  // ========================================================================
  // UPDATE QUALITY CHECKS
  // ========================================================================

  fastify.put('/strands/:slug/quality', {
    schema: {
      description: 'Update quality checks for a strand',
      tags: ['Maturity'],
      params: {
        type: 'object',
        properties: {
          slug: { type: 'string' }
        },
        required: ['slug']
      },
      body: qualityChecksSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            qualityChecks: qualityChecksSchema
          }
        },
        404: errorResponseSchema,
        503: errorResponseSchema
      }
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    const db = await getDatabase()
    if (!db) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE', message: 'Database not available' })
    }

    const { slug } = request.params as { slug: string }
    const body = request.body as QualityChecks

    // Get current strand
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await db.all(
      'SELECT id, quality_checks FROM strands WHERE slug = ?',
      [slug]
    ) as any[]

    if (!rows || rows.length === 0) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Strand not found' })
    }

    const strandId = rows[0].id
    const currentQuality = parseJsonObject<QualityChecks>(rows[0].quality_checks) || {}

    // Merge quality checks
    const newQuality: QualityChecks = {
      ...currentQuality,
      ...body
    }

    const now = new Date().toISOString()

    try {
      await db.run(
        `UPDATE strands SET quality_checks = ?, updated_at = ? WHERE id = ?`,
        [JSON.stringify(newQuality), now, strandId]
      )

      // Invalidate cache
      invalidateByPrefix(CachePrefix.STRANDS)

      return {
        success: true,
        message: 'Quality checks updated successfully',
        qualityChecks: newQuality
      }
    } catch (error) {
      return reply.status(500).send({
        error: 'UPDATE_FAILED',
        message: 'Failed to update quality checks'
      })
    }
  })
}

