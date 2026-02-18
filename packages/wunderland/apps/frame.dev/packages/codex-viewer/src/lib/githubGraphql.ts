/**
 * GitHub GraphQL API wrapper with PAT support
 * @module lib/github-graphql
 *
 * @remarks
 * - Free for all public repos; no cost
 * - Rate limit: 5,000 points/hour with PAT, 60 requests/hour without
 * - Required scopes: `public_repo` (read public repositories)
 * - Optional: `repo:read` if you need private repos in the future
 *
 * @example
 * ```ts
 * const tree = await fetchGithubTree('framersai', 'codex', 'main')
 * console.log(tree.length, 'files')
 * ```
 */

const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql'

/**
 * Check if running in static export mode (no API routes available)
 */
function isStaticExport(): boolean {
  // Build-time: check env var
  if (process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'static') return true

  // Runtime fallback: detect static hosting platforms by hostname
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host.endsWith('.github.io')) return true
    if (host.endsWith('.pages.dev')) return true // Cloudflare Pages
    if (host.endsWith('.netlify.app')) return true
  }

  return false
}

function resolveStoredPat(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage?.getItem('quarry-codex-preferences')
    if (!raw) return undefined
    const prefs = JSON.parse(raw)
    if (prefs && typeof prefs.githubPAT === 'string' && prefs.githubPAT.trim().length > 0) {
      return prefs.githubPAT.trim()
    }
  } catch (error) {
    console.warn('[githubGraphql] Failed to read stored GitHub PAT from preferences', error)
  }
  return undefined
}

function resolvePat(explicit?: string): string | undefined {
  if (explicit && explicit.length > 0) return explicit
  const storedPat = resolveStoredPat()
  if (storedPat) return storedPat
  return process.env.GH_PAT
}

export function hasGithubAuthToken(): boolean {
  return Boolean(resolvePat())
}

/**
 * GitHub tree entry from GraphQL response
 */
export interface GitHubTreeEntry {
  /** File or directory name */
  name: string
  /** 'blob' = file, 'tree' = directory */
  type: 'blob' | 'tree'
  /** Full path from repo root */
  path: string
  /** File size in bytes (for blobs only) */
  size?: number
}

/**
 * GraphQL response structure
 */
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
 * Fetch a single directory from GitHub using GraphQL
 * 
 * @param owner - Repository owner (e.g., 'framersai')
 * @param repo - Repository name (e.g., 'codex')
 * @param expression - Git tree expression (e.g., 'HEAD:', 'main:weaves/', 'sha:path/')
 * @param token - Optional GitHub PAT (defaults to NEXT_PUBLIC_GH_PAT or GH_PAT env var)
 * @returns Array of tree entries in that directory
 * 
 * @throws Error if GraphQL request fails
 * 
 * @example
 * ```ts
 * // Fetch root directory
 * const rootFiles = await fetchGithubDirectory('framersai', 'codex', 'HEAD:')
 * 
 * // Fetch subdirectory
 * const weaves = await fetchGithubDirectory('framersai', 'codex', 'HEAD:weaves')
 * ```
 */
export async function fetchGithubDirectory(
  owner: string,
  repo: string,
  expression: string,
  token?: string
): Promise<GitHubTreeEntry[]> {
  const pat = resolvePat(token)

  const query = `
    query($owner: String!, $repo: String!, $expression: String!) {
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

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (pat) {
    headers['Authorization'] = `bearer ${pat}`
  }

  const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables: { owner, repo, expression },
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub GraphQL error: ${response.status} ${response.statusText}`)
  }

  const json: TreeQueryResponse = await response.json()

  if (!json.data?.repository?.object?.entries) {
    return []
  }

  return json.data.repository.object.entries.map((entry) => ({
    name: entry.name,
    type: entry.type === 'blob' ? 'blob' : 'tree',
    path: entry.path,
    size: entry.object?.byteSize,
  }))
}

/**
 * Recursively fetch entire repository tree using GitHub GraphQL
 * 
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param branch - Branch name (default: 'main')
 * @param token - Optional GitHub PAT
 * @param maxDepth - Maximum recursion depth (default: 20)
 * @returns Flat array of all files and directories
 * 
 * @remarks
 * - Recursively walks subdirectories client-side
 * - For repos with < 1000 items, this is more efficient than paginated REST
 * - Cost: ~1 GraphQL point per directory level
 * 
 * @example
 * ```ts
 * const allFiles = await fetchGithubTree('framersai', 'codex')
 * const markdownFiles = allFiles.filter(f => f.type === 'blob' && f.path.endsWith('.md'))
 * ```
 */
export async function fetchGithubTree(
  owner: string,
  repo: string,
  branch: string = 'main',
  token?: string,
  maxDepth: number = 20
): Promise<GitHubTreeEntry[]> {
  const results: GitHubTreeEntry[] = []
  const queue: Array<{ path: string; depth: number }> = [{ path: '', depth: 0 }]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || current.depth > maxDepth) continue

    const expression = current.path ? `${branch}:${current.path}` : `${branch}:`
    const entries = await fetchGithubDirectory(owner, repo, expression, token)

    for (const entry of entries) {
      results.push(entry)
      if (entry.type === 'tree') {
        queue.push({ path: entry.path, depth: current.depth + 1 })
      }
    }
  }

  return results
}

