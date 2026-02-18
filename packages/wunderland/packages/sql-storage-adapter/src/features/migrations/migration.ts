/**
 * High-level migration utilities for moving data between adapters.
 * Simplifies common migration scenarios like local -> Supabase, Supabase -> local, etc.
 */

import type { StorageAdapter } from '../../core/contracts';
import { exportData, exportAsJSON } from './dataExport';
import { migrateAdapter, type ImportResult, type DataImportOptions } from './dataImport';

/**
 * Migration strategy for handling conflicts and errors.
 */
export interface MigrationStrategy {
  /** Whether to drop existing tables */
  dropExisting?: boolean;
  /** How to handle conflicts during import */
  onConflict?: 'replace' | 'ignore' | 'error';
  /** Whether to verify data after migration */
  verify?: boolean;
  /** Batch size for operations */
  batchSize?: number;
  /** Tables to migrate (all if not specified) */
  tables?: string[];
}

/**
 * Migration result with detailed statistics.
 */
export interface MigrationResult extends ImportResult {
  sourceAdapter: string;
  targetAdapter: string;
  verification?: VerificationResult;
}

/**
 * Verification result after migration.
 */
export interface VerificationResult {
  passed: boolean;
  tableCounts: Record<string, { source: number; target: number; match: boolean }>;
  errors?: string[];
}

/**
 * Migrate from Better-SQLite3 (local) to Supabase.
 */
export async function migrateLocalToSupabase(
  localAdapter: StorageAdapter,
  supabaseAdapter: StorageAdapter,
  strategy: MigrationStrategy = {}
): Promise<MigrationResult> {
  return await executeMigration(localAdapter, supabaseAdapter, 'better-sqlite3', 'supabase', strategy);
}

/**
 * Migrate from Supabase to Better-SQLite3 (local).
 */
export async function migrateSupabaseToLocal(
  supabaseAdapter: StorageAdapter,
  localAdapter: StorageAdapter,
  strategy: MigrationStrategy = {}
): Promise<MigrationResult> {
  return await executeMigration(supabaseAdapter, localAdapter, 'supabase', 'better-sqlite3', strategy);
}

/**
 * Migrate from Supabase to PostgreSQL.
 */
export async function migrateSupabaseToPostgres(
  supabaseAdapter: StorageAdapter,
  postgresAdapter: StorageAdapter,
  strategy: MigrationStrategy = {}
): Promise<MigrationResult> {
  return await executeMigration(supabaseAdapter, postgresAdapter, 'supabase', 'postgres', strategy);
}

/**
 * Migrate from SQL.js (browser) to Capacitor SQLite (mobile).
 */
export async function migrateBrowserToMobile(
  sqlJsAdapter: StorageAdapter,
  capacitorAdapter: StorageAdapter,
  strategy: MigrationStrategy = {}
): Promise<MigrationResult> {
  return await executeMigration(sqlJsAdapter, capacitorAdapter, 'sql.js', 'capacitor-sqlite', strategy);
}

/**
 * Generic migration between any two adapters.
 */
export async function migrateAdapters(
  sourceAdapter: StorageAdapter,
  targetAdapter: StorageAdapter,
  strategy: MigrationStrategy = {}
): Promise<MigrationResult> {
  return await executeMigration(sourceAdapter, targetAdapter, 'unknown', 'unknown', strategy);
}

/**
 * Execute migration with strategy.
 */
async function executeMigration(
  sourceAdapter: StorageAdapter,
  targetAdapter: StorageAdapter,
  sourceName: string,
  targetName: string,
  strategy: MigrationStrategy
): Promise<MigrationResult> {
  const importOptions: DataImportOptions = {
    dropTables: strategy.dropExisting,
    onConflict: strategy.onConflict,
    batchSize: strategy.batchSize,
    tables: strategy.tables,
  };

  const result = await migrateAdapter(sourceAdapter, targetAdapter, importOptions);

  const migrationResult: MigrationResult = {
    ...result,
    sourceAdapter: sourceName,
    targetAdapter: targetName,
  };

  // Verify migration if requested
  if (strategy.verify && result.success) {
    migrationResult.verification = await verifyMigration(
      sourceAdapter,
      targetAdapter,
      strategy.tables
    );
  }

  return migrationResult;
}

/**
 * Verify migration by comparing row counts.
 */
