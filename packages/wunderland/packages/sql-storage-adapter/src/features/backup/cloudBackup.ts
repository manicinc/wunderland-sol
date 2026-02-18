/**
 * Cloud backup utilities for S3, R2, and other object storage providers.
 * 
 * This module provides automatic scheduled backups and restore functionality
 * for SQL databases using S3-compatible storage (AWS S3, Cloudflare R2, MinIO, etc.).
 * 
 * Features:
 * - Automatic scheduled backups with configurable intervals
 * - Gzip compression to reduce storage costs
 * - Retention policies (automatic cleanup of old backups)
 * - JSON and SQL export formats
 * - Manual backup/restore on demand
 * 
 * @example
 * ```typescript
 * import { S3Client } from '@aws-sdk/client-s3';
 * import { createCloudBackupManager } from '@framers/sql-storage-adapter';
 * 
 * const s3Client = new S3Client({ region: 'us-east-1' });
 * const manager = createCloudBackupManager(db, s3Client, 'my-backups', {
 *   interval: 3600000,  // 1 hour
 *   maxBackups: 24,
 *   options: { compression: 'gzip', format: 'json' }
 * });
 * 
 * manager.start();  // Auto-schedule backups
 * await manager.backupNow();  // Manual backup
 * await manager.restore('backups/db-2024-01-15.json.gz');
 * ```
 * 
 * @module cloudBackup
 */

import type { StorageAdapter } from '../../core/contracts';
import { exportAsJSON, exportAsSQL } from '../migrations/dataExport';
import { importFromJSON, importFromSQL } from '../migrations/dataImport';

/** Supported backup export formats */
export type BackupFormat = 'json' | 'sql';

/** Supported compression algorithms */
export type CompressionType = 'gzip' | 'none';

/**
 * Generic interface for cloud storage providers.
 * 
 * Implement this interface to support custom storage backends
 * beyond S3-compatible services.
 */
export interface CloudStorageProvider {
  /**
   * Upload data to cloud storage
   * @param key - The storage key/path for the backup
   * @param data - The backup data (string or Buffer)
   */
  upload(key: string, data: string | Buffer): Promise<void>;
  
  /**
   * Download data from cloud storage
   * @param key - The storage key/path to download
   * @returns The backup data
   */
  download(key: string): Promise<string | Buffer>;
  
  /**
   * List available backups in cloud storage
   * @param prefix - Optional prefix to filter backups
   * @returns Array of backup keys
   */
  list(prefix?: string): Promise<string[]>;
  
  /**
   * Delete a backup from cloud storage
   * @param key - The storage key/path to delete
   */
  delete(key: string): Promise<void>;
}

/**
 * Configuration options for backup creation
 */
export interface BackupOptions {
  /** Backup format (json or sql) - default: 'json' */
  format?: BackupFormat;
  /** Compression type - default: 'gzip' */
  compression?: CompressionType;
  /** Tables to include (undefined = all tables) */
  tables?: string[];
  /** Prefix for backup keys - default: 'backups/' */
  prefix?: string;
  /** Include timestamp in backup key - default: true */
  includeTimestamp?: boolean;
}

/**
 * Configuration for automatic scheduled backups
 */
export interface ScheduledBackupConfig {
  /** Backup interval in milliseconds (e.g., 3600000 = 1 hour) */
  interval: number;
  /** Maximum number of backups to keep (older backups auto-deleted) */
  maxBackups?: number;
  /** Backup creation options */
  options?: BackupOptions;
  /** Callback invoked on successful backup */
  onSuccess?: (key: string) => void;
  /** Callback invoked on backup error */
  onError?: (error: Error) => void;
}

/**
 * S3-compatible cloud storage provider.
 * 
 * Works with AWS S3, Cloudflare R2, MinIO, and other S3-compatible services.
 * Uses the AWS SDK v3 for S3 operations.
 * 
 * @example
 * ```typescript
 * import { S3Client } from '@aws-sdk/client-s3';
 * 
 * const s3Client = new S3Client({ region: 'us-east-1' });
 * const provider = new S3StorageProvider(s3Client, 'my-bucket');
 * 
 * await provider.upload('backups/test.json', JSON.stringify(data));
 * const backups = await provider.list('backups/');
 * ```
 */
export class S3StorageProvider implements CloudStorageProvider {
  /**
   * @param client - AWS SDK S3Client instance
   * @param bucket - S3 bucket name
   */
  constructor(
    private client: { send: (command: unknown) => Promise<unknown> },
    private bucket: string
  ) {}

  async upload(key: string, data: string | Buffer): Promise<void> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
    }));
  }

  async download(key: string): Promise<string> {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })) as { Body: { transformToString?: () => Promise<string>; toString: (encoding: string) => string } };
    
    // Handle different SDK versions
    if (response.Body.transformToString) {
      return await response.Body.transformToString();
    }
    return response.Body.toString('utf-8');
  }

  async list(prefix?: string): Promise<string[]> {
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const response = await this.client.send(new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    })) as { Contents?: Array<{ Key?: string }> };
    
    return response.Contents?.map((obj) => obj.Key).filter((key): key is string => !!key) ?? [];
  }

  async delete(key: string): Promise<void> {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }
}

/**
 * Compress data using gzip.
 */
async function compress(data: string): Promise<Buffer> {
  const { gzip } = await import('zlib');
  const { promisify } = await import('util');
  const gzipAsync = promisify(gzip);
  return await gzipAsync(Buffer.from(data));
}

/**
 * Decompress gzipped data.
 */
async function decompress(data: Buffer): Promise<string> {
  const { gunzip } = await import('zlib');
  const { promisify } = await import('util');
  const gunzipAsync = promisify(gunzip);
  const decompressed = await gunzipAsync(data);
  return decompressed.toString('utf-8');
}

