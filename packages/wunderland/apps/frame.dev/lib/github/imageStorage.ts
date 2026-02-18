/**
 * GitHub Image Storage - Commit generated images to repository
 * @module github/imageStorage
 *
 * @remarks
 * Handles committing AI-generated illustrations to GitHub.
 * Uses the Git Tree API for efficient batch uploads.
 *
 * Structure:
 * weaves/uploads/{project-title}/
 *   _manifest.json        - Project metadata + style memory
 *   content/
 *     chapter-01.md       - Converted markdown
 *   illustrations/
 *     001-page-1.png
 *     002-page-5.png
 */

import { getDecryptedPAT } from './patStorage'

/**
 * Image to commit
 */
export interface ImageToCommit {
  /** Unique image ID */
  id: string
  /** Base64 encoded image data (without data URL prefix) */
  base64: string
  /** Original page/chunk index */
  pageIndex: number
  /** Chunk ID this image belongs to */
  chunkId: string
  /** Prompt used to generate this image */
  prompt: string
  /** Image generation provider */
  provider: 'openai' | 'replicate'
  /** Cost of generation */
  cost: number
}

/**
 * Project manifest for GitHub storage
 */
export interface ProjectManifest {
  /** Project title (e.g., "1984 by George Orwell") */
  title: string
  /** Original filename */
  sourceFile: string
  /** Creation timestamp */
  createdAt: string
  /** Style memory JSON */
  styleMemory?: string
  /** Optional conversion manifest for the source document */
  conversionManifest?: unknown
  /** Total images generated */
  imageCount: number
  /** Total generation cost */
  totalCost: number
  /** Provider used */
  provider: 'openai' | 'replicate'
  /** List of generated images */
  images: {
    id: string
    filename: string
    pageIndex: number
    chunkId: string
    prompt: string
    cost: number
  }[]
}

/**
 * Commit status
 */
export interface CommitStatus {
  phase: 'preparing' | 'uploading' | 'committing' | 'complete' | 'error'
  progress: number
  message: string
  error?: string
  commitUrl?: string
}

/**
 * Repository configuration
 */
export interface RepoConfig {
  owner: string
  repo: string
  branch: string
  basePath: string
}

const DEFAULT_REPO_CONFIG: RepoConfig = {
  owner: 'framersai',
  repo: 'weaves',
  branch: 'master',
  basePath: 'uploads',
}

/**
 * Slugify a title for use in file paths
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * GitHub Image Storage class
 */
export class GitHubImageStorage {
  private pat: string | null = null
  private statusCallback?: (status: CommitStatus) => void
  private config: RepoConfig

  constructor(
    statusCallback?: (status: CommitStatus) => void,
    config?: Partial<RepoConfig>
  ) {
    this.statusCallback = statusCallback
    this.config = { ...DEFAULT_REPO_CONFIG, ...config }
  }

  /**
   * Initialize with PAT from localStorage
   */
  async initialize(): Promise<boolean> {
    this.pat = await getDecryptedPAT()
    return this.pat !== null
  }

  /**
   * Set PAT directly (for API routes)
   */
  setPAT(pat: string): void {
    this.pat = pat
  }

  /**
   * Update status and notify callback
   */
  private updateStatus(status: CommitStatus) {
    if (this.statusCallback) {
      this.statusCallback(status)
    }
  }

