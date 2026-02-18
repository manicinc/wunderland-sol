# Mobile & Offline Feature Parity

> Comprehensive guide for achieving feature parity across desktop, mobile, and browser platforms with offline-first support.

---

## Table of Contents

1. [Overview](#overview)
2. [Platform Feature Matrix](#platform-feature-matrix)
3. [API Consistency](#api-consistency)
4. [Offline-First Architecture](#offline-first-architecture)
5. [Platform-Specific Configuration](#platform-specific-configuration)
6. [Sync Strategies](#sync-strategies)
7. [Storage Quotas & Limits](#storage-quotas--limits)
8. [Testing Across Platforms](#testing-across-platforms)

---

## Overview

The SQL Storage Adapter is designed as a **platform-agnostic library/SDK** that provides identical APIs and abstractions across:

| Platform | Primary Adapter | Offline Support | Sync Support |
|----------|----------------|-----------------|--------------|
| **Desktop (Electron/Node)** | better-sqlite3 | ✅ Native | ✅ Full |
| **Browser (Web/PWA)** | IndexedDB | ✅ Native | ✅ Full |
| **Mobile (iOS/Android)** | Capacitor SQLite | ✅ Native | ✅ Full |
| **Cloud (Serverless)** | PostgreSQL | ❌ N/A | N/A (is remote) |

### Core Principles

1. **Same API everywhere**: Write once, run on any platform
2. **Offline-first by default**: Local storage is primary, cloud is secondary
3. **Automatic adapter selection**: Runtime detection picks the best adapter
4. **Graceful degradation**: Falls back to alternatives if preferred adapter unavailable

---

## Platform Feature Matrix

### Core Operations

| Feature | Desktop | Browser | Mobile | Cloud |
|---------|---------|---------|--------|-------|
| `createDatabase()` | ✅ | ✅ | ✅ | ✅ |
| `db.run()` | ✅ | ✅ | ✅ | ✅ |
| `db.get()` | ✅ | ✅ | ✅ | ✅ |
| `db.all()` | ✅ | ✅ | ✅ | ✅ |
| `db.exec()` | ✅ | ✅ | ✅ | ✅ |
| `db.transaction()` | ✅ | ✅ | ✅ | ✅ |
| `db.batch()` | ✅ | ✅ | ✅ | ✅ |
| `db.close()` | ✅ | ✅ | ✅ | ✅ |

### Advanced Features

| Feature | Desktop | Browser | Mobile | Cloud |
|---------|---------|---------|--------|-------|
| Prepared statements | ✅ | ✅ | ✅ | ✅ |
| WAL mode | ✅ | ❌ | ✅ | ✅ |
| Connection pooling | ❌ | ❌ | ❌ | ✅ |
| Encryption | ✅ | ❌ | ✅ | ✅ |
| JSON support | ✅ | ✅ | ✅ | ✅ |
| FTS (Full-Text Search) | ✅ | ✅ | ✅ | ✅ |

### Sync & Persistence

| Feature | Desktop | Browser | Mobile | Cloud |
|---------|---------|---------|--------|-------|
| Auto-persistence | ✅ | ✅ | ✅ | ✅ |
| Manual save | ✅ | ✅ | ✅ | N/A |
| Export/Import | ✅ | ✅ | ✅ | ✅ |
| Cloud backup | ✅ | ✅ | ✅ | N/A |
| Bi-directional sync | ✅ | ✅ | ✅ | N/A |

---

## API Consistency

### Unified Database Creation

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

// The same code works on ALL platforms
const db = await createDatabase();

// Platform-specific adapter is automatically selected
console.log(db.kind); // 'better-sqlite3' | 'indexeddb' | 'capacitor' | 'postgres'
```

### Unified CRUD Operations

```typescript
// These operations work identically across all platforms

// Create
await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert
const result = await db.run(
  'INSERT INTO users (name, email) VALUES (?, ?)',
  ['Alice', 'alice@example.com']
);
console.log(`Inserted user with ID: ${result.lastInsertRowid}`);

// Read single
const user = await db.get<User>(
  'SELECT * FROM users WHERE id = ?',
  [result.lastInsertRowid]
);

// Read multiple
const allUsers = await db.all<User>('SELECT * FROM users');

// Update
await db.run(
  'UPDATE users SET name = ? WHERE id = ?',
  ['Alice Smith', result.lastInsertRowid]
);

// Delete
await db.run('DELETE FROM users WHERE id = ?', [result.lastInsertRowid]);

// Transaction
await db.transaction(async (trx) => {
  await trx.run('INSERT INTO users (name) VALUES (?)', ['Bob']);
  await trx.run('INSERT INTO users (name) VALUES (?)', ['Charlie']);
});
```

### Unified Performance Configuration

```typescript
// Same performance config works everywhere
const db = await createDatabase({
  performance: {
    tier: 'balanced',
    cacheEnabled: true,
    cacheTtlMs: 5000,
    trackMetrics: true,
  }
});
```

### Unified Hooks

```typescript
// Same hooks work on all platforms
const hooks: StorageHooks = {
  onBeforeWrite: async (ctx) => {
    console.log(`[${db.kind}] Writing:`, ctx.statement);
    return ctx;
  },
  onAfterQuery: async (ctx, result) => {
    const duration = Date.now() - ctx.startTime;
    console.log(`[${db.kind}] Query took ${duration}ms`);
    return result;
  }
};

const db = await createDatabase({ hooks });
```

---

## Offline-First Architecture

### Default Behavior

By default, the adapter operates in offline-first mode:

```typescript
// Local-first: works without network
const db = await createDatabase();

// All operations go to local storage first
await db.run('INSERT INTO notes (content) VALUES (?)', ['My note']);

// Data is immediately available offline
const notes = await db.all('SELECT * FROM notes');
```

### Adding Cloud Sync

```typescript
import { createSyncManager } from '@framers/sql-storage-adapter';

const manager = await createSyncManager({
  // Primary: local storage (offline-first)
  primary: {
    file: './local.db',           // Desktop
    // OR priority: ['indexeddb'] // Browser
    // OR priority: ['capacitor'] // Mobile
  },
  
  // Remote: cloud database
  remote: {
    url: process.env.DATABASE_URL
  },
  
  // Sync configuration
  sync: {
    mode: 'periodic',           // Sync every interval
    interval: 30000,            // 30 seconds
    direction: 'bidirectional', // Two-way sync
    conflictStrategy: 'last-write-wins'
  },
  
  // Event handlers
  onOffline: () => console.log('Gone offline, using local data'),
  onOnline: () => console.log('Back online, syncing...'),
  onSync: (result) => console.log(`Synced ${result.recordsSynced} records`)
});

// Use like normal database - it's offline-first
const db = manager.db;
await db.run('INSERT INTO notes (content) VALUES (?)', ['Works offline!']);

// Manually trigger sync when needed
await manager.sync();
```

### Offline Queue Pattern

For critical operations that must reach the server:

```typescript
import { createDatabase, type StorageHooks } from '@framers/sql-storage-adapter';

// Queue table for pending operations
await db.exec(`
  CREATE TABLE IF NOT EXISTS _sync_queue (
    id INTEGER PRIMARY KEY,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    retry_count INTEGER DEFAULT 0
  )
`);

// Hook to queue writes when offline
const offlineQueueHooks: StorageHooks = {
  onBeforeWrite: async (ctx) => {
    const isOnline = navigator.onLine;
    const isCriticalTable = ctx.affectedTables?.some(t => 
      ['orders', 'payments'].includes(t)
    );
    
    if (!isOnline && isCriticalTable) {
      // Queue for later sync
      await db.run(
        'INSERT INTO _sync_queue (operation, payload) VALUES (?, ?)',
        [ctx.operation, JSON.stringify({ statement: ctx.statement, params: ctx.parameters })]
      );
      ctx.metadata = { ...ctx.metadata, queued: true };
    }
    
    return ctx;
  }
};
```

---

## Platform-Specific Configuration

### Desktop (Electron/Node.js)

```typescript
const desktopDb = await createDatabase({
  priority: ['better-sqlite3', 'sqljs'],
  file: './data/app.db',
  performance: {
    tier: 'balanced',
    // Desktop has more resources
    cacheMaxEntries: 2000,
    trackMetrics: true,
  }
});

// Desktop-specific: Enable WAL mode for concurrency
await desktopDb.exec('PRAGMA journal_mode = WAL');
await desktopDb.exec('PRAGMA synchronous = NORMAL');
```

### Browser (Web/PWA)

```typescript
const browserDb = await createDatabase({
  priority: ['indexeddb', 'sqljs'],
  indexedDb: {
    dbName: 'my-app-db',
    storeName: 'sqliteDb',
    autoSave: true,
    saveIntervalMs: 2000,  // Save every 2 seconds
  },
  performance: {
    tier: 'balanced',
    // Browser has limited memory
    cacheMaxEntries: 500,
  }
});
```

### Mobile (Capacitor)

```typescript
const mobileDb = await createDatabase({
  priority: ['capacitor', 'indexeddb'],
  mobile: {
    dbName: 'app-db',
    encrypted: true,
    encryptionKey: await getSecureKey(),
    mode: 'encryption',
  },
  performance: {
    tier: 'efficient',  // Battery optimization
    batchWrites: true,
    batchFlushIntervalMs: 1000,
    trackMetrics: false, // Save CPU
  }
});
```

### Cloud (PostgreSQL)

```typescript
const cloudDb = await createDatabase({
  postgres: {
    connectionString: process.env.DATABASE_URL,
    max: 20,                    // Pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false }
  },
  performance: {
    tier: 'accurate',
    retryOnError: true,
    maxRetries: 5,
  }
});
```

---

## Sync Strategies

### Strategy Comparison

| Strategy | Use Case | Data Loss Risk | Battery Impact |
|----------|----------|----------------|----------------|
| `manual` | User-triggered | Low (user controls) | Low |
| `periodic` | Background sync | Medium (interval gap) | Medium |
| `auto` | Real-time apps | Low (debounced) | High |
| `on-reconnect` | Offline-heavy | Medium | Low |
| `realtime` | Collaborative | Very Low | Very High |

### Manual Sync (Default)

```typescript
const manager = await createSyncManager({
  primary: './local.db',
  remote: process.env.DATABASE_URL,
  sync: { mode: 'manual' }
});

// User triggers sync via button
document.getElementById('syncBtn').onclick = async () => {
  const result = await manager.sync();
  console.log(`Synced ${result.recordsSynced} records`);
};
```

### Periodic Sync

```typescript
const manager = await createSyncManager({
  primary: './local.db',
  remote: process.env.DATABASE_URL,
  sync: {
    mode: 'periodic',
    interval: 60000, // Every minute
  }
});
```

### Reconnect Sync (Mobile-Optimized)

```typescript
const manager = await createSyncManager({
  primary: { priority: ['capacitor'] },
  remote: process.env.DATABASE_URL,
  sync: {
    mode: 'on-reconnect',
    // Only sync critical tables immediately
    tables: {
      orders: { priority: 'critical', realtime: true },
      products: { priority: 'high' },
      analytics: { priority: 'low', skip: true }
    }
  }
});
```

---

## Storage Quotas & Limits

### Platform Limits

| Platform | Storage Limit | Notes |
|----------|---------------|-------|
| Desktop | Disk space | Effectively unlimited |
| Browser (Chrome) | ~80% of disk | Evicted under pressure |
| Browser (Safari) | 1GB (persistent) | Requires user permission |
| Browser (Firefox) | ~50% of disk | 2GB limit per origin |
| iOS (Capacitor) | Unlimited | Backed up to iCloud |
| Android (Capacitor) | Unlimited | Can be cleared by user |

### Handling Storage Limits

```typescript
const manager = await createSyncManager({
  primary: { priority: ['indexeddb'] },
  remote: process.env.DATABASE_URL,
  sync: {
    mode: 'periodic',
    // Mobile storage management
    mobileStorageLimit: 100, // MB
    storageLimitAction: 'prune', // Auto-delete old data
    tables: {
      users: { maxRecords: 1000 },
      logs: { maxRecords: 500, priority: 'low' },
      cache: { skip: true } // Don't sync cache table
    }
  }
});
```

### Checking Available Storage

```typescript
// Browser: Check storage estimate
if (navigator.storage && navigator.storage.estimate) {
  const estimate = await navigator.storage.estimate();
  const usedMB = (estimate.usage ?? 0) / (1024 * 1024);
  const quotaMB = (estimate.quota ?? 0) / (1024 * 1024);
  console.log(`Storage: ${usedMB.toFixed(1)}MB / ${quotaMB.toFixed(1)}MB`);
  
  if (usedMB / quotaMB > 0.8) {
    console.warn('Storage nearly full, consider pruning');
  }
}
```

---

## Testing Across Platforms

### Unit Tests (Vitest)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase, type StorageAdapter } from '@framers/sql-storage-adapter';

describe('Cross-platform operations', () => {
  let db: StorageAdapter;
  
  beforeEach(async () => {
    // Use memory adapter for fast tests
    db = await createDatabase({ type: 'memory' });
    await db.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)
    `);
  });
  
  afterEach(async () => {
    await db.close();
  });
  
  it('should insert and retrieve', async () => {
    const result = await db.run('INSERT INTO users (name) VALUES (?)', ['Alice']);
    expect(result.lastInsertRowid).toBeDefined();
    
    const user = await db.get('SELECT * FROM users WHERE id = ?', [result.lastInsertRowid]);
    expect(user).toMatchObject({ name: 'Alice' });
  });
  
  it('should handle transactions', async () => {
    await db.transaction(async (trx) => {
      await trx.run('INSERT INTO users (name) VALUES (?)', ['Bob']);
      await trx.run('INSERT INTO users (name) VALUES (?)', ['Charlie']);
    });
    
    const users = await db.all('SELECT * FROM users');
    expect(users).toHaveLength(2);
  });
});
```

### Integration Tests by Platform

```typescript
// Desktop test
describe('Desktop (better-sqlite3)', () => {
  it('should use native adapter', async () => {
    const db = await createDatabase({ priority: ['better-sqlite3'] });
    expect(db.kind).toBe('better-sqlite3');
    await db.close();
  });
});

// Browser test (run in browser environment)
describe('Browser (IndexedDB)', () => {
  it('should persist across page reloads', async () => {
    const db = await createDatabase({ priority: ['indexeddb'] });
    await db.run('INSERT INTO users (name) VALUES (?)', ['Test']);
    
    // Simulate page reload by closing and reopening
    await db.close();
    
    const db2 = await createDatabase({ priority: ['indexeddb'] });
    const user = await db2.get('SELECT * FROM users WHERE name = ?', ['Test']);
    expect(user).toBeDefined();
    await db2.close();
  });
});
```

### E2E Tests with Playwright

```typescript
import { test, expect } from '@playwright/test';

test('offline functionality', async ({ page, context }) => {
  await page.goto('/app');
  
  // Go offline
  await context.setOffline(true);
  
  // Should still work
  await page.click('[data-testid="add-note"]');
  await page.fill('[data-testid="note-input"]', 'Offline note');
  await page.click('[data-testid="save"]');
  
  // Verify saved locally
  const note = await page.locator('[data-testid="note-item"]');
  await expect(note).toContainText('Offline note');
  
  // Go online
  await context.setOffline(false);
  
  // Verify sync happens
  await expect(page.locator('[data-testid="sync-status"]')).toContainText('Synced');
});
```

---

## Summary

The SQL Storage Adapter provides **complete feature parity** across platforms with:

1. **Identical APIs**: Same code works everywhere
2. **Offline-first**: Local storage is always primary
3. **Automatic detection**: Best adapter chosen at runtime
4. **Configurable sync**: Multiple strategies for different needs
5. **Storage management**: Handle quotas gracefully

For detailed implementation, see:
- [OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md) - Performance tuning
- [PLATFORM_STRATEGY.md](../PLATFORM_STRATEGY.md) - Platform-specific details
- [API Documentation](../docs/api/) - Complete API reference

---

<p align="center">
  Built and maintained by <a href="https://frame.dev" target="_blank" rel="noopener"><strong>Frame.dev</strong></a>
</p>



