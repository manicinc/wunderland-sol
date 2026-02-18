/**
 * Lifecycle Store
 * 
 * SQLite operations for strand lifecycle tracking and decay calculations.
 * Tracks strand access events, calculates decay scores, and determines lifecycle stages.
 * 
 * @module lib/analytics/lifecycleStore
 */

import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../codexDatabase'
import type { StorageAdapter } from '@framers/sql-storage-adapter'
import type {
  StrandLifecycle,
  StrandLifecycleWithMeta,
  LifecycleSettings,
  LifecycleEvent,
  LifecycleEventType,
  LifecycleStage,
  LifecycleStats,
  LifecycleTimeSeriesPoint,
  ResurfaceSuggestion,
  RitualSession,
} from './lifecycleTypes'
import { DEFAULT_LIFECYCLE_SETTINGS } from './lifecycleTypes'
import { differenceInDays, parseISO, format, subDays, startOfDay } from 'date-fns'

// ============================================================================
// SCHEMA INITIALIZATION
// ============================================================================

let schemaInitialized = false

/**
 * Initialize lifecycle tables in the database
 */
export async function initLifecycleSchema(db: StorageAdapter): Promise<void> {
  if (schemaInitialized) return

  // Strand lifecycle tracking table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS strand_lifecycle (
      strand_path TEXT PRIMARY KEY,
      stage TEXT NOT NULL DEFAULT 'fresh',
      decay_score REAL NOT NULL DEFAULT 100,
      last_accessed_at TEXT NOT NULL,
      view_count INTEGER NOT NULL DEFAULT 0,
      edit_count INTEGER NOT NULL DEFAULT 0,
      connection_count INTEGER NOT NULL DEFAULT 0,
      engagement_score REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_lifecycle_stage ON strand_lifecycle(stage)
  `)

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_lifecycle_decay ON strand_lifecycle(decay_score)
  `)

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_lifecycle_accessed ON strand_lifecycle(last_accessed_at)
  `)

  // Lifecycle events table for tracking individual events
  await db.exec(`
    CREATE TABLE IF NOT EXISTS lifecycle_events (
      id TEXT PRIMARY KEY,
      strand_path TEXT NOT NULL,
      event_type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      metadata TEXT
    )
  `)

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_lifecycle_events_strand ON lifecycle_events(strand_path)
  `)

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_lifecycle_events_timestamp ON lifecycle_events(timestamp)
  `)

  // Ritual sessions table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ritual_sessions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      surfaced_strands TEXT,
      reviewed_strands TEXT,
      intentions TEXT,
      reflections TEXT,
      connections_formed TEXT
    )
  `)

  schemaInitialized = true
  console.log('[LifecycleStore] ✅ Schema initialized')
}

// ============================================================================
// DECAY CALCULATION
// ============================================================================

/**
 * Calculate the time-based decay factor (0-100)
 * 100 = just accessed, decays toward 0 over fadeThresholdDays
 */
function calculateTimeDecay(
  lastAccessedAt: string,
  settings: LifecycleSettings
): number {
  const daysSinceAccess = differenceInDays(new Date(), parseISO(lastAccessedAt))
  
  if (daysSinceAccess <= 0) return 100
  if (daysSinceAccess >= settings.fadeThresholdDays) return 0
  
  // Linear decay from 100 to 0 over fadeThresholdDays
  const decayRate = 100 / settings.fadeThresholdDays
  return Math.max(0, 100 - (daysSinceAccess * decayRate))
}

/**
 * Calculate the engagement score (0-100) based on views, edits, and connections
 */
function calculateEngagementScore(
  viewCount: number,
  editCount: number,
  connectionCount: number
): number {
  // Weighted scoring: edits are most valuable, then connections, then views
  const viewWeight = 0.2
  const editWeight = 0.5
  const connectionWeight = 0.3

  // Clamp negative values to 0 (can't have negative engagement)
  const safeViews = Math.max(0, viewCount)
  const safeEdits = Math.max(0, editCount)
  const safeConnections = Math.max(0, connectionCount)

  // Normalize each metric (cap at reasonable maximums)
  const normalizedViews = Math.min(safeViews / 50, 1) * 100
  const normalizedEdits = Math.min(safeEdits / 20, 1) * 100
  const normalizedConnections = Math.min(safeConnections / 10, 1) * 100

  return (
    normalizedViews * viewWeight +
    normalizedEdits * editWeight +
    normalizedConnections * connectionWeight
  )
}

