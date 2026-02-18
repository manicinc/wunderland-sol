/**
 * Preload Script for Electron SQL Storage Adapter.
 *
 * Exposes a secure API to renderer processes via contextBridge.
 * This script runs in an isolated context with access to Node.js APIs
 * and Electron's IPC modules.
 *
 * ## Security
 * - Only exposes necessary functions via contextBridge
 * - All IPC calls are wrapped with proper error handling
 * - No direct access to Node.js modules from renderer
 *
 * ## Usage in main.js
 * ```javascript
 * new BrowserWindow({
 *   webPreferences: {
 *     preload: path.join(__dirname, 'preload.js'),
 *     contextIsolation: true,
 *     nodeIntegration: false,
 *   }
 * });
 * ```
 */

import { contextBridge, ipcRenderer } from 'electron';
import { DB_CHANNELS, TRANSACTION_CHANNELS, SYNC_CHANNELS, BROADCAST_CHANNELS } from './ipc/channels';
import type {
  IpcRequest,
  IpcResponse,
  SqlOperationPayload,
  ExecPayload,
  BatchPayload,
  OpenPayload,
  TransactionContext,
  TransactionOperationPayload,
  SyncStatus,
  DbChangeEvent,
} from './ipc/types';
import type {
  StorageRunResult,
  StorageOpenOptions,
  StorageParameters,
  BatchOperation,
  BatchResult,
  StorageCapability,
} from '../../core/contracts';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique message ID for request correlation.
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Create a typed IPC request.
 */
function createRequest<T>(payload: T): IpcRequest<T> {
  return {
    messageId: generateMessageId(),
    payload,
    timestamp: Date.now(),
  };
}

/**
 * Invoke IPC and handle response.
 */
async function invokeIpc<T>(channel: string, payload: unknown): Promise<T> {
  const request = createRequest(payload);
  const response = await ipcRenderer.invoke(channel, request) as IpcResponse<T>;

  if (!response.success) {
    const error = new Error(response.error?.message ?? 'Unknown IPC error');
    error.name = response.error?.code ?? 'IpcError';
    throw error;
  }

  return response.data as T;
}

// ============================================================================
// SQL Storage API
// ============================================================================

/**
 * SQL Storage API exposed to renderer processes.
 */
