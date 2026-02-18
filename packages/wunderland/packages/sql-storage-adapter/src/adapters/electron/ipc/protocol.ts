/**
 * IPC Protocol Handlers for Electron SQL Storage Adapter.
 *
 * Registers IPC handlers in the main process to handle database
 * operations from renderer processes. Ensures type-safe communication
 * and proper error handling.
 */

import { ipcMain, BrowserWindow } from 'electron';
import { DB_CHANNELS, TRANSACTION_CHANNELS, BROADCAST_CHANNELS } from './channels';
import type {
  IpcRequest,
  IpcResponse,
  IpcError,
  SqlOperationPayload,
  ExecPayload,
  BatchPayload,
  OpenPayload,
  TransactionContext,
  TransactionOperationPayload,
  DbChangeEvent,
} from './types';
import type { StorageAdapter, StorageRunResult, BatchResult } from '../../../core/contracts';

// ============================================================================
// Protocol Manager
// ============================================================================

/**
 * Transaction store for multi-step transactions.
 */
interface ActiveTransaction {
  id: string;
  startedAt: number;
  windowId: number;
}

/**
 * IPC Protocol Manager.
 *
 * Manages IPC communication between main and renderer processes
 * for database operations. Handles request routing, error handling,
 * and change broadcasting.
 */
export class IpcProtocolManager {
  private adapter: StorageAdapter | null = null;
  private activeTransactions = new Map<string, ActiveTransaction>();
  private handlersRegistered = false;

  /**
   * Initialize the protocol manager with a storage adapter.
   */
  public initialize(adapter: StorageAdapter): void {
    this.adapter = adapter;
    this.registerHandlers();
  }

  /**
   * Register all IPC handlers.
   */
  private registerHandlers(): void {
    if (this.handlersRegistered) {
      console.warn('[IpcProtocol] Handlers already registered');
      return;
    }

    // Database operations
    ipcMain.handle(DB_CHANNELS.OPEN, this.handleOpen.bind(this));
    ipcMain.handle(DB_CHANNELS.CLOSE, this.handleClose.bind(this));
    ipcMain.handle(DB_CHANNELS.IS_OPEN, this.handleIsOpen.bind(this));
    ipcMain.handle(DB_CHANNELS.CAPABILITIES, this.handleCapabilities.bind(this));
    ipcMain.handle(DB_CHANNELS.RUN, this.handleRun.bind(this));
    ipcMain.handle(DB_CHANNELS.GET, this.handleGet.bind(this));
    ipcMain.handle(DB_CHANNELS.ALL, this.handleAll.bind(this));
    ipcMain.handle(DB_CHANNELS.EXEC, this.handleExec.bind(this));
    ipcMain.handle(DB_CHANNELS.BATCH, this.handleBatch.bind(this));

    // Transaction operations
    ipcMain.handle(TRANSACTION_CHANNELS.BEGIN, this.handleTransactionBegin.bind(this));
    ipcMain.handle(TRANSACTION_CHANNELS.COMMIT, this.handleTransactionCommit.bind(this));
    ipcMain.handle(TRANSACTION_CHANNELS.ROLLBACK, this.handleTransactionRollback.bind(this));
    ipcMain.handle(TRANSACTION_CHANNELS.EXECUTE, this.handleTransactionExecute.bind(this));

    this.handlersRegistered = true;
  }

  /**
   * Unregister all IPC handlers.
   */
  public dispose(): void {
    if (!this.handlersRegistered) return;

    // Remove database operation handlers
    ipcMain.removeHandler(DB_CHANNELS.OPEN);
    ipcMain.removeHandler(DB_CHANNELS.CLOSE);
    ipcMain.removeHandler(DB_CHANNELS.IS_OPEN);
    ipcMain.removeHandler(DB_CHANNELS.CAPABILITIES);
    ipcMain.removeHandler(DB_CHANNELS.RUN);
    ipcMain.removeHandler(DB_CHANNELS.GET);
    ipcMain.removeHandler(DB_CHANNELS.ALL);
    ipcMain.removeHandler(DB_CHANNELS.EXEC);
    ipcMain.removeHandler(DB_CHANNELS.BATCH);

    // Remove transaction handlers
    ipcMain.removeHandler(TRANSACTION_CHANNELS.BEGIN);
    ipcMain.removeHandler(TRANSACTION_CHANNELS.COMMIT);
    ipcMain.removeHandler(TRANSACTION_CHANNELS.ROLLBACK);
    ipcMain.removeHandler(TRANSACTION_CHANNELS.EXECUTE);

    this.handlersRegistered = false;
  }

  // ============================================================================
  // Database Operation Handlers
  // ============================================================================

  private async handleOpen(
    _event: Electron.IpcMainInvokeEvent,
    request: IpcRequest<OpenPayload>
  ): Promise<IpcResponse<void>> {
    return this.wrapHandler(request, async () => {
      await this.adapter!.open(request.payload.options);
    });
  }

