// Public type surface -------------------------------------------------------
export * from './types';

// Core runtime APIs ---------------------------------------------------------
export * from './core/database';
export * from './core/resolver';

// Adapter implementations ----------------------------------------------------
export * from './adapters/betterSqliteAdapter';
export * from './adapters/sqlJsAdapter';
export * from './adapters/indexedDbAdapter';
export * from './adapters/capacitorSqliteAdapter';
export * from './adapters/postgresAdapter';
export * from './adapters/supabase';
export * from './adapters/baseStorageAdapter';

// Note: Electron adapter is available via separate entry point to avoid
// bundling Electron dependencies in non-Electron builds.
// Usage: import { createElectronMainAdapter, createElectronRendererAdapter } from '@framers/sql-storage-adapter/electron';
// Preload: import '@framers/sql-storage-adapter/electron/preload';

// Feature modules ------------------------------------------------------------
export * from './features/backup/cloudBackup';
export * from './features/migrations/dataExport';
export * from './features/migrations/dataImport';
export * from './features/migrations/migration';
export * from './features/sync/syncManager';

// Note: Cross-platform sync is available via separate entry point for cleaner imports.
// Usage: import { createCrossPlatformSync } from '@framers/sql-storage-adapter/sync';

// Shared utilities -----------------------------------------------------------
export * from './shared/parameterUtils';
