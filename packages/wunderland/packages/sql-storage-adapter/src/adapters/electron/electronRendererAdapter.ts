/**
 * Electron Renderer Process Storage Adapter.
 *
 * Provides the same StorageAdapter interface to renderer processes
 * by proxying all operations to the main process via IPC.
 *
 * ## Architecture
 * This adapter runs in renderer processes and communicates with
 * ElectronMainAdapter in the main process via the preload script API.
 *
 * ## Requirements
 * - Preload script must be loaded and expose `window.sqlStorage`
 * - Main process must have ElectronMainAdapter initialized
 *
 * ## Usage
 * ```typescript
 * import { createElectronRendererAdapter } from '@framers/sql-storage-adapter/electron';
 *
 * const db = createElectronRendererAdapter({
 *   onDatabaseChange: (change) => {
 *     console.log('Database changed:', change);
 *     // React to changes from other windows
 *   },
 * });
 *
 * await db.open();
 * const users = await db.all('SELECT * FROM users');
 * ```
 */

import type {
  StorageAdapter,
  StorageCapability,
  StorageOpenOptions,
  StorageParameters,
  StorageRunResult,
  BatchOperation,
  BatchResult,
  PreparedStatement,
} from '../../core/contracts';
import type { DbChangeEvent, SyncStatus } from './ipc/types';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Options for ElectronRendererAdapter.
 */
export interface ElectronRendererAdapterOptions {
  /**
   * Callback when database changes from another window.
   * Use this to invalidate caches or refresh UI.
   */
  onDatabaseChange?: (event: DbChangeEvent) => void;

  /**
   * Callback when sync progress updates.
   */
  onSyncProgress?: (progress: number) => void;

  /**
   * Callback when sync completes.
   */
  onSyncComplete?: () => void;

  /**
   * Callback when sync encounters an error.
   */
  onSyncError?: (error: Error) => void;

  /**
   * Enable verbose logging (default: false).
   */
  verbose?: boolean;
}

// ============================================================================
// Electron Renderer Adapter
// ============================================================================

/**
 * Storage adapter for Electron renderer processes.
 *
 * Proxies all database operations to the main process via IPC.
 * Implements the same StorageAdapter interface as other adapters.
 */
export class ElectronRendererAdapter implements StorageAdapter {
  public readonly kind = 'electron-renderer';
  public capabilities: ReadonlySet<StorageCapability>;

  private readonly options: ElectronRendererAdapterOptions;
  private eventUnsubscribers: Array<() => void> = [];
  private isInitialized = false;
  private cachedCapabilities: StorageCapability[] = [];

