/**
 * Cost Tracking Service
 * @module lib/costs/costTrackingService
 *
 * Records and queries LLM API usage and costs.
 * All data is stored locally via SQLite - nothing is sent to external servers.
 *
 * Features:
 * - Per-request usage logging with costs
 * - Daily/monthly aggregation
 * - Provider breakdown analytics
 * - Cost projections
 */

import { calculateTokenCost, calculateImageCost, formatCost, type LLMProviderName } from './pricingModels'

// ============================================================================
// TYPES
// ============================================================================

export interface UsageRecord {
  id: string
  timestamp: string
  provider: LLMProviderName
  model: string
  operationType: 'chat' | 'completion' | 'embedding' | 'image' | 'vision'
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUsd: number
  requestContext?: {
    feature?: string      // e.g., 'abstractive-summary', 'auto-tag', 'teach-mode'
    strandPath?: string
    sessionId?: string
  }
  durationMs?: number
  success: boolean
  errorMessage?: string
}

export interface ImageUsageRecord {
  id: string
  timestamp: string
  provider: LLMProviderName
  model: string
  size: string
  quality: 'standard' | 'hd'
  count: number
  costUsd: number
  requestContext?: {
    feature?: string
    strandPath?: string
  }
  success: boolean
}

export interface CostSummary {
  totalCost: number
  totalRequests: number
  totalTokens: number
  byProvider: Record<string, {
    cost: number
    requests: number
    tokens: number
    models: Record<string, { cost: number; requests: number; tokens: number }>
  }>
  byDay: Array<{
    date: string
    cost: number
    requests: number
    tokens: number
  }>
  period: {
    start: string
    end: string
    type: 'day' | 'week' | 'month' | 'year' | 'all'
  }
}

export interface DailyCostEntry {
  date: string
  cost: number
  requests: number
  tokens: number
  byProvider: Record<string, number>
}

export interface MonthlyProjection {
  currentSpend: number
  daysElapsed: number
  daysRemaining: number
  projectedMonthly: number
  averageDailyCost: number
}

// ============================================================================
// IN-MEMORY STORAGE (Fallback when DB unavailable)
// ============================================================================

let inMemoryUsage: UsageRecord[] = []
let inMemoryImageUsage: ImageUsageRecord[] = []

/**
 * Reset in-memory storage (for testing)
 */
export function resetInMemoryStorage(): void {
  inMemoryUsage = []
  inMemoryImageUsage = []
}

// ============================================================================
// DATABASE HELPERS
// ============================================================================

/**
 * Get database instance (lazy loaded)
 */
async function getDb(): Promise<any | null> {
  if (typeof window === 'undefined') return null

  try {
    const { getDatabase } = await import('@/lib/codexDatabase')
    return await getDatabase()
  } catch (err) {
    console.warn('[CostTracking] Database not available, using in-memory storage:', err)
    return null
  }
}

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ============================================================================
// RECORDING FUNCTIONS
// ============================================================================

/**
 * Record a token-based LLM API call
 * Call this after every LLM request to track costs
 */