  private async handleClose(
    _event: Electron.IpcMainInvokeEvent,
    request: IpcRequest<void>
  ): Promise<IpcResponse<void>> {
    return this.wrapHandler(request, async () => {
      await this.adapter!.close();
    });
  }

  private async handleIsOpen(
    _event: Electron.IpcMainInvokeEvent,
    request: IpcRequest<void>
  ): Promise<IpcResponse<boolean>> {
    return this.wrapHandler(request, async () => {
      // Check if adapter has isOpen method, otherwise try to execute a simple query
      if ('isOpen' in this.adapter! && typeof (this.adapter as { isOpen: () => boolean }).isOpen === 'function') {
        return (this.adapter as { isOpen: () => boolean }).isOpen();
      }
      // Fallback: try a simple operation
      try {
        await this.adapter!.get('SELECT 1');
        return true;
      } catch {
        return false;
      }
    });
  }

  private async handleCapabilities(
    _event: Electron.IpcMainInvokeEvent,
    request: IpcRequest<void>
  ): Promise<IpcResponse<string[]>> {
    return this.wrapHandler(request, async () => {
      return Array.from(this.adapter!.capabilities);
    });
  }

  private async handleRun(
    event: Electron.IpcMainInvokeEvent,
    request: IpcRequest<SqlOperationPayload>
  ): Promise<IpcResponse<StorageRunResult>> {
    return this.wrapHandler(request, async () => {
      const result = await this.adapter!.run(
        request.payload.statement,
        request.payload.parameters
      );

      // Broadcast change to all windows except sender
      this.broadcastDbChange(event, {
        type: this.detectMutationType(request.payload.statement),
        tables: this.extractTables(request.payload.statement),
        changes: result.changes,
        timestamp: Date.now(),
        sourceWindowId: BrowserWindow.fromWebContents(event.sender)?.id,
      });

      return result;
    });
  }

  private async handleGet(
    _event: Electron.IpcMainInvokeEvent,
    request: IpcRequest<SqlOperationPayload>
  ): Promise<IpcResponse<unknown>> {
    return this.wrapHandler(request, async () => {
      return this.adapter!.get(
        request.payload.statement,
        request.payload.parameters
      );
    });
  }

  private async handleAll(
    _event: Electron.IpcMainInvokeEvent,
    request: IpcRequest<SqlOperationPayload>
  ): Promise<IpcResponse<unknown[]>> {
    return this.wrapHandler(request, async () => {
      return this.adapter!.all(
        request.payload.statement,
        request.payload.parameters
      );
    });
  }

  private async handleExec(
    event: Electron.IpcMainInvokeEvent,
    request: IpcRequest<ExecPayload>
  ): Promise<IpcResponse<void>> {
    return this.wrapHandler(request, async () => {
      await this.adapter!.exec(request.payload.script);

      // Broadcast change for exec operations
      this.broadcastDbChange(event, {
        type: 'transaction',
        tables: [],
        changes: 0,
        timestamp: Date.now(),
        sourceWindowId: BrowserWindow.fromWebContents(event.sender)?.id,
      });
    });
  }

  private async handleBatch(
    event: Electron.IpcMainInvokeEvent,
    request: IpcRequest<BatchPayload>
  ): Promise<IpcResponse<BatchResult>> {
    return this.wrapHandler(request, async () => {
      if (!this.adapter!.batch) {
        throw new Error('Batch operations not supported by this adapter');
      }

      const result = await this.adapter!.batch(request.payload.operations);

      // Broadcast change
      this.broadcastDbChange(event, {
        type: 'transaction',
        tables: request.payload.operations.flatMap(op => this.extractTables(op.statement)),
        changes: result.successful,
        timestamp: Date.now(),
        sourceWindowId: BrowserWindow.fromWebContents(event.sender)?.id,
      });

      return result;
    });
  }

  // ============================================================================
  // Transaction Handlers
  // ============================================================================

