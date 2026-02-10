/**
 * Tests for channel binding ownership enforcement.
 *
 * Verifies that ChannelsService correctly isolates bindings per user,
 * enforces agent ownership on creation, and prevents cross-user access.
 */

import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelsService } from '../modules/wunderland/channels/channels.service.js';

// ── Mock DatabaseService ─────────────────────────────────────────────────────

class MockDb {
  private tables: Map<string, any[]> = new Map();
  private nextId = 0;

  constructor(agents: any[] = []) {
    this.tables.set('wunderland_agents', agents);
    this.tables.set('wunderland_channel_bindings', []);
    this.tables.set('wunderland_channel_sessions', []);
  }

  generateId(): string {
    return `mock-${++this.nextId}`;
  }

  async get<T>(_sql: string, params: any[] = []): Promise<T | undefined> {
    const table = this.resolveTable(_sql);
    const rows = this.filterRows(table, _sql, params);
    return rows[0] as T | undefined;
  }

  async all<T>(_sql: string, params: any[] = []): Promise<T[]> {
    const table = this.resolveTable(_sql);
    return this.filterRows(table, _sql, params) as T[];
  }

  async run(_sql: string, params: any[] = []): Promise<void> {
    const sql = _sql.trim();
    if (sql.startsWith('INSERT')) {
      const tableName = this.extractTable(sql);
      const table = this.tables.get(tableName) ?? [];
      const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
      if (colMatch) {
        const cols = colMatch[1].split(',').map((c) => c.trim());
        const row: any = {};
        cols.forEach((col, i) => {
          row[col] = params[i];
        });
        table.push(row);
      }
    } else if (sql.startsWith('UPDATE')) {
      const tableName = this.extractTable(sql);
      const table = this.tables.get(tableName) ?? [];
      const bindingId = params[params.length - 1];
      const row = table.find((r) => r.binding_id === bindingId);
      if (row) {
        const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
        if (setMatch) {
          const parts = setMatch[1].split(',').map((s) => s.trim());
          let idx = 0;
          for (const part of parts) {
            const col = part.split('=')[0].trim();
            row[col] = params[idx++];
          }
        }
      }
    } else if (sql.startsWith('DELETE')) {
      const tableName = this.extractTable(sql);
      const table = this.tables.get(tableName) ?? [];
      const idx = table.findIndex((r) => r.binding_id === params[0]);
      if (idx >= 0) table.splice(idx, 1);
    }
  }

  private resolveTable(sql: string): any[] {
    // Handle JOINs by extracting the primary table or alias
    const tableName = this.extractTable(sql);
    return this.tables.get(tableName) ?? [];
  }

  private extractTable(sql: string): string {
    const match = sql.match(/(?:FROM|INTO|UPDATE)\s+(\w+)/i);
    return match ? match[1] : '';
  }

  private filterRows(table: any[], sql: string, params: any[]): any[] {
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s+GROUP|\s*$)/is);
    if (!whereMatch) return table;

    return table.filter((row) => {
      const conditions = whereMatch[1].split(/\s+AND\s+/i);
      let idx = 0;
      for (const cond of conditions) {
        const colMatch = cond.match(/(\w+)\s*=\s*\?/);
        if (colMatch) {
          const col = colMatch[1];
          if (row[col] !== undefined && String(row[col]) !== String(params[idx])) {
            return false;
          }
          idx++;
        }
        // Skip sub-selects and complex conditions — mock trusts them
        if (cond.includes('IN (SELECT') || cond.includes('!=')) continue;
      }
      return true;
    });
  }
}

