/**
 * Work Profiles API Routes
 *
 * GET /api/work-profiles - List all profiles
 * POST /api/work-profiles - Create new profile
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  listAllWorkProfiles,
  saveWorkProfile,
  getRecentWorkProfiles,
  searchWorkProfiles,
  getWorkProfileStats,
} from '@/lib/images/workProfileStorage'
import type { WorkStyleProfile } from '@/lib/images/workStyleProfile'

export const runtime = 'nodejs'

/**
 * GET - List work profiles
 * Query params:
 * - limit: number (default: 10)
 * - search: string (optional)
 * - stats: boolean (include stats)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const searchQuery = searchParams.get('search')
    const includeStats = searchParams.get('stats') === 'true'

    let profiles: WorkStyleProfile[]

    if (searchQuery) {
      profiles = await searchWorkProfiles(searchQuery)
    } else {
      profiles = await getRecentWorkProfiles(limit)
    }

    const response: any = {
      success: true,
      profiles,
      count: profiles.length,
    }

    if (includeStats) {
      response.stats = await getWorkProfileStats()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Work Profiles API] GET error:', error)

    return NextResponse.json(
      {
        error: 'Failed to list work profiles',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Create or update work profile
 */
export async function POST(request: NextRequest) {
  try {
    const profile: WorkStyleProfile = await request.json()

    // Validate profile
    if (!profile.workId || !profile.workTitle) {
      return NextResponse.json(
        { error: 'Missing required fields: workId, workTitle' },
        { status: 400 }
      )
    }

    // Save profile
    await saveWorkProfile(profile)

    return NextResponse.json({
      success: true,
      workId: profile.workId,
      message: 'Profile saved successfully',
    })
  } catch (error) {
    console.error('[Work Profiles API] POST error:', error)

    return NextResponse.json(
      {
        error: 'Failed to save work profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
