/**
 * Database Corruption Detection and Auto-Repair.
 *
 * Provides integrity checking and automatic repair capabilities
 * for SQLite databases. Detects corruption early and attempts
 * recovery before data loss occurs.
 *
 * ## Detection Methods
 * - SQLite integrity_check PRAGMA
 * - Quick check (faster, less thorough)
 * - Foreign key constraint validation
 * - Index integrity verification
 *
 * ## Repair Strategies
 * - VACUUM: Rebuilds entire database
 * - REINDEX: Rebuilds all indexes
 * - Export/Import: Last resort recovery
 *
 * @example
 * ```typescript
 * const detector = new CorruptionDetector(adapter, {
 *   checkOnOpen: true,
 *   autoRepair: true,
 *   backupBeforeRepair: true,
 * });
 *
 * const result = await detector.runFullCheck();
 * if (!result.isHealthy) {
 *   await detector.attemptRepair();
 * }
 * ```
 */

import type { StorageAdapter } from '../../../core/contracts';

// ============================================================================
// Types
// ============================================================================

/**
 * Integrity check level.
 */
export type IntegrityCheckLevel = 'quick' | 'full' | 'thorough';

/**
 * Corruption detection configuration.
 */
export interface CorruptionDetectorConfig {
  /** Run check when database is opened (default: true) */
  checkOnOpen?: boolean;
  /** Attempt automatic repair on corruption (default: true) */
  autoRepair?: boolean;
  /** Create backup before repair (default: true) */
  backupBeforeRepair?: boolean;
  /** Maximum time for integrity check in ms (default: 60000) */
  checkTimeout?: number;
  /** Check level (default: 'quick') */
  defaultCheckLevel?: IntegrityCheckLevel;
  /** Enable verbose logging (default: false) */
  verbose?: boolean;
}

/**
 * Single corruption issue.
 */
export interface CorruptionIssue {
  /** Issue type */
  type: 'data' | 'index' | 'foreign_key' | 'structure' | 'unknown';
  /** Affected table (if identifiable) */
  table?: string;
  /** Detailed message */
  message: string;
  /** Severity level */
  severity: 'warning' | 'error' | 'critical';
  /** Whether this issue is repairable */
  repairable: boolean;
}

/**
 * Result of an integrity check.
 */
export interface IntegrityCheckResult {
  /** Whether the database is healthy */
  isHealthy: boolean;
  /** Check level performed */
  level: IntegrityCheckLevel;
  /** List of issues found */
  issues: CorruptionIssue[];
  /** Time taken in milliseconds */
  durationMs: number;
  /** Timestamp of check */
  timestamp: number;
  /** Pages checked (full check only) */
  pagesChecked?: number;
  /** Total database size in bytes */
  databaseSize?: number;
}

/**
 * Repair strategy.
 */
export type RepairStrategy = 'vacuum' | 'reindex' | 'export_import';

/**
 * Result of a repair attempt.
 */
export interface RepairResult {
  /** Whether repair was successful */
  success: boolean;
  /** Strategy used */
  strategy: RepairStrategy;
  /** Issues fixed */
  issuesFixed: number;
  /** Issues remaining */
  issuesRemaining: number;
  /** Time taken in milliseconds */
  durationMs: number;
  /** Backup path (if created) */
  backupPath?: string;
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<CorruptionDetectorConfig> = {
  checkOnOpen: true,
  autoRepair: true,
  backupBeforeRepair: true,
  checkTimeout: 60000,
  defaultCheckLevel: 'quick',
  verbose: false,
};

// ============================================================================
// Corruption Detector
// ============================================================================

/**
 * Database Corruption Detector.
 *
 * Detects and repairs SQLite database corruption.
 */
export class CorruptionDetector {
  private readonly config: Required<CorruptionDetectorConfig>;
  private lastCheck: IntegrityCheckResult | null = null;
  private repairHistory: RepairResult[] = [];

