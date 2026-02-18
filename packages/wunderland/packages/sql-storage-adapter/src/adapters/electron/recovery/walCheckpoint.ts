/**
 * WAL (Write-Ahead Logging) Checkpoint Manager.
 *
 * Manages SQLite WAL checkpointing for optimal performance and
 * data durability. Handles automatic and manual checkpointing
 * with configurable strategies.
 *
 * ## WAL Mode Benefits
 * - Better concurrency (readers don't block writers)
 * - Faster write performance
 * - Atomic commits
 *
 * ## Checkpoint Strategies
 * - PASSIVE: Non-blocking, best for background checkpointing
 * - FULL: Blocks until complete, ensures WAL is cleared
 * - RESTART: Blocks and restarts WAL, minimizes WAL growth
 * - TRUNCATE: Most aggressive, truncates WAL file
 *
 * @example
 * ```typescript
 * const manager = new WalCheckpointManager(adapter, {
 *   checkpointInterval: 300000,
 *   strategy: 'PASSIVE',
 *   maxWalSize: 50 * 1024 * 1024, // 50MB
 * });
 *
 * await manager.start();
 * ```
 */

import type { StorageAdapter } from '../../../core/contracts';

// ============================================================================
// Types
// ============================================================================

/**
 * WAL checkpoint strategy.
 */
export type CheckpointStrategy = 'PASSIVE' | 'FULL' | 'RESTART' | 'TRUNCATE';

/**
 * WAL checkpoint manager configuration.
 */
export interface WalCheckpointConfig {
  /** Interval between automatic checkpoints in milliseconds (default: 300000 = 5 min) */
  checkpointInterval?: number;
  /** Checkpoint strategy (default: 'PASSIVE') */
  strategy?: CheckpointStrategy;
  /** Maximum WAL size in bytes before forced checkpoint (default: 50MB) */
  maxWalSize?: number;
  /** Page size in bytes (default: 4096) */
  pageSize?: number;
  /** Auto-checkpoint page threshold (default: 1000) */
  autoCheckpointPages?: number;
  /** Synchronous mode (default: 'NORMAL') */
  synchronous?: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';
  /** Enable verbose logging (default: false) */
  verbose?: boolean;
}

/**
 * Result of a checkpoint operation.
 */
export interface CheckpointResult {
  /** Whether the checkpoint was successful */
  success: boolean;
  /** Strategy used for this checkpoint */
  strategy: CheckpointStrategy;
  /** Number of WAL frames before checkpoint */
  walFramesBefore: number;
  /** Number of WAL frames after checkpoint */
  walFramesAfter: number;
  /** Number of frames moved to database */
  framesCheckpointed: number;
  /** Number of busy frames that couldn't be checkpointed */
  busyFrames: number;
  /** Time taken in milliseconds */
  durationMs: number;
  /** Timestamp of checkpoint */
  timestamp: number;
  /** Error message if failed */
  error?: string;
}

/**
 * WAL status information.
 */
export interface WalStatus {
  /** Whether WAL mode is enabled */
  enabled: boolean;
  /** Current WAL file size in bytes */
  walSize: number;
  /** Approximate number of pages in WAL */
  walPages: number;
  /** Last checkpoint timestamp */
  lastCheckpoint: number | null;
  /** Number of checkpoints performed */
  totalCheckpoints: number;
  /** Auto-checkpoint threshold in pages */
  autoCheckpointThreshold: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<WalCheckpointConfig> = {
  checkpointInterval: 300000, // 5 minutes
  strategy: 'PASSIVE',
  maxWalSize: 50 * 1024 * 1024, // 50MB
  pageSize: 4096,
  autoCheckpointPages: 1000,
  synchronous: 'NORMAL',
  verbose: false,
};

// ============================================================================
// WAL Checkpoint Manager
// ============================================================================

/**
 * WAL Checkpoint Manager.
 *
 * Manages automatic and manual WAL checkpointing for SQLite databases.
 * Ensures optimal performance and data durability.
 */
export class WalCheckpointManager {
  private readonly config: Required<WalCheckpointConfig>;
  private checkpointTimer: NodeJS.Timeout | null = null;
  private lastCheckpoint: number | null = null;
  private totalCheckpoints = 0;
  private isRunning = false;