/**
 * Cloud backup manager for automatic scheduled backups.
 */
export class CloudBackupManager {
  private intervalId?: NodeJS.Timeout;

  constructor(
    private adapter: StorageAdapter,
    private storage: CloudStorageProvider,
    private config: ScheduledBackupConfig
  ) {}

  /**
   * Create a backup and upload to cloud storage.
   */
  async backup(options: BackupOptions = {}): Promise<string> {
    const format = options.format ?? this.config.options?.format ?? 'json';
    const compression = options.compression ?? this.config.options?.compression ?? 'none';
    const tables = options.tables ?? this.config.options?.tables;
    const prefix = options.prefix ?? this.config.options?.prefix ?? 'backups/';
    const includeTimestamp = options.includeTimestamp ?? this.config.options?.includeTimestamp ?? true;

    // Export data
    let data: string;
    if (format === 'json') {
      data = await exportAsJSON(this.adapter, { tables });
    } else {
      data = await exportAsSQL(this.adapter, { tables });
    }

    // Compress if needed
    let uploadData: string | Buffer = data;
    if (compression === 'gzip') {
      uploadData = await compress(data);
    }

    // Generate key
    const timestamp = includeTimestamp ? `-${new Date().toISOString().replace(/[:.]/g, '-')}` : '';
    const ext = format === 'json' ? 'json' : 'sql';
    const compExt = compression === 'gzip' ? '.gz' : '';
    const key = `${prefix}backup${timestamp}.${ext}${compExt}`;

    // Upload
    await this.storage.upload(key, uploadData);

    // Cleanup old backups if needed
    if (this.config.maxBackups) {
      await this.cleanupOldBackups(prefix);
    }

    return key;
  }

  /**
   * Restore from a cloud backup.
   */
  async restore(key: string): Promise<void> {
    // Download
    const data = await this.storage.download(key);

    // Decompress if needed
    let restored: string;
    if (key.endsWith('.gz')) {
      restored = await decompress(Buffer.from(data));
    } else {
      restored = typeof data === 'string' ? data : data.toString('utf-8');
    }

    // Import
    if (key.includes('.json')) {
      await importFromJSON(this.adapter, restored);
    } else {
      await importFromSQL(this.adapter, restored);
    }
  }

  /**
   * List all backups in cloud storage.
   */
  async listBackups(prefix?: string): Promise<string[]> {
    const searchPrefix = prefix ?? this.config.options?.prefix ?? 'backups/';
    return await this.storage.list(searchPrefix);
  }

  /**
   * Delete old backups exceeding maxBackups limit.
   */
  private async cleanupOldBackups(prefix: string): Promise<void> {
    if (!this.config.maxBackups) return;

    const backups = await this.storage.list(prefix);
    if (backups.length <= this.config.maxBackups) return;

    // Sort by name (timestamp) and delete oldest
    const sorted = backups.sort();
    const toDelete = sorted.slice(0, backups.length - this.config.maxBackups);

    for (const key of toDelete) {
      await this.storage.delete(key);
    }
  }

  /**
   * Start automatic scheduled backups.
   */
  start(): void {
    if (this.intervalId) {
      throw new Error('Scheduled backups already started');
    }

    this.intervalId = setInterval(async () => {
      try {
        const key = await this.backup();
        this.config.onSuccess?.(key);
      } catch (error) {
        this.config.onError?.(error as Error);
      }
    }, this.config.interval);
  }

  /**
   * Stop automatic scheduled backups.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Perform a backup immediately (manual trigger).
   */
  async backupNow(options?: BackupOptions): Promise<string> {
    return await this.backup(options);
  }
}

/**
 * Create a cloud backup manager with S3-compatible storage.
 * 
 * This is the main factory function for setting up cloud backups.
 * It creates an S3StorageProvider and CloudBackupManager configured
 * with your database and S3-compatible storage.
 * 
 * @param adapter - The StorageAdapter instance to backup
 * @param s3Client - AWS SDK S3Client (works with S3, R2, MinIO, etc.)
 * @param bucket - The S3 bucket name
 * @param config - Scheduled backup configuration
 * @returns CloudBackupManager instance ready to start
 * 
 * @example AWS S3
 * ```typescript
 * import { S3Client } from '@aws-sdk/client-s3';
 * import { createCloudBackupManager } from '@framers/sql-storage-adapter';
 * 
 * const s3 = new S3Client({ region: 'us-east-1' });
 * const manager = createCloudBackupManager(db, s3, 'my-bucket', {
 *   interval: 60 * 60 * 1000, // 1 hour
 *   maxBackups: 24,
 *   options: { compression: 'gzip' }
 * });
 * 
 * manager.start();
 * ```
 * 
 * @example Cloudflare R2
 * ```typescript
 * import { S3Client } from '@aws-sdk/client-s3';
 * 
 * const r2 = new S3Client({
 *   region: 'auto',
 *   endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
 *   credentials: {
 *     accessKeyId: process.env.R2_ACCESS_KEY_ID,
 *     secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
 *   },
 * });
 * 
 * const manager = createCloudBackupManager(db, r2, 'backups', {
 *   interval: 24 * 60 * 60 * 1000, // Daily
 *   maxBackups: 7
 * });
 * ```
 */
export function createCloudBackupManager(
  adapter: StorageAdapter,
  s3Client: { send: (command: unknown) => Promise<unknown> },
  bucket: string,
  config: ScheduledBackupConfig
): CloudBackupManager {
  const storage = new S3StorageProvider(s3Client, bucket);
  return new CloudBackupManager(adapter, storage, config);
}