export async function recordTokenUsage(
  provider: LLMProviderName,
  model: string,
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens?: number
    cachedTokens?: number
  },
  options: {
    operationType?: UsageRecord['operationType']
    context?: UsageRecord['requestContext']
    durationMs?: number
    success?: boolean
    errorMessage?: string
  } = {}
): Promise<string | null> {
  const totalTokens = usage.totalTokens ?? (usage.promptTokens + usage.completionTokens)
  const cost = calculateTokenCost(
    provider,
    model,
    usage.promptTokens,
    usage.completionTokens,
    usage.cachedTokens
  )

  const record: UsageRecord = {
    id: generateId('usage'),
    timestamp: new Date().toISOString(),
    provider,
    model,
    operationType: options.operationType || 'chat',
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens,
    costUsd: cost,
    requestContext: options.context,
    durationMs: options.durationMs,
    success: options.success !== false,
    errorMessage: options.errorMessage,
  }

  // Try to save to database
  const db = await getDb()
  if (db) {
    try {
      await db.run(
        `INSERT INTO llm_api_usage (
          id, timestamp, provider, model, operation_type,
          prompt_tokens, completion_tokens, total_tokens, cost_usd,
          request_context, duration_ms, success, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.timestamp,
          record.provider,
          record.model,
          record.operationType,
          record.promptTokens,
          record.completionTokens,
          record.totalTokens,
          record.costUsd,
          record.requestContext ? JSON.stringify(record.requestContext) : null,
          record.durationMs ?? null,
          record.success ? 1 : 0,
          record.errorMessage ?? null,
          record.timestamp,
        ]
      )

      // Update daily aggregates asynchronously
      updateDailyAggregate(record).catch(console.error)
    } catch (err) {
      console.error('[CostTracking] Failed to save to database:', err)
      // Fall back to in-memory
      inMemoryUsage.push(record)
    }
  } else {
    // Use in-memory storage
    inMemoryUsage.push(record)
    // Keep only last 1000 records in memory
    if (inMemoryUsage.length > 1000) {
      inMemoryUsage = inMemoryUsage.slice(-1000)
    }
  }

  return record.id
}

/**
 * Record an image generation API call
 */
export async function recordImageUsage(
  provider: LLMProviderName,
  model: string,
  size: string,
  quality: 'standard' | 'hd' = 'standard',
  count = 1,
  options: {
    context?: ImageUsageRecord['requestContext']
    success?: boolean
  } = {}
): Promise<string | null> {
  const cost = calculateImageCost(provider, model, size, quality, count)

  const record: ImageUsageRecord = {
    id: generateId('img'),
    timestamp: new Date().toISOString(),
    provider,
    model,
    size,
    quality,
    count,
    costUsd: cost,
    requestContext: options.context,
    success: options.success !== false,
  }

  const db = await getDb()
  if (db) {
    try {
      await db.run(
        `INSERT INTO llm_image_usage (
          id, timestamp, provider, model, size, quality, count,
          cost_usd, request_context, success, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.timestamp,
          record.provider,
          record.model,
          record.size,
          record.quality,
          record.count,
          record.costUsd,
          record.requestContext ? JSON.stringify(record.requestContext) : null,
          record.success ? 1 : 0,
          record.timestamp,
        ]
      )
    } catch (err) {
      console.error('[CostTracking] Failed to save image usage:', err)
      inMemoryImageUsage.push(record)
    }
  } else {
    inMemoryImageUsage.push(record)
  }

  return record.id
}

/**
 * Update daily aggregates for faster querying
 */
async function updateDailyAggregate(record: UsageRecord): Promise<void> {
  const db = await getDb()
  if (!db) return

  const dateKey = record.timestamp.split('T')[0]
  const aggId = `agg_day_${dateKey}_${record.provider}_${record.model}`

  try {
    await db.run(
      `INSERT INTO llm_cost_aggregates (
        id, period_type, period_date, provider, model,
        total_requests, total_prompt_tokens, total_completion_tokens,
        total_tokens, total_cost_usd, updated_at
      ) VALUES (?, 'day', ?, ?, ?, 1, ?, ?, ?, ?, ?)
      ON CONFLICT(period_type, period_date, provider, model) DO UPDATE SET
        total_requests = total_requests + 1,
        total_prompt_tokens = total_prompt_tokens + ?,
        total_completion_tokens = total_completion_tokens + ?,
        total_tokens = total_tokens + ?,
        total_cost_usd = total_cost_usd + ?,
        updated_at = ?`,
      [
        aggId,
        dateKey,
        record.provider,
        record.model,
        record.promptTokens,
        record.completionTokens,
        record.totalTokens,
        record.costUsd,
        record.timestamp,
        // For ON CONFLICT UPDATE
        record.promptTokens,
        record.completionTokens,
        record.totalTokens,
        record.costUsd,
        record.timestamp,
      ]
    )
  } catch (err) {
    console.warn('[CostTracking] Failed to update aggregate:', err)
  }
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get cost summary for a time range
 */
export async function getCostSummary(
  range: 'day' | 'week' | 'month' | 'year' | 'all' = 'month'
): Promise<CostSummary> {
  const now = new Date()
  let startDate: Date

  switch (range) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'all':
      startDate = new Date(0)
      break
  }

  const db = await getDb()

  if (!db) {
    // Use in-memory data
    return computeSummaryFromMemory(startDate, now, range)
  }

  try {
    // Query aggregated data
    const rows = await db.all(
      `SELECT
        provider, model,
        SUM(total_requests) as requests,
        SUM(total_tokens) as tokens,
        SUM(total_cost_usd) as cost,
        period_date as date
      FROM llm_cost_aggregates
      WHERE period_type = 'day' AND period_date >= ?
      GROUP BY provider, model, period_date
      ORDER BY period_date ASC`,
      [startDate.toISOString().split('T')[0]]
    )

    return computeSummaryFromRows(rows, startDate, now, range)
  } catch (err) {
    console.error('[CostTracking] Failed to query costs:', err)
    return computeSummaryFromMemory(startDate, now, range)
  }
}

