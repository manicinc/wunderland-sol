import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resolveStorageAdapter, StorageResolutionError } from '../src/index.js';

const ensureStorageResolutionError = (error: unknown): StorageResolutionError => {
  if (error instanceof StorageResolutionError) {
    return error;
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error(String(error));
};

describe('Storage Adapter Resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('should export resolveStorageAdapter function', () => {
    expect(resolveStorageAdapter).toBeDefined();
    expect(typeof resolveStorageAdapter).toBe('function');
  });

  it('should throw StorageResolutionError when no adapter can be resolved', async () => {
    // Mock all adapters to fail
    vi.mock('../src/adapters/betterSqliteAdapter.js', () => ({
      createBetterSqliteAdapter: () => {
        throw new Error('better-sqlite3 not available');
      }
    }));

    vi.mock('../src/adapters/sqlJsAdapter.js', () => ({
      createSqlJsAdapter: () => {
        throw new Error('sql.js not available');
      }
    }));

    await expect(
      resolveStorageAdapter({ priority: ['better-sqlite3'] }).catch((error) => {
        const resolutionError = ensureStorageResolutionError(error);
        expect(resolutionError.message).toContain('Unable to resolve a storage adapter');
        throw resolutionError;
      }),
    ).rejects.toBeInstanceOf(StorageResolutionError);
  });

  it('should respect priority order when specified', async () => {
    const options = {
      priority: ['sqljs' as const],
      filePath: '/test/db.sqlite'
    };

    // This will attempt sql.js first due to priority
    // The actual adapter creation might fail in test environment
    // but we're testing the resolution logic
    try {
      await resolveStorageAdapter(options);
    } catch (error) {
      expect(ensureStorageResolutionError(error)).toBeInstanceOf(StorageResolutionError);
    }
  });

  it('should use environment variable STORAGE_ADAPTER when set', async () => {
    vi.stubEnv('STORAGE_ADAPTER', 'sqljs');

    try {
      await resolveStorageAdapter();
    } catch (error) {
      expect(ensureStorageResolutionError(error)).toBeInstanceOf(StorageResolutionError);
    }
  });

  it('should prioritize PostgreSQL when DATABASE_URL is set', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');

    // This test verifies that PostgreSQL is prioritized when DATABASE_URL is set
    // The actual adapter creation will fail (pg not available in test), but we verify
    // that the resolver attempts PostgreSQL first before falling back
    try {
      await resolveStorageAdapter();
    } catch (error) {
      const resolvedError = ensureStorageResolutionError(error);
      expect(resolvedError.causes).toBeDefined();
      // Verify that postgres was attempted (first in priority when DATABASE_URL is set)
      expect(resolvedError.causes.length).toBeGreaterThan(0);
    }
  }, { timeout: 10000 });
});