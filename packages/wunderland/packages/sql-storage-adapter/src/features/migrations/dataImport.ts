/**
 * Data import utilities for cross-adapter migration and restoration.
 * Supports importing from JSON, SQL dumps, and CSV files.
 */

import type { StorageAdapter } from '../../core/contracts';
import type { ExportedData, TableSchema } from './dataExport';

/**
 * Options for data import.
 */
export interface DataImportOptions {
  /** Drop existing tables before import */
  dropTables?: boolean;
  /** Skip schema creation (data only) */
  skipSchema?: boolean;
  /** Skip data import (schema only) */
  skipData?: boolean;
  /** Batch size for inserts */
  batchSize?: number;
  /** Tables to import (all if not specified) */
  tables?: string[];
  /** On conflict strategy */
  onConflict?: 'replace' | 'ignore' | 'error';
}

/**
 * Import result with statistics.
 */
export interface ImportResult {
  success: boolean;
  tablesImported: number;
  rowsImported: number;
  errors?: string[];
  duration: number;
}

/**
 * Import data from exported JSON format.
 */
export async function importData(
  adapter: StorageAdapter,
  data: ExportedData,
  options: DataImportOptions = {}
): Promise<ImportResult> {
  const startTime = Date.now();
  const {
    dropTables = false,
    skipSchema = false,
    skipData = false,
    batchSize = 100,
    tables,
    onConflict = 'error',
  } = options;

  const errors: string[] = [];
  let tablesImported = 0;
  let rowsImported = 0;

  // Determine tables to import from both schema and data
  let tablesToImport: string[];
  if (tables) {
    tablesToImport = tables;
  } else {
    const dataTables = Object.keys(data.data);
    const schemaTables = data.schema?.map(s => s.name) || [];
    tablesToImport = Array.from(new Set([...dataTables, ...schemaTables]));
  }

  try {
    // Import schema
    if (!skipSchema && data.schema) {
      for (const tableSchema of data.schema) {
        if (!tablesToImport.includes(tableSchema.name)) continue;

        try {
          if (dropTables) {
            await adapter.run(`DROP TABLE IF EXISTS ${escapeIdentifier(tableSchema.name)}`);
          }
          await createTable(adapter, tableSchema);
          // Only count if we're not also importing data (to avoid double counting)
          if (skipData) {
            tablesImported++;
          }
        } catch (error) {
          const errorMsg = `Schema error for ${tableSchema.name}: ${(error as Error).message}`;
          errors.push(errorMsg);
          // If we're in error mode, fail fast
          if (onConflict === 'error') {
            return {
              success: false,
              tablesImported,
              rowsImported,
              errors,
              duration: Date.now() - startTime,
            };
          }
        }
      }
    }

    // Import data
    if (!skipData) {
      for (const [tableName, rows] of Object.entries(data.data)) {
        if (!tablesToImport.includes(tableName)) continue;
        if (!Array.isArray(rows) || rows.length === 0) continue;

        try {
          const imported = await importTableData(adapter, tableName, rows, {
            batchSize,
            onConflict,
          });
          rowsImported += imported;
          tablesImported++;
        } catch (error) {
          errors.push(`Data error for ${tableName}: ${(error as Error).message}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      tablesImported,
      rowsImported,
      errors: errors.length > 0 ? errors : undefined,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      tablesImported,
      rowsImported,
      errors: [...errors, `Fatal error: ${(error as Error).message}`],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Import data from JSON string.
 */
export async function importFromJSON(
  adapter: StorageAdapter,
  jsonString: string,
  options: DataImportOptions = {}
): Promise<ImportResult> {
  try {
    const data = JSON.parse(jsonString) as ExportedData;
    return await importData(adapter, data, options);
  } catch (error) {
    return {
      success: false,
      tablesImported: 0,
      rowsImported: 0,
      errors: [`JSON parse error: ${(error as Error).message}`],
      duration: 0,
    };
  }
}

/**
 * Import data from SQL dump.
 */
export async function importFromSQL(
  adapter: StorageAdapter,
  sqlDump: string,
  options: DataImportOptions = {}
): Promise<ImportResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let statementsExecuted = 0;

  try {
    // Remove comments first
    const withoutComments = sqlDump
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // Split SQL dump into individual statements
    // Handle both inline and multi-line statements
    const statements = withoutComments
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        // Skip if filtering by tables
        if (options.tables) {
          const matchesTable = options.tables.some(table =>
            statement.toLowerCase().includes(table.toLowerCase())
          );
          if (!matchesTable) continue;
        }

        // Execute the statement
        await adapter.run(statement);
        statementsExecuted++;
      } catch (error) {
        errors.push(`SQL error in statement: ${(error as Error).message}`);
      }
    }

    return {
      success: errors.length === 0,
      tablesImported: statementsExecuted,
      rowsImported: 0, // Cannot accurately count from SQL
      errors: errors.length > 0 ? errors : undefined,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      tablesImported: 0,
      rowsImported: 0,
      errors: [...errors, `Fatal error: ${(error as Error).message}`],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Import data from CSV.
 */
export async function importFromCSV(
  adapter: StorageAdapter,
  tableName: string,
  csvContent: string,
  options: DataImportOptions = {}
): Promise<ImportResult> {
  const startTime = Date.now();

  try {
    const rows = parseCSV(csvContent);
    if (rows.length === 0) {
      return {
        success: true,
        tablesImported: 0,
        rowsImported: 0,
        duration: Date.now() - startTime,
      };
    }

    const imported = await importTableData(adapter, tableName, rows, {
      batchSize: options.batchSize || 100,
      onConflict: options.onConflict || 'error',
    });

    return {
      success: true,
      tablesImported: 1,
      rowsImported: imported,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      tablesImported: 0,
      rowsImported: 0,
      errors: [`CSV import error: ${(error as Error).message}`],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Migrate data from one adapter to another.
 */
export async function migrateAdapter(
  sourceAdapter: StorageAdapter,
  targetAdapter: StorageAdapter,
  options: DataImportOptions = {}
): Promise<ImportResult> {
  const { exportData } = await import('./dataExport.js');

  // Export from source
  const exportedData = await exportData(sourceAdapter, {
    tables: options.tables,
    includeSchema: !options.skipSchema,
  });

  // Import to target
  return await importData(targetAdapter, exportedData, options);
}

/**
 * Create table from schema.
 */
async function createTable(adapter: StorageAdapter, schema: TableSchema): Promise<void> {
  if (schema.columns.length === 0) {
    throw new Error(`Cannot create table ${schema.name} without column definitions`);
  }

  const columnDefs = schema.columns.map(col => {
    let def = `${escapeIdentifier(col.name)} ${col.type}`;
    if (!col.nullable) def += ' NOT NULL';
    if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
    return def;
  });

  const createSQL = `CREATE TABLE IF NOT EXISTS ${escapeIdentifier(schema.name)} (
    ${columnDefs.join(',\n    ')}
  )`;

  await adapter.run(createSQL);
}

/**
 * Import rows into a table.
 */
async function importTableData(
  adapter: StorageAdapter,
  tableName: string,
  rows: unknown[],
  options: { batchSize: number; onConflict: 'replace' | 'ignore' | 'error' }
): Promise<number> {
  let imported = 0;
  const { batchSize, onConflict } = options;

  // Process in batches
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    for (const row of batch) {
      const record = row as Record<string, unknown>;
      const columns = Object.keys(record);
      const placeholders = columns.map(() => '?');

      let insertSQL = `INSERT `;
      
      // Handle conflicts (SQLite syntax)
      if (onConflict === 'replace') {
        insertSQL = `INSERT OR REPLACE `;
      } else if (onConflict === 'ignore') {
        insertSQL = `INSERT OR IGNORE `;
      }

      insertSQL += `INTO ${escapeIdentifier(tableName)} (${columns.map(escapeIdentifier).join(', ')}) VALUES (${placeholders.join(', ')})`;

      try {
        await adapter.run(insertSQL, columns.map(col => record[col]));
        imported++;
      } catch (error) {
        if (onConflict === 'error') {
          throw error;
        }
        // Otherwise silently skip
      }
    }
  }

  return imported;
}

/**
 * Parse CSV content into rows.
 */
function parseCSV(content: string): Array<Record<string, unknown>> {
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Array<Record<string, unknown>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, unknown> = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? null;
    });

    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line.
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

/**
 * Escape SQL identifier.
 */
function escapeIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}