  constructor(options: ElectronRendererAdapterOptions = {}) {
    this.options = options;
    // Default capabilities - will be updated after connecting to main process
    this.capabilities = new Set<StorageCapability>([
      'transactions',
      'persistence',
      'batch',
    ]);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Get the preload API, throwing if not available.
   */
  private getApi(): typeof window.sqlStorage {
    if (typeof window === 'undefined' || !window.sqlStorage) {
      throw new Error(
        '[ElectronRendererAdapter] window.sqlStorage not available. ' +
        'Ensure the preload script is loaded and contextBridge is properly configured.'
      );
    }
    return window.sqlStorage;
  }

  /**
   * Log a message if verbose mode is enabled.
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[ElectronRendererAdapter] ${message}`);
    }
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  /**
   * Open connection to the database via main process.
   */
  public async open(options?: StorageOpenOptions): Promise<void> {
    if (this.isInitialized) {
      this.log('Already initialized, skipping open()');
      return;
    }

    const api = this.getApi();

    // Open connection
    await api.open(options);

    // Fetch actual capabilities from main process
    this.cachedCapabilities = await api.getCapabilities();
    this.capabilities = new Set(this.cachedCapabilities);

    // Subscribe to events
    this.subscribeToEvents();

    this.isInitialized = true;
    this.log('Connected to main process');
  }

  /**
   * Close connection.
   */
  public async close(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    // Unsubscribe from events
    for (const unsubscribe of this.eventUnsubscribers) {
      unsubscribe();
    }
    this.eventUnsubscribers = [];

    // Note: We don't actually close the database here since that would
    // affect all other renderer processes. The main process owns the connection.

    this.isInitialized = false;
    this.log('Disconnected from main process');
  }

  /**
   * Subscribe to database events from main process.
   */
  private subscribeToEvents(): void {
    const api = this.getApi();

    // Database change events
    if (this.options.onDatabaseChange) {
      const unsubscribe = api.onDatabaseChange(this.options.onDatabaseChange);
      this.eventUnsubscribers.push(unsubscribe);
    }

    // Sync events
    if (this.options.onSyncProgress) {
      const unsubscribe = api.onSyncProgress(this.options.onSyncProgress);
      this.eventUnsubscribers.push(unsubscribe);
    }

    if (this.options.onSyncComplete) {
      const unsubscribe = api.onSyncComplete(this.options.onSyncComplete);
      this.eventUnsubscribers.push(unsubscribe);
    }

    if (this.options.onSyncError) {
      const unsubscribe = api.onSyncError(this.options.onSyncError);
      this.eventUnsubscribers.push(unsubscribe);
    }
  }

  // ============================================================================
  // Storage Adapter Interface
  // ============================================================================

  /**
   * Execute a mutation statement (INSERT, UPDATE, DELETE).
   */
  public async run(statement: string, parameters?: StorageParameters): Promise<StorageRunResult> {
    this.assertOpen();
    return this.getApi().run(statement, parameters);
  }

  /**
   * Get a single row.
   */
  public async get<T = unknown>(statement: string, parameters?: StorageParameters): Promise<T | null> {
    this.assertOpen();
    return this.getApi().get<T>(statement, parameters);
  }

  /**
   * Get all matching rows.
   */
  public async all<T = unknown>(statement: string, parameters?: StorageParameters): Promise<T[]> {
    this.assertOpen();
    return this.getApi().all<T>(statement, parameters);
  }

  /**
   * Execute a SQL script.
   */
  public async exec(script: string): Promise<void> {
    this.assertOpen();
    return this.getApi().exec(script);
  }

  /**
   * Execute operations within a transaction.
   */
  public async transaction<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T> {
    this.assertOpen();

    // Create a transaction proxy adapter
    const trxAdapter = new TransactionProxyAdapter(this.getApi());

    return this.getApi().transaction(async (trx) => {
      // The trx object from preload provides run/get/all
      // We need to wrap it to match StorageAdapter interface
      const wrappedTrx: StorageAdapter = {
        kind: 'electron-renderer-transaction',
        capabilities: this.capabilities,
        open: async () => {},
        close: async () => {},
        run: trx.run,
        get: trx.get,
        all: trx.all,
        exec: async () => { throw new Error('exec not supported in transaction'); },
        transaction: async () => { throw new Error('Nested transactions not supported'); },
      };

      return fn(wrappedTrx);
    });
  }

  /**
   * Execute batch operations.
   */
  public async batch(operations: BatchOperation[]): Promise<BatchResult> {
    this.assertOpen();
    return this.getApi().batch(operations);
  }

  /**
   * Prepared statements are not directly supported in renderer.
   * Use the main process adapter for prepared statements.
   */
  public prepare?<T = unknown>(_statement: string): PreparedStatement<T> {
    throw new Error('Prepared statements not supported in renderer process. Use transactions instead.');
  }

  // ============================================================================
  // Sync Operations
  // ============================================================================

  /**
   * Get current sync status.
   */
  public async getSyncStatus(): Promise<SyncStatus> {
    this.assertOpen();
    return this.getApi().getSyncStatus();
  }

  /**
   * Trigger a manual sync.
   */
  public async triggerSync(): Promise<void> {
    this.assertOpen();
    return this.getApi().triggerSync();
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Assert that the adapter is open.
   */
  private assertOpen(): void {
    if (!this.isInitialized) {
      throw new Error('[ElectronRendererAdapter] Adapter not open. Call open() first.');
    }
  }

  /**
   * Check if the adapter is open.
   */
  public isOpen(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if the main process database is open.
   */
  public async isMainProcessOpen(): Promise<boolean> {
    try {
      return await this.getApi().isOpen();
    } catch {
      return false;
    }
  }

  /**
   * Add an event listener for database changes.
   */
  public onDatabaseChange(callback: (event: DbChangeEvent) => void): () => void {
    const unsubscribe = this.getApi().onDatabaseChange(callback);
    this.eventUnsubscribers.push(unsubscribe);
    return unsubscribe;
  }
}

// ============================================================================
// Transaction Proxy Adapter
// ============================================================================

/**
 * Internal adapter used during transactions.
 */
class TransactionProxyAdapter implements StorageAdapter {
  public readonly kind = 'electron-renderer-transaction';
  public readonly capabilities: ReadonlySet<StorageCapability> = new Set();

  constructor(private readonly api: typeof window.sqlStorage) {}

  public async open(): Promise<void> {
    // No-op: Transaction doesn't need to be opened
  }

  public async close(): Promise<void> {
    // No-op: Transaction is closed by commit/rollback
  }

  public async run(statement: string, parameters?: StorageParameters): Promise<StorageRunResult> {
    return this.api.run(statement, parameters);
  }

  public async get<T = unknown>(statement: string, parameters?: StorageParameters): Promise<T | null> {
    return this.api.get<T>(statement, parameters);
  }

  public async all<T = unknown>(statement: string, parameters?: StorageParameters): Promise<T[]> {
    return this.api.all<T>(statement, parameters);
  }

  public async exec(_script: string): Promise<void> {
    throw new Error('exec not supported within transactions from renderer');
  }

  public async transaction<T>(_fn: (trx: StorageAdapter) => Promise<T>): Promise<T> {
    throw new Error('Nested transactions not supported');
  }

  public async batch(_operations: BatchOperation[]): Promise<BatchResult> {
    throw new Error('Batch operations not supported within transactions from renderer');
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an Electron Renderer Process Storage Adapter.
 *
 * This adapter proxies all database operations to the main process
 * via IPC. Use it in renderer processes to access the shared database.
 *
 * @param options - Adapter configuration
 * @returns ElectronRendererAdapter instance
 *
 * @example
 * ```typescript
 * const db = createElectronRendererAdapter({
 *   onDatabaseChange: (change) => {
 *     console.log('Database changed:', change);
 *     // Refresh data or invalidate caches
 *   },
 * });
 *
 * await db.open();
 * const users = await db.all('SELECT * FROM users');
 * ```
 */
export function createElectronRendererAdapter(
  options: ElectronRendererAdapterOptions = {}
): ElectronRendererAdapter {
  return new ElectronRendererAdapter(options);
}

/**
 * Helper to detect if running in Electron renderer.
 */
export function isElectronRenderer(): boolean {
  return typeof window !== 'undefined' &&
         typeof window.process === 'object' &&
         (window.process as NodeJS.Process & { type?: string })?.type === 'renderer';
}

/**
 * Helper to check if preload API is available.
 */
export function isPreloadApiAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.sqlStorage;
}