function makeDb() {
  return new MockDb([
    { seed_id: 'agent-a', owner_user_id: 'user-1', status: 'active' },
    { seed_id: 'agent-b', owner_user_id: 'user-2', status: 'active' },
    { seed_id: 'agent-archived', owner_user_id: 'user-1', status: 'archived' },
  ]);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ChannelsService: binding ownership', () => {
  test('createBinding succeeds for agent owner', async () => {
    const db = makeDb();
    const svc = new ChannelsService(db as any);

    const { binding } = await svc.createBinding('user-1', {
      seedId: 'agent-a',
      platform: 'telegram',
      channelId: 'chat-123',
    } as any);

    assert.equal(binding.seedId, 'agent-a');
    assert.equal(binding.platform, 'telegram');
    assert.equal(binding.channelId, 'chat-123');
    assert.equal(binding.ownerUserId, 'user-1');
    assert.equal(binding.isActive, true);
  });

  test('createBinding rejects when user does not own agent', async () => {
    const db = makeDb();
    const svc = new ChannelsService(db as any);

    await assert.rejects(
      () =>
        svc.createBinding('user-2', {
          seedId: 'agent-a', // owned by user-1
          platform: 'telegram',
          channelId: 'chat-456',
        } as any),
      (err: any) => {
        assert.equal(err.status, 404);
        assert.ok(err.message.includes('not found or not owned'));
        return true;
      }
    );
  });

  test('getBinding returns binding for correct owner', async () => {
    const db = makeDb();
    const svc = new ChannelsService(db as any);

    const { binding: created } = await svc.createBinding('user-1', {
      seedId: 'agent-a',
      platform: 'discord',
      channelId: 'guild-1',
    } as any);

    const { binding } = await svc.getBinding('user-1', created.bindingId);
    assert.equal(binding.bindingId, created.bindingId);
    assert.equal(binding.platform, 'discord');
  });

  test('getBinding returns 404 for wrong owner', async () => {
    const db = makeDb();
    const svc = new ChannelsService(db as any);

    const { binding: created } = await svc.createBinding('user-1', {
      seedId: 'agent-a',
      platform: 'slack',
      channelId: 'C0001',
    } as any);

    await assert.rejects(
      () => svc.getBinding('user-2', created.bindingId),
      (err: any) => {
        assert.equal(err.status, 404);
        return true;
      }
    );
  });

  test('listBindings only returns bindings for requesting user', async () => {
    const db = makeDb();
    const svc = new ChannelsService(db as any);

    await svc.createBinding('user-1', {
      seedId: 'agent-a',
      platform: 'telegram',
      channelId: 'chat-1',
    } as any);

    await svc.createBinding('user-2', {
      seedId: 'agent-b',
      platform: 'discord',
      channelId: 'guild-1',
    } as any);

    const user1List = await svc.listBindings('user-1');
    assert.equal(user1List.items.length, 1);
    assert.equal(user1List.items[0].platform, 'telegram');

    const user2List = await svc.listBindings('user-2');
    assert.equal(user2List.items.length, 1);
    assert.equal(user2List.items[0].platform, 'discord');
  });

  test('deleteBinding succeeds for owner', async () => {
    const db = makeDb();
    const svc = new ChannelsService(db as any);

    const { binding: created } = await svc.createBinding('user-1', {
      seedId: 'agent-a',
      platform: 'telegram',
      channelId: 'chat-del',
    } as any);

    const result = await svc.deleteBinding('user-1', created.bindingId);
    assert.equal(result.deleted, true);

    // Verify it's gone
    await assert.rejects(
      () => svc.getBinding('user-1', created.bindingId),
      (err: any) => {
        assert.equal(err.status, 404);
        return true;
      }
    );
  });

  test('deleteBinding rejects for non-owner', async () => {
    const db = makeDb();
    const svc = new ChannelsService(db as any);

    const { binding: created } = await svc.createBinding('user-1', {
      seedId: 'agent-a',
      platform: 'whatsapp',
      channelId: 'wa-123',
    } as any);

    await assert.rejects(
      () => svc.deleteBinding('user-2', created.bindingId),
      (err: any) => {
        assert.equal(err.status, 404);
        return true;
      }
    );

    // Verify not deleted
    const { binding } = await svc.getBinding('user-1', created.bindingId);
    assert.ok(binding, 'Binding should still exist after failed delete by non-owner');
  });

  test('updateBinding rejects for non-owner', async () => {
    const db = makeDb();
    const svc = new ChannelsService(db as any);

    const { binding: created } = await svc.createBinding('user-1', {
      seedId: 'agent-a',
      platform: 'telegram',
      channelId: 'chat-upd',
    } as any);

    await assert.rejects(
      () => svc.updateBinding('user-2', created.bindingId, { isActive: false }),
      (err: any) => {
        assert.equal(err.status, 404);
        return true;
      }
    );
  });

  test('updateBinding succeeds for owner', async () => {
    const db = makeDb();
    const svc = new ChannelsService(db as any);

    const { binding: created } = await svc.createBinding('user-1', {
      seedId: 'agent-a',
      platform: 'telegram',
      channelId: 'chat-toggle',
    } as any);

    const { binding: updated } = await svc.updateBinding('user-1', created.bindingId, {
      isActive: false,
    });
    // Note: mock doesn't re-map after update, but should not throw
    assert.ok(updated);
  });
});

describe('ChannelsService: duplicate and validation', () => {
  test('rejects duplicate binding for same agent+platform+channelId', async () => {
    const db = makeDb();
    const svc = new ChannelsService(db as any);

    await svc.createBinding('user-1', {
      seedId: 'agent-a',
      platform: 'telegram',
      channelId: 'chat-dup',
    } as any);

    await assert.rejects(
      () =>
        svc.createBinding('user-1', {
          seedId: 'agent-a',
          platform: 'telegram',
          channelId: 'chat-dup',
        } as any),
      (err: any) => {
        assert.equal(err.status, 400);
        assert.ok(err.message.includes('already exists'));
        return true;
      }
    );
  });

  test('rejects invalid platformConfig JSON', async () => {
    const db = makeDb();
    const svc = new ChannelsService(db as any);

    await assert.rejects(
      () =>
        svc.createBinding('user-1', {
          seedId: 'agent-a',
          platform: 'webchat',
          channelId: 'wc-1',
          platformConfig: 'not{valid json',
        } as any),
      (err: any) => {
        assert.equal(err.status, 400);
        assert.ok(err.message.includes('JSON'));
        return true;
      }
    );
  });

  test('allows different platforms for same agent', async () => {
    const db = makeDb();
    const svc = new ChannelsService(db as any);

    await svc.createBinding('user-1', {
      seedId: 'agent-a',
      platform: 'telegram',
      channelId: 'chat-1',
    } as any);

    const { binding } = await svc.createBinding('user-1', {
      seedId: 'agent-a',
      platform: 'discord',
      channelId: 'guild-1',
    } as any);

    assert.equal(binding.platform, 'discord');

    const all = await svc.listBindings('user-1');
    assert.equal(all.items.length, 2);
  });
});
