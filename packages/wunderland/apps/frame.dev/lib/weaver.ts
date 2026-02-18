/**
 * Weaver Status & Publishing Authorization
 * @module lib/weaver
 * 
 * Handles checking if a user is an approved "Weaver" who can auto-merge,
 * or if they need to create a PR for review.
 * 
 * Approved weavers are listed in .github/WEAVERS.txt in the codex repo.
 */

const WEAVERS_FILE_URL = 'https://raw.githubusercontent.com/framersai/quarry/main/.github/WEAVERS.txt'
const WEAVERS_CACHE_KEY = 'quarry-codex-weavers-cache'
const WEAVERS_CACHE_TTL = 1000 * 60 * 60 // 1 hour

export interface WeaverStatus {
  isWeaver: boolean
  username: string | null
  canAutoMerge: boolean
  requiresPR: boolean
  weaversList: string[]
  lastChecked: number
}

export interface PublishCapability {
  canPublish: boolean
  method: 'auto-merge' | 'pr' | 'github-redirect' | 'disabled'
  reason: string
  helpText: string
}

/**
 * Fetch the list of approved weavers from the codex repository
 */
export async function fetchWeaversList(): Promise<string[]> {
  // Check cache first
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(WEAVERS_CACHE_KEY)
      if (cached) {
        const { weavers, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < WEAVERS_CACHE_TTL) {
          return weavers
        }
      }
    } catch (e) {
      console.warn('[Weaver] Cache read failed:', e)
    }
  }

  try {
    const response = await fetch(WEAVERS_FILE_URL)
    if (!response.ok) {
      console.warn('[Weaver] Failed to fetch WEAVERS.txt:', response.status)
      return []
    }

    const text = await response.text()
    const weavers = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))

    // Cache the result
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(WEAVERS_CACHE_KEY, JSON.stringify({
          weavers,
          timestamp: Date.now()
        }))
      } catch (e) {
        console.warn('[Weaver] Cache write failed:', e)
      }
    }

    return weavers
  } catch (error) {
    console.error('[Weaver] Error fetching weavers list:', error)
    return []
  }
}

/**
 * Get the current user's GitHub username from their PAT
 */
export async function getCurrentGitHubUser(pat: string): Promise<string | null> {
  if (!pat) return null

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${pat}`,
        Accept: 'application/vnd.github.v3+json'
      }
    })

    if (!response.ok) return null

    const user = await response.json()
    return user.login || null
  } catch (error) {
    console.error('[Weaver] Error fetching GitHub user:', error)
    return null
  }
}

/**
 * Check if a user is an approved weaver
 */
export async function checkWeaverStatus(pat: string): Promise<WeaverStatus> {
  const [weaversList, username] = await Promise.all([
    fetchWeaversList(),
    getCurrentGitHubUser(pat)
  ])

  const isWeaver = username ? weaversList.includes(username) : false

  return {
    isWeaver,
    username,
    canAutoMerge: isWeaver,
    requiresPR: !isWeaver && !!username,
    weaversList,
    lastChecked: Date.now()
  }
}

/**
 * Determine what publishing capabilities a user has
 */
export function getPublishCapability(
  hasPAT: boolean,
  weaverStatus: WeaverStatus | null
): PublishCapability {
  // No PAT at all
  if (!hasPAT) {
    return {
      canPublish: true,
      method: 'github-redirect',
      reason: 'No GitHub authentication configured',
      helpText: 'You can still contribute! Click Publish to be redirected to GitHub where you can create a Pull Request manually.'
    }
  }

  // Has PAT but couldn't get username (invalid PAT?)
  if (!weaverStatus?.username) {
    return {
      canPublish: true,
      method: 'github-redirect',
      reason: 'Could not verify GitHub identity',
      helpText: 'Your GitHub token may be invalid or expired. You can still contribute via the GitHub web interface.'
    }
  }

  // Approved weaver - can auto-merge
  if (weaverStatus.isWeaver) {
    return {
      canPublish: true,
      method: 'auto-merge',
      reason: `You're an approved Weaver (@${weaverStatus.username})`,
      helpText: 'Your changes will be automatically merged after passing validation checks.'
    }
  }

  // Has valid PAT but not a weaver - needs PR
  return {
    canPublish: true,
    method: 'pr',
    reason: 'Pull Request required for review',
    helpText: `As @${weaverStatus.username}, your contribution will create a Pull Request for maintainer review. After 5+ approved PRs, you can become an approved Weaver!`
  }
}

/**
 * Build the GitHub URL for manual contribution
 */
export function buildGitHubContributeUrl(
  filePath: string,
  content: string,
  options: {
    owner?: string
    repo?: string
    branch?: string
    commitMessage?: string
  } = {}
): string {
  const {
    owner = 'framersai',
    repo = 'codex',
    branch = 'main',
    commitMessage = 'Update via Quarry Codex'
  } = options

  // For new files
  if (!filePath.includes('/')) {
    filePath = `weaves/contributions/${filePath}`
  }

  const params = new URLSearchParams({
    filename: filePath,
    value: content,
    message: commitMessage
  })

  return `https://github.com/${owner}/${repo}/new/${branch}?${params.toString()}`
}

/**
 * Build the GitHub PR URL for existing file edits
 */
export function buildGitHubEditUrl(
  filePath: string,
  options: {
    owner?: string
    repo?: string
    branch?: string
  } = {}
): string {
  const {
    owner = 'framersai',
    repo = 'codex',
    branch = 'main'
  } = options

  return `https://github.com/${owner}/${repo}/edit/${branch}/${filePath}`
}

/**
 * Get the WEAVERS.txt file URL for linking
 */
export function getWeaversListUrl(): string {
  return 'https://github.com/framersai/quarry/blob/main/.github/WEAVERS.txt'
}

/**
 * Get info about becoming a weaver
 */
export function getWeaverInfoText(): string {
  return `
## How Publishing Works

### Approved Weavers (Auto-Merge)
Trusted contributors listed in WEAVERS.txt can have their changes automatically merged after passing validation checks.

### Regular Contributors (Pull Request)
All other contributors create Pull Requests that are reviewed by maintainers before merging.

### How to Become a Weaver
1. Submit 5+ high-quality PRs that pass all validation
2. Demonstrate understanding of the Codex schema and quality standards
3. Receive nomination from existing Weavers or maintainers

### No GitHub Account?
You can still view and export content. To contribute, you'll need a free GitHub account.
  `.trim()
}








