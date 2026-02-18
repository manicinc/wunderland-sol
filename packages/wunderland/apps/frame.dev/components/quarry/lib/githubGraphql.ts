'use server'

interface GithubTreeEntry {
  path: string
  type: 'blob' | 'tree'
  name: string
  size?: number
}

const GITHUB_API = 'https://api.github.com'

const DEFAULT_HEADERS: HeadersInit = {
  Accept: 'application/vnd.github+json',
}

const withAuth = (): HeadersInit => {
  const headers: HeadersInit = { ...DEFAULT_HEADERS }
  const token = process.env.GITHUB_TOKEN || process.env.NEXT_PUBLIC_GITHUB_TOKEN
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

async function fetchTreeREST(owner: string, repo: string, branch: string): Promise<GithubTreeEntry[]> {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
    headers: withAuth(),
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`GitHub REST tree fetch failed: ${response.status} ${response.statusText}`)
  }
  const data = await response.json()
  if (!data?.tree || !Array.isArray(data.tree)) {
    return []
  }
  return data.tree.map((item: any) => ({
    path: item.path || '',
    name: item.path?.split('/').pop() || '',
    type: item.type === 'tree' ? 'tree' : 'blob',
    size: item.size,
  }))
}

export async function fetchGithubTree(owner: string, repo: string, branch: string): Promise<GithubTreeEntry[]> {
  // GraphQL API previously used; fallback to REST for simplicity.
  return fetchTreeREST(owner, repo, branch)
}

export async function fetchGithubTreeREST(owner: string, repo: string, branch: string): Promise<GithubTreeEntry[]> {
  return fetchTreeREST(owner, repo, branch)
}