  /**
   * Commit generated images to GitHub
   */
  async commitImages(
    projectTitle: string,
    images: ImageToCommit[],
    styleMemory?: string,
    markdownContent?: { chunkId: string; content: string }[],
    conversionManifest?: unknown
  ): Promise<{ success: boolean; commitUrl?: string; error?: string }> {
    if (!this.pat) {
      return { success: false, error: 'No GitHub PAT configured' }
    }

    try {
      this.updateStatus({
        phase: 'preparing',
        progress: 10,
        message: 'Preparing files for upload...',
      })

      const projectSlug = slugify(projectTitle)
      const basePath = `${this.config.basePath}/${projectSlug}`

      // Create manifest
      const manifest: ProjectManifest = {
        title: projectTitle,
        sourceFile: `${projectSlug}.pdf`,
        createdAt: new Date().toISOString(),
        styleMemory,
        conversionManifest,
        imageCount: images.length,
        totalCost: images.reduce((sum, img) => sum + img.cost, 0),
        provider: images[0]?.provider || 'openai',
        images: images.map((img, idx) => ({
          id: img.id,
          filename: `${String(idx + 1).padStart(3, '0')}-page-${img.pageIndex + 1}.png`,
          pageIndex: img.pageIndex,
          chunkId: img.chunkId,
          prompt: img.prompt,
          cost: img.cost,
        })),
      }

      // Get latest commit SHA
      this.updateStatus({
        phase: 'uploading',
        progress: 20,
        message: 'Connecting to repository...',
      })

      const refResponse = await this.githubFetch(
        `/repos/${this.config.owner}/${this.config.repo}/git/ref/heads/${this.config.branch}`
      )

      if (!refResponse.ok) {
        throw new Error(`Failed to get repository ref: ${refResponse.statusText}`)
      }

      const ref = await refResponse.json()
      const latestCommitSha = ref.object.sha

      // Create blobs for all files
      const blobs: { path: string; sha: string }[] = []

      // Upload manifest
      this.updateStatus({
        phase: 'uploading',
        progress: 30,
        message: 'Uploading manifest...',
      })

      const manifestBlob = await this.createBlob(JSON.stringify(manifest, null, 2), 'utf-8')
      blobs.push({ path: `${basePath}/_manifest.json`, sha: manifestBlob })

      // Upload images
      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        const progress = 30 + Math.round((i / images.length) * 50)

        this.updateStatus({
          phase: 'uploading',
          progress,
          message: `Uploading image ${i + 1} of ${images.length}...`,
        })

        const filename = `${String(i + 1).padStart(3, '0')}-page-${img.pageIndex + 1}.png`
        const imageBlobSha = await this.createBlob(img.base64, 'base64')
        blobs.push({ path: `${basePath}/illustrations/${filename}`, sha: imageBlobSha })
      }

      // Upload markdown content if provided
      if (markdownContent && markdownContent.length > 0) {
        this.updateStatus({
          phase: 'uploading',
          progress: 85,
          message: 'Uploading markdown content...',
        })

        for (const chunk of markdownContent) {
          const mdBlob = await this.createBlob(chunk.content, 'utf-8')
          blobs.push({ path: `${basePath}/content/${chunk.chunkId}.md`, sha: mdBlob })
        }
      }

      // Create tree with all files
      this.updateStatus({
        phase: 'committing',
        progress: 90,
        message: 'Creating commit...',
      })

      const treeItems = blobs.map((blob) => ({
        path: blob.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      }))

      const treeResponse = await this.githubFetch(
        `/repos/${this.config.owner}/${this.config.repo}/git/trees`,
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
      const commitMessage = `Add ${images.length} illustrations for "${projectTitle}"\n\nGenerated with ${images[0]?.provider || 'AI'}\nTotal cost: $${manifest.totalCost.toFixed(2)}`

      const commitResponse = await this.githubFetch(
        `/repos/${this.config.owner}/${this.config.repo}/git/commits`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: commitMessage,
            tree: tree.sha,
            parents: [latestCommitSha],
          }),
        }
      )

      if (!commitResponse.ok) {
        throw new Error('Failed to create commit')
      }

      const commit = await commitResponse.json()

      // Update branch to point to new commit
      const updateResponse = await this.githubFetch(
        `/repos/${this.config.owner}/${this.config.repo}/git/refs/heads/${this.config.branch}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sha: commit.sha,
          }),
        }
      )

      if (!updateResponse.ok) {
        throw new Error('Failed to update branch')
      }

      const commitUrl = `https://github.com/${this.config.owner}/${this.config.repo}/commit/${commit.sha}`

      this.updateStatus({
        phase: 'complete',
        progress: 100,
        message: 'Images committed successfully!',
        commitUrl,
      })

      return { success: true, commitUrl }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      this.updateStatus({
        phase: 'error',
        progress: 0,
        message: 'Failed to commit images',
        error: errorMessage,
      })

      return { success: false, error: errorMessage }
    }
  }

  /**
   * Create a blob in the repository
   */
  private async createBlob(content: string, encoding: 'utf-8' | 'base64'): Promise<string> {
    const response = await this.githubFetch(
      `/repos/${this.config.owner}/${this.config.repo}/git/blobs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, encoding }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to create blob: ${response.statusText}`)
    }

    const blob = await response.json()
    return blob.sha
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
        Authorization: `Bearer ${this.pat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
  }

  /**
   * Check if a project already exists in the repo
   */
  async projectExists(projectTitle: string): Promise<boolean> {
    if (!this.pat) return false

    const projectSlug = slugify(projectTitle)
    const path = `${this.config.basePath}/${projectSlug}/_manifest.json`

    try {
      const response = await this.githubFetch(
        `/repos/${this.config.owner}/${this.config.repo}/contents/${path}`
      )
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Get manifest for existing project
   */
  async getProjectManifest(projectTitle: string): Promise<ProjectManifest | null> {
    if (!this.pat) return null

    const projectSlug = slugify(projectTitle)
    const path = `${this.config.basePath}/${projectSlug}/_manifest.json`

    try {
      const response = await this.githubFetch(
        `/repos/${this.config.owner}/${this.config.repo}/contents/${path}`
      )

      if (!response.ok) return null

      const file = await response.json()
      const content = atob(file.content)
      return JSON.parse(content)
    } catch {
      return null
    }
  }
}

/**
 * Create a storage instance for client-side use
 */
export function createImageStorage(
  statusCallback?: (status: CommitStatus) => void,
  config?: Partial<RepoConfig>
): GitHubImageStorage {
  return new GitHubImageStorage(statusCallback, config)
}
