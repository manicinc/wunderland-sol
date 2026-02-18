/**
 * Type declarations for sql.js (WebAssembly SQLite)
 */

declare module 'sql.js' {
  export interface SqlJsConfig {
    locateFile?: (file: string, prefix: string) => string;
  }

  export interface Database {
    run(sql: string, params?: unknown[] | Record<string, unknown>): void;
    exec(sql: string): ExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
    getRowsModified(): number;
  }

  export interface Statement {
    bind(values?: unknown[] | Record<string, unknown>): boolean;
    step(): boolean;
    get(params?: unknown[] | Record<string, unknown>): unknown[];
    getAsObject(params?: unknown[] | Record<string, unknown>): Record<string, unknown>;
    run(params?: unknown[] | Record<string, unknown>): void;
    reset(): void;
    free(): void;
    freemem(): void;
    getColumnNames(): string[];
  }

  export interface ExecResult {
    columns: string[];
    values: unknown[][];
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}
