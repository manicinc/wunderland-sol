/**
 * Git Analytics Service
 * @module lib/analytics/gitAnalyticsService
 *
 * Provides git commit tracking and metrics for content strands.
 * Caches commit data in SQLite for fast queries.
 */

import { getDatabase } from '@/lib/codexDatabase'
import type { TimeRange, GitCommit, GitCommitMetrics, TimeSeriesPoint } from './types'
import { TIME_RANGE_CONFIG } from './types'

// ============================================================================
// HELPERS
// ============================================================================

function getDateRange(range: TimeRange): { since: string; until: string } {
  const now = new Date()
  const until = now.toISOString().split('T')[0]

  if (range === 'all') {
    return { since: '2020-01-01', until }
  }

  const days = TIME_RANGE_CONFIG[range].days
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  return { since, until }
}

function fillDateGaps(
  points: TimeSeriesPoint[],
  since: string,
  until: string
): TimeSeriesPoint[] {
  const dateMap = new Map(points.map((p) => [p.date, p.count]))
  const filled: TimeSeriesPoint[] = []

  const start = new Date(since)
  const end = new Date(until)
  let cumulative = 0

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const count = dateMap.get(dateStr) || 0
    cumulative += count
    filled.push({ date: dateStr, count, cumulative })
  }

  return filled
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Ensure git_commits table exists
 */
export async function initGitCommitsTable(): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  await db.exec(`
    CREATE TABLE IF NOT EXISTS git_commits (
      sha TEXT PRIMARY KEY,
      message TEXT NOT NULL,
      author_name TEXT,
      author_email TEXT,
      committed_at TEXT NOT NULL,
      strand_path TEXT,
      additions INTEGER DEFAULT 0,
      deletions INTEGER DEFAULT 0,
      fetched_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_git_commits_date
      ON git_commits(committed_at);
    CREATE INDEX IF NOT EXISTS idx_git_commits_strand
      ON git_commits(strand_path);
    CREATE INDEX IF NOT EXISTS idx_git_commits_author
      ON git_commits(author_name);
  `)
}

/**
 * Record a git commit in the database
 */
export async function recordGitCommit(commit: GitCommit): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  await db.run(
    `INSERT OR REPLACE INTO git_commits
     (sha, message, author_name, author_email, committed_at, strand_path, additions, deletions, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      commit.sha,
      commit.message,
      commit.authorName,
      commit.authorEmail || null,
      commit.committedAt,
      commit.strandPath || null,
      commit.additions || 0,
      commit.deletions || 0,
      new Date().toISOString(),
    ]
  )
}

/**
 * Record multiple commits in a batch
 */
export async function recordGitCommits(commits: GitCommit[]): Promise<void> {
  for (const commit of commits) {
    await recordGitCommit(commit)
  }
}

// ============================================================================
// METRICS QUERIES
// ============================================================================

/**
 * Get git commit metrics for a time range
 */
export async function getGitCommitMetrics(range: TimeRange): Promise<GitCommitMetrics> {
  const db = await getDatabase()
  const { since, until } = getDateRange(range)

  // Return empty metrics if no database
  if (!db) {
    return getEmptyGitMetrics()
  }

  try {
    // Check if table exists
    const tableCheck = (await db.all(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='git_commits'
    `)) as { name: string }[]

    if (tableCheck.length === 0) {
      await initGitCommitsTable()
      return getEmptyGitMetrics()
    }

    // Commits over time
    const commitsOverTimeRaw = (await db.all(`
      SELECT date(committed_at) as date, COUNT(*) as count
      FROM git_commits
      WHERE date(committed_at) >= ? AND date(committed_at) <= ?
      GROUP BY date(committed_at)
      ORDER BY date ASC
    `, [since, until])) as { date: string; count: number }[]

    const commitsOverTime = fillDateGaps(commitsOverTimeRaw, since, until)

    // Total commits
    const totalResult = (await db.all(`
      SELECT COUNT(*) as count FROM git_commits
    `)) as { count: number }[]
    const totalCommits = totalResult[0]?.count || 0

    // Commits this period
    const periodResult = (await db.all(`
      SELECT COUNT(*) as count FROM git_commits
      WHERE date(committed_at) >= ? AND date(committed_at) <= ?
    `, [since, until])) as { count: number }[]
    const commitsThisPeriod = periodResult[0]?.count || 0

    // Top contributors
    const topContributors = (await db.all(`
      SELECT author_name as author, COUNT(*) as count
      FROM git_commits
      WHERE date(committed_at) >= ? AND date(committed_at) <= ?
      GROUP BY author_name
      ORDER BY count DESC
      LIMIT 10
    `, [since, until])) as { author: string; count: number }[]

    // By strand
    const byStrand = (await db.all(`
      SELECT strand_path as path, COUNT(*) as commits
      FROM git_commits
      WHERE strand_path IS NOT NULL
        AND date(committed_at) >= ? AND date(committed_at) <= ?
      GROUP BY strand_path
      ORDER BY commits DESC
      LIMIT 15
    `, [since, until])) as { path: string; commits: number }[]

    // Recent commits
    const recentCommitsRaw = (await db.all(`
      SELECT sha, message, author_name, author_email, committed_at, strand_path, additions, deletions
      FROM git_commits
      WHERE date(committed_at) >= ? AND date(committed_at) <= ?
      ORDER BY committed_at DESC
      LIMIT 20
    `, [since, until])) as {
      sha: string
      message: string
      author_name: string
      author_email: string | null
      committed_at: string
      strand_path: string | null
      additions: number
      deletions: number
    }[]

    const recentCommits: GitCommit[] = recentCommitsRaw.map((c) => ({
      sha: c.sha,
      message: c.message,
      authorName: c.author_name,
      authorEmail: c.author_email || undefined,
      committedAt: c.committed_at,
      strandPath: c.strand_path || undefined,
      additions: c.additions,
      deletions: c.deletions,
    }))

    // Total additions/deletions
    const linesResult = (await db.all(`
      SELECT
        COALESCE(SUM(additions), 0) as totalAdditions,
        COALESCE(SUM(deletions), 0) as totalDeletions
      FROM git_commits
      WHERE date(committed_at) >= ? AND date(committed_at) <= ?
    `, [since, until])) as { totalAdditions: number; totalDeletions: number }[]

    return {
      commitsOverTime,
      totalCommits,
      commitsThisPeriod,
      topContributors,
      byStrand,
      recentCommits,
      totalAdditions: linesResult[0]?.totalAdditions || 0,
      totalDeletions: linesResult[0]?.totalDeletions || 0,
    }
  } catch (error) {
    console.error('[Git Analytics] Failed to get metrics:', error)
    return getEmptyGitMetrics()
  }
}

/**
 * Get empty git metrics structure
 */
function getEmptyGitMetrics(): GitCommitMetrics {
  return {
    commitsOverTime: [],
    totalCommits: 0,
    commitsThisPeriod: 0,
    topContributors: [],
    byStrand: [],
    recentCommits: [],
    totalAdditions: 0,
    totalDeletions: 0,
  }
}

