/**
 * Create Metadata Update PR
 *
 * Creates a GitHub Pull Request for metadata changes to a strand file.
 * Uses the GitHub API to:
 * 1. Fork repository (if needed)
 * 2. Create branch
 * 3. Commit updated file
 * 4. Open PR
 *
 * @module github/createMetadataPR
 */

import type { StrandMetadata } from '../content/types'
import { buildMarkdownWithFrontmatter, generateMetadataDiff } from '../content/saveStrandMetadata'

// ============================================================================
// TYPES
// ============================================================================

export interface CreatePRConfig {
  owner: string
  repo: string
  branch: string
  pat: string
}

export interface CreatePROptions {
  path: string
  oldMetadata: StrandMetadata
  newMetadata: StrandMetadata
  contentBody: string
  config: CreatePRConfig
}

export interface CreatePRResult {
  prUrl: string
  prNumber: number
  branch: string
}

// ============================================================================
// GITHUB API HELPERS
// ============================================================================

async function githubFetch(
  endpoint: string,
  pat: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `https://api.github.com${endpoint}`

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${pat}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
}

/**
 * Get the authenticated user's login
 */
async function getAuthenticatedUser(pat: string): Promise<string> {
  const response = await githubFetch('/user', pat)
  if (!response.ok) {
    throw new Error('Failed to authenticate with GitHub')
  }
  const user = await response.json()
  return user.login
}

/**
 * Check if user has a fork of the repository
 */
async function checkFork(
  username: string,
  repo: string,
  pat: string
): Promise<boolean> {
  try {
    const response = await githubFetch(`/repos/${username}/${repo}`, pat)
    return response.ok
  } catch {
    return false
  }
}

/**
 * Create a fork of the repository
 */
async function createFork(
  owner: string,
  repo: string,
  pat: string
): Promise<string> {
  const response = await githubFetch(`/repos/${owner}/${repo}/forks`, pat, {
    method: 'POST',
    body: JSON.stringify({}),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(`Failed to create fork: ${error.message}`)
  }

  const fork = await response.json()

  // Wait for fork to be ready
  await new Promise(resolve => setTimeout(resolve, 2000))

  return fork.owner.login
}

/**
 * Get the current file content from GitHub (to preserve any server-side changes)
 */
async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  pat: string
): Promise<{ content: string; sha: string } | null> {
  try {
    const response = await githubFetch(
      `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      pat
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const content = atob(data.content.replace(/\n/g, ''))
    return { content, sha: data.sha }
  } catch {
    return null
  }
}

/**
 * Get the SHA of the base branch
 */
async function getBranchSHA(
  owner: string,
  repo: string,
  branch: string,
  pat: string
): Promise<string> {
  const response = await githubFetch(
    `/repos/${owner}/${repo}/git/ref/heads/${branch}`,
    pat
  )

  if (!response.ok) {
    throw new Error(`Failed to get branch ref: ${branch}`)
  }

  const ref = await response.json()
  return ref.object.sha
}

/**
 * Create a new branch from the base branch
 */
async function createBranch(
  owner: string,
  repo: string,
  branchName: string,
  baseSha: string,
  pat: string
): Promise<void> {
  const response = await githubFetch(
    `/repos/${owner}/${repo}/git/refs`,
    pat,
    {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(`Failed to create branch: ${error.message}`)
  }
}

/**
 * Create or update a file in the repository
 */
async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  existingSha: string | undefined,
  pat: string
): Promise<string> {
  const body: Record<string, unknown> = {
    message,
    content: btoa(unescape(encodeURIComponent(content))), // UTF-8 safe base64
    branch,
  }

  if (existingSha) {
    body.sha = existingSha
  }

  const response = await githubFetch(
    `/repos/${owner}/${repo}/contents/${path}`,
    pat,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(`Failed to commit file: ${error.message}`)
  }

  const result = await response.json()
  return result.commit.sha
}

/**
 * Create a pull request
 */
async function createPR(
  upstreamOwner: string,
  repo: string,
  forkOwner: string,
  branch: string,
  baseBranch: string,
  title: string,
  body: string,
  pat: string
): Promise<{ url: string; number: number }> {
  const response = await githubFetch(
    `/repos/${upstreamOwner}/${repo}/pulls`,
    pat,
    {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        head: `${forkOwner}:${branch}`,
        base: baseBranch,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(`Failed to create PR: ${error.message}`)
  }

  const pr = await response.json()
  return {
    url: pr.html_url,
    number: pr.number,
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Create a GitHub Pull Request for metadata changes
 *
 * @param options - PR creation options
 * @returns PR URL and branch name
 */
export async function createMetadataPR(options: CreatePROptions): Promise<CreatePRResult> {
  const { path, oldMetadata, newMetadata, contentBody, config } = options
  const { owner, repo, branch, pat } = config

  // Generate diff summary for PR description
  const changes = generateMetadataDiff(oldMetadata, newMetadata)

  // Get authenticated user
  const username = await getAuthenticatedUser(pat)

  // Determine where to commit (fork or direct if user has write access)
  let commitOwner = owner
  let needsFork = true

  // Check if user is the repo owner or has direct access
  if (username === owner) {
    needsFork = false
    commitOwner = owner
  } else {
    // Check if user has a fork
    const hasFork = await checkFork(username, repo, pat)
    if (hasFork) {
      commitOwner = username
    } else {
      // Create fork
      console.log('[createMetadataPR] Creating fork...')
      commitOwner = await createFork(owner, repo, pat)
    }
  }

  // Generate branch name
  const slug = newMetadata.slug || path.split('/').pop()?.replace('.md', '') || 'strand'
  const timestamp = Date.now().toString(36)
  const newBranchName = `metadata-update/${slug}-${timestamp}`

  // Get base branch SHA from fork (or main repo if no fork)
  const baseSha = await getBranchSHA(commitOwner, repo, branch, pat)

  // Create new branch
  await createBranch(commitOwner, repo, newBranchName, baseSha, pat)

  // Get existing file SHA (for update)
  const existingFile = await getFileContent(commitOwner, repo, path, branch, pat)

  // Build updated markdown content
  const updatedContent = buildMarkdownWithFrontmatter(newMetadata, contentBody)

  // Commit the updated file
  const commitMessage = `Update metadata for ${newMetadata.title || slug}

Changes:
${changes.map(c => `- ${c}`).join('\n')}`

  await createOrUpdateFile(
    commitOwner,
    repo,
    path,
    updatedContent,
    commitMessage,
    newBranchName,
    existingFile?.sha,
    pat
  )

  // Create pull request
  const prTitle = `📝 Update metadata: ${newMetadata.title || slug}`
  const prBody = `## Metadata Update

This PR updates the metadata for \`${path}\`.

### Changes Made
${changes.map(c => `- ${c}`).join('\n')}

### File Updated
- \`${path}\`

---
*This PR was automatically generated by Quarry Codex metadata editor.*`

  const pr = await createPR(
    owner,
    repo,
    commitOwner,
    newBranchName,
    branch,
    prTitle,
    prBody,
    pat
  )

  console.log('[createMetadataPR] PR created:', pr.url)

  return {
    prUrl: pr.url,
    prNumber: pr.number,
    branch: newBranchName,
  }
}
