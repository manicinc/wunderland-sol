/**
 * GitHub Storage Adapter
 * @module lib/storage/adapters/GitHubStorageAdapter
 *
 * Storage adapter for GitHub repositories.
 * - Read: Works for public repos without authentication
 * - Write: Requires PAT (Personal Access Token) for commits
 *
 * Uses GitHub REST API for file operations:
 * - GET /repos/{owner}/{repo}/contents/{path} - Read file
 * - PUT /repos/{owner}/{repo}/contents/{path} - Create/update file
 * - DELETE /repos/{owner}/{repo}/contents/{path} - Delete file
 */

import type {
    StorageAdapter,
    StorableStrand,
    StorableCollection,
    StorableDraft,
    StorableBookmark,
    StorablePreferences,
    StorableEntity,
    EntitySyncStatus,
    GitHubRepoConfig,
} from '../types'

// ============================================================================
// TYPES
// ============================================================================

interface GitHubFileContent {
    name: string
    path: string
    sha: string
    size: number
    url: string
    html_url: string
    git_url: string
    download_url: string | null
    type: 'file' | 'dir'
    content?: string  // Base64 encoded content (only for files)
    encoding?: 'base64'
}

interface GitHubCommitInfo {
    content: GitHubFileContent
    commit: {
        sha: string
        message: string
    }
}

// ============================================================================
// GITHUB STORAGE ADAPTER
// ============================================================================

export class GitHubStorageAdapter implements StorageAdapter {
    readonly name = 'GitHub'

    private config: GitHubRepoConfig
    private headers: Record<string, string>

    constructor(config: GitHubRepoConfig) {
        this.config = {
            ...config,
            branch: config.branch || 'main',
            basePath: config.basePath || '',
        }

        // Set up headers
        this.headers = {
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28',
        }

        if (config.pat) {
            this.headers['Authorization'] = `Bearer ${config.pat}`
        }
    }

    get canWrite(): boolean {
        return !!this.config.pat
    }

    // ==========================================================================
    // LIFECYCLE
    // ==========================================================================

    async initialize(): Promise<void> {
        // Verify repository access
        try {
            const response = await fetch(
                `https://api.github.com/repos/${this.config.owner}/${this.config.repo}`,
                { headers: this.headers }
            )

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Repository ${this.config.owner}/${this.config.repo} not found or not accessible`)
                }
                throw new Error(`GitHub API error: ${response.status}`)
            }

            console.log(`[GitHubStorageAdapter] Initialized for ${this.config.owner}/${this.config.repo}`)
        } catch (error) {
            console.error('[GitHubStorageAdapter] Initialization failed:', error)
            throw error
        }
    }

    async close(): Promise<void> {
        // No-op for GitHub adapter
    }

    // ==========================================================================
    // INTERNAL HELPERS
    // ==========================================================================

    private getFilePath(entityType: string, id: string): string {
        const basePath = this.config.basePath ? `${this.config.basePath}/` : ''
        return `${basePath}.quarry/${entityType}/${id}.json`
    }

    private async readFile(path: string): Promise<{ content: string; sha: string } | null> {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${path}?ref=${this.config.branch}`,
                { headers: this.headers }
            )

            if (response.status === 404) {
                return null
            }

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`)
            }

            const data = await response.json() as GitHubFileContent

            if (data.type !== 'file' || !data.content) {
                return null
            }

            // Decode base64 content
            const content = atob(data.content.replace(/\n/g, ''))
            return { content, sha: data.sha }
        } catch (error) {
            console.error(`[GitHubStorageAdapter] Failed to read ${path}:`, error)
            return null
        }
    }

    private async writeFile(
        path: string,
        content: string,
        message: string,
        sha?: string
    ): Promise<string> {
        if (!this.canWrite) {
            throw new Error('GitHub PAT required for write operations')
        }

        const response = await fetch(
            `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${path}`,
            {
                method: 'PUT',
                headers: {
                    ...this.headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    content: btoa(content),  // Base64 encode
                    branch: this.config.branch,
                    ...(sha && { sha }),  // Required for updates
                }),
            }
        )

        if (!response.ok) {
            const error = await response.json()
            throw new Error(`GitHub API error: ${error.message || response.status}`)
        }

        const data = await response.json() as GitHubCommitInfo
        return data.content.sha
    }

    private async deleteFile(path: string, sha: string, message: string): Promise<void> {
        if (!this.canWrite) {
            throw new Error('GitHub PAT required for delete operations')
        }

        const response = await fetch(
            `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${path}`,
            {
                method: 'DELETE',
                headers: {
                    ...this.headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    sha,
                    branch: this.config.branch,
                }),
            }
        )

        if (!response.ok && response.status !== 404) {
            const error = await response.json()
            throw new Error(`GitHub API error: ${error.message || response.status}`)
        }
    }

    private async listDirectory(path: string): Promise<GitHubFileContent[]> {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${path}?ref=${this.config.branch}`,
                { headers: this.headers }
            )

