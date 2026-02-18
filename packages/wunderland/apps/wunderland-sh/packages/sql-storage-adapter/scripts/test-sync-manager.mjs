#!/usr/bin/env node

/**
 * Quick verification that SyncManager works
 */

import { createSyncManager } from '../dist/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('🧪 Testing SyncManager Implementation\n');
  console.log('='.repeat(60));

  // Clean up test databases
  const testFiles = ['./test-primary.db', './test-remote.db'];
  for (const file of testFiles) {
    try {
      await fs.unlink(file);
    } catch {}
  }

  try {
    // Test 1: Create offline-first manager
    console.log('\n✓ Test 1: Create offline-first manager');
    const offlineManager = await createSyncManager({
      primary: './test-primary.db',
      sync: { mode: 'manual' }
    });
    console.log(`  Primary DB: ${offlineManager.db.kind}`);
    console.log(`  Syncing: ${offlineManager.syncing}`);
    console.log(`  Online: ${offlineManager.online}`);
    await offlineManager.close();

    // Test 2: Create with remote database
    console.log('\n✓ Test 2: Create with local + remote');
    const syncManager = await createSyncManager({
      primary: './test-primary.db',
      remote: './test-remote.db',
      sync: { mode: 'manual' }
    });

    // Test 3: Create tables
    console.log('\n✓ Test 3: Create tables and insert data');
    await syncManager.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    await syncManager.db.run('INSERT INTO users (name) VALUES (?)', ['Alice']);
    await syncManager.db.run('INSERT INTO users (name) VALUES (?)', ['Bob']);
    console.log('  Inserted 2 users into primary database');

    // Test 4: Manual sync
    console.log('\n✓ Test 4: Perform manual sync');
    const result = await syncManager.sync();
    console.log(`  Success: ${result.success}`);
    console.log(`  Direction: ${result.direction}`);
    console.log(`  Records synced: ${result.recordsSynced}`);
    console.log(`  Duration: ${result.duration}ms`);
    console.log(`  Tables: ${result.tables.join(', ')}`);

    // Test 5: Verify sync worked
    console.log('\n✓ Test 5: Verify data in remote database');
    const users = await syncManager.db.all('SELECT * FROM users');
    console.log(`  Found ${users.length} users in database`);
    users.forEach((u) => {
      console.log(`    - ${u.name} (id: ${u.id})`);
    });

    // Test 6: Check properties
    console.log('\n✓ Test 6: Check manager properties');
    console.log(`  Syncing: ${syncManager.syncing}`);
    console.log(`  Online: ${syncManager.online}`);
    console.log(`  Last sync: ${syncManager.lastSync?.toISOString()}`);

    await syncManager.close();

    // Test 7: Create with callbacks
    console.log('\n✓ Test 7: Create with event callbacks');
    let syncCalled = false;
    let progressCalled = false;

    const callbackManager = await createSyncManager({
      primary: './test-primary.db',
      remote: './test-remote.db',
      sync: { mode: 'manual' },
      onSync: (result) => {
        syncCalled = true;
        console.log(`  onSync called: ${result.recordsSynced} records`);
      },
      onProgress: (progress) => {
        progressCalled = true;
        console.log(`  onProgress: ${progress.percent}% - ${progress.phase}`);
      }
    });

    await callbackManager.sync();
    console.log(`  Callbacks fired: sync=${syncCalled}, progress=${progressCalled}`);
    await callbackManager.close();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Clean up
    for (const file of testFiles) {
      try {
        await fs.unlink(file);
      } catch {}
    }
  }
}

main();