async function verifyMigration(
  sourceAdapter: StorageAdapter,
  targetAdapter: StorageAdapter,
  tables?: string[]
): Promise<VerificationResult> {
  const errors: string[] = [];
  const tableCounts: Record<string, { source: number; target: number; match: boolean }> = {};

  try {
    // Get list of tables
    const sourceData = await exportData(sourceAdapter, { tables, includeSchema: false });
    const targetData = await exportData(targetAdapter, { tables, includeSchema: false });

    // Compare counts for each table
    for (const tableName of Object.keys(sourceData.data)) {
      const sourceCount = sourceData.data[tableName]?.length || 0;
      const targetCount = targetData.data[tableName]?.length || 0;
      const match = sourceCount === targetCount;

      tableCounts[tableName] = {
        source: sourceCount,
        target: targetCount,
        match,
      };

      if (!match) {
        errors.push(
          `Table ${tableName}: source has ${sourceCount} rows, target has ${targetCount} rows`
        );
      }
    }

    // Check for missing tables in target
    for (const tableName of Object.keys(targetData.data)) {
      if (!sourceData.data[tableName]) {
        errors.push(`Table ${tableName} exists in target but not in source`);
      }
    }

    return {
      passed: errors.length === 0,
      tableCounts,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      passed: false,
      tableCounts,
      errors: [`Verification failed: ${(error as Error).message}`],
    };
  }
}

/**
 * Create a backup of an adapter to JSON file.
 */
export async function createBackup(
  adapter: StorageAdapter,
  options: { tables?: string[]; pretty?: boolean } = {}
): Promise<string> {
  return await exportAsJSON(adapter, {
    tables: options.tables,
    includeSchema: true,
    pretty: options.pretty ?? true,
  });
}

/**
 * Restore from a backup JSON string.
 */
export async function restoreFromBackup(
  adapter: StorageAdapter,
  backupJSON: string,
  options: DataImportOptions = {}
): Promise<ImportResult> {
  const { importFromJSON } = await import('./dataImport.js');
  return await importFromJSON(adapter, backupJSON, options);
}

/**
 * Clone an adapter's data to another adapter.
 */
export async function cloneAdapter(
  sourceAdapter: StorageAdapter,
  targetAdapter: StorageAdapter,
  options: MigrationStrategy = {}
): Promise<MigrationResult> {
  return await migrateAdapters(sourceAdapter, targetAdapter, {
    ...options,
    verify: options.verify ?? true,
  });
}

/**
 * Sync data between two adapters (bidirectional).
 * NOTE: This is a simple implementation - for production use, implement proper conflict resolution.
 */
export async function syncAdapters(
  adapter1: StorageAdapter,
  adapter2: StorageAdapter,
  strategy: MigrationStrategy = {}
): Promise<{ toAdapter2: MigrationResult; toAdapter1: MigrationResult }> {
  // Export data from both adapters (unused currently, but kept for future bidirectional sync)
  // const data1 = await exportData(adapter1, { tables: strategy.tables });
  // const data2 = await exportData(adapter2, { tables: strategy.tables });

  // Find differences and sync
  const toAdapter2 = await migrateAdapters(adapter1, adapter2, {
    ...strategy,
    onConflict: 'replace',
  });

  const toAdapter1 = await migrateAdapters(adapter2, adapter1, {
    ...strategy,
    onConflict: 'replace',
  });

  return { toAdapter2, toAdapter1 };
}

/**
 * Get migration summary for display.
 */
export function formatMigrationResult(result: MigrationResult): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('Migration Result');
  lines.push('='.repeat(60));
  lines.push(`Source: ${result.sourceAdapter}`);
  lines.push(`Target: ${result.targetAdapter}`);
  lines.push(`Status: ${result.success ? '[OK] SUCCESS' : '[X] FAILED'}`);
  lines.push(`Duration: ${result.duration}ms`);
  lines.push(`Tables: ${result.tablesImported}`);
  lines.push(`Rows: ${result.rowsImported}`);

  if (result.errors && result.errors.length > 0) {
    lines.push('\nErrors:');
    result.errors.forEach(err => lines.push(`  [X] ${err}`));
  }

  if (result.verification) {
    lines.push('\nVerification:');
    lines.push(`Status: ${result.verification.passed ? '[OK] PASSED' : '[X] FAILED'}`);

    if (Object.keys(result.verification.tableCounts).length > 0) {
      lines.push('\nTable Counts:');
      for (const [table, counts] of Object.entries(result.verification.tableCounts)) {
        const status = counts.match ? '[OK]' : '[X]';
        lines.push(
          `  ${status} ${table}: source=${counts.source}, target=${counts.target}`
        );
      }
    }

    if (result.verification.errors && result.verification.errors.length > 0) {
      lines.push('\nVerification Errors:');
      result.verification.errors.forEach(err => lines.push(`  [X] ${err}`));
    }
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}
