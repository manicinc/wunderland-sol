/**
 * Cloud Backup Example
 * 
 * Demonstrates automatic scheduled backups to S3, R2, or other cloud storage.
 * 
 * Note: This example file has TypeScript errors because dependencies are optional.
 * The package uses:
 * - Tree-shakable exports - unused code is removed by bundlers
 * - Lazy loading - AWS SDK commands are imported dynamically only when used
 * - Optional peer dependencies - install only what you need (@aws-sdk/client-s3, better-sqlite3, pg)
 * 
 * In production, these errors won't appear because users install the dependencies they need.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createDatabase, createCloudBackupManager, S3StorageProvider, CloudStorageProvider } from '../src/index';

// AWS S3 Example
async function awsS3Backup() {
  const db = await createDatabase({ type: 'memory' });

  // Configure S3 client
  const s3 = new S3Client({ 
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
  });

  // Create backup manager
  const backupManager = createCloudBackupManager(db, s3, 'my-app-backups', {
    interval: 60 * 60 * 1000, // Every hour
    maxBackups: 24, // Keep last 24 backups
    options: {
      format: 'json',
      compression: 'gzip',
      prefix: 'production/',
    },
    onSuccess: (key) => console.log(`Backup created: ${key}`),
    onError: (error) => console.error('Backup failed:', error),
  });

  // Start automatic backups
  backupManager.start();

  // Manual backup
  const key = await backupManager.backupNow();
  console.log('Manual backup created:', key);

  // List backups
  const backups = await backupManager.listBackups();
  console.log('Available backups:', backups);

  // Restore from backup
  await backupManager.restore(backups[0]);
  console.log('Restored from:', backups[0]);

  // Stop automatic backups
  backupManager.stop();
}

// Cloudflare R2 Example
async function cloudflareR2Backup() {
  const db = await createDatabase({ type: 'memory' });

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
  
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const backupManager = createCloudBackupManager(db, r2, 'database-backups', {
    interval: 24 * 60 * 60 * 1000, // Daily
    maxBackups: 7, // Keep last week
    options: {
      compression: 'gzip',
    },
  });

  backupManager.start();
}

// MinIO Example (self-hosted S3-compatible)
async function minIOBackup() {
  const db = await createDatabase({ type: 'memory' });

  const minio = new S3Client({
    region: 'us-east-1', // MinIO requires a region
    endpoint: 'http://localhost:9000',
    credentials: {
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin',
    },
    forcePathStyle: true, // Required for MinIO
  });

  const backupManager = createCloudBackupManager(db, minio, 'backups', {
    interval: 30 * 60 * 1000, // Every 30 minutes
    maxBackups: 10,
  });

  backupManager.start();
}

// Custom Storage Provider Example
class CustomStorageProvider implements CloudStorageProvider {
  async upload(key: string, data: string | Buffer): Promise<void> {
    // Custom upload logic (e.g., HTTP POST to your API)
    const body = typeof data === 'string' ? data : data.toString('base64');
    await fetch(`https://my-api.com/backups/${key}`, {
      method: 'POST',
      body,
    });
  }

  async download(key: string): Promise<string | Buffer> {
    const response = await fetch(`https://my-api.com/backups/${key}`);
    return await response.text();
  }

  async list(prefix?: string): Promise<string[]> {
    const response = await fetch(`https://my-api.com/backups?prefix=${prefix || ''}`);
    return await response.json();
  }

  async delete(key: string): Promise<void> {
    await fetch(`https://my-api.com/backups/${key}`, { method: 'DELETE' });
  }
}

async function customStorageBackup() {
  const db = await createDatabase({ type: 'memory' });
  
  // Use your custom storage provider
  const storage = new CustomStorageProvider();
  const { CloudBackupManager } = await import('../src/features/backup/cloudBackup');
  
  const backupManager = new CloudBackupManager(db, storage, {
    interval: 60 * 60 * 1000,
    maxBackups: 24,
  });

  backupManager.start();
}

// One-time backup to S3
async function oneTimeBackup() {
  const db = await createDatabase({ type: 'memory' });

  const s3 = new S3Client({ region: 'us-east-1' });
  
  const backupManager = createCloudBackupManager(db, s3, 'my-bucket', {
    interval: 0, // Not used for one-time
  });

  // Manual backup
  const key = await backupManager.backupNow({
    format: 'sql',
    compression: 'gzip',
    tables: ['users', 'posts'], // Only specific tables
  });

  console.log('Backup saved to:', key);
}

// Run examples
if (require.main === module) {
  awsS3Backup().catch(console.error);
}

export { awsS3Backup, cloudflareR2Backup, minIOBackup, customStorageBackup, oneTimeBackup };