  private async handleTransactionBegin(
    event: Electron.IpcMainInvokeEvent,
    request: IpcRequest<void>
  ): Promise<IpcResponse<TransactionContext>> {
    return this.wrapHandler(request, async () => {
      const transactionId = `trx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const windowId = BrowserWindow.fromWebContents(event.sender)?.id ?? 0;

      // Start transaction
      await this.adapter!.exec('BEGIN IMMEDIATE');

      const context: TransactionContext = {
        transactionId,
        active: true,
        startedAt: Date.now(),
      };

      this.activeTransactions.set(transactionId, {
        id: transactionId,
        startedAt: context.startedAt,
        windowId,
      });

      return context;
    });
  }

  private async handleTransactionCommit(
    event: Electron.IpcMainInvokeEvent,
    request: IpcRequest<{ transactionId: string }>
  ): Promise<IpcResponse<void>> {
    return this.wrapHandler(request, async () => {
      const trx = this.activeTransactions.get(request.payload.transactionId);
      if (!trx) {
        throw new Error(`Transaction ${request.payload.transactionId} not found`);
      }

      await this.adapter!.exec('COMMIT');
      this.activeTransactions.delete(request.payload.transactionId);

      // Broadcast transaction completion
      this.broadcastDbChange(event, {
        type: 'transaction',
        tables: [],
        changes: 0,
        timestamp: Date.now(),
        sourceWindowId: BrowserWindow.fromWebContents(event.sender)?.id,
      });
    });
  }

  private async handleTransactionRollback(
    _event: Electron.IpcMainInvokeEvent,
    request: IpcRequest<{ transactionId: string }>
  ): Promise<IpcResponse<void>> {
    return this.wrapHandler(request, async () => {
      const trx = this.activeTransactions.get(request.payload.transactionId);
      if (!trx) {
        throw new Error(`Transaction ${request.payload.transactionId} not found`);
      }

      await this.adapter!.exec('ROLLBACK');
      this.activeTransactions.delete(request.payload.transactionId);
    });
  }

  private async handleTransactionExecute(
    _event: Electron.IpcMainInvokeEvent,
    request: IpcRequest<TransactionOperationPayload>
  ): Promise<IpcResponse<StorageRunResult | unknown>> {
    return this.wrapHandler(request, async () => {
      const trx = this.activeTransactions.get(request.payload.transactionId);
      if (!trx) {
        throw new Error(`Transaction ${request.payload.transactionId} not found`);
      }

      const { statement, parameters } = request.payload.operation;
      const upperStatement = statement.trim().toUpperCase();

      if (upperStatement.startsWith('SELECT')) {
        return this.adapter!.all(statement, parameters);
      } else {
        return this.adapter!.run(statement, parameters);
      }
    });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Wrap handler with error handling and response formatting.
   */
  private async wrapHandler<T>(
    request: IpcRequest<unknown>,
    handler: () => Promise<T>
  ): Promise<IpcResponse<T>> {
    const startTime = Date.now();

    if (!this.adapter) {
      return {
        messageId: request.messageId,
        success: false,
        error: this.formatError(new Error('Adapter not initialized')),
        duration: Date.now() - startTime,
      };
    }

    try {
      const data = await handler();
      return {
        messageId: request.messageId,
        success: true,
        data,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        messageId: request.messageId,
        success: false,
        error: this.formatError(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Format error for IPC response.
   */
  private formatError(error: unknown): IpcError {
    if (error instanceof Error) {
      return {
        code: error.name || 'ERROR',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        cause: (error as Error & { cause?: unknown }).cause,
      };
    }
    return {
      code: 'UNKNOWN_ERROR',
      message: String(error),
    };
  }

  /**
   * Broadcast database change to all windows except sender.
   */
  private broadcastDbChange(event: Electron.IpcMainInvokeEvent, change: DbChangeEvent): void {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    const allWindows = BrowserWindow.getAllWindows();

    for (const win of allWindows) {
      if (win.id !== senderWindow?.id && !win.isDestroyed()) {
        win.webContents.send(BROADCAST_CHANNELS.DB_CHANGE, change);
      }
    }
  }

  /**
   * Detect mutation type from SQL statement.
   */
  private detectMutationType(statement: string): 'insert' | 'update' | 'delete' | 'transaction' {
    const upper = statement.trim().toUpperCase();
    if (upper.startsWith('INSERT')) return 'insert';
    if (upper.startsWith('UPDATE')) return 'update';
    if (upper.startsWith('DELETE')) return 'delete';
    return 'transaction';
  }

  /**
   * Extract table names from SQL statement.
   */
  private extractTables(statement: string): string[] {
    const tables: string[] = [];
    const patterns = [
      /FROM\s+([^\s,;(]+)/gi,
      /INSERT\s+INTO\s+([^\s(]+)/i,
      /UPDATE\s+([^\s]+)/i,
      /DELETE\s+FROM\s+([^\s]+)/i,
      /JOIN\s+([^\s]+)/gi,
    ];

    for (const pattern of patterns) {
      const matches = statement.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          tables.push(match[1].toLowerCase().replace(/["`[\]]/g, ''));
        }
      }
    }

    return [...new Set(tables)];
  }
}

/**
 * Singleton protocol manager instance.
 */
export const protocolManager = new IpcProtocolManager();

/**
 * Initialize IPC protocol with the given adapter.
 */
export function initializeIpcProtocol(adapter: StorageAdapter): void {
  protocolManager.initialize(adapter);
}

/**
 * Dispose IPC protocol handlers.
 */
export function disposeIpcProtocol(): void {
  protocolManager.dispose();
}
