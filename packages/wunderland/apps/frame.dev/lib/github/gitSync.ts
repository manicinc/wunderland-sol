/**
 * Git Sync - Draft to GitHub PR workflow
 * @module github/gitSync
 * 
 * @remarks
 * Orchestrates the local → remote journey:
 * 1. Save draft to localStorage
 * 2. Encrypt media blobs with PAT
 * 3. Fork repo if needed
 * 4. Create branch
 * 5. Commit changes
 * 6. Create PR
 * 7. Poll for completion
 */

import { getDecryptedPAT } from './patStorage'

/**
 * GitHub repository information
 */
export interface RepoInfo {
  owner: string
  repo: string
  defaultBranch: string
}

/**
 * File change to commit
 */
export interface FileChange {
  path: string
  content: string
  encoding?: 'utf-8' | 'base64'
}

/**
 * Media asset to upload
 */
export interface MediaAsset {
  type: 'photo' | 'audio' | 'drawing'
  blob: Blob
  filename: string
  path: string
}

/**
 * Pull request details
 */
export interface PullRequestInfo {
  number: number
  url: string
  head: string
  base: string
  title: string
  merged: boolean
  state: 'open' | 'closed'
}

/**
 * Sync status for UI feedback
 */
export interface SyncStatus {
  phase: 'idle' | 'forking' | 'uploading' | 'committing' | 'pr-creating' | 'polling' | 'complete' | 'error'
  progress: number
  message: string
  error?: string
  pr?: PullRequestInfo
}

/**
 * GitSync orchestrator
 */
export class GitSync {
  private pat: string | null = null
  private statusCallback?: (status: SyncStatus) => void

  constructor(statusCallback?: (status: SyncStatus) => void) {
    this.statusCallback = statusCallback
  }

  /**
   * Initialize with PAT from localStorage
   */
  async initialize(): Promise<boolean> {
    this.pat = await getDecryptedPAT()
    return this.pat !== null
  }

  /**
   * Update status and notify callback
   */
  private updateStatus(status: SyncStatus) {
    if (this.statusCallback) {
      this.statusCallback(status)
    }
  }

  /**
   * Main sync workflow
   */
  async sync(
    repo: RepoInfo,
    changes: FileChange[],
    assets: MediaAsset[],
    commitMessage: string,
    prTitle: string,
    prDescription: string
  ): Promise<PullRequestInfo> {
    if (!this.pat) {
      throw new Error('No GitHub PAT configured. Please set one in Settings.')
    }

    try {
      // Phase 1: Fork repository (if needed)
      this.updateStatus({
        phase: 'forking',
        progress: 10,
        message: 'Checking repository access...',
      })

      const forkOwner = await this.ensureFork(repo)

      // Phase 2: Upload assets
      if (assets.length > 0) {
        this.updateStatus({
          phase: 'uploading',
          progress: 30,
          message: `Uploading ${assets.length} asset(s)...`,
        })

        await this.uploadAssets(forkOwner, repo.repo, assets)
      }

      // Phase 3: Create branch and commit
      this.updateStatus({
        phase: 'committing',
        progress: 60,
        message: 'Creating branch and committing changes...',
      })

      const branchName = await this.commitChanges(
        forkOwner,
        repo.repo,
        repo.defaultBranch,
        changes,
        commitMessage
      )

      // Phase 4: Create pull request
      this.updateStatus({
        phase: 'pr-creating',
        progress: 80,
        message: 'Opening pull request...',
      })

      const pr = await this.createPullRequest(
        repo,
        forkOwner,
        branchName,
        prTitle,
        prDescription
      )

      // Phase 5: Poll for merge
      this.updateStatus({
        phase: 'polling',
        progress: 90,
        message: 'Waiting for review and merge...',
      })

      // Note: We don't actually wait for merge, just return the PR
      this.updateStatus({
        phase: 'complete',
        progress: 100,
        message: 'Pull request created successfully!',
        pr,
      })

      return pr
    } catch (error) {
      this.updateStatus({
        phase: 'error',
        progress: 0,
        message: 'Sync failed',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Ensure user has a fork of the repository
   */
  private async ensureFork(repo: RepoInfo): Promise<string> {
    // Get authenticated user
    const userResponse = await this.githubFetch('/user')
    const user = await userResponse.json()
    const username = user.login

    // Check if fork already exists
    try {
      const forkResponse = await this.githubFetch(`/repos/${username}/${repo.repo}`)
      if (forkResponse.ok) {
        return username // Fork exists
      }
    } catch {
      // Fork doesn't exist, create it
    }

    // Create fork
    const forkResponse = await this.githubFetch(`/repos/${repo.owner}/${repo.repo}/forks`, {
      method: 'POST',
    })

    if (!forkResponse.ok) {
      throw new Error(`Failed to fork repository: ${forkResponse.statusText}`)
    }

    const fork = await forkResponse.json()

    // Wait a bit for fork to be ready
    await new Promise(resolve => setTimeout(resolve, 2000))

    return fork.owner.login
  }

  /**
   * Upload media assets to GitHub using Git Tree API
   * More efficient than individual PUT requests for multiple files
   */
  private async uploadAssets(
    owner: string,
    repo: string,
    assets: MediaAsset[]
  ): Promise<void> {
    if (assets.length === 0) return

    // Get latest commit SHA
    const refResponse = await this.githubFetch(`/repos/${owner}/${repo}/git/ref/heads/master`)
    if (!refResponse.ok) {
      throw new Error('Failed to get repository ref')
    }
    const ref = await refResponse.json()
    const latestCommitSha = ref.object.sha

    // Create blobs for each asset
    const blobShas: string[] = []
    
    for (const asset of assets) {
      const content = await this.blobToBase64(asset.blob)

      const blobResponse = await this.githubFetch(
        `/repos/${owner}/${repo}/git/blobs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            encoding: 'base64',
          }),
        }
      )

      if (!blobResponse.ok) {
        throw new Error(`Failed to create blob for ${asset.filename}`)
      }

      const blob = await blobResponse.json()
      blobShas.push(blob.sha)
    }

    // Create tree with all assets
    const treeItems = assets.map((asset, i) => ({
      path: asset.path,
      mode: '100644',
      type: 'blob',
      sha: blobShas[i],
    }))

    const treeResponse = await this.githubFetch(
      `/repos/${owner}/${repo}/git/trees`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_tree: latestCommitSha,
          tree: treeItems,
        }),
      }
    )

    if (!treeResponse.ok) {
      throw new Error('Failed to create tree')
    }

    const tree = await treeResponse.json()

    // Create commit
    const commitResponse = await this.githubFetch(
      `/repos/${owner}/${repo}/git/commits`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Add ${assets.length} media asset(s)`,
          tree: tree.sha,
          parents: [latestCommitSha],
        }),
      }
    )

    if (!commitResponse.ok) {
      throw new Error('Failed to create commit for assets')
    }

    const commit = await commitResponse.json()

    // Update branch to point to new commit
    const updateResponse = await this.githubFetch(
      `/repos/${owner}/${repo}/git/refs/heads/master`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sha: commit.sha,
        }),
      }
    )

