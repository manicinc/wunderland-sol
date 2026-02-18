/**
 * Git History Sync Service
 * @module analytics/gitHistorySync
 *
 * Parses git log to populate analytics data with accurate creation/modification dates.
 * Works for both local SQLite and GitHub storage backends - git history is the source of truth.
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { recordGitCommits } from './gitAnalyticsService'
import type { GitCommit } from './types'
import { getDatabase } from '@/lib/codexDatabase'

const execAsync = promisify(exec)

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GitFileInfo {
  path: string
  sha: string
  authorName: string
  authorEmail: string
  committedAt: Date
  message: string
  status: 'A' | 'M' | 'D' // Added, Modified, Deleted
}

export interface SyncResult {
  success: boolean
  strandsPopulated: number
  commitsRecorded: number
  errors: string[]
  syncedAt: Date
}

interface FileHistoryEntry {
  createdAt: Date
  updatedAt: Date
  createdBy: string
  createdByEmail: string
  commits: GitFileInfo[]
}

// Cache to avoid re-syncing too frequently
let lastSyncTime: Date | null = null
const SYNC_COOLDOWN_MS = 60 * 1000 // 1 minute cooldown

// ═══════════════════════════════════════════════════════════════════════════════
// GIT LOG PARSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse git log output into structured data
 * Format: "sha|authorName|authorEmail|isoDate|message" followed by file status lines
 */
function parseGitLog(output: string): GitFileInfo[] {
  const results: GitFileInfo[] = []
  const lines = output.trim().split('\n').filter(l => l.length > 0)

  let currentCommit: {
    sha: string
    authorName: string
    authorEmail: string
    committedAt: Date
    message: string
  } | null = null

  for (const line of lines) {
    // Check if this is a commit header line (contains pipe separators)
    if (line.includes('|') && line.split('|').length >= 5) {
      const parts = line.split('|')
      currentCommit = {
        sha: parts[0],
        authorName: parts[1],
        authorEmail: parts[2],
        committedAt: new Date(parts[3]),
        message: parts.slice(4).join('|'), // Message might contain pipes
      }
    } else if (currentCommit && /^[AMD]\t/.test(line)) {
      // This is a file status line: "A\tpath/to/file.md"
      const [status, filePath] = line.split('\t')
      if (filePath && (status === 'A' || status === 'M' || status === 'D')) {
        results.push({
          path: filePath,
          sha: currentCommit.sha,
          authorName: currentCommit.authorName,
          authorEmail: currentCommit.authorEmail,
          committedAt: currentCommit.committedAt,
          message: currentCommit.message,
          status: status as 'A' | 'M' | 'D',
        })
      }
    }
  }

  return results
}

/**
 * Get git history for all strand files
 * Returns all commits that touched weaves/**\/*.md files
 */
async function getGitHistory(repoPath: string): Promise<GitFileInfo[]> {
  try {
    // Get all commits that touched strand files, with file status
    const { stdout } = await execAsync(
      `git log --name-status --format="%H|%an|%ae|%aI|%s" -- "weaves/**/*.md"`,
      {
        cwd: repoPath,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large repos
      }
    )

    return parseGitLog(stdout)
  } catch (error) {
    console.error('[GitHistorySync] Failed to get git history:', error)
    return []
  }
}

/**
 * Build file history map from git log entries
 * Maps file paths to their creation date, last update, and commit history
 */
