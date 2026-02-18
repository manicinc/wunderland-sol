// Browser-safe path utilities - avoid importing Node.js 'path' module in browser builds
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const isNode = typeof process !== 'undefined' && !!process.versions?.node;

// Browser-safe path join (only used in Node.js environments)
const joinPath = async (parts: string[]): Promise<string> => {
  if (isBrowser) {
    // In browser, just join with '/' (not used anyway since filePath is provided)
    return parts.join('/');
  }
  // In Node.js, use path.join dynamically
  if (isNode) {
    try {
      // Dynamic import to avoid bundling 'path' in browser builds
      const path = await import('path');
      return path.join(...parts);
    } catch {
      // Fallback if import fails
      return parts.join('/');
    }
  }
  return parts.join('/');
};

// Browser-safe process.env access
const getEnv = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

// Browser-safe process.cwd()
const getCwd = (): string => {
  if (isNode && typeof process !== 'undefined' && process.cwd) {
    return process.cwd();
  }
  // Browser fallback (not used in browser anyway)
  return '/';
};

import type { StorageAdapter, StorageAdapterFactory, StorageOpenOptions } from './contracts';
import { StorageResolutionError } from './contracts';
import type { AdapterKind } from './contracts/context';
import { createBetterSqliteAdapter } from '../adapters/betterSqliteAdapter';
import { createSqlJsAdapter } from '../adapters/sqlJsAdapter';
import { createCapacitorSqliteAdapter, type CapacitorAdapterOptions } from '../adapters/capacitorSqliteAdapter';
import { createPostgresAdapter } from '../adapters/postgresAdapter';
import { IndexedDbAdapter, type IndexedDbAdapterOptions } from '../adapters/indexedDbAdapter';

// Re-export AdapterKind for external use
export type { AdapterKind } from './contracts/context';

export interface StorageResolutionOptions {
  /** Absolute path for sqlite file (used by better-sqlite3/sql.js when persistence is desired). */
  filePath?: string;
  /** Explicit adapter priority override. */
  priority?: AdapterKind[];
  /** Options passed to the Capacitor adapter. */
  capacitor?: CapacitorAdapterOptions;
  /** Options passed to the Postgres adapter. */
  postgres?: { connectionString?: string };
  /** Options passed to the IndexedDB adapter (browser persistence). */
  indexedDb?: IndexedDbAdapterOptions;
  /** Options forwarded to adapter.open. */
  openOptions?: StorageOpenOptions;
}

interface CapacitorGlobal {
  Capacitor?: {
    isNativePlatform?: () => boolean;
  };
}

const isCapacitorRuntime = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  const maybeCapacitor = (window as Window & CapacitorGlobal).Capacitor;
  return Boolean(maybeCapacitor?.isNativePlatform?.());
};

/**
 * Detect if running in Electron main process.
 */
const isElectronMain = (): boolean => {
  return typeof process !== 'undefined' &&
    Boolean(process.versions?.electron) &&
    (process as NodeJS.Process & { type?: string }).type === 'browser';
};

/**
 * Detect if running in Electron renderer process.
 */
const isElectronRenderer = (): boolean => {
  return typeof window !== 'undefined' &&
    typeof process !== 'undefined' &&
    Boolean(process.versions?.electron) &&
    (process as NodeJS.Process & { type?: string }).type === 'renderer';
};

interface Candidate {
  name: AdapterKind;
  factory: StorageAdapterFactory;
  openOptions?: StorageOpenOptions;
}

/**
 * Resolves the most appropriate storage adapter for the current runtime.
 * Tries candidates in the supplied priority order and falls back when one fails.
 */
