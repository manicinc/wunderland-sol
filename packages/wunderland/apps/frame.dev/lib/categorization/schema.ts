/**
 * SQL Schema for Categorization System
 * @module lib/categorization/schema
 *
 * @description
 * Defines database tables for offline document categorization:
 * - categorization_results: Stores categorization suggestions and review status
 * - categorization_actions: Queues approved categorizations for GitHub sync
 */

export const CATEGORIZATION_SCHEMA = `
-- Categorization results with manual review support
CREATE TABLE IF NOT EXISTS categorization_results (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  strand_path TEXT NOT NULL,
  current_category TEXT NOT NULL,
  suggested_category TEXT NOT NULL,
  confidence REAL NOT NULL,
  reasoning TEXT NOT NULL,
  alternatives TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  final_category TEXT,
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  applied_at TEXT,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_categorization_results_job
  ON categorization_results(job_id);
CREATE INDEX IF NOT EXISTS idx_categorization_results_strand
  ON categorization_results(strand_path);
CREATE INDEX IF NOT EXISTS idx_categorization_results_status
  ON categorization_results(status);
CREATE INDEX IF NOT EXISTS idx_categorization_results_confidence
  ON categorization_results(confidence DESC);

-- Categorization actions queue (for GitHub sync when online)
CREATE TABLE IF NOT EXISTS categorization_actions (
  id TEXT PRIMARY KEY,
  result_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  from_path TEXT NOT NULL,
  to_path TEXT NOT NULL,
  strand_content TEXT NOT NULL,
  metadata TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  github_pr_number INTEGER,
  github_pr_url TEXT,
  created_at TEXT NOT NULL,
  synced_at TEXT,
  FOREIGN KEY (result_id) REFERENCES categorization_results(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_categorization_actions_status
  ON categorization_actions(status);
CREATE INDEX IF NOT EXISTS idx_categorization_actions_result
  ON categorization_actions(result_id);
CREATE INDEX IF NOT EXISTS idx_categorization_actions_created
  ON categorization_actions(created_at);
`

/**
 * Initialize categorization tables in the database
 */
export async function initializeCategorizationSchema(db: any): Promise<void> {
  try {
    await db.exec(CATEGORIZATION_SCHEMA)
    console.log('[Categorization] Schema initialized successfully')
  } catch (error) {
    console.error('[Categorization] Schema initialization failed:', error)
    throw error
  }
}

/**
 * Check if categorization tables exist
 */
export async function categorizationTablesExist(db: any): Promise<boolean> {
  try {
    const result = await db.get(`
      SELECT COUNT(*) as count
      FROM sqlite_master
      WHERE type='table'
      AND name IN ('categorization_results', 'categorization_actions')
    `)
    return result?.count === 2
  } catch (error) {
    console.error('[Categorization] Error checking tables:', error)
    return false
  }
}

/**
 * Drop categorization tables (for testing/cleanup)
 */
export async function dropCategorizationTables(db: any): Promise<void> {
  try {
    await db.exec(`
      DROP TABLE IF EXISTS categorization_actions;
      DROP TABLE IF EXISTS categorization_results;
    `)
    console.log('[Categorization] Tables dropped successfully')
  } catch (error) {
    console.error('[Categorization] Error dropping tables:', error)
    throw error
  }
}
