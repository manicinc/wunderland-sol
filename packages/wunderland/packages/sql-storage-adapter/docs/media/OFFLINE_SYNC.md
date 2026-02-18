# Offline Sync Guide

Complete guide to building offline-first and online-first applications with automatic cloud synchronization.

## Table of Contents

- [Quick Start](#quick-start)
- [Use Cases](#use-cases)
- [Sync Modes](#sync-modes)
- [Conflict Resolution](#conflict-resolution)
- [Mobile Optimization](#mobile-optimization)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Online-First with Automatic Fallback

Perfect for cloud apps that need offline resilience:

```typescript
import { createSyncManager } from '@framers/sql-storage-adapter';

const manager = await createSyncManager({
  primary: {
    url: process.env.DATABASE_URL,  // Try cloud first
    fallback: './offline.db'         // Fall back to local if cloud fails
  },
  sync: {
    mode: 'periodic',    // Auto-sync every interval
    interval: 30000      // 30 seconds
  }
});

// Use like normal database - syncs automatically
await manager.db.run('INSERT INTO tasks (title) VALUES (?)', ['Buy milk']);
```

### Offline-First with Cloud Sync

Perfect for mobile apps, PWAs, desktop apps:

```typescript
const manager = await createSyncManager({
  primary: './local.db',                    // Work locally
  remote: process.env.DATABASE_URL,         // Sync to cloud when available
  sync: {
    mode: 'manual',                         // Manual control (DEFAULT)
    conflictStrategy: 'last-write-wins'     // Simple conflict resolution (DEFAULT)
  }
});

// Work completely offline
await manager.db.run('INSERT INTO notes (content) VALUES (?)', ['Meeting notes']);

// Sync when ready (e.g., on WiFi)
const result = await manager.sync();
console.log(`Synced ${result.recordsSynced} records in ${result.duration}ms`);
```

### Both Databases Available (Universal)

Use the same code for any pattern:

```typescript
const manager = await createSyncManager({
  primary: './local.db',          // Local database
  remote: DATABASE_URL,            // Remote database
  sync: { mode: 'manual' }
});

// Decide sync strategy at runtime
if (isOnWiFi) {
  await manager.sync();  // Full bidirectional sync
}
```

## Use Cases

### 1. Mobile App with Cloud Backup

**Requirements:**
- Work completely offline
- Sync to cloud when WiFi available
- Minimize mobile data usage
- Handle storage limits

**Solution:**
```typescript
const manager = await createSyncManager({
  primary: './app.db',
  remote: CLOUD_URL,
  sync: {
    mode: 'manual',                          // User controls when to sync
    direction: 'bidirectional',              // Two-way sync
    mobileStorageLimit: 50,                  // 50MB limit
    storageLimitAction: 'warn',              // Warn but continue
    tables: {
      'messages': { 
        priority: 'critical',                // Sync messages first
        maxRecords: 1000                     // Keep only 1000 messages locally
      },
      'attachments': { 
        priority: 'low',                     // Sync attachments last
        skip: !isOnWiFi                      // Skip on cellular
      }
    }
  },
  onProgress: (progress) => {
    updateUI(`${progress.percent}% - ${progress.currentTable}`);
  }
});

// Sync only on WiFi
if (isOnWiFi) {
  await manager.sync();
}
```

### 2. Web App with Offline Mode (PWA)

**Requirements:**
- Work online normally
- Continue working if connection drops
- Sync changes when reconnected

**Solution:**
```typescript
const manager = await createSyncManager({
  primary: {
    url: DATABASE_URL,
    fallback: './offline.db'                 // IndexedDB in browser
  },
  sync: {
    mode: 'on-reconnect',                    // Sync when network returns
    conflictStrategy: 'last-write-wins'
  },
  onOffline: () => {
    showBanner('Working offline - changes will sync when reconnected');
  },
  onOnline: () => {
    showBanner('Back online - syncing changes');
  }
});

// Database automatically switches between online/offline
await manager.db.run('INSERT INTO ...');
```

### 3. Desktop App with Cloud Sync

**Requirements:**
- Fast local performance
- Cloud backup for disaster recovery
- Sync across multiple devices

**Solution:**
```typescript
const manager = await createSyncManager({
  primary: './local.db',
  remote: CLOUD_URL,
  sync: {
    mode: 'periodic',                        // Auto-sync in background
    interval: 60000,                         // Every minute
    direction: 'bidirectional'               // Sync both ways
  }
});

// Work at local speed, syncs automatically
await manager.db.run('INSERT INTO documents ...');
```

### 4. Real-Time Collaboration with Offline Support

**Requirements:**
- Multiple users editing same data
- Work offline, sync when online
- Handle conflicts gracefully

**Solution:**
```typescript
const manager = await createSyncManager({
  primary: './local.db',
  remote: CLOUD_URL,
  sync: {
    mode: 'auto',                            // Sync on every write
    debounce: 500,                           // Wait 500ms for batching
    conflictStrategy: 'last-write-wins',     // Simple resolution
    tables: {
      'documents': {
        realtime: true,                      // Force immediate sync
        conflictStrategy: 'keep-both',       // Keep both versions
      }
    }
  },
  onConflict: async (conflict) => {
    // Show UI for manual resolution
    await askUserToResolve(conflict);
  }
});
```

### 5. Sync-Only Backup (Push-Only)

**Requirements:**
- Backup local data to cloud
- Never download from cloud
- One-way sync

**Solution:**
```typescript
const manager = await createSyncManager({
  primary: './main.db',
  remote: BACKUP_URL,
  sync: {
    mode: 'periodic',
    interval: 300000,                        // Every 5 minutes
    direction: 'push-only'                   // Only upload
  }
});

// Changes only flow local → cloud
await manager.db.run('INSERT INTO backups ...');
```

### 6. Cloud Data Reader (Pull-Only)

**Requirements:**
- Download data from cloud
- Use locally for fast reads
- Never upload changes

**Solution:**
```typescript
const manager = await createSyncManager({
  primary: './cache.db',
  remote: CLOUD_URL,
  sync: {
    mode: 'periodic',
    interval: 600000,                        // Every 10 minutes
    direction: 'pull-only'                   // Only download
  }
});

// Read from fast local cache
const users = await manager.db.all('SELECT * FROM users');
```

## Sync Modes

### `manual` (DEFAULT)

**When to use:**
- You want full control over when sync occurs
- Mobile apps (sync on WiFi only)
- Batch operations
- Testing

**Example:**
```typescript
const manager = await createSyncManager({
  primary: './local.db',
  remote: CLOUD_URL,
  sync: { mode: 'manual' }
});

// Explicit sync calls
await manager.sync();  // Returns SyncResult
```

### `auto`

**When to use:**
- Real-time collaboration
- Multi-device sync
- User expects immediate cloud backup

**How it works:**
- Debounced sync after writes
- Batches multiple writes together
- Default 500ms debounce delay

**Example:**
```typescript
const manager = await createSyncManager({
  primary: './local.db',
  remote: CLOUD_URL,
  sync: {
    mode: 'auto',
    debounce: 1000  // Wait 1s before syncing
  }
});

// Syncs automatically after writes
await manager.db.run('INSERT INTO ...');  // Triggers sync after 1s
await manager.db.run('INSERT INTO ...');  // Batched with previous
```

### `periodic`

**When to use:**
- Background sync
- Consistent sync schedule
- Reduced network usage

**Example:**
```typescript
const manager = await createSyncManager({
  primary: './local.db',
  remote: CLOUD_URL,
  sync: {
    mode: 'periodic',
    interval: 60000  // Every 60 seconds
  }
});

// Syncs automatically every minute
```

### `realtime`

**When to use:**
- Critical data that must sync immediately
- Real-time dashboards
- Live collaboration

**Warning:** Expensive! Every write triggers a sync.

**Example:**
```typescript
const manager = await createSyncManager({
  primary: './local.db',
  remote: CLOUD_URL,
  sync: {
    mode: 'realtime'  // Syncs on EVERY write
  }
});

// Each write triggers immediate sync
await manager.db.run('INSERT INTO ...');  // Syncs now
```

### `on-reconnect`

**When to use:**
- Unreliable network
- Want sync only when connection restored
- PWAs, mobile apps

**Example:**
```typescript
const manager = await createSyncManager({
  primary: {
    url: CLOUD_URL,
    fallback: './offline.db'
  },
  sync: {
    mode: 'on-reconnect'  // Syncs when network comes back
  },
  onOnline: () => console.log('Syncing...')
});
```

## Conflict Resolution

### `last-write-wins` (DEFAULT)

**How it works:**
- Compares `updated_at` or `created_at` timestamps
- Newest record wins
- Overwrites older record

**Pros:**
- Simple, predictable
- No user intervention needed
- Works for most cases

**Cons:**
- Can lose data if clocks are wrong
- No merge of changes

**Example:**
```typescript
const manager = await createSyncManager({
  primary: './local.db',
  remote: CLOUD_URL,
  sync: {
    conflictStrategy: 'last-write-wins'  // DEFAULT
  }
});

// Local:  { id: 1, name: 'Alice', updated_at: '2025-11-02T10:00:00Z' }
// Remote: { id: 1, name: 'Bob',   updated_at: '2025-11-02T10:05:00Z' }
// Result: Remote wins (newer timestamp)
```

### `local-wins`

**How it works:**
- Local changes always take priority
- Remote changes discarded on conflict

**When to use:**
- Offline-first apps where local is source of truth
- Single-user apps with cloud backup

**Example:**
```typescript
const manager = await createSyncManager({
  primary: './local.db',
  remote: CLOUD_URL,
  sync: {
    conflictStrategy: 'local-wins'
  }
});

// Local changes always win
```

### `remote-wins`

**How it works:**
- Remote (server) is source of truth
- Local changes discarded on conflict

**When to use:**
- Cloud-first apps
- Server has authoritative data
- Read-only local cache

**Example:**
```typescript
const manager = await createSyncManager({
  primary: './local.db',
  remote: CLOUD_URL,
  sync: {
    conflictStrategy: 'remote-wins'
  }
});

// Server always wins
```

### `merge`

**How it works:**
- Calls custom merge function
- You decide how to combine changes

**When to use:**
- Complex data structures
- Need field-level merging
- Application-specific logic

**Example:**
```typescript
const manager = await createSyncManager({
  primary: './local.db',
  remote: CLOUD_URL,
  sync: {
    tables: {
      'documents': {
        conflictStrategy: 'merge',
        mergeFn: (local, remote) => ({
          ...remote,                    // Start with remote
          title: local.title,           // Keep local title
          content: local.content,       // Keep local content
          tags: [...new Set([           // Merge tags
            ...local.tags,
            ...remote.tags
          ])]
        })
      }
    }
  }
});
```

### `keep-both`

**How it works:**
- Creates duplicate records
- Both versions preserved
- Manual resolution needed

**When to use:**
- Can't lose either version
- User needs to decide
- Audit trail required

**Example:**
```typescript
const manager = await createSyncManager({
  primary: './local.db',
  remote: CLOUD_URL,
  sync: {
    conflictStrategy: 'keep-both'
  },
  onConflict: async (conflict) => {
    // Show both versions to user
    await showConflictUI({
      local: conflict.local,
      remote: conflict.remote
    });
  }
});
```

## Mobile Optimization

### Storage Limits

Mobile devices have limited storage. Configure limits:

```typescript
const manager = await createSyncManager({
  primary: './mobile.db',
  remote: CLOUD_URL,
  sync: {
    mobileStorageLimit: 50,           // 50MB limit
    storageLimitAction: 'warn',       // warn | error | prune
    tables: {
      'messages': {
        maxRecords: 1000               // Keep latest 1000 messages
      },
      'images': {
        skip: true                     // Don't sync images to mobile
      }
    }
  }
});
```

### Storage Limit Actions

#### `warn` (DEFAULT)

Logs warning, continues syncing:

```typescript
sync: {
  storageLimitAction: 'warn'  // DEFAULT
}

// Logs: "[SyncManager] Warning: Storage limit exceeded (52MB / 50MB)"
// Continues syncing
```

#### `error`

Throws error, stops sync:

```typescript
sync: {
  storageLimitAction: 'error'
}

// Throws: Error: Storage limit exceeded
// Sync fails, must handle error
```

#### `prune`

Auto-deletes old data:

```typescript
sync: {
  storageLimitAction: 'prune'  // Auto-cleanup
}

// Automatically deletes oldest records to stay under limit
```

### Selective Sync

Sync only what you need:

```typescript
const manager = await createSyncManager({
  primary: './mobile.db',
  remote: CLOUD_URL,
  sync: {
    // Include only specific tables
    includeTables: ['messages', 'contacts'],
    
    // OR exclude specific tables
    excludeTables: ['audit_logs', 'temp_data'],
    
    // Per-table config
    tables: {
      'attachments': {
        skip: !isOnWiFi              // Skip on cellular
      },
      'messages': {
        priority: 'critical',         // Sync first
        maxRecords: 500               // Limit local storage
      }
    }
  }
});
```

### Network-Aware Sync

```typescript
const manager = await createSyncManager({
  primary: './mobile.db',
  remote: CLOUD_URL,
  sync: { mode: 'manual' }
});

// Sync based on network type
const connection = navigator.connection;

if (connection.effectiveType === 'wifi') {
  // Full sync on WiFi
  await manager.sync();
} else if (connection.effectiveType === '4g') {
  // Partial sync on 4G
  manager.config.tables = {
    'attachments': { skip: true }  // Skip large files
  };
  await manager.sync();
} else {
  // No sync on 3G/2G
  console.log('Waiting for better connection');
}
```

## Best Practices

### 1. Use Timestamps

Always include timestamps for conflict resolution:

```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Update trigger for updated_at
CREATE TRIGGER tasks_updated_at
AFTER UPDATE ON tasks
BEGIN
  UPDATE tasks SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;
```

### 2. Monitor Sync Status

Track sync progress:

```typescript
const manager = await createSyncManager({
  primary: './local.db',
  remote: CLOUD_URL,
  sync: { mode: 'periodic', interval: 60000 },
  
  onSync: (result) => {
    console.log(`✓ Synced ${result.recordsSynced} records`);
    updateSyncBadge(result.timestamp);
  },
  
  onError: (error) => {
    console.error('Sync failed:', error);
    showErrorBanner(error.message);
  },
  
  onProgress: (progress) => {
    updateProgressBar(progress.percent);
  },
  
  onOffline: () => {
    showOfflineBanner();
  },
  
  onOnline: () => {
    hideOfflineBanner();
  }
});
```

### 3. Handle Errors Gracefully

```typescript
try {
  const result = await manager.sync();
  
  if (!result.success) {
    console.warn('Sync completed with errors:', result.errors);
    // Show which tables failed
    result.errors?.forEach(err => {
      showError(`Failed to sync: ${err.message}`);
    });
  }
} catch (error) {
  console.error('Sync failed completely:', error);
  // Retry logic
  setTimeout(() => manager.sync(), 5000);
}
```

### 4. Prioritize Critical Data

```typescript
const manager = await createSyncManager({
  primary: './local.db',
  remote: CLOUD_URL,
  sync: {
    tables: {
      // Critical: Sync immediately, realtime
      'transactions': {
        priority: 'critical',
        realtime: true
      },
      
      // High: Sync first in batch
      'messages': {
        priority: 'high'
      },
      
      // Medium: Normal sync
      'contacts': {
        priority: 'medium'
      },
      
      // Low: Sync last
      'logs': {
        priority: 'low'
      }
    }
  }
});
```

### 5. Test Offline Scenarios

```typescript
// Simulate offline
const manager = await createSyncManager({
  primary: './local.db',
  remote: null,  // No remote = offline mode
  sync: { mode: 'manual' }
});

// Work offline
await manager.db.run('INSERT INTO ...');

// Later: Add remote and sync
manager.remoteDb = await connectDatabase(CLOUD_URL);
await manager.sync();
```

### 6. Clean Up Resources

```typescript
// Stop timers, close connections
await manager.close();
```

## API Reference

### `createSyncManager(config)`

Creates sync manager instance.

**Parameters:**
- `config.primary` - Primary database (writes go here)
  - `string`: File path or URL
  - `{ url, fallback }`: URL with fallback
  - `{ file, postgres }`: Detailed config
  
- `config.remote` - Optional remote database for sync
  - `string`: URL
  - `{ url, postgres }`: Detailed config
  
- `config.sync` - Sync configuration
  - `mode`: `'manual'` (default) | `'auto'` | `'periodic'` | `'realtime'` | `'on-reconnect'`
  - `direction`: `'bidirectional'` | `'push-only'` | `'pull-only'`
  - `conflictStrategy`: `'last-write-wins'` (default) | `'local-wins'` | `'remote-wins'` | `'merge'` | `'keep-both'`
  - `interval`: Milliseconds for periodic sync (default: 30000)
  - `debounce`: Milliseconds for auto sync (default: 500)
  - `batchSize`: Records per batch (default: 100)
  - `retryOnError`: Auto-retry failed syncs (default: true)
  - `maxRetries`: Max retry attempts (default: 3)
  - `tables`: Per-table configuration
  - `mobileStorageLimit`: Limit in MB (default: 50)
  - `storageLimitAction`: `'warn'` (default) | `'error'` | `'prune'`

**Returns:** `Promise<SyncManager>`

### `manager.sync()`

Manually trigger sync. Safe to call multiple times (queues requests).

**Returns:** `Promise<SyncResult>`

```typescript
interface SyncResult {
  success: boolean;
  direction: SyncDirection;
  recordsSynced: number;
  conflicts: number;
  duration: number;
  timestamp: string;
  tables: string[];
  errors?: Error[];
  details?: Record<string, {
    pushed: number;
    pulled: number;
    conflicts: number;
  }>;
}
```

### `manager.db`

Access to primary database adapter. Use for all database operations:

```typescript
await manager.db.run('INSERT INTO ...');
const rows = await manager.db.all('SELECT * FROM ...');
```

### `manager.stop()`

Stop automatic sync timers:

```typescript
manager.stop();
```

### `manager.close()`

Stop sync and close all connections:

```typescript
await manager.close();
```

### Properties

- `manager.syncing`: Currently syncing (boolean)
- `manager.online`: Currently online (boolean)
- `manager.lastSync`: Last successful sync time (Date | null)

## Troubleshooting

### Sync Not Happening

**Check sync mode:**
```typescript
// manual mode requires explicit sync() call
if (manager.config.mode === 'manual') {
  await manager.sync();
}
```

### Conflicts Not Resolving

**Ensure timestamps exist:**
```sql
-- Add timestamps if missing
ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
```

### Storage Limit Errors on Mobile

**Reduce local data:**
```typescript
sync: {
  tables: {
    'large_table': {
      maxRecords: 500  // Limit local records
    }
  }
}
```

### Network Errors

**Add retry logic:**
```typescript
sync: {
  retryOnError: true,
  maxRetries: 5,
  retryDelay: 2000
}
```

### Database Not Syncing

**Check connection:**
```typescript
if (!manager.online) {
  console.log('Offline - sync when reconnected');
}
```

### Slow Sync Performance

**Reduce batch size:**
```typescript
sync: {
  batchSize: 50  // Smaller batches
}
```

**Or sync fewer tables:**
```typescript
sync: {
  includeTables: ['critical_table']
}
```

## Examples

See `examples/offline-sync.ts` for complete working examples.

---

**Next Steps:**
- Read [API Reference](../README.md#api-reference)
- See [Remote PostgreSQL Guide](./POSTGRES_REMOTE_CONNECTION.md)
- Check [SQLite vs PostgreSQL](../SQLITE_VS_POSTGRES.md) comparison
