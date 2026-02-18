/**
 * Source Adapter for Categorization
 * @module lib/categorization/sourceAdapter
 *
 * Automatically detects codex source (local files vs GitHub) and uses appropriate sync method
 */

import type {
  CategorizationAction,
  SyncResult,
} from './types'
import { getDb } from '@/lib/storage/localCodex'
import { syncCategorizationActions as syncToGitHub } from './githubSync'

/**
 * Codex source configuration
 */
export interface CodexSource {
  type: 'local' | 'github'
  path?: string           // For local: filesystem path
  owner?: string          // For GitHub: repo owner
  repo?: string           // For GitHub: repo name
  branch?: string         // For GitHub: branch name
  token?: string          // For GitHub: PAT
}

/**
 * Get current codex source from settings
 */
export async function getCodexSource(): Promise<CodexSource> {
  const db = await getDb()

  try {
    // Try to get from fabric/codex settings
    const settingsRow = await db.get<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      ['codex_source']
    )

    if (settingsRow) {
      return JSON.parse(settingsRow.value)
    }

    // Check for GitHub config (legacy)
    const githubConfigRow = await db.get<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      ['github_config']
    )

    if (githubConfigRow) {
      const config = JSON.parse(githubConfigRow.value)
      return {
        type: 'github',
        owner: config.owner,
        repo: config.repo,
        branch: config.baseBranch || 'main',
        token: config.token,
      }
    }

    // Check for local directory setting
    const localPathRow = await db.get<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      ['local_codex_path']
    )

    if (localPathRow) {
      return {
        type: 'local',
        path: localPathRow.value,
      }
    }

    // Default: assume local
    return {
      type: 'local',
      path: '/weaves/',
    }
  } catch (error) {
    console.error('[SourceAdapter] Failed to get codex source:', error)
    return { type: 'local', path: '/weaves/' }
  }
}

/**
 * Save codex source configuration
 */
export async function setCodexSource(source: CodexSource): Promise<void> {
  const db = await getDb()

  await db.run(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    ['codex_source', JSON.stringify(source)]
  )
}

/**
 * Detect if current source supports auto-sync
 */
export async function supportsAutoSync(): Promise<boolean> {
  const source = await getCodexSource()

  switch (source.type) {
    case 'github':
      // Check if we have valid GitHub config
      return !!(source.owner && source.repo && source.token)

    case 'local':
      // Local files can be moved directly
      return !!(source.path)

    default:
      return false
  }
}

/**
 * Sync categorization actions using appropriate method
 */
export async function syncCategorizationActions(
  limit = 50
): Promise<SyncResult> {
  const source = await getCodexSource()

  switch (source.type) {
    case 'github':
      return syncToGitHub(limit)

    case 'local':
      return syncToLocalFilesystem(limit, source)

    default:
      throw new Error(`Unsupported source type: ${source.type}`)
  }
}

/**
 * Sync to local filesystem (direct file moves)
 */
async function syncToLocalFilesystem(
  limit: number,
  source: CodexSource
): Promise<SyncResult> {
  const result: SyncResult = {
    synced: 0,
    failed: 0,
    errors: [],
  }

  try {
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
        await db.run(
          'UPDATE categorization_actions SET status = ? WHERE id = ?',
          ['syncing', action.id]
        )

        // Perform file operation based on action type
        switch (action.action_type) {
          case 'move':
          case 'create_pr':  // Local doesn't need PR, just move
          case 'create_issue':  // Local doesn't need issue, just move
            await moveLocalFile(action, source)
            break
        }

        // Update status to completed
        await db.run(
          'UPDATE categorization_actions SET status = ?, synced_at = ? WHERE id = ?',
          ['completed', new Date().toISOString(), action.id]
        )

        result.synced++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Update status to failed
        await db.run(
          'UPDATE categorization_actions SET status = ?, sync_error = ? WHERE id = ?',
          ['failed', errorMessage, action.id]
        )

        result.failed++
        result.errors.push({
          actionId: action.id,
          error: errorMessage,
        })

        console.error(`[SourceAdapter] Failed to sync action ${action.id}:`, error)
      }
    }

    return result
  } catch (error) {
    console.error('[SourceAdapter] Local sync failed:', error)
    throw error
  }
}

/**
 * Move file in local filesystem
 */
async function moveLocalFile(
  action: CategorizationAction,
  source: CodexSource
): Promise<void> {
  // Use File System Access API if available (browser)
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    await moveFileWithFSA(action, source)
    return
  }

  // Fallback: Update database only (for non-browser environments)
  await moveFileInDatabase(action)
}

/**
 * Move file using File System Access API (browser)
 */