/**
 * Get daily costs for charting
 */
export async function getDailyCosts(days = 30): Promise<DailyCostEntry[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const db = await getDb()

  if (!db) {
    // Compute from in-memory
    return computeDailyCostsFromMemory(startDate)
  }

  try {
    const rows = await db.all(
      `SELECT
        period_date as date,
        provider,
        SUM(total_requests) as requests,
        SUM(total_tokens) as tokens,
        SUM(total_cost_usd) as cost
      FROM llm_cost_aggregates
      WHERE period_type = 'day' AND period_date >= ?
      GROUP BY period_date, provider
      ORDER BY period_date ASC`,
      [startDate.toISOString().split('T')[0]]
    )

    return aggregateDailyRows(rows)
  } catch (err) {
    console.error('[CostTracking] Failed to query daily costs:', err)
    return computeDailyCostsFromMemory(startDate)
  }
}

/**
 * Get current month's running total with projection
 */
export async function getCurrentMonthProjection(): Promise<MonthlyProjection> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const daysElapsed = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysRemaining = daysInMonth - daysElapsed

  const summary = await getCostSummary('month')
  const currentSpend = summary.totalCost
  const averageDailyCost = daysElapsed > 0 ? currentSpend / daysElapsed : 0
  const projectedMonthly = averageDailyCost * daysInMonth

  return {
    currentSpend,
    daysElapsed,
    daysRemaining,
    projectedMonthly,
    averageDailyCost,
  }
}

/**
 * Get provider breakdown for current month
 */
export async function getProviderBreakdown(): Promise<Record<string, {
  cost: number
  percentage: number
  requests: number
  tokens: number
}>> {
  const summary = await getCostSummary('month')
  const totalCost = summary.totalCost || 1 // Avoid division by zero

  const breakdown: Record<string, { cost: number; percentage: number; requests: number; tokens: number }> = {}

  for (const [provider, data] of Object.entries(summary.byProvider)) {
    breakdown[provider] = {
      cost: data.cost,
      percentage: (data.cost / totalCost) * 100,
      requests: data.requests,
      tokens: data.tokens,
    }
  }

  return breakdown
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function computeSummaryFromMemory(startDate: Date, endDate: Date, range: string): CostSummary {
  const filtered = inMemoryUsage.filter(r => {
    const ts = new Date(r.timestamp)
    return ts >= startDate && ts <= endDate
  })

  const byProvider: CostSummary['byProvider'] = {}
  const byDayMap = new Map<string, { cost: number; requests: number; tokens: number }>()

  for (const record of filtered) {
    // By provider
    if (!byProvider[record.provider]) {
      byProvider[record.provider] = { cost: 0, requests: 0, tokens: 0, models: {} }
    }
    byProvider[record.provider].cost += record.costUsd
    byProvider[record.provider].requests += 1
    byProvider[record.provider].tokens += record.totalTokens

    if (!byProvider[record.provider].models[record.model]) {
      byProvider[record.provider].models[record.model] = { cost: 0, requests: 0, tokens: 0 }
    }
    byProvider[record.provider].models[record.model].cost += record.costUsd
    byProvider[record.provider].models[record.model].requests += 1
    byProvider[record.provider].models[record.model].tokens += record.totalTokens

    // By day
    const dateKey = record.timestamp.split('T')[0]
    if (!byDayMap.has(dateKey)) {
      byDayMap.set(dateKey, { cost: 0, requests: 0, tokens: 0 })
    }
    const day = byDayMap.get(dateKey)!
    day.cost += record.costUsd
    day.requests += 1
    day.tokens += record.totalTokens
  }

  const byDay = Array.from(byDayMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalCost: filtered.reduce((sum, r) => sum + r.costUsd, 0),
    totalRequests: filtered.length,
    totalTokens: filtered.reduce((sum, r) => sum + r.totalTokens, 0),
    byProvider,
    byDay,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      type: range as any,
    },
  }
}