export const resolveStorageAdapter = async (options: StorageResolutionOptions = {}): Promise<StorageAdapter> => {
  const envOverride = getEnv('STORAGE_ADAPTER') as AdapterKind | undefined;
  const postgresConnection = options.postgres?.connectionString ?? getEnv('DATABASE_URL') ?? undefined;
  const defaultFilePath = isBrowser ? 'db_data/app.sqlite3' : await joinPath([getCwd(), 'db_data', 'app.sqlite3']);
  const filePath = options.filePath ?? defaultFilePath;

  const defaultPriority: AdapterKind[] = (() => {
    if (options.priority && options.priority.length > 0) {
      return options.priority;
    }
    if (envOverride) {
      return [envOverride];
    }
    // Electron detection - provide guidance to use dedicated Electron adapters
    if (isElectronMain()) {
      console.warn(
        '[StorageAdapter] Electron main process detected. ' +
        'Consider using the dedicated Electron adapter for full framework support:\n' +
        "  import { createElectronMainAdapter } from '@framers/sql-storage-adapter/electron';\n" +
        'Falling back to better-sqlite3 adapter.'
      );
      return ['better-sqlite3'];
    }
    if (isElectronRenderer()) {
      console.warn(
        '[StorageAdapter] Electron renderer process detected. ' +
        'For IPC-based database access, use the dedicated Electron adapter:\n' +
        "  import { createElectronRendererAdapter } from '@framers/sql-storage-adapter/electron';\n" +
        'Note: Direct database access in renderer is not recommended for security reasons.'
      );
      return ['indexeddb', 'sqljs'];
    }
    if (isCapacitorRuntime()) {
      return ['capacitor', 'indexeddb', 'sqljs'];
    }
    if (postgresConnection) {
      return ['postgres', 'better-sqlite3', 'indexeddb', 'sqljs'];
    }
    // Browser detection (check for IndexedDB)
    if (typeof window !== 'undefined' && window.indexedDB) {
      return ['indexeddb', 'sqljs'];
    }
    return ['better-sqlite3', 'indexeddb', 'sqljs'];
  })();

  const candidates: Candidate[] = defaultPriority.map((name) => {
    switch (name) {
      case 'postgres': {
        return {
          name,
          factory: async () => {
            if (!postgresConnection) {
              throw new Error('DATABASE_URL or postgres connection string not provided.');
            }
            return createPostgresAdapter(postgresConnection);
          },
          openOptions: { connectionString: postgresConnection }
        };
      }
      case 'better-sqlite3':
        return {
          name,
          factory: async () => createBetterSqliteAdapter(filePath),
          openOptions: { filePath }
        };
      case 'capacitor':
        return {
          name,
          factory: async () => createCapacitorSqliteAdapter(options.capacitor)
        };
      case 'indexeddb':
        return {
          name,
          factory: async () => {
            // Use dedicated indexedDb options, fallback to legacy openOptions.adapterOptions
            const legacyOptions = options.openOptions?.adapterOptions as { dbName?: string } | undefined;
            return new IndexedDbAdapter({
              dbName: options.indexedDb?.dbName || legacyOptions?.dbName || 'app-db',
              storeName: options.indexedDb?.storeName,
              autoSave: options.indexedDb?.autoSave ?? true,
              saveIntervalMs: options.indexedDb?.saveIntervalMs,
              sqlJsConfig: options.indexedDb?.sqlJsConfig,
            });
          }
        };
      case 'sqljs':
      default:
        return {
          name: 'sqljs',
          factory: async () => createSqlJsAdapter(),
          openOptions: { filePath }
        };
    }
  });

  const errors: unknown[] = [];

  for (const candidate of candidates) {
    try {
      const adapter = await candidate.factory();
      const openOptions: StorageOpenOptions = {
        ...candidate.openOptions,
        ...options.openOptions,
      };
      await adapter.open(openOptions);
      console.info(`[StorageAdapter] Using adapter "${candidate.name}".`);
      return adapter;
    } catch (error) {
      console.warn(`[StorageAdapter] Failed to initialise adapter "${candidate.name}".`, error);
      errors.push(error);
      continue;
    }
  }

  throw new StorageResolutionError('Unable to resolve a storage adapter for the current environment.', errors);
};

