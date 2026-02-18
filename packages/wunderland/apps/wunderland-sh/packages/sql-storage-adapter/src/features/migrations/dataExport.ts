/**
 * Data export utilities for cross-adapter migration and backup.
 * Supports exporting data to portable formats (JSON, SQL, CSV).
 */

import type { StorageAdapter } from '../../core/contracts';

/**
 * Export format types.
 */
export type ExportFormat = 'json' | 'sql' | 'csv';

/**
 * Options for data export.
 */
export interface DataExportOptions {
  /** Tables to export (all if not specified) */
  tables?: string[];
  /** Include schema/DDL statements */
  includeSchema?: boolean;
  /** Format for export */
  format?: ExportFormat;
  /** Batch size for large exports */
  batchSize?: number;
  /** Whether to pretty-print JSON */
  pretty?: boolean;
}

/**
 * Exported data structure.
 */
export interface ExportedData {
  version: string;
  exportedAt: string;
  adapter: string;
  schema?: TableSchema[];
  data: Record<string, unknown[]>;
}

/**
 * Table schema information.
 */
export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
  primaryKeys?: string[];
  indexes?: IndexInfo[];
}

/**
 * Column information.
 */
export interface ColumnInfo {
  name: string;
  type: string;
  nullable?: boolean;
  defaultValue?: string;
}

/**
 * Index information.
 */
export interface IndexInfo {
  name: string;
  columns: string[];
  unique?: boolean;
}

/**
 * Export data from an adapter to a portable format.
 */
export async function exportData(
  adapter: StorageAdapter,
  options: DataExportOptions = {}
): Promise<ExportedData> {
  const { tables, includeSchema = true, batchSize = 1000 } = options;

  const exportedData: ExportedData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    adapter: 'sql-storage-adapter',
    data: {},
  };

  // Get list of tables
  const tablesToExport = tables || (await getTables(adapter));

  // Export schema if requested
  if (includeSchema) {
    exportedData.schema = await Promise.all(
      tablesToExport.map(table => getTableSchema(adapter, table))
    );
  }

  // Export data from each table
  for (const table of tablesToExport) {
    const rows: unknown[] = [];
    let offset = 0;
    let batch: unknown[];

    // Fetch data in batches
    do {
      batch = await adapter.all(
        `SELECT * FROM ${escapeIdentifier(table)} LIMIT ${batchSize} OFFSET ${offset}`
      );
      rows.push(...batch);
      offset += batchSize;
    } while (batch.length === batchSize);

    exportedData.data[table] = rows;
  }

  return exportedData;
}

/**
 * Export data as JSON string.
 */
export async function exportAsJSON(
  adapter: StorageAdapter,
  options: DataExportOptions = {}
): Promise<string> {
  const data = await exportData(adapter, options);
  return JSON.stringify(data, null, options.pretty ? 2 : 0);
}

/**
 * Export data as SQL statements.
 */
export async function exportAsSQL(
  adapter: StorageAdapter,
  options: DataExportOptions = {}
): Promise<string> {
  const data = await exportData(adapter, options);
  const lines: string[] = [];

  lines.push('-- SQL Export from sql-storage-adapter');
  lines.push(`-- Generated at: ${data.exportedAt}`);
  lines.push('');

  // Export schema
  if (data.schema) {
    for (const table of data.schema) {
      lines.push(`-- Table: ${table.name}`);
      lines.push(generateCreateTableSQL(table));
      lines.push('');
    }
  }

  // Export data
  for (const [tableName, rows] of Object.entries(data.data)) {
    if (rows.length === 0) continue;

    lines.push(`-- Data for table: ${tableName}`);
    for (const row of rows) {
      lines.push(generateInsertSQL(tableName, row as Record<string, unknown>));
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Export data as CSV (one file per table).
 */
export async function exportAsCSV(
  adapter: StorageAdapter,
  options: DataExportOptions = {}
): Promise<Record<string, string>> {
  const data = await exportData(adapter, options);
  const csvFiles: Record<string, string> = {};

  for (const [tableName, rows] of Object.entries(data.data)) {
    if (rows.length === 0) {
      csvFiles[tableName] = '';
      continue;
    }

    const firstRow = rows[0] as Record<string, unknown>;
    const headers = Object.keys(firstRow);

    const lines: string[] = [];
    lines.push(headers.map(escapeCSVValue).join(','));

    for (const row of rows) {
      const values = headers.map(header =>
        escapeCSVValue(String((row as Record<string, unknown>)[header] ?? ''))
      );
      lines.push(values.join(','));
    }

    csvFiles[tableName] = lines.join('\n');
  }

  return csvFiles;
}

/**
 * Get list of tables from adapter.
 */
async function getTables(adapter: StorageAdapter): Promise<string[]> {
  // Try SQLite/PostgreSQL table query
  try {
    const rows = await adapter.all<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    );
    return rows.map(r => r.name);
  } catch {
    // Try PostgreSQL
    try {
      const rows = await adapter.all<{ name: string }>(
        `SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'`
      );
      return rows.map(r => r.name);
    } catch {
      throw new Error('Unable to retrieve table list from adapter');
    }
  }
}

/**
 * Get schema for a specific table.
 */
async function getTableSchema(adapter: StorageAdapter, table: string): Promise<TableSchema> {
  try {
    // Try SQLite PRAGMA
    const columns = await adapter.all<{
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
    }>(`PRAGMA table_info(${escapeIdentifier(table)})`);

    return {
      name: table,
      columns: columns.map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.notnull === 0,
        defaultValue: col.dflt_value ?? undefined,
      })),
    };
  } catch {
    // Try PostgreSQL information_schema
    try {
      const columns = await adapter.all<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>(
        `SELECT column_name, data_type, is_nullable, column_default 
         FROM information_schema.columns 
         WHERE table_name = $1`,
        [table]
      );

      return {
        name: table,
        columns: columns.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          defaultValue: col.column_default ?? undefined,
        })),
      };
    } catch {
      // Fallback: no schema info
      return {
        name: table,
        columns: [],
      };
    }
  }
}

/**
 * Generate CREATE TABLE SQL from schema.
 */
function generateCreateTableSQL(schema: TableSchema): string {
  if (schema.columns.length === 0) {
    return `CREATE TABLE ${escapeIdentifier(schema.name)} ();`;
  }

  const columnDefs = schema.columns.map(col => {
    let def = `  ${escapeIdentifier(col.name)} ${col.type}`;
    if (!col.nullable) def += ' NOT NULL';
    if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
    return def;
  });

  return `CREATE TABLE ${escapeIdentifier(schema.name)} (\n${columnDefs.join(',\n')}\n);`;
}

/**
 * Generate INSERT SQL for a row.
 */
function generateInsertSQL(table: string, row: Record<string, unknown>): string {
  const columns = Object.keys(row);
  const values = columns.map(col => escapeSQLValue(row[col]));

  return `INSERT INTO ${escapeIdentifier(table)} (${columns.map(escapeIdentifier).join(', ')}) VALUES (${values.join(', ')});`;
}

/**
 * Escape SQL identifier (table/column name).
 */
function escapeIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Escape SQL value for INSERT statement.
 */
function escapeSQLValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value instanceof Date) return `'${value.toISOString()}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Escape CSV value.
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