async function moveFileWithFSA(
  action: CategorizationAction,
  source: CodexSource
): Promise<void> {
  try {
    // This requires user permission first time
    // @ts-ignore - File System Access API
    const rootHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents',
    })

    // Get old file
    const oldPath = action.from_path.split('/')
    let currentDir = rootHandle
    for (let i = 0; i < oldPath.length - 1; i++) {
      currentDir = await currentDir.getDirectoryHandle(oldPath[i])
    }
    const oldFile = await currentDir.getFileHandle(oldPath[oldPath.length - 1])

    // Create new directory structure
    const newPath = action.to_path.split('/')
    let targetDir = rootHandle
    for (let i = 0; i < newPath.length - 1; i++) {
      targetDir = await targetDir.getDirectoryHandle(newPath[i], { create: true })
    }

    // Write to new location
    const newFile = await targetDir.getFileHandle(newPath[newPath.length - 1], { create: true })
    const writable = await newFile.createWritable()
    await writable.write(action.strand_content)
    await writable.close()

    // Delete old file
    await currentDir.removeEntry(oldPath[oldPath.length - 1])

    console.log(`[SourceAdapter] Moved ${action.from_path} → ${action.to_path}`)
  } catch (error) {
    console.error('[SourceAdapter] FSA move failed, falling back to database:', error)
    await moveFileInDatabase(action)
  }
}

/**
 * Move file in database only (virtual move)
 */
async function moveFileInDatabase(action: CategorizationAction): Promise<void> {
  const db = await getDb()

  // Update strand path in database
  await db.run(
    'UPDATE strands SET path = ? WHERE path = ?',
    [action.to_path, action.from_path]
  )

  // Update any references
  await db.run(
    'UPDATE strand_links SET source_path = ? WHERE source_path = ?',
    [action.to_path, action.from_path]
  )

  await db.run(
    'UPDATE strand_links SET target_path = ? WHERE target_path = ?',
    [action.to_path, action.from_path]
  )

  console.log(`[SourceAdapter] Updated database: ${action.from_path} → ${action.to_path}`)
}

/**
 * Get friendly source display name
 */
export async function getSourceDisplayName(): Promise<string> {
  const source = await getCodexSource()

  switch (source.type) {
    case 'github':
      return `GitHub: ${source.owner}/${source.repo}`

    case 'local':
      return `Local: ${source.path}`

    default:
      return 'Unknown source'
  }
}

/**
 * Check if source is available/reachable
 */
export async function isSourceReachable(): Promise<boolean> {
  const source = await getCodexSource()

  switch (source.type) {
    case 'github':
      // Check GitHub API
      if (!navigator.onLine) return false
      try {
        const response = await fetch('https://api.github.com', {
          method: 'HEAD',
          cache: 'no-cache',
        })
        return response.ok
      } catch {
        return false
      }

    case 'local':
      // Local is always available
      return true

    default:
      return false
  }
}

/**
 * Get recommended action type based on source
 */
export async function getRecommendedActionType(
  confidence: number
): Promise<'move' | 'create_pr' | 'create_issue'> {
  const source = await getCodexSource()

  if (source.type === 'local') {
    // Local always uses 'move' (no PR/issue concept)
    return 'move'
  }

  // GitHub uses confidence-based actions
  if (confidence >= 0.95) return 'move'
  if (confidence >= 0.80) return 'create_pr'
  return 'create_issue'
}

/**
 * Auto-detect source from environment
 */
export async function autoDetectSource(): Promise<CodexSource> {
  // Check if running in GitHub Codespaces
  if (process.env.CODESPACES === 'true') {
    return {
      type: 'github',
      owner: process.env.GITHUB_REPOSITORY_OWNER || '',
      repo: process.env.GITHUB_REPOSITORY?.split('/')[1] || '',
      branch: 'main',
      token: process.env.GITHUB_TOKEN,
    }
  }

  // Check if .git directory exists (is a repo)
  try {
    const response = await fetch('/.git/config')
    if (response.ok) {
      const gitConfig = await response.text()
      const match = gitConfig.match(/github\.com[:/](.+)\/(.+)\.git/)
      if (match) {
        return {
          type: 'github',
          owner: match[1],
          repo: match[2],
          branch: 'main',
        }
      }
    }
  } catch {
    // Not a git repo or can't access .git
  }

  // Default to local
  return {
    type: 'local',
    path: '/weaves/',
  }
}

/**
 * Initialize source detection
 */
export async function initializeSourceDetection(): Promise<void> {
  const existing = await getCodexSource()

  // If no source configured, auto-detect
  if (!existing.type || (existing.type === 'local' && !existing.path)) {
    const detected = await autoDetectSource()
    await setCodexSource(detected)
    console.log('[SourceAdapter] Auto-detected source:', detected.type)
  }
}