    if (!updateResponse.ok) {
      throw new Error('Failed to update branch with assets')
    }
  }

  /**
   * Create branch and commit changes
   */
  private async commitChanges(
    owner: string,
    repo: string,
    baseBranch: string,
    changes: FileChange[],
    message: string
  ): Promise<string> {
    // Generate unique branch name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const branchName = `codex-edit-${timestamp}`

    // Get base branch ref
    const refResponse = await this.githubFetch(`/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`)
    const ref = await refResponse.json()
    const baseSha = ref.object.sha

    // Create new branch
    await this.githubFetch(`/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      }),
    })

    // Create tree with changes
    const treeItems = await Promise.all(
      changes.map(async (change) => {
        const content = change.encoding === 'base64' 
          ? change.content 
          : Buffer.from(change.content, 'utf-8').toString('base64')

        return {
          path: change.path,
          mode: '100644',
          type: 'blob',
          content: change.encoding === 'base64' ? undefined : change.content,
          encoding: change.encoding || 'utf-8',
        }
      })
    )

    const treeResponse = await this.githubFetch(`/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base_tree: baseSha,
        tree: treeItems,
      }),
    })

    const tree = await treeResponse.json()

    // Create commit
    const commitResponse = await this.githubFetch(`/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        tree: tree.sha,
        parents: [baseSha],
      }),
    })

    const commit = await commitResponse.json()

    // Update branch ref to point to new commit
    await this.githubFetch(`/repos/${owner}/${repo}/git/refs/heads/${branchName}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sha: commit.sha,
        force: true,
      }),
    })

    return branchName
  }

  /**
   * Create pull request
   */
  private async createPullRequest(
    repo: RepoInfo,
    forkOwner: string,
    branchName: string,
    title: string,
    description: string
  ): Promise<PullRequestInfo> {
    const response = await this.githubFetch(`/repos/${repo.owner}/${repo.repo}/pulls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body: description,
        head: `${forkOwner}:${branchName}`,
        base: repo.defaultBranch,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to create PR: ${error.message || response.statusText}`)
    }

    const pr = await response.json()

    return {
      number: pr.number,
      url: pr.html_url,
      head: pr.head.ref,
      base: pr.base.ref,
      title: pr.title,
      merged: false,
      state: pr.state,
    }
  }

  /**
   * Poll PR status until merged or timeout
   */
  async pollPRStatus(
    repo: RepoInfo,
    prNumber: number,
    timeoutMs: number = 60000
  ): Promise<PullRequestInfo> {
    const startTime = Date.now()
    const pollInterval = 3000

    while (Date.now() - startTime < timeoutMs) {
      const response = await this.githubFetch(`/repos/${repo.owner}/${repo.repo}/pulls/${prNumber}`)
      const pr = await response.json()

      if (pr.merged || pr.state === 'closed') {
        return {
          number: pr.number,
          url: pr.html_url,
          head: pr.head.ref,
          base: pr.base.ref,
          title: pr.title,
          merged: pr.merged,
          state: pr.state,
        }
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    throw new Error('PR polling timeout')
  }

  /**
   * GitHub API fetch with PAT auth
   */
  private async githubFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = endpoint.startsWith('http') 
      ? endpoint 
      : `https://api.github.com${endpoint}`

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.pat}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
  }

  /**
   * Convert blob to base64
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
}

/**
 * Save draft to localStorage
 */
export function saveDraft(strandPath: string, content: string, metadata: any): void {
  const draft = {
    content,
    metadata,
    timestamp: Date.now(),
  }
  
  localStorage.setItem(`codex-draft-${strandPath}`, JSON.stringify(draft))
}

/**
 * Load draft from localStorage
 */
export function loadDraft(strandPath: string): { content: string; metadata: any; timestamp: number } | null {
  const stored = localStorage.getItem(`codex-draft-${strandPath}`)
  if (!stored) return null
  
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Clear draft from localStorage
 */
export function clearDraft(strandPath: string): void {
  localStorage.removeItem(`codex-draft-${strandPath}`)
}