            if (response.status === 404) {
                return []
            }

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`)
            }

            const data = await response.json()
            return Array.isArray(data) ? data : []
        } catch (error) {
            console.error(`[GitHubStorageAdapter] Failed to list ${path}:`, error)
            return []
        }
    }

    // ==========================================================================
    // STRAND OPERATIONS
    // ==========================================================================

    async getStrand(path: string): Promise<StorableStrand | null> {
        const result = await this.readFile(this.getFilePath('strands', path.replace(/\//g, '_')))
        if (!result) return null

        try {
            const strand = JSON.parse(result.content) as StorableStrand
            strand.githubSha = result.sha
            return strand
        } catch {
            return null
        }
    }

    async getAllStrands(): Promise<StorableStrand[]> {
        const files = await this.listDirectory(this.getFilePath('strands', '').replace(/\/[^/]*$/, ''))
        const strands: StorableStrand[] = []

        for (const file of files) {
            if (file.type === 'file' && file.name.endsWith('.json')) {
                const result = await this.readFile(file.path)
                if (result) {
                    try {
                        const strand = JSON.parse(result.content) as StorableStrand
                        strand.githubSha = result.sha
                        strands.push(strand)
                    } catch {
                        // Skip malformed files
                    }
                }
            }
        }

        return strands
    }

    async getStrandsByWeave(weave: string): Promise<StorableStrand[]> {
        const allStrands = await this.getAllStrands()
        return allStrands.filter(s => s.weave === weave)
    }

    async getStrandsByLoom(loom: string): Promise<StorableStrand[]> {
        const allStrands = await this.getAllStrands()
        return allStrands.filter(s => s.loom === loom)
    }

    async saveStrand(strand: StorableStrand): Promise<void> {
        const path = this.getFilePath('strands', strand.path.replace(/\//g, '_'))

        // Check if file exists to get SHA
        const existing = await this.readFile(path)

        await this.writeFile(
            path,
            JSON.stringify(strand, null, 2),
            `Update strand: ${strand.title}`,
            existing?.sha
        )
    }

    async deleteStrand(path: string): Promise<void> {
        const filePath = this.getFilePath('strands', path.replace(/\//g, '_'))
        const existing = await this.readFile(filePath)

        if (existing) {
            await this.deleteFile(filePath, existing.sha, `Delete strand: ${path}`)
        }
    }

    // ==========================================================================
    // COLLECTION OPERATIONS
    // ==========================================================================

    async getCollection(id: string): Promise<StorableCollection | null> {
        const result = await this.readFile(this.getFilePath('collections', id))
        if (!result) return null

        try {
            return JSON.parse(result.content) as StorableCollection
        } catch {
            return null
        }
    }

    async getAllCollections(): Promise<StorableCollection[]> {
        const files = await this.listDirectory(this.getFilePath('collections', '').replace(/\/[^/]*$/, ''))
        const collections: StorableCollection[] = []

        for (const file of files) {
            if (file.type === 'file' && file.name.endsWith('.json')) {
                const result = await this.readFile(file.path)
                if (result) {
                    try {
                        collections.push(JSON.parse(result.content) as StorableCollection)
                    } catch {
                        // Skip malformed files
                    }
                }
            }
        }

        return collections
    }

    async saveCollection(collection: StorableCollection): Promise<void> {
        const path = this.getFilePath('collections', collection.id)
        const existing = await this.readFile(path)

        await this.writeFile(
            path,
            JSON.stringify(collection, null, 2),
            `Update collection: ${collection.title}`,
            existing?.sha
        )
    }

    async deleteCollection(id: string): Promise<void> {
        const path = this.getFilePath('collections', id)
        const existing = await this.readFile(path)

        if (existing) {
            await this.deleteFile(path, existing.sha, `Delete collection: ${id}`)
        }
    }

    // ==========================================================================
    // DRAFT OPERATIONS (Drafts are local-only, but we support sync if needed)
    // ==========================================================================

    async getDraft(id: string): Promise<StorableDraft | null> {
        const result = await this.readFile(this.getFilePath('drafts', id))
        if (!result) return null

        try {
            return JSON.parse(result.content) as StorableDraft
        } catch {
            return null
        }
    }

    async getAllDrafts(): Promise<StorableDraft[]> {
        const files = await this.listDirectory(this.getFilePath('drafts', '').replace(/\/[^/]*$/, ''))
        const drafts: StorableDraft[] = []

        for (const file of files) {
            if (file.type === 'file' && file.name.endsWith('.json')) {
                const result = await this.readFile(file.path)
                if (result) {
                    try {
                        drafts.push(JSON.parse(result.content) as StorableDraft)
                    } catch {
                        // Skip malformed files
                    }
                }
            }
        }

        return drafts
    }

    async saveDraft(draft: StorableDraft): Promise<void> {
        const path = this.getFilePath('drafts', draft.id)
        const existing = await this.readFile(path)

        await this.writeFile(
            path,
            JSON.stringify(draft, null, 2),
            `Update draft: ${draft.title}`,
            existing?.sha
        )
    }

    async deleteDraft(id: string): Promise<void> {
        const path = this.getFilePath('drafts', id)
        const existing = await this.readFile(path)

        if (existing) {
            await this.deleteFile(path, existing.sha, `Delete draft: ${id}`)
        }
    }

    // ==========================================================================
    // BOOKMARK OPERATIONS
    // ==========================================================================

    async getBookmark(strandPath: string): Promise<StorableBookmark | null> {
        const id = strandPath.replace(/\//g, '_')
        const result = await this.readFile(this.getFilePath('bookmarks', id))
        if (!result) return null

        try {
            return JSON.parse(result.content) as StorableBookmark
        } catch {
            return null
        }
    }

    async getAllBookmarks(): Promise<StorableBookmark[]> {
        const files = await this.listDirectory(this.getFilePath('bookmarks', '').replace(/\/[^/]*$/, ''))
        const bookmarks: StorableBookmark[] = []

        for (const file of files) {
            if (file.type === 'file' && file.name.endsWith('.json')) {
                const result = await this.readFile(file.path)
                if (result) {
                    try {
                        bookmarks.push(JSON.parse(result.content) as StorableBookmark)
                    } catch {
                        // Skip malformed files
                    }
                }
            }
        }

        return bookmarks
    }

    async saveBookmark(bookmark: StorableBookmark): Promise<void> {
        const id = bookmark.strandPath.replace(/\//g, '_')
        const path = this.getFilePath('bookmarks', id)
        const existing = await this.readFile(path)

        await this.writeFile(
            path,
            JSON.stringify(bookmark, null, 2),
            `Update bookmark: ${bookmark.strandPath}`,
            existing?.sha
        )
    }

    async deleteBookmark(strandPath: string): Promise<void> {
        const id = strandPath.replace(/\//g, '_')
        const path = this.getFilePath('bookmarks', id)
        const existing = await this.readFile(path)

        if (existing) {
            await this.deleteFile(path, existing.sha, `Delete bookmark: ${strandPath}`)
        }
    }

    // ==========================================================================
    // PREFERENCES OPERATIONS
    // ==========================================================================

    async getPreferences(): Promise<StorablePreferences | null> {
        const result = await this.readFile(this.getFilePath('preferences', 'user'))
        if (!result) return null

        try {
            return JSON.parse(result.content) as StorablePreferences
        } catch {
            return null
        }
    }

    async savePreferences(prefs: StorablePreferences): Promise<void> {
        const path = this.getFilePath('preferences', 'user')
        const existing = await this.readFile(path)

        await this.writeFile(
            path,
            JSON.stringify(prefs, null, 2),
            'Update user preferences',
            existing?.sha
        )
    }

    // ==========================================================================
    // BULK OPERATIONS
    // ==========================================================================

    async getPendingEntities(): Promise<StorableEntity[]> {
        // GitHub adapter doesn't track pending status - that's managed by StorageManager
        return []
    }

    async updateSyncStatus(_ids: string[], _status: EntitySyncStatus): Promise<void> {
        // GitHub adapter doesn't track sync status - that's managed by StorageManager
    }

    async clearAll(): Promise<void> {
        if (!this.canWrite) {
            throw new Error('GitHub PAT required for clear operations')
        }

        console.warn('[GitHubStorageAdapter] clearAll is a destructive operation')

        // Delete all .quarry directories
        const basePath = this.config.basePath ? `${this.config.basePath}/.quarry` : '.quarry'
        const entities = ['strands', 'collections', 'drafts', 'bookmarks', 'preferences']

        for (const entity of entities) {
            const files = await this.listDirectory(`${basePath}/${entity}`)
            for (const file of files) {
                if (file.type === 'file') {
                    await this.deleteFile(file.path, file.sha, `Clear all: delete ${file.name}`)
                }
            }
        }
    }
}
