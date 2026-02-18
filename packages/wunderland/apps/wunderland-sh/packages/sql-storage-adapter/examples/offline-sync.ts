/**
 * Offline Sync Examples
 * 
 * Real-world examples of using SyncManager for various patterns.
 */

import { createSyncManager } from '../src/features/sync/syncManager';

// cspell:ignore AUTOINCREMENT collab prefs

type PlainObject = Record<string, unknown>;

const isPlainObject = (value: unknown): value is PlainObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normaliseSettings = (value: unknown): PlainObject => {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (isPlainObject(parsed)) {
        return { ...parsed };
      }
    } catch (error) {
      console.warn('[Sync Examples] Failed to parse settings JSON.', error);
    }
    return {};
  }

  if (isPlainObject(value)) {
    return { ...value };
  }

  return {};
};

const getStringField = (source: PlainObject, key: string): string | undefined => {
  const value = source[key];
  return typeof value === 'string' ? value : undefined;
};

interface ProfileMergeRecord {
  raw: PlainObject;
  display_name?: string;
  avatar?: string;
  bio?: string;
  settings: PlainObject;
}

const toProfileMergeRecord = (value: unknown): ProfileMergeRecord => {
  if (!isPlainObject(value)) {
    return { raw: {}, settings: {} };
  }

  return {
    raw: value,
    display_name: getStringField(value, 'display_name'),
    avatar: getStringField(value, 'avatar'),
    bio: getStringField(value, 'bio'),
    settings: normaliseSettings(value['settings']),
  };
};

const selectBooleanPreference = (
  primary: PlainObject,
  fallback: PlainObject,
  key: string,
): boolean | undefined => {
  const primaryValue = primary[key];
  if (typeof primaryValue === 'boolean') {
    return primaryValue;
  }

  const fallbackValue = fallback[key];
  return typeof fallbackValue === 'boolean' ? fallbackValue : undefined;
};

// =============================================================================
// Example 1: Mobile App with WiFi-Only Sync
// =============================================================================

async function mobileAppExample() {
  console.log('\n📱 Mobile App Example\n');

  const manager = await createSyncManager({
    primary: './mobile-app.db',
    remote: process.env.DATABASE_URL,
    sync: {
      mode: 'manual',                        // User controls sync
      conflictStrategy: 'last-write-wins',
      mobileStorageLimit: 50,                // 50MB limit
      storageLimitAction: 'warn',            // Warn but continue
      tables: {
        'messages': {
          priority: 'critical',              // Sync first
          maxRecords: 1000                   // Keep 1000 messages
        },
        'attachments': {
          priority: 'low',                   // Sync last
          skip: true                         // Skip on cellular
        }
      }
    },
    onProgress: (progress) => {
      console.log(`  ${progress.percent}% - ${progress.currentTable}`);
    }
  });

  // Work offline
  await manager.db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await manager.db.run(
    'INSERT INTO messages (content) VALUES (?)',
    ['Message sent while offline']
  );

  console.log('  ✓ Message saved locally');

  // Sync only on WiFi
  const isOnWiFi = true; // Check actual network type
  if (isOnWiFi) {
    console.log('  📡 WiFi detected - syncing...');
    const result = await manager.sync();
    console.log(`  ✓ Synced ${result.recordsSynced} records in ${result.duration}ms`);
  }

  await manager.close();
}

// =============================================================================
// Example 2: PWA with Online/Offline Automatic Switching
// =============================================================================

async function pwaExample() {
  console.log('\n🌐 PWA Example\n');

  const manager = await createSyncManager({
    primary: {
      url: process.env.DATABASE_URL,
      fallback: './pwa-offline.db'           // Auto-fallback
    },
    sync: {
      mode: 'on-reconnect',                  // Sync when online
      conflictStrategy: 'last-write-wins'
    },
    onOffline: () => {
      console.log('  📴 Working offline - changes will sync when reconnected');
    },
    onOnline: () => {
      console.log('  📶 Back online - syncing changes');
    },
    onSync: (result) => {
      console.log(`  ✓ Synced: ${result.recordsSynced} records`);
    }
  });

  // Work normally - manager handles online/offline automatically
  await manager.db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await manager.db.run('INSERT INTO tasks (title) VALUES (?)', ['Buy groceries']);
  console.log('  ✓ Task saved (syncs automatically when online)');

  await manager.close();
}

