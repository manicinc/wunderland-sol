/**
 * GitHub Sync Service for Categorization
 * @module lib/categorization/githubSync
 *
 * Syncs approved categorization actions to GitHub repository.
 * Creates branches, moves files, and creates PRs via GitHub API.
 */

import type {
  CategorizationAction,
  SyncResult,
  CategorizationActionStatus,
} from './types'
import { getDb } from '@/lib/storage/localCodex'

/**
 * GitHub API configuration
 */
interface GitHubConfig {
  /** GitHub Personal Access Token */
  token: string
  /** Repository owner */
  owner: string
  /** Repository name */
  repo: string
  /** Base branch (default: main) */
  baseBranch?: string
}

/**
 * Get GitHub config from settings or environment
 */
async function getGitHubConfig(): Promise<GitHubConfig | null> {
  try {
    const db = await getDb()

    // Try to load from settings first
    const settingsRow = await db.get<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      ['github_config']
    )

    if (settingsRow) {
      return JSON.parse(settingsRow.value)
    }

    // Fallback to environment variables (if available)
    if (typeof process !== 'undefined' && process.env) {
      const token = process.env.GITHUB_TOKEN || process.env.GH_PAT
      const owner = process.env.GITHUB_OWNER
      const repo = process.env.GITHUB_REPO

      if (token && owner && repo) {
        return { token, owner, repo, baseBranch: 'main' }
      }
    }

    return null
  } catch (error) {
    console.error('[GitHubSync] Failed to load config:', error)
    return null
  }
}

/**
 * Sync pending categorization actions to GitHub
 */
export async function syncCategorizationActions(
  limit = 50
): Promise<SyncResult> {
  const result: SyncResult = {
    synced: 0,
    failed: 0,
    errors: [],
  }

  try {
    const config = await getGitHubConfig()

    if (!config) {
      throw new Error('GitHub configuration not found. Please configure GitHub PAT in settings.')
    }

    const db = await getDb()

    // Load pending actions
    const actions = await db.all<CategorizationAction>(
      'SELECT * FROM categorization_actions WHERE status = ? LIMIT ?',
      ['pending', limit]
    )

    if (!actions || actions.length === 0) {
      return result
    }

    // Process each action
    for (const action of actions) {
      try {
        // Update status to syncing
        await updateActionStatus(action.id, 'syncing')

        // Sync based on action type
        switch (action.action_type) {
          case 'move':
            await syncMoveAction(action, config)
            break
          case 'create_pr':
            await syncPRAction(action, config)
            break
          case 'create_issue':
            await syncIssueAction(action, config)
            break
        }

        // Update status to completed
        await updateActionStatus(action.id, 'completed', undefined, new Date().toISOString())
        result.synced++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Update status to failed with error
        await updateActionStatus(action.id, 'failed', errorMessage)

        result.failed++
        result.errors.push({
          actionId: action.id,
          error: errorMessage,
        })

        console.error(`[GitHubSync] Failed to sync action ${action.id}:`, error)
      }
    }

    return result
  } catch (error) {
    console.error('[GitHubSync] Sync failed:', error)
    throw error
  }
}

/**
 * Sync a move action (high confidence - auto-merge PR)
 */
async function syncMoveAction(
  action: CategorizationAction,
  config: GitHubConfig
): Promise<void> {
  const { owner, repo, token, baseBranch = 'main' } = config
  const filename = action.to_path.split('/').pop() || 'untitled.md'
  const branchName = `auto-categorize/${filename.replace(/\.md$/, '')}-${Date.now()}`

  // Get base branch SHA
  const baseRef = await getRef(owner, repo, token, baseBranch)
  const baseSHA = baseRef.object.sha

  // Create new branch
  await createRef(owner, repo, token, branchName, baseSHA)

  // Get base tree
  const baseCommit = await getCommit(owner, repo, token, baseSHA)
  const baseTreeSHA = baseCommit.tree.sha

  // Create tree with file move (delete old, create new)
  const tree = await createTree(owner, repo, token, baseTreeSHA, [
    // Delete old file
    {
      path: action.from_path,
      mode: '100644',
      type: 'blob',
      sha: null, // null SHA means delete
    },
    // Create new file
    {
      path: action.to_path,
      mode: '100644',
      type: 'blob',
      content: action.strand_content,
    },
  ])

  // Create commit
  const metadata = JSON.parse(action.metadata || '{}')
  const confidence = metadata.confidence || 0.95
  const reasoning = metadata.reasoning || 'Auto-categorized'

  const commit = await createCommit(
    owner,
    repo,
    token,
    `chore(codex): auto-categorize ${filename} to ${action.to_path}\n\nConfidence: ${Math.round(confidence * 100)}%\nReasoning: ${reasoning}\n\nAuto-categorized by offline categorization system`,
    tree.sha,
    baseSHA
  )

  // Update branch ref
  await updateRef(owner, repo, token, branchName, commit.sha)

  // Create PR
  const pr = await createPR(
    owner,
    repo,
    token,
    `Auto-categorize: ${filename}`,
    branchName,
    baseBranch,
    generatePRBody(action, metadata)
  )

  // Store PR info
  const db = await getDb()
  await db.run(
    'UPDATE categorization_actions SET github_pr_number = ?, github_pr_url = ? WHERE id = ?',
    [pr.number, pr.html_url, action.id]
  )

  // Enable auto-merge for high confidence
  if (confidence >= 0.95) {
    try {
      await enableAutoMerge(owner, repo, token, pr.node_id)
    } catch (error) {
      console.warn('[GitHubSync] Failed to enable auto-merge:', error)
    }
  }
}

