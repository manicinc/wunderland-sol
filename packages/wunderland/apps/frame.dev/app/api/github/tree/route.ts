/**
 * GitHub Tree API Proxy
 * @module api/github/tree
 * 
 * Proxies requests to GitHub API to avoid CORS issues in production.
 * Supports both GraphQL and REST endpoints.
 */

import { NextRequest, NextResponse } from 'next/server'

const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql'

interface TreeQueryResponse {
  data: {
    repository: {
      object: {
        entries: Array<{
          name: string
          type: string
          path: string
          object?: {
            byteSize?: number
          }
        }>
      }
    }
  }
}

/**
 * GET /api/github/tree
 * 
 * Query params:
 * - owner: Repository owner (required)
 * - repo: Repository name (required)
 * - branch: Branch name (default: main)
 * - path: Path within repo (default: root)
 * - method: 'graphql' | 'rest' (default: rest)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const owner = searchParams.get('owner')
  const repo = searchParams.get('repo')
  const branch = searchParams.get('branch') || 'main'
  const path = searchParams.get('path') || ''
  const method = searchParams.get('method') || 'rest'

  if (!owner || !repo) {
    return NextResponse.json(
      { error: 'Missing required parameters: owner, repo' },
      { status: 400 }
    )
  }

  // Get PAT from environment or header
  const authHeader = request.headers.get('x-github-token')
  const token = authHeader || process.env.GH_PAT

  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Frame-Codex-Viewer',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    if (method === 'graphql' && token) {
      // GraphQL method (requires token)
      const expression = `${branch}:${path}`
      const query = `
        query ($owner: String!, $repo: String!, $expression: String!) {
          repository(owner: $owner, name: $repo) {
            object(expression: $expression) {
              ... on Tree {
                entries {
                  name
                  type
                  path
                  object {
                    ... on Blob {
                      byteSize
                    }
                  }
                }
              }
            }
          }
        }
      `

      const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { owner, repo, expression },
        }),
      })

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status}`)
      }

      const data: TreeQueryResponse = await response.json()
      const entries = data?.data?.repository?.object?.entries || []

      return NextResponse.json({
        entries: entries.map(entry => ({
          name: entry.name,
          type: entry.type === 'blob' ? 'file' : 'dir',
          path: entry.path,
          size: entry.object?.byteSize,
        })),
        method: 'graphql',
      })
    } else {
      // REST method (works without token but with rate limits)
      const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
      
      const response = await fetch(url, { headers })

      if (!response.ok) {
        throw new Error(`REST request failed: ${response.status}`)
      }

      const data = await response.json()
      const entries = data.tree || []

      return NextResponse.json({
        entries: entries.map((entry: { path: string; type: string; size?: number }) => ({
          name: entry.path.split('/').pop() || entry.path,
          type: entry.type === 'blob' ? 'file' : 'dir',
          path: entry.path,
          size: entry.size,
        })),
        method: 'rest',
        truncated: data.truncated,
      })
    }
  } catch (error) {
    console.error('[GitHub Tree Proxy] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tree' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/github/tree
 * 
 * Alternative method for sending GitHub PAT securely in body
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { owner, repo, branch = 'main', path = '', token, method = 'rest' } = body

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo' },
        { status: 400 }
      )
    }

    // Create URL with params for GET handler
    const url = new URL(request.url)
    url.searchParams.set('owner', owner)
    url.searchParams.set('repo', repo)
    url.searchParams.set('branch', branch)
    url.searchParams.set('path', path)
    url.searchParams.set('method', method)

    // Create new request with token header
    const proxyRequest = new NextRequest(url, {
      method: 'GET',
      headers: token ? { 'x-github-token': token } : undefined,
    })

    return GET(proxyRequest)
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}