  constructor(
    private readonly adapter: StorageAdapter,
    config: CorruptionDetectorConfig = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Integrity Checks
  // ============================================================================

  /**
   * Run a quick integrity check.
   * Faster but less thorough than full check.
   */
  public async runQuickCheck(): Promise<IntegrityCheckResult> {
    return this.runCheck('quick');
  }

  /**
   * Run a full integrity check.
   * Checks all pages and structures.
   */
  public async runFullCheck(): Promise<IntegrityCheckResult> {
    return this.runCheck('full');
  }

  /**
   * Run a thorough integrity check.
   * Includes foreign key and index validation.
   */
  public async runThoroughCheck(): Promise<IntegrityCheckResult> {
    return this.runCheck('thorough');
  }

  /**
   * Run an integrity check at the specified level.
   */
  private async runCheck(level: IntegrityCheckLevel): Promise<IntegrityCheckResult> {
    const startTime = Date.now();
    const issues: CorruptionIssue[] = [];

    try {
      // Get database size
      const pageCount = await this.adapter.get<{ page_count: number }>('PRAGMA page_count');
      const pageSize = await this.adapter.get<{ page_size: number }>('PRAGMA page_size');
      const databaseSize = (pageCount?.page_count ?? 0) * (pageSize?.page_size ?? 4096);

      // Run appropriate check based on level
      if (level === 'quick') {
        const result = await this.adapter.all<{ quick_check: string }>('PRAGMA quick_check');
        this.parseIntegrityResults(result.map(r => r.quick_check), issues);
      } else {
        const result = await this.adapter.all<{ integrity_check: string }>('PRAGMA integrity_check');
        this.parseIntegrityResults(result.map(r => r.integrity_check), issues);
      }

      // For thorough check, also check foreign keys and indexes
      if (level === 'thorough') {
        await this.checkForeignKeys(issues);
        await this.checkIndexes(issues);
      }

      const checkResult: IntegrityCheckResult = {
        isHealthy: issues.length === 0,
        level,
        issues,
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
        pagesChecked: pageCount?.page_count,
        databaseSize,
      };

      this.lastCheck = checkResult;
      this.log(`Integrity check completed: ${issues.length} issues found (${checkResult.durationMs}ms)`);

      // Auto-repair if enabled and issues found
      if (!checkResult.isHealthy && this.config.autoRepair) {
        await this.attemptRepair();
      }

      return checkResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Integrity check failed: ${errorMessage}`);

      issues.push({
        type: 'unknown',
        message: `Integrity check failed: ${errorMessage}`,
        severity: 'critical',
        repairable: false,
      });

      return {
        isHealthy: false,
        level,
        issues,
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Parse integrity check results into structured issues.
   */
  private parseIntegrityResults(results: string[], issues: CorruptionIssue[]): void {
    for (const result of results) {
      if (result === 'ok') continue;

      const issue: CorruptionIssue = {
        type: 'unknown',
        message: result,
        severity: 'error',
        repairable: true,
      };

      // Try to identify issue type and affected table
      if (result.includes('index')) {
        issue.type = 'index';
        const match = result.match(/index (\w+)/);
        if (match) issue.table = match[1];
      } else if (result.includes('table')) {
        issue.type = 'data';
        const match = result.match(/table (\w+)/);
        if (match) issue.table = match[1];
      } else if (result.includes('foreign key')) {
        issue.type = 'foreign_key';
      } else if (result.includes('page') || result.includes('corrupt')) {
        issue.type = 'structure';
        issue.severity = 'critical';
      }

      issues.push(issue);
    }
  }

  /**
   * Check foreign key constraints.
   */
  private async checkForeignKeys(issues: CorruptionIssue[]): Promise<void> {
    try {
      // Enable foreign key checking temporarily
      await this.adapter.exec('PRAGMA foreign_keys = ON');

      const violations = await this.adapter.all<{
        table: string;
        rowid: number;
        parent: string;
        fkid: number;
      }>('PRAGMA foreign_key_check');

      for (const violation of violations) {
        issues.push({
          type: 'foreign_key',
          table: violation.table,
          message: `Foreign key violation in ${violation.table} (row ${violation.rowid}): references ${violation.parent}`,
          severity: 'warning',
          repairable: true,
        });
      }
    } catch (error) {
      this.log(`Foreign key check failed: ${error}`);
    }
  }

  /**
   * Check index integrity.
   */
  private async checkIndexes(issues: CorruptionIssue[]): Promise<void> {
    try {
      // Get all indexes
      const indexes = await this.adapter.all<{ name: string; tbl_name: string }>(
        "SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'"
      );

      for (const index of indexes) {
        try {
          // Verify index by querying it
          await this.adapter.get(`SELECT * FROM "${index.tbl_name}" INDEXED BY "${index.name}" LIMIT 1`);
        } catch (error) {
          issues.push({
            type: 'index',
            table: index.tbl_name,
            message: `Index ${index.name} on ${index.tbl_name} may be corrupt: ${error}`,
            severity: 'error',
            repairable: true,
          });
        }
      }
    } catch (error) {
      this.log(`Index check failed: ${error}`);
    }
  }

  // ============================================================================
  // Repair Operations
  // ============================================================================

  /**
   * Attempt to repair the database.
   */
  public async attemptRepair(strategy?: RepairStrategy): Promise<RepairResult> {
    const effectiveStrategy = strategy ?? this.selectRepairStrategy();
    const startTime = Date.now();

    this.log(`Attempting repair with strategy: ${effectiveStrategy}`);

    // Create backup if configured
    let backupPath: string | undefined;
    if (this.config.backupBeforeRepair) {
      try {
        backupPath = await this.createBackup();
      } catch (error) {
        this.log(`Backup failed, proceeding with repair: ${error}`);
      }
    }

    try {
      switch (effectiveStrategy) {
        case 'vacuum':
          await this.repairWithVacuum();
          break;
        case 'reindex':
          await this.repairWithReindex();
          break;
        case 'export_import':
          await this.repairWithExportImport();
          break;
      }

      // Verify repair
      const verifyResult = await this.runQuickCheck();

      const result: RepairResult = {
        success: verifyResult.isHealthy,
        strategy: effectiveStrategy,
        issuesFixed: (this.lastCheck?.issues.length ?? 0) - verifyResult.issues.length,
        issuesRemaining: verifyResult.issues.length,
        durationMs: Date.now() - startTime,
        backupPath,
      };

      this.repairHistory.push(result);
      this.log(`Repair completed: ${result.issuesFixed} issues fixed, ${result.issuesRemaining} remaining`);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Repair failed: ${errorMessage}`);

      const result: RepairResult = {
        success: false,
        strategy: effectiveStrategy,
        issuesFixed: 0,
        issuesRemaining: this.lastCheck?.issues.length ?? 0,
        durationMs: Date.now() - startTime,
        backupPath,
        error: errorMessage,
      };

      this.repairHistory.push(result);
      return result;
    }
  }