/**
 * Sync a PR action (medium confidence - manual review PR)
 */
async function syncPRAction(
  action: CategorizationAction,
  config: GitHubConfig
): Promise<void> {
  // Same as move action but without auto-merge
  const { owner, repo, token, baseBranch = 'main' } = config
  const filename = action.to_path.split('/').pop() || 'untitled.md'
  const branchName = `categorize-suggest/${filename.replace(/\.md$/, '')}-${Date.now()}`

  const baseRef = await getRef(owner, repo, token, baseBranch)
  const baseSHA = baseRef.object.sha

  await createRef(owner, repo, token, branchName, baseSHA)

  const baseCommit = await getCommit(owner, repo, token, baseSHA)
  const tree = await createTree(owner, repo, token, baseCommit.tree.sha, [
    { path: action.from_path, mode: '100644', type: 'blob', sha: null },
    { path: action.to_path, mode: '100644', type: 'blob', content: action.strand_content },
  ])

  const metadata = JSON.parse(action.metadata || '{}')
  const commit = await createCommit(
    owner,
    repo,
    token,
    `chore(codex): suggest categorization for ${filename}\n\nConfidence: ${Math.round((metadata.confidence || 0.8) * 100)}%\n\nRequires manual review`,
    tree.sha,
    baseSHA
  )

  await updateRef(owner, repo, token, branchName, commit.sha)

  const pr = await createPR(
    owner,
    repo,
    token,
    `Categorization suggestion: ${filename}`,
    branchName,
    baseBranch,
    generatePRBody(action, metadata)
  )

  const db = await getDb()
  await db.run(
    'UPDATE categorization_actions SET github_pr_number = ?, github_pr_url = ? WHERE id = ?',
    [pr.number, pr.html_url, action.id]
  )
}

/**
 * Sync an issue action (low confidence - needs triage)
 */
async function syncIssueAction(
  action: CategorizationAction,
  config: GitHubConfig
): Promise<void> {
  const { owner, repo, token } = config
  const filename = action.from_path.split('/').pop() || 'untitled.md'
  const metadata = JSON.parse(action.metadata || '{}')

  const issue = await createIssue(
    owner,
    repo,
    token,
    `Categorization needed: ${filename}`,
    generateIssueBody(action, metadata),
    ['needs-triage', 'categorization']
  )

  const db = await getDb()
  await db.run(
    'UPDATE categorization_actions SET github_pr_url = ? WHERE id = ?',
    [issue.html_url, action.id]
  )
}

/**
 * Generate PR body from action
 */
function generatePRBody(action: CategorizationAction, metadata: any): string {
  const confidence = metadata.confidence || 0
  const reasoning = metadata.reasoning || 'No reasoning provided'
  const alternatives = metadata.alternatives || []

  let body = `## Auto-Categorization\n\n`
  body += `**File:** \`${action.from_path}\`\n`
  body += `**Suggested Path:** \`${action.to_path}\`\n`
  body += `**Confidence:** ${Math.round(confidence * 100)}%\n\n`
  body += `### Reasoning\n${reasoning}\n\n`

  if (alternatives.length > 0) {
    body += `### Alternatives\n`
    for (const alt of alternatives) {
      body += `- \`${alt.category}\` (${Math.round(alt.confidence * 100)}%): ${alt.reasoning}\n`
    }
    body += `\n`
  }

  body += `---\n`
  body += `*This PR was automatically created by the offline categorization system.*\n`

  return body
}

/**
 * Generate issue body from action
 */