const sqlStorageApi = {
  // ============================================================================
  // Database Operations
  // ============================================================================

  /**
   * Open the database connection.
   */
  async open(options?: StorageOpenOptions): Promise<void> {
    const payload: OpenPayload = { options };
    await invokeIpc<void>(DB_CHANNELS.OPEN, payload);
  },

  /**
   * Close the database connection.
   */
  async close(): Promise<void> {
    await invokeIpc<void>(DB_CHANNELS.CLOSE, undefined);
  },

  /**
   * Check if the database is open.
   */
  async isOpen(): Promise<boolean> {
    return invokeIpc<boolean>(DB_CHANNELS.IS_OPEN, undefined);
  },

  /**
   * Get adapter capabilities.
   */
  async getCapabilities(): Promise<StorageCapability[]> {
    return invokeIpc<StorageCapability[]>(DB_CHANNELS.CAPABILITIES, undefined);
  },

  /**
   * Execute a mutation statement (INSERT, UPDATE, DELETE).
   */
  async run(statement: string, parameters?: StorageParameters): Promise<StorageRunResult> {
    const payload: SqlOperationPayload = { statement, parameters };
    return invokeIpc<StorageRunResult>(DB_CHANNELS.RUN, payload);
  },

  /**
   * Get a single row.
   */
  async get<T = unknown>(statement: string, parameters?: StorageParameters): Promise<T | null> {
    const payload: SqlOperationPayload = { statement, parameters };
    return invokeIpc<T | null>(DB_CHANNELS.GET, payload);
  },

  /**
   * Get all matching rows.
   */
  async all<T = unknown>(statement: string, parameters?: StorageParameters): Promise<T[]> {
    const payload: SqlOperationPayload = { statement, parameters };
    return invokeIpc<T[]>(DB_CHANNELS.ALL, payload);
  },

  /**
   * Execute a SQL script.
   */
  async exec(script: string): Promise<void> {
    const payload: ExecPayload = { script };
    await invokeIpc<void>(DB_CHANNELS.EXEC, payload);
  },

  /**
   * Execute batch operations.
   */
  async batch(operations: BatchOperation[]): Promise<BatchResult> {
    const payload: BatchPayload = { operations };
    return invokeIpc<BatchResult>(DB_CHANNELS.BATCH, payload);
  },

  // ============================================================================
  // Transaction Operations
  // ============================================================================

  /**
   * Begin a transaction.
   */
  async beginTransaction(): Promise<TransactionContext> {
    return invokeIpc<TransactionContext>(TRANSACTION_CHANNELS.BEGIN, undefined);
  },

  /**
   * Commit a transaction.
   */
  async commitTransaction(transactionId: string): Promise<void> {
    await invokeIpc<void>(TRANSACTION_CHANNELS.COMMIT, { transactionId });
  },

  /**
   * Rollback a transaction.
   */
  async rollbackTransaction(transactionId: string): Promise<void> {
    await invokeIpc<void>(TRANSACTION_CHANNELS.ROLLBACK, { transactionId });
  },

  /**
   * Execute an operation within a transaction.
   */
  async executeInTransaction(
    transactionId: string,
    statement: string,
    parameters?: StorageParameters
  ): Promise<StorageRunResult | unknown[]> {
    const payload: TransactionOperationPayload = {
      transactionId,
      operation: { statement, parameters },
    };
    return invokeIpc<StorageRunResult | unknown[]>(TRANSACTION_CHANNELS.EXECUTE, payload);
  },

  /**
   * Execute a callback within a transaction (convenience method).
   * Automatically handles begin/commit/rollback.
   */
  async transaction<T>(
    fn: (trx: {
      run: (statement: string, parameters?: StorageParameters) => Promise<StorageRunResult>;
      get: <R = unknown>(statement: string, parameters?: StorageParameters) => Promise<R | null>;
      all: <R = unknown>(statement: string, parameters?: StorageParameters) => Promise<R[]>;
    }) => Promise<T>
  ): Promise<T> {
    const ctx = await this.beginTransaction();

    const trx = {
      run: async (statement: string, parameters?: StorageParameters) => {
        const result = await this.executeInTransaction(ctx.transactionId, statement, parameters);
        return result as StorageRunResult;
      },
      get: async <R = unknown>(statement: string, parameters?: StorageParameters) => {
        const result = await this.executeInTransaction(ctx.transactionId, statement, parameters);
        return (Array.isArray(result) ? result[0] ?? null : null) as R | null;
      },
      all: async <R = unknown>(statement: string, parameters?: StorageParameters) => {
        const result = await this.executeInTransaction(ctx.transactionId, statement, parameters);
        return (Array.isArray(result) ? result : []) as R[];
      },
    };

    try {
      const result = await fn(trx);
      await this.commitTransaction(ctx.transactionId);
      return result;
    } catch (error) {
      await this.rollbackTransaction(ctx.transactionId).catch(() => {
        // Ignore rollback errors
      });
      throw error;
    }
  },

  // ============================================================================
  // Sync Operations
  // ============================================================================

  /**
   * Get sync status.
   */
  async getSyncStatus(): Promise<SyncStatus> {
    return invokeIpc<SyncStatus>(SYNC_CHANNELS.STATUS, undefined);
  },

  /**
   * Trigger manual sync.
   */
  async triggerSync(): Promise<void> {
    await invokeIpc<void>(SYNC_CHANNELS.TRIGGER, undefined);
  },

  // ============================================================================
  // Event Subscriptions
  // ============================================================================

  /**
   * Subscribe to database change events.
   */
  onDatabaseChange(callback: (event: DbChangeEvent) => void): () => void {
    const handler = (_: Electron.IpcRendererEvent, event: DbChangeEvent) => {
      callback(event);
    };
    ipcRenderer.on(BROADCAST_CHANNELS.DB_CHANGE, handler);
    return () => ipcRenderer.removeListener(BROADCAST_CHANNELS.DB_CHANGE, handler);
  },

  /**
   * Subscribe to sync progress events.
   */
  onSyncProgress(callback: (progress: number) => void): () => void {
    const handler = (_: Electron.IpcRendererEvent, progress: number) => {
      callback(progress);
    };
    ipcRenderer.on(SYNC_CHANNELS.PROGRESS, handler);
    return () => ipcRenderer.removeListener(SYNC_CHANNELS.PROGRESS, handler);
  },

  /**
   * Subscribe to sync complete events.
   */
  onSyncComplete(callback: () => void): () => void {
    const handler = () => callback();
    ipcRenderer.on(SYNC_CHANNELS.COMPLETE, handler);
    return () => ipcRenderer.removeListener(SYNC_CHANNELS.COMPLETE, handler);
  },

  /**
   * Subscribe to sync error events.
   */
  onSyncError(callback: (error: Error) => void): () => void {
    const handler = (_: Electron.IpcRendererEvent, error: { message: string }) => {
      callback(new Error(error.message));
    };
    ipcRenderer.on(SYNC_CHANNELS.ERROR, handler);
    return () => ipcRenderer.removeListener(SYNC_CHANNELS.ERROR, handler);
  },
};

// ============================================================================
// Expose API via contextBridge
// ============================================================================

/**
 * Type declaration for window.sqlStorage.
 */
export type SqlStorageApi = typeof sqlStorageApi;

// Only expose if contextBridge is available (running in Electron)
if (contextBridge) {
  contextBridge.exposeInMainWorld('sqlStorage', sqlStorageApi);
}

// Export for testing and direct use
export { sqlStorageApi };

// ============================================================================
// Type Augmentation for Window
// ============================================================================

declare global {
  interface Window {
    sqlStorage: SqlStorageApi;
  }
}