/**
 * Direct GitHub API call from browser (no proxy)
 * Works for public repos; rate limited to 60 req/hour without PAT
 *
 * @internal Used by fetchGithubTreeREST for static exports
 */
async function fetchGithubTreeDirect(
  owner: string,
  repo: string,
  branch: string,
  pat?: string
): Promise<GitHubTreeEntry[]> {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  }

  if (pat) {
    headers['Authorization'] = `token ${pat}`
  }

  // First get branch SHA
  const branchRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`,
    { headers }
  )

  if (!branchRes.ok) {
    throw new Error(`GitHub API error (branch): ${branchRes.status} ${branchRes.statusText}`)
  }

  const branchData = await branchRes.json()
  const sha = branchData.commit?.sha
  if (!sha) throw new Error('Failed to resolve branch SHA')

  // Then fetch recursive tree
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=true`
  const response = await fetch(treeUrl, { headers })

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  if (!data.tree || !Array.isArray(data.tree)) {
    return []
  }

  return data.tree.map((item: { path: string; type: string; size?: number }) => ({
    name: item.path.split('/').pop() || item.path,
    type: item.type === 'blob' ? 'blob' : 'tree',
    path: item.path,
    size: item.size,
  }))
}

/**
 * Fallback: fetch tree using REST API (no PAT required, lower rate limits)
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param branch - Branch name
 * @returns Array of tree entries
 *
 * @remarks
 * - Rate limit: 60 requests/hour without auth, 5,000/hour with auth
 * - Single request for entire tree (faster than GraphQL for small repos)
 * - Fallback when GraphQL fails or PAT is unavailable
 * - Uses proxy API in browser when available, direct API for static exports
 */
export async function fetchGithubTreeREST(
  owner: string,
  repo: string,
  branch: string = 'main',
  token?: string
): Promise<GitHubTreeEntry[]> {
  const pat = resolvePat(token)

  // Browser-side: check if we should use direct API or proxy
  if (typeof window !== 'undefined') {
    const useDirectApi = isStaticExport()

    // Try proxy first if not in static export mode
    if (!useDirectApi) {
      try {
        const proxyUrl = new URL('/api/github/tree', window.location.origin)
        proxyUrl.searchParams.set('owner', owner)
        proxyUrl.searchParams.set('repo', repo)
        proxyUrl.searchParams.set('branch', branch)
        proxyUrl.searchParams.set('method', 'rest')

        const headers: HeadersInit = {}
        if (pat) {
          headers['x-github-token'] = pat
        }

        const response = await fetch(proxyUrl.toString(), { headers })

        if (response.ok) {
          const data = await response.json()
          return (data.entries || []).map((item: { name: string; type: string; path: string; size?: number }) => ({
            name: item.name,
            type: item.type === 'file' ? 'blob' : 'tree',
            path: item.path,
            size: item.size,
          }))
        }

        // If 404, proxy doesn't exist (static export) - fall through to direct API
        if (response.status === 404) {
          console.info('[githubGraphql] Proxy not available, using direct GitHub API')
        } else {
          const error = await response.json().catch(() => ({ error: response.statusText }))
          throw new Error(`GitHub REST API error: ${error.error || response.statusText}`)
        }
      } catch (err) {
        // Only log non-404 errors as warnings
        if (err instanceof Error && !err.message.includes('404')) {
          console.warn('[githubGraphql] Proxy failed, falling back to direct API:', err)
        }
      }
    }

    // Direct GitHub API call (for static exports or proxy fallback)
    return fetchGithubTreeDirect(owner, repo, branch, pat)
  }

  // Server-side: direct API calls
  const headers: HeadersInit = {}
  if (pat) {
    headers['Authorization'] = `token ${pat}`
  }

  // First get branch SHA
  const branchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${branch}`, { headers })
  if (!branchRes.ok) {
    throw new Error(`GitHub REST API error (branch): ${branchRes.statusText}`)
  }
  const branchData = await branchRes.json()
  const sha = branchData.commit?.sha
  if (!sha) throw new Error('Failed to resolve branch SHA')

  // Then fetch recursive tree
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=true`
  const response = await fetch(treeUrl, { headers })
  if (!response.ok) {
    throw new Error(`GitHub REST API error: ${response.statusText}`)
  }

  const data = await response.json()
  if (!data.tree || !Array.isArray(data.tree)) {
    return []
  }

  return data.tree.map((item: { path: string; type: string; size?: number }) => ({
    name: item.path.split('/').pop() || item.path,
    type: item.type === 'blob' ? 'blob' : 'tree',
    path: item.path,
    size: item.size,
  }))
}