function generateIssueBody(action: CategorizationAction, metadata: any): string {
  const confidence = metadata.confidence || 0
  const reasoning = metadata.reasoning || 'No reasoning provided'

  let body = `## Manual Categorization Required\n\n`
  body += `**File:** \`${action.from_path}\`\n`
  body += `**Suggested Path:** \`${action.to_path}\`\n`
  body += `**Confidence:** ${Math.round(confidence * 100)}%\n\n`
  body += `### Analysis\n${reasoning}\n\n`
  body += `This strand could not be automatically categorized with sufficient confidence. `
  body += `Please review and place in the appropriate location.\n\n`
  body += `---\n`
  body += `*Auto-categorization confidence below threshold.*\n`

  return body
}

/**
 * Update action status in database
 */
async function updateActionStatus(
  id: string,
  status: CategorizationActionStatus,
  error?: string,
  syncedAt?: string
): Promise<void> {
  const db = await getDb()

  if (error) {
    await db.run(
      'UPDATE categorization_actions SET status = ?, sync_error = ? WHERE id = ?',
      [status, error, id]
    )
  } else if (syncedAt) {
    await db.run(
      'UPDATE categorization_actions SET status = ?, synced_at = ? WHERE id = ?',
      [status, syncedAt, id]
    )
  } else {
    await db.run(
      'UPDATE categorization_actions SET status = ? WHERE id = ?',
      [status, id]
    )
  }
}

// =============================================================================
// GITHUB API HELPERS
// =============================================================================

async function githubAPI(path: string, token: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GitHub API error: ${response.status} ${error}`)
  }

  return response.json()
}

async function getRef(owner: string, repo: string, token: string, ref: string) {
  return githubAPI(`/repos/${owner}/${repo}/git/ref/heads/${ref}`, token)
}

async function createRef(owner: string, repo: string, token: string, ref: string, sha: string) {
  return githubAPI(`/repos/${owner}/${repo}/git/refs`, token, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${ref}`, sha }),
  })
}

async function updateRef(owner: string, repo: string, token: string, ref: string, sha: string) {
  return githubAPI(`/repos/${owner}/${repo}/git/refs/heads/${ref}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ sha, force: false }),
  })
}

async function getCommit(owner: string, repo: string, token: string, sha: string) {
  return githubAPI(`/repos/${owner}/${repo}/git/commits/${sha}`, token)
}

async function createTree(owner: string, repo: string, token: string, baseTree: string, tree: any[]) {
  return githubAPI(`/repos/${owner}/${repo}/git/trees`, token, {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseTree, tree }),
  })
}

async function createCommit(
  owner: string,
  repo: string,
  token: string,
  message: string,
  tree: string,
  parent: string
) {
  return githubAPI(`/repos/${owner}/${repo}/git/commits`, token, {
    method: 'POST',
    body: JSON.stringify({ message, tree, parents: [parent] }),
  })
}

async function createPR(
  owner: string,
  repo: string,
  token: string,
  title: string,
  head: string,
  base: string,
  body: string
) {
  return githubAPI(`/repos/${owner}/${repo}/pulls`, token, {
    method: 'POST',
    body: JSON.stringify({ title, head, base, body }),
  })
}

async function createIssue(
  owner: string,
  repo: string,
  token: string,
  title: string,
  body: string,
  labels: string[]
) {
  return githubAPI(`/repos/${owner}/${repo}/issues`, token, {
    method: 'POST',
    body: JSON.stringify({ title, body, labels }),
  })
}

async function enableAutoMerge(owner: string, repo: string, token: string, pullRequestId: string) {
  // GraphQL mutation for auto-merge
  const mutation = `
    mutation EnableAutoMerge($pullRequestId: ID!) {
      enablePullRequestAutoMerge(input: {
        pullRequestId: $pullRequestId
        mergeMethod: SQUASH
      }) {
        pullRequest {
          id
        }
      }
    }
  `

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: { pullRequestId },
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to enable auto-merge: ${response.status}`)
  }

  return response.json()
}

/**
 * Check if online and can reach GitHub
 */
export async function isGitHubReachable(): Promise<boolean> {
  if (!navigator.onLine) {
    return false
  }

  try {
    const response = await fetch('https://api.github.com', {
      method: 'HEAD',
      cache: 'no-cache',
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get count of pending actions
 */
export async function getPendingActionsCount(): Promise<number> {
  try {
    const db = await getDb()
    const result = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM categorization_actions WHERE status = ?',
      ['pending']
    )
    return result?.count || 0
  } catch {
    return 0
  }
}
