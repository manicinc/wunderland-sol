declare module '@capacitor-community/sqlite' {
  export interface SQLiteRunResult {
    changes?: number;
    lastId?: number | string | null;
  }

  export interface SQLiteQueryResult<T = unknown> {
    values?: T[];
  }

  export interface SQLiteDBConnection {
    open(): Promise<void>;
    close(): Promise<void>;
    execute(statements: string): Promise<void>;
    run(statement: string, values: unknown[]): Promise<SQLiteRunResult>;
    query<T = unknown>(statement: string, values: unknown[]): Promise<SQLiteQueryResult<T>>;
  }

  export interface CapacitorSQLitePlugin {
    createConnection(
      database: string,
      encrypted: boolean,
      mode: string,
      version: number,
      readonly: boolean
    ): Promise<SQLiteDBConnection>;
  }

  export const CapacitorSQLite: CapacitorSQLitePlugin;
  const plugin: CapacitorSQLitePlugin;
  export default plugin;
}