function buildFileHistoryMap(gitEntries: GitFileInfo[]): Map<string, FileHistoryEntry> {
  const fileHistory = new Map<string, FileHistoryEntry>()

  // Sort entries by date (oldest first) to process in chronological order
  const sortedEntries = [...gitEntries].sort(
    (a, b) => a.committedAt.getTime() - b.committedAt.getTime()
  )

  for (const entry of sortedEntries) {
    const existing = fileHistory.get(entry.path)

    if (!existing) {
      // First time seeing this file - this is the creation commit
      fileHistory.set(entry.path, {
        createdAt: entry.committedAt,
        updatedAt: entry.committedAt,
        createdBy: entry.authorName,
        createdByEmail: entry.authorEmail,
        commits: [entry],
      })
    } else {
      // File already exists - update the last modified date
      existing.updatedAt = entry.committedAt
      existing.commits.push(entry)
    }
  }

  return fileHistory
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE SYNC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Update strands table with git-derived creation/update dates
 */
async function syncStrandsWithGitDates(
  fileHistory: Map<string, FileHistoryEntry>
): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = []
  let updated = 0

  try {
    const db = await getDatabase()

    if (!db) {
      errors.push('Database not available')
      return { updated: 0, errors }
    }

    for (const [filePath, history] of fileHistory) {
      try {
        // Try exact path and normalized variations
        const normalizedPath = filePath.replace(/^weaves\//, '')

        // Update strands table with git dates
        const result = await db.run(`
          UPDATE strands
          SET created_at = ?, updated_at = ?
          WHERE path = ? OR path LIKE ?
        `, [
          history.createdAt.toISOString(),
          history.updatedAt.toISOString(),
          filePath,
          `%${normalizedPath}`
        ])

        if (result.changes && result.changes > 0) {
          updated++
        }
      } catch (err) {
        errors.push(`Failed to update ${filePath}: ${err}`)
      }
    }

    return { updated, errors }
  } catch (error) {
    errors.push(`Database sync failed: ${error}`)
    return { updated: 0, errors }
  }
}

/**
 * Record all git commits to the git_commits table
 */
async function syncGitCommits(gitEntries: GitFileInfo[]): Promise<{ recorded: number; errors: string[] }> {
  const errors: string[] = []

  try {
    // Convert to GitCommit format
    const commits: GitCommit[] = gitEntries.map(entry => ({
      sha: entry.sha,
      message: entry.message,
      authorName: entry.authorName,
      authorEmail: entry.authorEmail,
      committedAt: entry.committedAt.toISOString(),
      strandPath: entry.path,
      // Git log with --name-status doesn't give line counts, set to 0
      additions: 0,
      deletions: 0,
    }))

    // Deduplicate by sha+strand_path
    const seen = new Set<string>()
    const uniqueCommits = commits.filter(c => {
      const key = `${c.sha}:${c.strandPath}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    await recordGitCommits(uniqueCommits)

    return { recorded: uniqueCommits.length, errors }
  } catch (error) {
    errors.push(`Failed to record git commits: ${error}`)
    return { recorded: 0, errors }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SYNC FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Main sync function - parses git history and populates analytics tables
 * Call this on analytics page load to ensure data is fresh
 */
export async function syncGitHistoryToAnalytics(options: {
  force?: boolean
  repoPath?: string
} = {}): Promise<SyncResult> {
  const { force = false, repoPath = process.cwd() } = options

  // Check cooldown (unless forced)
  if (!force && lastSyncTime) {
    const timeSinceLastSync = Date.now() - lastSyncTime.getTime()
    if (timeSinceLastSync < SYNC_COOLDOWN_MS) {
      return {
        success: true,
        strandsPopulated: 0,
        commitsRecorded: 0,
        errors: ['Skipped - sync cooldown active'],
        syncedAt: lastSyncTime,
      }
    }
  }

  const errors: string[] = []
  let strandsPopulated = 0
  let commitsRecorded = 0

  try {
    // Step 1: Get git history
    console.log('[GitHistorySync] Fetching git history...')
    const gitEntries = await getGitHistory(repoPath)

    if (gitEntries.length === 0) {
      errors.push('No git history found for weaves/**/*.md files')
      return {
        success: false,
        strandsPopulated: 0,
        commitsRecorded: 0,
        errors,
        syncedAt: new Date(),
      }
    }

    console.log(`[GitHistorySync] Found ${gitEntries.length} git entries`)

    // Step 2: Build file history map
    const fileHistory = buildFileHistoryMap(gitEntries)
    console.log(`[GitHistorySync] Built history for ${fileHistory.size} files`)

    // Step 3: Sync strands table with git dates
    const strandResult = await syncStrandsWithGitDates(fileHistory)
    strandsPopulated = strandResult.updated
    errors.push(...strandResult.errors)

    // Step 4: Record git commits
    const commitResult = await syncGitCommits(gitEntries)
    commitsRecorded = commitResult.recorded
    errors.push(...commitResult.errors)

    // Update last sync time
    lastSyncTime = new Date()

    console.log(`[GitHistorySync] Sync complete: ${strandsPopulated} strands updated, ${commitsRecorded} commits recorded`)

    return {
      success: errors.length === 0,
      strandsPopulated,
      commitsRecorded,
      errors,
      syncedAt: lastSyncTime,
    }
  } catch (error) {
    errors.push(`Sync failed: ${error}`)
    return {
      success: false,
      strandsPopulated,
      commitsRecorded,
      errors,
      syncedAt: new Date(),
    }
  }
}

/**
 * Check if sync is needed (cooldown expired)
 */
export function isSyncNeeded(): boolean {
  if (!lastSyncTime) return true
  return Date.now() - lastSyncTime.getTime() >= SYNC_COOLDOWN_MS
}

/**
 * Get last sync time
 */
export function getLastSyncTime(): Date | null {
  return lastSyncTime
}