function computeSummaryFromRows(
  rows: any[],
  startDate: Date,
  endDate: Date,
  range: string
): CostSummary {
  const byProvider: CostSummary['byProvider'] = {}
  const byDayMap = new Map<string, { cost: number; requests: number; tokens: number }>()
  let totalCost = 0
  let totalRequests = 0
  let totalTokens = 0

  for (const row of rows) {
    totalCost += row.cost || 0
    totalRequests += row.requests || 0
    totalTokens += row.tokens || 0

    // By provider
    if (!byProvider[row.provider]) {
      byProvider[row.provider] = { cost: 0, requests: 0, tokens: 0, models: {} }
    }
    byProvider[row.provider].cost += row.cost || 0
    byProvider[row.provider].requests += row.requests || 0
    byProvider[row.provider].tokens += row.tokens || 0

    if (!byProvider[row.provider].models[row.model]) {
      byProvider[row.provider].models[row.model] = { cost: 0, requests: 0, tokens: 0 }
    }
    byProvider[row.provider].models[row.model].cost += row.cost || 0
    byProvider[row.provider].models[row.model].requests += row.requests || 0
    byProvider[row.provider].models[row.model].tokens += row.tokens || 0

    // By day
    if (row.date) {
      if (!byDayMap.has(row.date)) {
        byDayMap.set(row.date, { cost: 0, requests: 0, tokens: 0 })
      }
      const day = byDayMap.get(row.date)!
      day.cost += row.cost || 0
      day.requests += row.requests || 0
      day.tokens += row.tokens || 0
    }
  }

  const byDay = Array.from(byDayMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalCost,
    totalRequests,
    totalTokens,
    byProvider,
    byDay,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      type: range as any,
    },
  }
}

function computeDailyCostsFromMemory(startDate: Date): DailyCostEntry[] {
  const byDayMap = new Map<string, DailyCostEntry>()

  for (const record of inMemoryUsage) {
    const ts = new Date(record.timestamp)
    if (ts < startDate) continue

    const dateKey = record.timestamp.split('T')[0]
    if (!byDayMap.has(dateKey)) {
      byDayMap.set(dateKey, {
        date: dateKey,
        cost: 0,
        requests: 0,
        tokens: 0,
        byProvider: {},
      })
    }

    const day = byDayMap.get(dateKey)!
    day.cost += record.costUsd
    day.requests += 1
    day.tokens += record.totalTokens
    day.byProvider[record.provider] = (day.byProvider[record.provider] || 0) + record.costUsd
  }

  return Array.from(byDayMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function aggregateDailyRows(rows: any[]): DailyCostEntry[] {
  const byDayMap = new Map<string, DailyCostEntry>()

  for (const row of rows) {
    if (!byDayMap.has(row.date)) {
      byDayMap.set(row.date, {
        date: row.date,
        cost: 0,
        requests: 0,
        tokens: 0,
        byProvider: {},
      })
    }

    const day = byDayMap.get(row.date)!
    day.cost += row.cost || 0
    day.requests += row.requests || 0
    day.tokens += row.tokens || 0
    day.byProvider[row.provider] = (day.byProvider[row.provider] || 0) + (row.cost || 0)
  }

  return Array.from(byDayMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

// ============================================================================
// EXPORTS
// ============================================================================

export { formatCost }
