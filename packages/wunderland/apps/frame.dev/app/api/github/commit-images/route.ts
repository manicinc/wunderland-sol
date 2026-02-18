/**
 * GitHub Commit Images API
 * @module api/github/commit-images
 *
 * POST /api/github/commit-images - Commit generated images to GitHub
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300 // Allow up to 5 minutes for committing many images

interface CommitImagesRequest {
  /** Project title */
  projectTitle: string
  /** GitHub PAT (from client) */
  pat: string
  /** Images to commit */
  images: Array<{
    id: string
    base64: string
    pageIndex: number
    chunkId: string
    prompt: string
    provider: 'openai' | 'replicate'
    cost: number
  }>
  /** Style memory JSON */
  styleMemory?: string
  /** Markdown content for each chunk */
  markdownContent?: Array<{
    chunkId: string
    content: string
  }>
  /** Optional conversion manifest/metadata to persist */
  conversionManifest?: unknown
  /** Optional repo configuration override */
  repoConfig?: {
    owner?: string
    repo?: string
    branch?: string
    basePath?: string
  }
}

/**
 * POST /api/github/commit-images
 *
 * Commit generated images to a GitHub repository
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/github/commit-images', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     projectTitle: '1984 by George Orwell',
 *     pat: 'ghp_...',
 *     images: [
 *       { id: '1', base64: '...', pageIndex: 0, chunkId: 'ch-1', prompt: '...', provider: 'openai', cost: 0.04 },
 *     ],
 *     styleMemory: '{ ... }',
 *   }),
 * })
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    const body: CommitImagesRequest = await request.json()

    // Validate required fields
    if (!body.projectTitle) {
      return NextResponse.json(
        { error: 'Missing required field: projectTitle' },
        { status: 400 }
      )
    }

    if (!body.pat) {
      return NextResponse.json(
        { error: 'Missing required field: pat (GitHub Personal Access Token)' },
        { status: 400 }
      )
    }

    if (!body.images || body.images.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: images (must have at least one image)' },
        { status: 400 }
      )
    }

    // Dynamically import to avoid issues with server-side code
    const { GitHubImageStorage } = await import('@/lib/github/imageStorage')

    // Create storage instance
    const storage = new GitHubImageStorage(undefined, body.repoConfig)
    storage.setPAT(body.pat)

    // Check if project already exists
    const exists = await storage.projectExists(body.projectTitle)
    if (exists) {
      // Could add an option to overwrite or append
      console.log(`[API] Project "${body.projectTitle}" already exists, will overwrite`)
    }

    // Commit images
    const result = await storage.commitImages(
      body.projectTitle,
      body.images,
      body.styleMemory,
      body.markdownContent,
      body.conversionManifest
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to commit images' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully committed ${body.images.length} images`,
      commitUrl: result.commitUrl,
      project: {
        title: body.projectTitle,
        imageCount: body.images.length,
        totalCost: body.images.reduce((sum, img) => sum + img.cost, 0),
      },
    })
  } catch (error) {
    console.error('[API] Commit images error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to commit images' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/github/commit-images?project={title}
 *
 * Check if a project exists and get its manifest
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectTitle = searchParams.get('project')
    const pat = request.headers.get('x-github-pat')

    if (!projectTitle) {
      return NextResponse.json(
        { error: 'Missing query parameter: project' },
        { status: 400 }
      )
    }

    if (!pat) {
      return NextResponse.json(
        { error: 'Missing header: x-github-pat' },
        { status: 400 }
      )
    }

    const { GitHubImageStorage } = await import('@/lib/github/imageStorage')

    const storage = new GitHubImageStorage()
    storage.setPAT(pat)

    const manifest = await storage.getProjectManifest(projectTitle)

    if (!manifest) {
      return NextResponse.json({
        exists: false,
        project: projectTitle,
      })
    }

    return NextResponse.json({
      exists: true,
      project: projectTitle,
      manifest,
    })
  } catch (error) {
    console.error('[API] Check project error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check project' },
      { status: 500 }
    )
  }
}
