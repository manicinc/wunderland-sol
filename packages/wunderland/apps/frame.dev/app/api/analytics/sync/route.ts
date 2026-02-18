/**
 * Analytics Git Sync API
 * @module api/analytics/sync
 *
 * POST: Triggers git history sync to populate analytics data
 * GET: Check sync status
 */

import { NextResponse } from 'next/server'
import {
  syncGitHistoryToAnalytics,
  isSyncNeeded,
  getLastSyncTime,
} from '@/lib/analytics/gitHistorySync'

/**
 * POST /api/analytics/sync
 * Trigger git history sync
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const force = body.force === true

    const result = await syncGitHistoryToAnalytics({ force })

    return NextResponse.json({
      success: result.success,
      strandsPopulated: result.strandsPopulated,
      commitsRecorded: result.commitsRecorded,
      syncedAt: result.syncedAt.toISOString(),
      errors: result.errors,
    })
  } catch (error) {
    console.error('[API] Analytics sync failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/analytics/sync
 * Check if sync is needed and get last sync time
 */
export async function GET() {
  try {
    const syncNeeded = isSyncNeeded()
    const lastSyncTime = getLastSyncTime()

    return NextResponse.json({
      syncNeeded,
      lastSyncTime: lastSyncTime?.toISOString() || null,
    })
  } catch (error) {
    console.error('[API] Analytics sync status check failed:', error)
    return NextResponse.json(
      {
        syncNeeded: true,
        lastSyncTime: null,
        error: error instanceof Error ? error.message : 'Status check failed',
      },
      { status: 500 }
    )
  }
}