  constructor(
    private readonly adapter: StorageAdapter,
    config: WalCheckpointConfig = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  /**
   * Start the checkpoint manager.
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      this.log('Already running');
      return;
    }

    // Configure WAL mode
    await this.configureWalMode();

    // Start periodic checkpointing
    this.startCheckpointTimer();

    this.isRunning = true;
    this.log('WAL Checkpoint Manager started');
  }

  /**
   * Stop the checkpoint manager.
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Stop timer
    this.stopCheckpointTimer();

    // Final checkpoint before stopping
    try {
      await this.checkpoint('FULL');
    } catch (error) {
      this.log(`Final checkpoint failed: ${error}`);
    }

    this.isRunning = false;
    this.log('WAL Checkpoint Manager stopped');
  }

  // ============================================================================
  // WAL Configuration
  // ============================================================================

  /**
   * Configure WAL mode on the database.
   */
  private async configureWalMode(): Promise<void> {
    const pragmas = [
      'PRAGMA journal_mode = WAL',
      `PRAGMA synchronous = ${this.config.synchronous}`,
      `PRAGMA wal_autocheckpoint = ${this.config.autoCheckpointPages}`,
      `PRAGMA page_size = ${this.config.pageSize}`,
    ];

    for (const pragma of pragmas) {
      await this.adapter.exec(pragma);
    }

    this.log('WAL mode configured');
  }

  /**
   * Disable WAL mode and switch back to DELETE journal mode.
   */
  public async disableWalMode(): Promise<void> {
    // First, checkpoint everything
    await this.checkpoint('TRUNCATE');

    // Switch to DELETE mode
    await this.adapter.exec('PRAGMA journal_mode = DELETE');

    this.log('WAL mode disabled');
  }

  // ============================================================================
  // Checkpoint Operations
  // ============================================================================

  /**
   * Perform a WAL checkpoint.
   *
   * @param strategy - Checkpoint strategy (defaults to config strategy)
   * @returns Checkpoint result
   */
  public async checkpoint(strategy?: CheckpointStrategy): Promise<CheckpointResult> {
    const effectiveStrategy = strategy ?? this.config.strategy;
    const startTime = Date.now();

    try {
      // Get WAL status before checkpoint
      const walBefore = await this.getWalFrameCount();

      // Execute checkpoint
      const result = await this.adapter.get<{
        busy: number;
        log: number;
        checkpointed: number;
      }>(`PRAGMA wal_checkpoint(${effectiveStrategy})`);

      // Get WAL status after checkpoint
      const walAfter = await this.getWalFrameCount();

      const checkpointResult: CheckpointResult = {
        success: true,
        strategy: effectiveStrategy,
        walFramesBefore: walBefore,
        walFramesAfter: walAfter,
        framesCheckpointed: result?.checkpointed ?? 0,
        busyFrames: result?.busy ?? 0,
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
      };

      this.lastCheckpoint = Date.now();
      this.totalCheckpoints++;

      this.log(
        `Checkpoint completed: ${checkpointResult.framesCheckpointed} frames ` +
        `(${effectiveStrategy}, ${checkpointResult.durationMs}ms)`
      );

      return checkpointResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Checkpoint failed: ${errorMessage}`);

      return {
        success: false,
        strategy: effectiveStrategy,
        walFramesBefore: 0,
        walFramesAfter: 0,
        framesCheckpointed: 0,
        busyFrames: 0,
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
        error: errorMessage,
      };
    }
  }

  /**
   * Force a full checkpoint that clears the WAL.
   */
  public async forceFullCheckpoint(): Promise<CheckpointResult> {
    return this.checkpoint('TRUNCATE');
  }

  // ============================================================================
  // Timer Management
  // ============================================================================

  /**
   * Start the automatic checkpoint timer.
   */
  private startCheckpointTimer(): void {
    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
    }

    this.checkpointTimer = setInterval(async () => {
      try {
        // Check if WAL has grown too large
        const walSize = await this.getWalSize();
        const strategy = walSize > this.config.maxWalSize ? 'FULL' : this.config.strategy;

        await this.checkpoint(strategy);
      } catch (error) {
        this.log(`Periodic checkpoint failed: ${error}`);
      }
    }, this.config.checkpointInterval);
  }

  /**
   * Stop the automatic checkpoint timer.
   */
  private stopCheckpointTimer(): void {
    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
      this.checkpointTimer = null;
    }
  }

  // ============================================================================
  // Status & Monitoring
  // ============================================================================

  /**
   * Get current WAL status.
   */
  public async getStatus(): Promise<WalStatus> {
    const journalMode = await this.adapter.get<{ journal_mode: string }>('PRAGMA journal_mode');
    const walFrames = await this.getWalFrameCount();
    const autoCheckpoint = await this.adapter.get<{ wal_autocheckpoint: number }>('PRAGMA wal_autocheckpoint');

    return {
      enabled: journalMode?.journal_mode?.toLowerCase() === 'wal',
      walSize: walFrames * this.config.pageSize,
      walPages: walFrames,
      lastCheckpoint: this.lastCheckpoint,
      totalCheckpoints: this.totalCheckpoints,
      autoCheckpointThreshold: autoCheckpoint?.wal_autocheckpoint ?? this.config.autoCheckpointPages,
    };
  }

  /**
   * Get current WAL size in bytes.
   */
  private async getWalSize(): Promise<number> {
    const frames = await this.getWalFrameCount();
    return frames * this.config.pageSize;
  }

  /**
   * Get current WAL frame count.
   */
  private async getWalFrameCount(): Promise<number> {
    // PRAGMA wal_checkpoint returns (busy, log, checkpointed)
    // log is the total number of frames in the WAL file
    const result = await this.adapter.get<{
      busy: number;
      log: number;
      checkpointed: number;
    }>('PRAGMA wal_checkpoint(PASSIVE)');

    return result?.log ?? 0;
  }

  /**
   * Check if WAL mode is currently enabled.
   */
  public async isWalEnabled(): Promise<boolean> {
    const result = await this.adapter.get<{ journal_mode: string }>('PRAGMA journal_mode');
    return result?.journal_mode?.toLowerCase() === 'wal';
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Get checkpoint statistics.
   */
  public getStats(): {
    totalCheckpoints: number;
    lastCheckpoint: number | null;
    isRunning: boolean;
    checkpointInterval: number;
    strategy: CheckpointStrategy;
  } {
    return {
      totalCheckpoints: this.totalCheckpoints,
      lastCheckpoint: this.lastCheckpoint,
      isRunning: this.isRunning,
      checkpointInterval: this.config.checkpointInterval,
      strategy: this.config.strategy,
    };
  }

  /**
   * Update checkpoint configuration at runtime.
   */
  public updateConfig(newConfig: Partial<WalCheckpointConfig>): void {
    Object.assign(this.config, newConfig);

    // Restart timer if interval changed and running
    if (this.isRunning && newConfig.checkpointInterval !== undefined) {
      this.startCheckpointTimer();
    }
  }

  /**
   * Log a message if verbose mode is enabled.
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[WalCheckpointManager] ${message}`);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a WAL Checkpoint Manager.
 *
 * @param adapter - Storage adapter to manage
 * @param config - Checkpoint configuration
 * @returns WalCheckpointManager instance
 */
export function createWalCheckpointManager(
  adapter: StorageAdapter,
  config: WalCheckpointConfig = {}
): WalCheckpointManager {
  return new WalCheckpointManager(adapter, config);
}