/**
 * Calculate the overall decay score combining time and engagement
 */
function calculateDecayScore(
  lastAccessedAt: string,
  viewCount: number,
  editCount: number,
  connectionCount: number,
  settings: LifecycleSettings
): number {
  const timeDecay = calculateTimeDecay(lastAccessedAt, settings)
  const engagementScore = calculateEngagementScore(viewCount, editCount, connectionCount)
  
  // Combine: time decay weighted against engagement
  // Higher engagement slows decay
  const decayScore = 
    timeDecay * (1 - settings.engagementWeight) + 
    engagementScore * settings.engagementWeight
  
  return Math.round(decayScore * 100) / 100
}

/**
 * Determine lifecycle stage based on decay score and settings
 */
function determineStage(
  decayScore: number,
  daysSinceAccess: number,
  settings: LifecycleSettings
): LifecycleStage {
  // Fresh: accessed within freshThresholdDays and high engagement
  if (daysSinceAccess <= settings.freshThresholdDays && decayScore >= 70) {
    return 'fresh'
  }
  
  // Faded: low decay score or beyond fade threshold
  if (decayScore < 30 || daysSinceAccess > settings.fadeThresholdDays) {
    return 'faded'
  }
  
  // Active: everything in between
  return 'active'
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Get or create lifecycle record for a strand
 */
export async function getOrCreateLifecycle(
  strandPath: string,
  settings: LifecycleSettings = DEFAULT_LIFECYCLE_SETTINGS
): Promise<StrandLifecycle | null> {
  const db = await getDatabase()
  if (!db) return null

  await initLifecycleSchema(db)

  try {
    const rows = await db.all(
      'SELECT * FROM strand_lifecycle WHERE strand_path = ?',
      [strandPath]
    )

    if (rows.length > 0) {
      const row = rows[0] as Record<string, unknown>
      return mapRowToLifecycle(row)
    }

    // Create new lifecycle record
    const now = new Date().toISOString()
    const lifecycle: StrandLifecycle = {
      strandPath,
      stage: 'fresh',
      decayScore: 100,
      lastAccessedAt: now,
      viewCount: 0,
      editCount: 0,
      connectionCount: 0,
      engagementScore: 0,
      createdAt: now,
      updatedAt: now,
    }

    await db.run(
      `INSERT INTO strand_lifecycle (
        strand_path, stage, decay_score, last_accessed_at,
        view_count, edit_count, connection_count, engagement_score,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lifecycle.strandPath,
        lifecycle.stage,
        lifecycle.decayScore,
        lifecycle.lastAccessedAt,
        lifecycle.viewCount,
        lifecycle.editCount,
        lifecycle.connectionCount,
        lifecycle.engagementScore,
        lifecycle.createdAt,
        lifecycle.updatedAt,
      ]
    )

    return lifecycle
  } catch (error) {
    console.error('[LifecycleStore] Failed to get/create lifecycle:', error)
    return null
  }
}

/**
 * Record a lifecycle event (view, edit, link, etc.)
 */
export async function recordLifecycleEvent(
  strandPath: string,
  eventType: LifecycleEventType,
  metadata?: Record<string, unknown>,
  settings: LifecycleSettings = DEFAULT_LIFECYCLE_SETTINGS
): Promise<StrandLifecycle | null> {
  const db = await getDatabase()
  if (!db) return null

  await initLifecycleSchema(db)

  try {
    const now = new Date().toISOString()
    
    // Insert event record
    const event: LifecycleEvent = {
      id: uuidv4(),
      strandPath,
      eventType,
      timestamp: now,
      metadata,
    }

    await db.run(
      `INSERT INTO lifecycle_events (id, strand_path, event_type, timestamp, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [event.id, event.strandPath, event.eventType, event.timestamp, JSON.stringify(metadata || {})]
    )

    // Get or create lifecycle record
    let lifecycle = await getOrCreateLifecycle(strandPath, settings)
    if (!lifecycle) return null

    // Update counts based on event type
    let viewCount = lifecycle.viewCount
    let editCount = lifecycle.editCount
    let connectionCount = lifecycle.connectionCount

    switch (eventType) {
      case 'view':
        viewCount++
        break
      case 'edit':
        editCount++
        break
      case 'link_added':
        connectionCount++
        break
      case 'link_removed':
        connectionCount = Math.max(0, connectionCount - 1)
        break
      case 'resurfaced':
      case 'ritual_review':
        // These reset the access time but don't increment counts
        break
    }

    // Recalculate scores
    const engagementScore = calculateEngagementScore(viewCount, editCount, connectionCount)
    const decayScore = calculateDecayScore(now, viewCount, editCount, connectionCount, settings)
    const daysSinceAccess = 0 // Just accessed
    const stage = determineStage(decayScore, daysSinceAccess, settings)

    // Update lifecycle record
    await db.run(
      `UPDATE strand_lifecycle SET
        stage = ?,
        decay_score = ?,
        last_accessed_at = ?,
        view_count = ?,
        edit_count = ?,
        connection_count = ?,
        engagement_score = ?,
        updated_at = ?
       WHERE strand_path = ?`,
      [stage, decayScore, now, viewCount, editCount, connectionCount, engagementScore, now, strandPath]
    )

    return {
      ...lifecycle,
      stage,
      decayScore,
      lastAccessedAt: now,
      viewCount,
      editCount,
      connectionCount,
      engagementScore,
      updatedAt: now,
    }
  } catch (error) {
    console.error('[LifecycleStore] Failed to record event:', error)
    return null
  }
}

/**
 * Get all lifecycle records
 */
export async function getAllLifecycles(
  settings: LifecycleSettings = DEFAULT_LIFECYCLE_SETTINGS
): Promise<StrandLifecycleWithMeta[]> {
  const db = await getDatabase()
  if (!db) return []

  await initLifecycleSchema(db)

  try {
    const rows = await db.all('SELECT * FROM strand_lifecycle ORDER BY last_accessed_at DESC')
    
    return (rows as Record<string, unknown>[]).map(row => {
      const lifecycle = mapRowToLifecycle(row)
      return enrichLifecycle(lifecycle, settings)
    })
  } catch (error) {
    console.error('[LifecycleStore] Failed to get all lifecycles:', error)
    return []
  }
}

/**
 * Get lifecycles by stage
 */
export async function getLifecyclesByStage(
  stage: LifecycleStage,
  settings: LifecycleSettings = DEFAULT_LIFECYCLE_SETTINGS
): Promise<StrandLifecycleWithMeta[]> {
  const db = await getDatabase()
  if (!db) return []

  await initLifecycleSchema(db)

  try {
    const rows = await db.all(
      'SELECT * FROM strand_lifecycle WHERE stage = ? ORDER BY decay_score DESC',
      [stage]
    )
    
    return (rows as Record<string, unknown>[]).map(row => {
      const lifecycle = mapRowToLifecycle(row)
      return enrichLifecycle(lifecycle, settings)
    })
  } catch (error) {
    console.error('[LifecycleStore] Failed to get lifecycles by stage:', error)
    return []
  }
}

/**
 * Get strands at risk of fading (active with low decay score)
 */
export async function getAtRiskStrands(
  settings: LifecycleSettings = DEFAULT_LIFECYCLE_SETTINGS,
  limit: number = 10
): Promise<StrandLifecycleWithMeta[]> {
  const db = await getDatabase()
  if (!db) return []

  await initLifecycleSchema(db)

  try {
    // Active strands with decay score between 30-50 are at risk
    const rows = await db.all(
      `SELECT * FROM strand_lifecycle 
       WHERE stage = 'active' AND decay_score BETWEEN 30 AND 50
       ORDER BY decay_score ASC
       LIMIT ?`,
      [limit]
    )
    
    return (rows as Record<string, unknown>[]).map(row => {
      const lifecycle = mapRowToLifecycle(row)
      return enrichLifecycle(lifecycle, settings)
    })
  } catch (error) {
    console.error('[LifecycleStore] Failed to get at-risk strands:', error)
    return []
  }
}

/**
 * Get resurface suggestions (faded strands connected to recent activity)
 */
export async function getResurfaceSuggestions(
  settings: LifecycleSettings = DEFAULT_LIFECYCLE_SETTINGS,
  recentStrandPaths: string[] = []
): Promise<ResurfaceSuggestion[]> {
  const db = await getDatabase()
  if (!db) return []

  await initLifecycleSchema(db)

  try {
    // Get faded strands with some connection count
    const rows = await db.all(
      `SELECT * FROM strand_lifecycle 
       WHERE stage = 'faded' AND connection_count > 0
       ORDER BY engagement_score DESC
       LIMIT ?`,
      [settings.resurfaceLimit]
    )
    
    const fadedStrands = (rows as Record<string, unknown>[]).map(row => {
      const lifecycle = mapRowToLifecycle(row)
      return enrichLifecycle(lifecycle, settings)
    })

    // Create suggestions with reasons
    return fadedStrands.map(strand => ({
      strand,
      reason: strand.connectionCount > 5 
        ? 'Well-connected note that may have insights'
        : strand.editCount > 10
          ? 'Heavily edited note worth revisiting'
          : 'Has connections to your knowledge base',
      relevanceScore: strand.engagementScore,
      connectedTags: [], // Would need to join with strand tags
      connectedStrands: [], // Would need to query connections
    }))
  } catch (error) {
    console.error('[LifecycleStore] Failed to get resurface suggestions:', error)
    return []
  }
}

/**
 * Resurface a strand (reset its lifecycle to fresh)
 */
export async function resurfaceStrand(
  strandPath: string,
  settings: LifecycleSettings = DEFAULT_LIFECYCLE_SETTINGS
): Promise<StrandLifecycle | null> {
  return recordLifecycleEvent(strandPath, 'resurfaced', { action: 'manual_resurface' }, settings)
}

/**
 * Update all lifecycle stages and decay scores (batch recalculation)
 */
export async function recalculateAllLifecycles(
  settings: LifecycleSettings = DEFAULT_LIFECYCLE_SETTINGS
): Promise<number> {
  const db = await getDatabase()
  if (!db) return 0

  await initLifecycleSchema(db)

  try {
    const rows = await db.all('SELECT * FROM strand_lifecycle')
    let updated = 0

    for (const row of rows as Record<string, unknown>[]) {
      const lifecycle = mapRowToLifecycle(row)
      
      const decayScore = calculateDecayScore(
        lifecycle.lastAccessedAt,
        lifecycle.viewCount,
        lifecycle.editCount,
        lifecycle.connectionCount,
        settings
      )
      
      const daysSinceAccess = differenceInDays(new Date(), parseISO(lifecycle.lastAccessedAt))
      const stage = determineStage(decayScore, daysSinceAccess, settings)
      
      if (decayScore !== lifecycle.decayScore || stage !== lifecycle.stage) {
        await db.run(
          `UPDATE strand_lifecycle SET stage = ?, decay_score = ?, updated_at = ? WHERE strand_path = ?`,
          [stage, decayScore, new Date().toISOString(), lifecycle.strandPath]
        )
        updated++
      }
    }

    console.log(`[LifecycleStore] Recalculated ${updated} lifecycle records`)
    return updated
  } catch (error) {
    console.error('[LifecycleStore] Failed to recalculate lifecycles:', error)
    return 0
  }
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get aggregate lifecycle statistics
 */
export async function getLifecycleStats(
  settings: LifecycleSettings = DEFAULT_LIFECYCLE_SETTINGS
): Promise<LifecycleStats> {
  const db = await getDatabase()
  const defaultStats: LifecycleStats = {
    totalStrands: 0,
    byStage: { fresh: 0, active: 0, faded: 0 },
    percentageByStage: { fresh: 0, active: 0, faded: 0 },
    averageDecayScore: 0,
    atRiskCount: 0,
    resurfaceSuggestionCount: 0,
    lastActivityAt: null,
  }

  if (!db) return defaultStats

  await initLifecycleSchema(db)

  try {
    // Total count
    const totalResult = await db.all('SELECT COUNT(*) as count FROM strand_lifecycle')
    const totalStrands = (totalResult[0] as Record<string, number>)?.count || 0

    if (totalStrands === 0) return defaultStats

    // Count by stage
    const stageResults = await db.all(`
      SELECT stage, COUNT(*) as count 
      FROM strand_lifecycle 
      GROUP BY stage
    `)

    const byStage: Record<LifecycleStage, number> = { fresh: 0, active: 0, faded: 0 }
    for (const row of stageResults as Record<string, unknown>[]) {
      const stage = row.stage as LifecycleStage
      byStage[stage] = row.count as number
    }

    // Average decay score
    const avgResult = await db.all('SELECT AVG(decay_score) as avg FROM strand_lifecycle')
    const averageDecayScore = Math.round(((avgResult[0] as Record<string, number>)?.avg || 0) * 100) / 100

    // At risk count
    const atRiskResult = await db.all(`
      SELECT COUNT(*) as count FROM strand_lifecycle 
      WHERE stage = 'active' AND decay_score BETWEEN 30 AND 50
    `)
    const atRiskCount = (atRiskResult[0] as Record<string, number>)?.count || 0

    // Resurface suggestions count
    const resurfaceResult = await db.all(`
      SELECT COUNT(*) as count FROM strand_lifecycle 
      WHERE stage = 'faded' AND connection_count > 0
    `)
    const resurfaceSuggestionCount = Math.min(
      (resurfaceResult[0] as Record<string, number>)?.count || 0,
      settings.resurfaceLimit
    )

    // Last activity
    const lastActivityResult = await db.all(`
      SELECT MAX(last_accessed_at) as last FROM strand_lifecycle
    `)
    const lastActivityAt = (lastActivityResult[0] as Record<string, string>)?.last || null

    return {
      totalStrands,
      byStage,
      percentageByStage: {
        fresh: Math.round((byStage.fresh / totalStrands) * 100),
        active: Math.round((byStage.active / totalStrands) * 100),
        faded: Math.round((byStage.faded / totalStrands) * 100),
      },
      averageDecayScore,
      atRiskCount,
      resurfaceSuggestionCount,
      lastActivityAt,
    }
  } catch (error) {
    console.error('[LifecycleStore] Failed to get stats:', error)
    return defaultStats
  }
}

/**
 * Get lifecycle time series data for charts
 */
export async function getLifecycleTimeSeries(
  days: number = 30
): Promise<LifecycleTimeSeriesPoint[]> {
  const db = await getDatabase()
  if (!db) return []

  await initLifecycleSchema(db)

  try {
    const results: LifecycleTimeSeriesPoint[] = []
    const today = startOfDay(new Date())

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const endOfDayStr = format(date, "yyyy-MM-dd'T'23:59:59.999'Z'")

      // Count strands that existed by this date (created_at <= date)
      const existingRows = await db.all(`
        SELECT stage, COUNT(*) as count 
        FROM strand_lifecycle 
        WHERE created_at <= ?
        GROUP BY stage
      `, [endOfDayStr])

      const counts: Record<LifecycleStage, number> = { fresh: 0, active: 0, faded: 0 }
      for (const row of existingRows as Record<string, unknown>[]) {
        counts[row.stage as LifecycleStage] = row.count as number
      }

      results.push({
        date: dateStr,
        fresh: counts.fresh,
        active: counts.active,
        faded: counts.faded,
        total: counts.fresh + counts.active + counts.faded,
      })
    }

    return results
  } catch (error) {
    console.error('[LifecycleStore] Failed to get time series:', error)
    return []
  }
}

// ============================================================================
// RITUAL SESSIONS
// ============================================================================

/**
 * Create a new ritual session
 */
export async function createRitualSession(
  type: 'morning' | 'evening'
): Promise<RitualSession | null> {
  const db = await getDatabase()
  if (!db) return null

  await initLifecycleSchema(db)

  try {
    const session: RitualSession = {
      id: uuidv4(),
      type,
      startedAt: new Date().toISOString(),
      surfacedStrands: [],
      reviewedStrands: [],
      connectionsFormed: [],
    }

    await db.run(
      `INSERT INTO ritual_sessions (id, type, started_at, surfaced_strands, reviewed_strands, connections_formed)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [session.id, session.type, session.startedAt, '[]', '[]', '[]']
    )

    return session
  } catch (error) {
    console.error('[LifecycleStore] Failed to create ritual session:', error)
    return null
  }
}

/**
 * Complete a ritual session
 */
export async function completeRitualSession(
  sessionId: string,
  data: Partial<Pick<RitualSession, 'reviewedStrands' | 'intentions' | 'reflections' | 'connectionsFormed'>>
): Promise<RitualSession | null> {
  const db = await getDatabase()
  if (!db) return null

  try {
    const now = new Date().toISOString()

    await db.run(
      `UPDATE ritual_sessions SET
        completed_at = ?,
        reviewed_strands = ?,
        intentions = ?,
        reflections = ?,
        connections_formed = ?
       WHERE id = ?`,
      [
        now,
        JSON.stringify(data.reviewedStrands || []),
        JSON.stringify(data.intentions || []),
        JSON.stringify(data.reflections || []),
        JSON.stringify(data.connectionsFormed || []),
        sessionId,
      ]
    )

    // Mark reviewed strands as accessed
    const settings = DEFAULT_LIFECYCLE_SETTINGS
    for (const strandPath of data.reviewedStrands || []) {
      await recordLifecycleEvent(strandPath, 'ritual_review', { sessionId }, settings)
    }

    const rows = await db.all('SELECT * FROM ritual_sessions WHERE id = ?', [sessionId])
    if (rows.length === 0) return null

    return mapRowToRitualSession(rows[0] as Record<string, unknown>)
  } catch (error) {
    console.error('[LifecycleStore] Failed to complete ritual session:', error)
    return null
  }
}

/**
 * Get recent ritual sessions
 */
export async function getRecentRitualSessions(
  limit: number = 10
): Promise<RitualSession[]> {
  const db = await getDatabase()
  if (!db) return []

  await initLifecycleSchema(db)

  try {
    const rows = await db.all(
      'SELECT * FROM ritual_sessions ORDER BY started_at DESC LIMIT ?',
      [limit]
    )

    return (rows as Record<string, unknown>[]).map(mapRowToRitualSession)
  } catch (error) {
    console.error('[LifecycleStore] Failed to get ritual sessions:', error)
    return []
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Map a database row to a StrandLifecycle object
 */
function mapRowToLifecycle(row: Record<string, unknown>): StrandLifecycle {
  return {
    strandPath: row.strand_path as string,
    stage: row.stage as LifecycleStage,
    decayScore: row.decay_score as number,
    lastAccessedAt: row.last_accessed_at as string,
    viewCount: row.view_count as number,
    editCount: row.edit_count as number,
    connectionCount: row.connection_count as number,
    engagementScore: row.engagement_score as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

/**
 * Enrich a lifecycle with computed fields
 */
function enrichLifecycle(
  lifecycle: StrandLifecycle,
  settings: LifecycleSettings
): StrandLifecycleWithMeta {
  const daysSinceAccess = differenceInDays(new Date(), parseISO(lifecycle.lastAccessedAt))
  const pathParts = lifecycle.strandPath.split('/')
  const title = pathParts[pathParts.length - 1]?.replace(/\.md$/, '') || lifecycle.strandPath

  return {
    ...lifecycle,
    title,
    daysSinceAccess,
    atRisk: lifecycle.stage === 'active' && lifecycle.decayScore < 50,
    suggestResurface: lifecycle.stage === 'faded' && lifecycle.connectionCount > 0,
  }
}

/**
 * Map a database row to a RitualSession object
 */
function mapRowToRitualSession(row: Record<string, unknown>): RitualSession {
  return {
    id: row.id as string,
    type: row.type as 'morning' | 'evening',
    startedAt: row.started_at as string,
    completedAt: row.completed_at as string | undefined,
    surfacedStrands: JSON.parse((row.surfaced_strands as string) || '[]'),
    reviewedStrands: JSON.parse((row.reviewed_strands as string) || '[]'),
    intentions: row.intentions ? JSON.parse(row.intentions as string) : undefined,
    reflections: row.reflections ? JSON.parse(row.reflections as string) : undefined,
    connectionsFormed: JSON.parse((row.connections_formed as string) || '[]'),
  }
}