// =============================================================================
// Example 3: Desktop App with Periodic Background Sync
// =============================================================================

async function desktopAppExample() {
  console.log('\n💻 Desktop App Example\n');

  const manager = await createSyncManager({
    primary: './desktop-local.db',
    remote: process.env.DATABASE_URL,
    sync: {
      mode: 'periodic',                      // Auto-sync in background
      interval: 60000,                       // Every minute
      direction: 'bidirectional'
    },
    onSync: (result) => {
      console.log(`  🔄 Background sync: ${result.recordsSynced} records`);
    }
  });

  // Create tables
  await manager.db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Work at local speed - syncs automatically every minute
  await manager.db.run(
    'INSERT INTO documents (title, content) VALUES (?, ?)',
    ['My Document', 'Document content here']
  );

  console.log('  ✓ Document saved locally');
  console.log('  ⏱️  Will sync automatically in 60s...');

  // Simulate waiting
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await manager.close();
}

// =============================================================================
// Example 4: Real-Time Collaboration with Conflict Handling
// =============================================================================

async function collaborationExample() {
  console.log('\n👥 Collaboration Example\n');

  const manager = await createSyncManager({
    primary: './collab-local.db',
    remote: process.env.DATABASE_URL,
    sync: {
      mode: 'auto',                          // Sync on writes
      debounce: 500,                         // Batch writes for 500ms
      conflictStrategy: 'keep-both',         // Keep both versions
      tables: {
        'shared_docs': {
          realtime: true,                    // Force immediate sync
          conflictStrategy: 'keep-both'
        }
      }
    },
    onConflict: (conflict) => {
      console.log(`  ⚠️  Conflict in ${conflict.table}:`);
      console.log(`      Local:  ${JSON.stringify(conflict.local)}`);
      console.log(`      Remote: ${JSON.stringify(conflict.remote)}`);
    }
  });

  await manager.db.run(`
    CREATE TABLE IF NOT EXISTS shared_docs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      author TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // User A edits
  await manager.db.run(
    'INSERT INTO shared_docs (title, content, author) VALUES (?, ?, ?)',
    ['Shared Document', 'Content from User A', 'Alice']
  );

  console.log('  ✓ Document created by Alice');
  console.log('  🔄 Auto-syncing after 500ms...');

  await manager.close();
}

// =============================================================================
// Example 5: Backup-Only (Push-Only Sync)
// =============================================================================

async function backupExample() {
  console.log('\n💾 Backup Example\n');

  const manager = await createSyncManager({
    primary: './main-database.db',
    remote: process.env.BACKUP_URL,          // Separate backup database
    sync: {
      mode: 'periodic',
      interval: 300000,                      // Every 5 minutes
      direction: 'push-only'                 // Only upload to backup
    },
    onSync: (result) => {
      console.log(`  ✓ Backup complete: ${result.recordsSynced} records`);
    }
  });

  await manager.db.run(`
    CREATE TABLE IF NOT EXISTS important_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await manager.db.run(
    'INSERT INTO important_data (data) VALUES (?)',
    ['Critical data that must be backed up']
  );

  console.log('  ✓ Data saved locally');
  console.log('  💾 Backing up to cloud every 5 minutes...');

  await manager.close();
}

// =============================================================================
// Example 6: Custom Conflict Resolution (Merge Strategy)
// =============================================================================

async function customMergeExample() {
  console.log('\n🔀 Custom Merge Example\n');

  const manager = await createSyncManager({
    primary: './merge-local.db',
    remote: process.env.DATABASE_URL,
    sync: {
      mode: 'manual',
      tables: {
        'user_profiles': {
          conflictStrategy: 'merge',
          mergeFn: (local, remote) => {
            console.log('  🔀 Merging profiles...');
            const localProfile = toProfileMergeRecord(local);
            const remoteProfile = toProfileMergeRecord(remote);
            const mergedSettings = {
              ...remoteProfile.settings,
              ...localProfile.settings,
            } as PlainObject;

            const notificationPreference = selectBooleanPreference(
              localProfile.settings,
              remoteProfile.settings,
              'notifications',
            );

            if (typeof notificationPreference === 'boolean') {
              mergedSettings.notifications = notificationPreference;
            }

            return {
              ...remoteProfile.raw,          // Start with remote record
              display_name: localProfile.display_name ?? remoteProfile.display_name ?? null,
              avatar: localProfile.avatar ?? remoteProfile.avatar ?? null,
              bio: remoteProfile.bio ?? localProfile.bio ?? null,
              settings: mergedSettings,
            };
          }
        }
      }
    }
  });

  await manager.db.run(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_name TEXT,
      avatar TEXT,
      bio TEXT,
      settings TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await manager.db.run(
    'INSERT INTO user_profiles (display_name, avatar, bio, settings) VALUES (?, ?, ?, ?)',
    [
      'Alice',
      '/avatars/alice.jpg',
      'Software developer',
      JSON.stringify({ theme: 'dark', notifications: true })
    ]
  );

  console.log('  ✓ Profile saved with custom merge strategy');

  await manager.close();
}

// =============================================================================
// Example 7: Network-Aware Sync (Mobile Data Optimization)
// =============================================================================

async function networkAwareExample() {
  console.log('\n📶 Network-Aware Sync Example\n');

  const manager = await createSyncManager({
    primary: './network-local.db',
    remote: process.env.DATABASE_URL,
    sync: { mode: 'manual' }
  });

  await manager.db.run(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      size_mb REAL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await manager.db.run(
    'INSERT INTO photos (url, size_mb) VALUES (?, ?)',
    ['/photos/large-photo.jpg', 15.5]
  );

  // Simulate checking network type (browser API)
  const networkType = 'wifi'; // wifi | 4g | 3g | 2g | unknown

  if (networkType === 'wifi') {
    console.log('  📡 WiFi - syncing all data');
    await manager.sync();
  } else if (networkType === '4g') {
    console.log('  📱 4G - syncing text only');
    // Skip large files on cellular
    manager.config.tables = {
      'photos': { skip: true }
    };
    await manager.sync();
  } else {
    console.log('  📵 Slow connection - waiting for WiFi');
  }

  await manager.close();
}

// =============================================================================
// Example 8: Selective Table Sync
// =============================================================================

async function selectiveTableExample() {
  console.log('\n📋 Selective Table Sync Example\n');

  const manager = await createSyncManager({
    primary: './selective-local.db',
    remote: process.env.DATABASE_URL,
    sync: {
      mode: 'manual',
      // Only sync these tables
      includeTables: ['users', 'posts'],
      // Or exclude these tables
      // excludeTables: ['temp_data', 'cache']
    }
  });

  await manager.db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)');
  await manager.db.run('CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY, title TEXT)');
  await manager.db.run('CREATE TABLE IF NOT EXISTS temp_data (id INTEGER PRIMARY KEY, data TEXT)');

  await manager.db.run('INSERT INTO users (name) VALUES (?)', ['Alice']);
  await manager.db.run('INSERT INTO posts (title) VALUES (?)', ['My Post']);
  await manager.db.run('INSERT INTO temp_data (data) VALUES (?)', ['Temporary data']);

  console.log('  ✓ Data saved to 3 tables');
  
  const result = await manager.sync();
  console.log(`  ✓ Synced only: ${result.tables.join(', ')}`);
  console.log(`  ℹ️  temp_data not synced (not in includeTables)`);

  await manager.close();
}

// =============================================================================
// Run Examples
// =============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Offline Sync Examples');
  console.log('='.repeat(60));

  try {
    await mobileAppExample();
    await pwaExample();
    await desktopAppExample();
    await collaborationExample();
    await backupExample();
    await customMergeExample();
    await networkAwareExample();
    await selectiveTableExample();

    console.log('\n✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  mobileAppExample,
  pwaExample,
  desktopAppExample,
  collaborationExample,
  backupExample,
  customMergeExample,
  networkAwareExample,
  selectiveTableExample
};