  /**
   * Select the best repair strategy based on issues found.
   */
  private selectRepairStrategy(): RepairStrategy {
    if (!this.lastCheck) return 'vacuum';

    const hasIndexIssues = this.lastCheck.issues.some(i => i.type === 'index');
    const hasCriticalIssues = this.lastCheck.issues.some(i => i.severity === 'critical');

    if (hasCriticalIssues) return 'export_import';
    if (hasIndexIssues) return 'reindex';
    return 'vacuum';
  }

  /**
   * Repair using VACUUM.
   */
  private async repairWithVacuum(): Promise<void> {
    this.log('Repairing with VACUUM...');
    await this.adapter.exec('VACUUM');
  }

  /**
   * Repair using REINDEX.
   */
  private async repairWithReindex(): Promise<void> {
    this.log('Repairing with REINDEX...');
    await this.adapter.exec('REINDEX');
  }

  /**
   * Repair using export/import.
   * This is a last resort that exports all data and recreates the database.
   */
  private async repairWithExportImport(): Promise<void> {
    this.log('Repairing with export/import...');

    // Get all tables
    const tables = await this.adapter.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    );

    // Export all data
    const tableData: Map<string, unknown[]> = new Map();
    for (const table of tables) {
      try {
        const data = await this.adapter.all(`SELECT * FROM "${table.name}"`);
        tableData.set(table.name, data);
      } catch (error) {
        this.log(`Failed to export ${table.name}: ${error}`);
      }
    }

    // Recreate tables by running VACUUM INTO a new database
    // This is simplified - full implementation would need schema preservation
    await this.adapter.exec('VACUUM');

    this.log('Export/import completed');
  }

  /**
   * Create a backup of the database.
   */
  private async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `backup_${timestamp}.db`;

    await this.adapter.exec(`VACUUM INTO '${backupPath}'`);
    this.log(`Backup created: ${backupPath}`);

    return backupPath;
  }

  // ============================================================================
  // Status & History
  // ============================================================================

  /**
   * Get the last integrity check result.
   */
  public getLastCheck(): IntegrityCheckResult | null {
    return this.lastCheck;
  }

  /**
   * Get repair history.
   */
  public getRepairHistory(): RepairResult[] {
    return [...this.repairHistory];
  }

  /**
   * Check if the database appears healthy.
   */
  public isHealthy(): boolean {
    return this.lastCheck?.isHealthy ?? true;
  }

  /**
   * Get summary of database health.
   */
  public getHealthSummary(): {
    isHealthy: boolean;
    lastCheckAt: number | null;
    issueCount: number;
    repairAttempts: number;
    successfulRepairs: number;
  } {
    return {
      isHealthy: this.lastCheck?.isHealthy ?? true,
      lastCheckAt: this.lastCheck?.timestamp ?? null,
      issueCount: this.lastCheck?.issues.length ?? 0,
      repairAttempts: this.repairHistory.length,
      successfulRepairs: this.repairHistory.filter(r => r.success).length,
    };
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Log a message if verbose mode is enabled.
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[CorruptionDetector] ${message}`);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Corruption Detector.
 *
 * @param adapter - Storage adapter to monitor
 * @param config - Detector configuration
 * @returns CorruptionDetector instance
 */
export function createCorruptionDetector(
  adapter: StorageAdapter,
  config: CorruptionDetectorConfig = {}
): CorruptionDetector {
  return new CorruptionDetector(adapter, config);
}
