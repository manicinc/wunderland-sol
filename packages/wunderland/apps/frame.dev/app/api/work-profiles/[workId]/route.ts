/**
 * Individual Work Profile API Routes
 *
 * GET /api/work-profiles/[workId] - Get specific profile
 * PATCH /api/work-profiles/[workId] - Update profile
 * DELETE /api/work-profiles/[workId] - Delete profile
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  loadWorkProfile,
  updateWorkProfile,
  deleteWorkProfile,
  loadWorkProfileWithImages,
} from '@/lib/images/workProfileStorage'
import type { WorkStyleProfile } from '@/lib/images/workStyleProfile'

export const runtime = 'nodejs'

// Required for static export - skip generating API route pages
export const dynamicParams = false
export async function generateStaticParams() {
  return []
}

interface RouteContext {
  params: {
    workId: string
  }
}

/**
 * GET - Get specific work profile
 * Query params:
 * - includeImages: boolean (load reference image data URLs)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { workId } = context.params
    const { searchParams } = new URL(request.url)
    const includeImages = searchParams.get('includeImages') === 'true'

    const profile = includeImages
      ? await loadWorkProfileWithImages(workId)
      : await loadWorkProfile(workId)

    if (!profile) {
      return NextResponse.json(
        { error: 'Work profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      profile,
    })
  } catch (error) {
    console.error('[Work Profile API] GET error:', error)

    return NextResponse.json(
      {
        error: 'Failed to load work profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Update work profile
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { workId } = context.params
    const updates: Partial<WorkStyleProfile> = await request.json()

    const updatedProfile = await updateWorkProfile(workId, updates)

    if (!updatedProfile) {
      return NextResponse.json(
        { error: 'Work profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: 'Profile updated successfully',
    })
  } catch (error) {
    console.error('[Work Profile API] PATCH error:', error)

    return NextResponse.json(
      {
        error: 'Failed to update work profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete work profile
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { workId } = context.params

    await deleteWorkProfile(workId)

    return NextResponse.json({
      success: true,
      message: 'Profile deleted successfully',
    })
  } catch (error) {
    console.error('[Work Profile API] DELETE error:', error)

    return NextResponse.json(
      {
        error: 'Failed to delete work profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
