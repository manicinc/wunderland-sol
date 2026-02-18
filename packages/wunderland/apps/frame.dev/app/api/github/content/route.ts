/**
 * GitHub Content API Proxy
 * @module api/github/content
 * 
 * Proxies requests to raw.githubusercontent.com to avoid CORS issues.
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/github/content
 * 
 * Query params:
 * - owner: Repository owner (required)
 * - repo: Repository name (required)
 * - branch: Branch name (default: main)
 * - path: File path (required)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const owner = searchParams.get('owner')
  const repo = searchParams.get('repo')
  const branch = searchParams.get('branch') || 'main'
  const path = searchParams.get('path')

  if (!owner || !repo || !path) {
    return NextResponse.json(
      { error: 'Missing required parameters: owner, repo, path' },
      { status: 400 }
    )
  }

  // Get PAT from environment or header
  const authHeader = request.headers.get('x-github-token')
  const token = authHeader || process.env.GH_PAT

  try {
    // Try raw.githubusercontent.com first (faster, no API rate limits)
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
    
    const headers: HeadersInit = {
      'User-Agent': 'Frame-Codex-Viewer',
    }

    // raw.githubusercontent.com doesn't need auth for public repos
    // but can use token for private repos
    if (token) {
      headers['Authorization'] = `token ${token}`
    }

    const response = await fetch(rawUrl, { headers })

    if (!response.ok) {
      // Fallback to GitHub API for content
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
      const apiHeaders: HeadersInit = {
        'Accept': 'application/vnd.github.raw+json',
        'User-Agent': 'Frame-Codex-Viewer',
      }
      if (token) {
        apiHeaders['Authorization'] = `Bearer ${token}`
      }

      const apiResponse = await fetch(apiUrl, { headers: apiHeaders })
      
      if (!apiResponse.ok) {
        throw new Error(`Failed to fetch content: ${apiResponse.status}`)
      }

      const content = await apiResponse.text()
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=600',
        },
      })
    }

    const content = await response.text()
    
    // Determine content type based on file extension
    const ext = path.split('.').pop()?.toLowerCase()
    let contentType = 'text/plain; charset=utf-8'
    if (ext === 'json') contentType = 'application/json'
    else if (ext === 'yaml' || ext === 'yml') contentType = 'text/yaml'
    else if (ext === 'md' || ext === 'mdx') contentType = 'text/markdown'

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300, s-maxage=600',
      },
    })
  } catch (error) {
    console.error('[GitHub Content Proxy] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch content' },
      { status: 500 }
    )
  }
}



