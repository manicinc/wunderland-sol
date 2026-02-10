import test, { afterEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import { VoiceService } from '../modules/wunderland/voice/voice.service.js';
import type { VoiceCallRecord, VoiceCallStats } from '../modules/wunderland/voice/voice.service.js';

// ── Mock Database Service ───────────────────────────────────────────────────

interface CallRow {
  call_id: string;
  seed_id: string;
  owner_user_id: string;
  provider: string;
  provider_call_id: string | null;
  direction: string;
  from_number: string;
  to_number: string;
  state: string;
  mode: string;
  start_time: number | null;
  end_time: number | null;
  transcript_json: string;
  metadata: string;
  created_at: number;
  updated_at: number;
}

interface AgentRow {
  seed_id: string;
  owner_user_id: string;
  status: string;
}

class MockDatabaseService {
  private calls = new Map<string, CallRow>();
  private agents = new Map<string, AgentRow>();
  private idCounter = 0;

  /** Seed a mock agent so requireOwnedAgent passes. */
  seedAgent(seedId: string, ownerUserId: string, status = 'active'): void {
    this.agents.set(`${seedId}:${ownerUserId}`, { seed_id: seedId, owner_user_id: ownerUserId, status });
  }

  /** Directly seed a call row for read-path tests. */
  seedCall(row: CallRow): void {
    this.calls.set(row.call_id, { ...row });
  }

  generateId(): string {
    this.idCounter++;
    return `test-call-${this.idCounter}`;
  }

  async run(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number }> {
    if (sql.trimStart().startsWith('INSERT INTO wunderland_voice_calls')) {
      const p = params ?? [];
      const row: CallRow = {
        call_id: p[0],
        seed_id: p[1],
        owner_user_id: p[2],
        provider: p[3],
        provider_call_id: null,
        direction: 'outbound',
        from_number: p[4],
        to_number: p[5],
        state: 'initiated',
        mode: p[6],
        start_time: null,
        end_time: null,
        transcript_json: '[]',
        metadata: '{}',
        created_at: p[7],
        updated_at: p[8],
      };
      this.calls.set(row.call_id, row);
      return { changes: 1, lastInsertRowid: 0 };
    }

    if (sql.trimStart().startsWith('UPDATE wunderland_voice_calls SET transcript_json')) {
      // appendTranscriptEntry update
      const p = params ?? [];
      const transcriptJson = p[0] as string;
      const updatedAt = p[1] as number;
      const callId = p[2] as string;
      const call = this.calls.get(callId);
      if (call) {
        call.transcript_json = transcriptJson;
        call.updated_at = updatedAt;
      }
      return { changes: call ? 1 : 0, lastInsertRowid: 0 };
    }

    if (sql.trimStart().startsWith('UPDATE wunderland_voice_calls SET')) {
      // updateCallState — parse SET clause for state, updated_at, provider_call_id, end_time, start_time
      const p = params ?? [];
      // The params order: state, updated_at, [provider_call_id], [end_time], [start_time], callId
      const callId = p[p.length - 1] as string;
      const call = this.calls.get(callId);
      if (!call) return { changes: 0, lastInsertRowid: 0 };

      const state = p[0] as string;
      const updatedAt = p[1] as number;
      call.state = state;
      call.updated_at = updatedAt;

      // Detect optional params based on SQL fragments
      let idx = 2;
      if (sql.includes('provider_call_id = ?')) {
        call.provider_call_id = p[idx] as string;
        idx++;
      }
      if (sql.includes('end_time = COALESCE(end_time, ?)')) {
        if (call.end_time === null) call.end_time = p[idx] as number;
        idx++;
      }
      if (sql.includes('start_time = COALESCE(start_time, ?)')) {
        if (call.start_time === null) call.start_time = p[idx] as number;
        idx++;
      }

      return { changes: 1, lastInsertRowid: 0 };
    }

    return { changes: 0, lastInsertRowid: 0 };
  }

  async get<T>(sql: string, params?: any[]): Promise<T | undefined> {
    const p = params ?? [];

    // Agent ownership check
    if (sql.includes('wunderland_agents')) {
      const seedId = p[0] as string;
      const userId = p[1] as string;
      const agent = this.agents.get(`${seedId}:${userId}`);
      if (agent && agent.status !== 'archived') return agent as unknown as T;
      return undefined;
    }

    // COUNT queries for stats
    if (sql.includes('COUNT(*)')) {
      const userId = p[0] as string;
      let rows = [...this.calls.values()].filter((c) => c.owner_user_id === userId);

      // Optional seedId filter
      if (sql.includes('seed_id = ?') && p.length > 1) {
        const seedId = p[1] as string;
        rows = rows.filter((c) => c.seed_id === seedId);
      }

      // State filters
      if (sql.includes("state = 'completed'")) {
        rows = rows.filter((c) => c.state === 'completed');
      } else if (sql.includes("state IN ('failed', 'error', 'no-answer', 'busy')")) {
        rows = rows.filter((c) => ['failed', 'error', 'no-answer', 'busy'].includes(c.state));
      } else if (sql.includes('state IN (')) {
        // Active states — params include the active states after owner/seed params
        const activeStates = new Set([
          'initiated', 'ringing', 'answered', 'active', 'speaking', 'listening',
        ]);
        rows = rows.filter((c) => activeStates.has(c.state));
      }

      return { cnt: rows.length } as unknown as T;
    }

    // SELECT transcript_json
    if (sql.includes('SELECT transcript_json')) {
      const callId = p[0] as string;
      const call = this.calls.get(callId);
      if (!call) return undefined;
      return { transcript_json: call.transcript_json } as unknown as T;
    }

    // Single call by call_id
    if (sql.includes('wunderland_voice_calls') && sql.includes('call_id = ?')) {
      const callId = p[0] as string;
      const call = this.calls.get(callId);
      if (!call) return undefined;

      // If also filtered by owner_user_id
      if (sql.includes('owner_user_id = ?')) {
        const userId = p[1] as string;
        if (call.owner_user_id !== userId) return undefined;
      }
      return call as unknown as T;
    }

    return undefined;
  }

  async all<T>(sql: string, params?: any[]): Promise<T[]> {
    const p = params ?? [];

    // Provider breakdown stats
    if (sql.includes('GROUP BY provider')) {
      const userId = p[0] as string;
      let rows = [...this.calls.values()].filter((c) => c.owner_user_id === userId);

      if (sql.includes('seed_id = ?') && p.length > 1) {
        const seedId = p[1] as string;
        rows = rows.filter((c) => c.seed_id === seedId);
      }

      const breakdown = new Map<string, number>();
      for (const row of rows) {
        breakdown.set(row.provider, (breakdown.get(row.provider) ?? 0) + 1);
      }
      return [...breakdown.entries()].map(([provider, cnt]) => ({ provider, cnt })) as unknown as T[];
    }

    // listCalls query
    if (sql.includes('wunderland_voice_calls')) {
      const userId = p[0] as string;
      let rows = [...this.calls.values()].filter((c) => c.owner_user_id === userId);

      let idx = 1;
      if (sql.includes('seed_id = ?')) {
        rows = rows.filter((c) => c.seed_id === (p[idx] as string));
        idx++;
      }
      if (sql.includes('provider = ?')) {
        rows = rows.filter((c) => c.provider === (p[idx] as string));
        idx++;
      }
      if (sql.includes('direction = ?')) {
        rows = rows.filter((c) => c.direction === (p[idx] as string));
        idx++;
      }

      // Active states filter
      const activeStates = new Set([
        'initiated', 'ringing', 'answered', 'active', 'speaking', 'listening',
      ]);
      if (sql.includes('state IN (') && !sql.includes("'failed'")) {
        rows = rows.filter((c) => activeStates.has(c.state));
        idx += activeStates.size;
      } else if (sql.includes("state = 'completed'")) {
        rows = rows.filter((c) => c.state === 'completed');
      } else if (sql.includes("state IN ('failed'")) {
        rows = rows.filter((c) => ['failed', 'error', 'no-answer', 'busy'].includes(c.state));
      }

      // LIMIT is always the last param
      const limit = p[p.length - 1] as number;
      rows.sort((a, b) => b.created_at - a.created_at);
      return rows.slice(0, limit) as unknown as T[];
    }

    return [];
  }
}

// ── Test Helpers ────────────────────────────────────────────────────────────

function createService(mockDb: MockDatabaseService): VoiceService {
  return new VoiceService(mockDb as any);
}

function makeCallRow(overrides: Partial<CallRow> = {}): CallRow {
  const now = Date.now();
  return {
    call_id: 'call-' + Math.random().toString(36).slice(2),
    seed_id: 'seed-1',
    owner_user_id: 'user-1',
    provider: 'twilio',
    provider_call_id: null,
    direction: 'outbound',
    from_number: '+1111111111',
    to_number: '+2222222222',
    state: 'initiated',
    mode: 'notify',
    start_time: null,
    end_time: null,
    transcript_json: '[]',
    metadata: '{}',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ── 1. initiateCall ─────────────────────────────────────────────────────────

describe('VoiceService.initiateCall()', () => {
  test('creates a call record with correct fields', async () => {
    const db = new MockDatabaseService();
    db.seedAgent('seed-1', 'user-1');
    const service = createService(db);

    const result = await service.initiateCall('user-1', {
      seedId: 'seed-1',
      toNumber: '+15551234567',
      provider: 'twilio',
      mode: 'conversation',
      fromNumber: '+15559999999',
    } as any);

    assert.ok(result.call, 'should return a call object');
    assert.equal(result.call.seedId, 'seed-1');
    assert.equal(result.call.ownerUserId, 'user-1');
    assert.equal(result.call.provider, 'twilio');
    assert.equal(result.call.toNumber, '+15551234567');
    assert.equal(result.call.fromNumber, '+15559999999');
    assert.equal(result.call.state, 'initiated');
    assert.equal(result.call.mode, 'conversation');
    assert.equal(result.call.direction, 'outbound');
    assert.equal(result.call.providerCallId, null);
    assert.equal(result.call.startTime, null);
    assert.equal(result.call.endTime, null);
    assert.equal(result.call.transcriptJson, '[]');
    assert.ok(result.call.callId.startsWith('test-call-'), 'callId should come from generateId');
    assert.ok(result.call.createdAt > 0, 'createdAt should be set');
  });

  test('defaults provider to "twilio" and mode to "notify"', async () => {
    const db = new MockDatabaseService();
    db.seedAgent('seed-1', 'user-1');
    const service = createService(db);

    const result = await service.initiateCall('user-1', {
      seedId: 'seed-1',
      toNumber: '+15551234567',
    } as any);

    assert.equal(result.call.provider, 'twilio');
    assert.equal(result.call.mode, 'notify');
  });

  test('throws NotFoundException for unowned agent', async () => {
    const db = new MockDatabaseService();
    // No agent seeded
    const service = createService(db);

    await assert.rejects(
      () =>
        service.initiateCall('user-1', {
          seedId: 'nonexistent-seed',
          toNumber: '+15551234567',
        } as any),
      (err: any) => {
        assert.ok(err.message.includes('not found'));
        return true;
      }
    );
  });
});

// ── 2. getCall ──────────────────────────────────────────────────────────────

describe('VoiceService.getCall()', () => {
  test('returns call for the correct owner', async () => {
    const db = new MockDatabaseService();
    const row = makeCallRow({ call_id: 'call-abc', owner_user_id: 'user-1' });
    db.seedCall(row);
    const service = createService(db);

    const result = await service.getCall('user-1', 'call-abc');

    assert.equal(result.call.callId, 'call-abc');
    assert.equal(result.call.ownerUserId, 'user-1');
  });

  test('throws NotFoundException for wrong user', async () => {
    const db = new MockDatabaseService();
    const row = makeCallRow({ call_id: 'call-abc', owner_user_id: 'user-1' });
    db.seedCall(row);
    const service = createService(db);

    await assert.rejects(
      () => service.getCall('user-other', 'call-abc'),
      (err: any) => {
        assert.ok(err.message.includes('not found'));
        return true;
      }
    );
  });

  test('throws NotFoundException for nonexistent call', async () => {
    const db = new MockDatabaseService();
    const service = createService(db);

    await assert.rejects(
      () => service.getCall('user-1', 'call-nonexistent'),
      (err: any) => {
        assert.ok(err.message.includes('not found'));
        return true;
      }
    );
  });
});

// ── 3. listCalls ────────────────────────────────────────────────────────────

describe('VoiceService.listCalls()', () => {
  test('filters by seedId', async () => {
    const db = new MockDatabaseService();
    db.seedCall(makeCallRow({ call_id: 'c1', seed_id: 'seed-A', owner_user_id: 'user-1' }));
    db.seedCall(makeCallRow({ call_id: 'c2', seed_id: 'seed-B', owner_user_id: 'user-1' }));
    db.seedCall(makeCallRow({ call_id: 'c3', seed_id: 'seed-A', owner_user_id: 'user-1' }));
    const service = createService(db);

    const result = await service.listCalls('user-1', { seedId: 'seed-A' });

    assert.equal(result.items.length, 2);
    assert.ok(result.items.every((c) => c.seedId === 'seed-A'));
  });

  test('filters by provider', async () => {
    const db = new MockDatabaseService();
    db.seedCall(makeCallRow({ call_id: 'c1', provider: 'twilio', owner_user_id: 'user-1' }));
    db.seedCall(makeCallRow({ call_id: 'c2', provider: 'telnyx', owner_user_id: 'user-1' }));
    const service = createService(db);

    const result = await service.listCalls('user-1', { provider: 'telnyx' });

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]!.provider, 'telnyx');
  });

  test('filters by direction', async () => {
    const db = new MockDatabaseService();
    db.seedCall(makeCallRow({ call_id: 'c1', direction: 'outbound', owner_user_id: 'user-1' }));
    db.seedCall(makeCallRow({ call_id: 'c2', direction: 'inbound', owner_user_id: 'user-1' }));
    const service = createService(db);

    const result = await service.listCalls('user-1', { direction: 'inbound' });

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]!.direction, 'inbound');
  });

  test('filters by status "active"', async () => {
    const db = new MockDatabaseService();
    db.seedCall(makeCallRow({ call_id: 'c1', state: 'initiated', owner_user_id: 'user-1' }));
    db.seedCall(makeCallRow({ call_id: 'c2', state: 'answered', owner_user_id: 'user-1' }));
    db.seedCall(makeCallRow({ call_id: 'c3', state: 'completed', owner_user_id: 'user-1' }));
    db.seedCall(makeCallRow({ call_id: 'c4', state: 'failed', owner_user_id: 'user-1' }));
    const service = createService(db);

    const result = await service.listCalls('user-1', { status: 'active' });

    assert.equal(result.items.length, 2);
    const states = result.items.map((c) => c.state);
    assert.ok(states.includes('initiated'));
    assert.ok(states.includes('answered'));
  });

  test('filters by status "completed"', async () => {
    const db = new MockDatabaseService();
    db.seedCall(makeCallRow({ call_id: 'c1', state: 'completed', owner_user_id: 'user-1' }));
    db.seedCall(makeCallRow({ call_id: 'c2', state: 'active', owner_user_id: 'user-1' }));
    const service = createService(db);

    const result = await service.listCalls('user-1', { status: 'completed' });

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]!.state, 'completed');
  });

  test('filters by status "failed"', async () => {
    const db = new MockDatabaseService();
    db.seedCall(makeCallRow({ call_id: 'c1', state: 'failed', owner_user_id: 'user-1' }));
    db.seedCall(makeCallRow({ call_id: 'c2', state: 'error', owner_user_id: 'user-1' }));
    db.seedCall(makeCallRow({ call_id: 'c3', state: 'active', owner_user_id: 'user-1' }));
    const service = createService(db);

    const result = await service.listCalls('user-1', { status: 'failed' });

    assert.equal(result.items.length, 2);
    const states = result.items.map((c) => c.state);
    assert.ok(states.includes('failed'));
    assert.ok(states.includes('error'));
  });

  test('only returns calls for the requesting user', async () => {
    const db = new MockDatabaseService();
    db.seedCall(makeCallRow({ call_id: 'c1', owner_user_id: 'user-1' }));
    db.seedCall(makeCallRow({ call_id: 'c2', owner_user_id: 'user-2' }));
    const service = createService(db);

    const result = await service.listCalls('user-1');

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]!.ownerUserId, 'user-1');
  });
});

// ── 4. updateCallState ──────────────────────────────────────────────────────

describe('VoiceService.updateCallState()', () => {
  test('transitions state correctly', async () => {
    const db = new MockDatabaseService();
    const row = makeCallRow({ call_id: 'call-1', state: 'initiated', owner_user_id: 'user-1' });
    db.seedCall(row);
    const service = createService(db);

    await service.updateCallState('call-1', 'ringing');

    const updated = await service.getCall('user-1', 'call-1');
    assert.equal(updated.call.state, 'ringing');
  });

  test('sets start_time when transitioning to "answered"', async () => {
    const db = new MockDatabaseService();
    const row = makeCallRow({ call_id: 'call-1', state: 'ringing', owner_user_id: 'user-1' });
    db.seedCall(row);
    const service = createService(db);

    await service.updateCallState('call-1', 'answered');

    const updated = await service.getCall('user-1', 'call-1');
    assert.equal(updated.call.state, 'answered');
    assert.ok(updated.call.startTime !== null, 'start_time should be set on answered');
    assert.ok(typeof updated.call.startTime === 'number');
  });

  test('sets start_time when transitioning to "active"', async () => {
    const db = new MockDatabaseService();
    const row = makeCallRow({ call_id: 'call-1', state: 'ringing', owner_user_id: 'user-1' });
    db.seedCall(row);
    const service = createService(db);

    await service.updateCallState('call-1', 'active');

    const updated = await service.getCall('user-1', 'call-1');
    assert.ok(updated.call.startTime !== null, 'start_time should be set on active');
  });

  test('sets end_time when transitioning to terminal state', async () => {
    const db = new MockDatabaseService();
    const row = makeCallRow({ call_id: 'call-1', state: 'active', owner_user_id: 'user-1' });
    db.seedCall(row);
    const service = createService(db);

    await service.updateCallState('call-1', 'completed');

    const updated = await service.getCall('user-1', 'call-1');
    assert.equal(updated.call.state, 'completed');
    assert.ok(updated.call.endTime !== null, 'end_time should be set for terminal state');
    assert.ok(typeof updated.call.endTime === 'number');
  });

  test('sets providerCallId when provided', async () => {
    const db = new MockDatabaseService();
    const row = makeCallRow({ call_id: 'call-1', state: 'initiated', owner_user_id: 'user-1' });
    db.seedCall(row);
    const service = createService(db);

    await service.updateCallState('call-1', 'ringing', 'CA-twilio-12345');

    const updated = await service.getCall('user-1', 'call-1');
    assert.equal(updated.call.providerCallId, 'CA-twilio-12345');
  });

  test('does not overwrite existing start_time', async () => {
    const db = new MockDatabaseService();
    const originalStart = Date.now() - 60_000;
    const row = makeCallRow({
      call_id: 'call-1',
      state: 'answered',
      start_time: originalStart,
      owner_user_id: 'user-1',
    });
    db.seedCall(row);
    const service = createService(db);

    await service.updateCallState('call-1', 'active');

    const updated = await service.getCall('user-1', 'call-1');
    assert.equal(updated.call.startTime, originalStart, 'should preserve original start_time via COALESCE');
  });
});

// ── 5. appendTranscriptEntry ────────────────────────────────────────────────

describe('VoiceService.appendTranscriptEntry()', () => {
  test('appends entry to transcript JSON array', async () => {
    const db = new MockDatabaseService();
    const row = makeCallRow({ call_id: 'call-1', transcript_json: '[]', owner_user_id: 'user-1' });
    db.seedCall(row);
    const service = createService(db);

    const entry1 = { role: 'user', text: 'Hello', timestamp: 1000 };
    await service.appendTranscriptEntry('call-1', entry1);

    const result = await service.getCall('user-1', 'call-1');
    const transcript = JSON.parse(result.call.transcriptJson);
    assert.equal(transcript.length, 1);
    assert.deepEqual(transcript[0], entry1);
  });

  test('appends multiple entries in sequence', async () => {
    const db = new MockDatabaseService();
    const row = makeCallRow({ call_id: 'call-1', transcript_json: '[]', owner_user_id: 'user-1' });
    db.seedCall(row);
    const service = createService(db);

    await service.appendTranscriptEntry('call-1', { role: 'user', text: 'Hi', timestamp: 1000 });
    await service.appendTranscriptEntry('call-1', { role: 'bot', text: 'Hello!', timestamp: 2000 });
    await service.appendTranscriptEntry('call-1', { role: 'user', text: 'Bye', timestamp: 3000 });

    const result = await service.getCall('user-1', 'call-1');
    const transcript = JSON.parse(result.call.transcriptJson);
    assert.equal(transcript.length, 3);
    assert.equal(transcript[0].role, 'user');
    assert.equal(transcript[1].role, 'bot');
    assert.equal(transcript[2].text, 'Bye');
  });

  test('silently ignores nonexistent call', async () => {
    const db = new MockDatabaseService();
    const service = createService(db);

    // Should not throw
    await service.appendTranscriptEntry('call-nonexistent', {
      role: 'user',
      text: 'Hello',
      timestamp: 1000,
    });
  });
});

// ── 6. hangupCall ───────────────────────────────────────────────────────────

describe('VoiceService.hangupCall()', () => {
  test('transitions call to "hangup-bot" state', async () => {
    const db = new MockDatabaseService();
    const row = makeCallRow({ call_id: 'call-1', state: 'active', owner_user_id: 'user-1' });
    db.seedCall(row);
    const service = createService(db);

    const result = await service.hangupCall('user-1', 'call-1');

    assert.equal(result.call.state, 'hangup-bot');
    assert.equal(result.call.callId, 'call-1');
  });

  test('sets end_time on hangup', async () => {
    const db = new MockDatabaseService();
    const row = makeCallRow({ call_id: 'call-1', state: 'active', owner_user_id: 'user-1' });
    db.seedCall(row);
    const service = createService(db);

    const result = await service.hangupCall('user-1', 'call-1');

    assert.ok(result.call.endTime !== null, 'end_time should be set on hangup');
  });

  test('throws BadRequestException for already-terminal call (completed)', async () => {
    const db = new MockDatabaseService();
    const row = makeCallRow({ call_id: 'call-1', state: 'completed', owner_user_id: 'user-1' });
    db.seedCall(row);
    const service = createService(db);

    await assert.rejects(
      () => service.hangupCall('user-1', 'call-1'),
      (err: any) => {
        assert.ok(err.message.includes('terminal state'));
        return true;
      }
    );
  });

  test('throws BadRequestException for already-terminal call (hangup-user)', async () => {
    const db = new MockDatabaseService();
    const row = makeCallRow({ call_id: 'call-1', state: 'hangup-user', owner_user_id: 'user-1' });
    db.seedCall(row);
    const service = createService(db);

    await assert.rejects(
      () => service.hangupCall('user-1', 'call-1'),
      (err: any) => {
        assert.ok(err.message.includes('terminal state'));
        return true;
      }
    );
  });

  test('throws NotFoundException for nonexistent call', async () => {
    const db = new MockDatabaseService();
    const service = createService(db);

    await assert.rejects(
      () => service.hangupCall('user-1', 'call-nonexistent'),
      (err: any) => {
        assert.ok(err.message.includes('not found'));
        return true;
      }
    );
  });

  test('throws NotFoundException for call owned by different user', async () => {
    const db = new MockDatabaseService();
    const row = makeCallRow({ call_id: 'call-1', state: 'active', owner_user_id: 'user-1' });
    db.seedCall(row);
    const service = createService(db);

    await assert.rejects(
      () => service.hangupCall('user-other', 'call-1'),
      (err: any) => {
        assert.ok(err.message.includes('not found'));
        return true;
      }
    );
  });
});

// ── 7. getCallStats ─────────────────────────────────────────────────────────

describe('VoiceService.getCallStats()', () => {
  test('returns correct counts for mixed states', async () => {
    const db = new MockDatabaseService();
    // Active calls
    db.seedCall(makeCallRow({ call_id: 'c1', state: 'initiated', owner_user_id: 'user-1', provider: 'twilio' }));
    db.seedCall(makeCallRow({ call_id: 'c2', state: 'active', owner_user_id: 'user-1', provider: 'twilio' }));
    // Completed calls
    db.seedCall(makeCallRow({ call_id: 'c3', state: 'completed', owner_user_id: 'user-1', provider: 'telnyx' }));
    // Failed calls
    db.seedCall(makeCallRow({ call_id: 'c4', state: 'failed', owner_user_id: 'user-1', provider: 'twilio' }));
    db.seedCall(makeCallRow({ call_id: 'c5', state: 'error', owner_user_id: 'user-1', provider: 'plivo' }));

    const service = createService(db);
    const stats = await service.getCallStats('user-1');

    assert.equal(stats.totalCalls, 5);
    assert.equal(stats.activeCalls, 2);
    assert.equal(stats.completedCalls, 1);
    assert.equal(stats.failedCalls, 2);
  });

  test('returns correct provider breakdown', async () => {
    const db = new MockDatabaseService();
    db.seedCall(makeCallRow({ call_id: 'c1', provider: 'twilio', owner_user_id: 'user-1' }));
    db.seedCall(makeCallRow({ call_id: 'c2', provider: 'twilio', owner_user_id: 'user-1' }));
    db.seedCall(makeCallRow({ call_id: 'c3', provider: 'telnyx', owner_user_id: 'user-1' }));
    db.seedCall(makeCallRow({ call_id: 'c4', provider: 'plivo', owner_user_id: 'user-1' }));

    const service = createService(db);
    const stats = await service.getCallStats('user-1');

    assert.equal(stats.providerBreakdown['twilio'], 2);
    assert.equal(stats.providerBreakdown['telnyx'], 1);
    assert.equal(stats.providerBreakdown['plivo'], 1);
  });

  test('filters stats by seedId', async () => {
    const db = new MockDatabaseService();
    db.seedCall(makeCallRow({ call_id: 'c1', seed_id: 'seed-A', owner_user_id: 'user-1', provider: 'twilio' }));
    db.seedCall(makeCallRow({ call_id: 'c2', seed_id: 'seed-A', owner_user_id: 'user-1', provider: 'twilio' }));
    db.seedCall(makeCallRow({ call_id: 'c3', seed_id: 'seed-B', owner_user_id: 'user-1', provider: 'twilio' }));

    const service = createService(db);
    const stats = await service.getCallStats('user-1', 'seed-A');

    assert.equal(stats.totalCalls, 2);
  });

  test('returns zero counts when no calls exist', async () => {
    const db = new MockDatabaseService();
    const service = createService(db);

    const stats = await service.getCallStats('user-1');

    assert.equal(stats.totalCalls, 0);
    assert.equal(stats.activeCalls, 0);
    assert.equal(stats.completedCalls, 0);
    assert.equal(stats.failedCalls, 0);
    assert.deepEqual(stats.providerBreakdown, {});
  });

  test('excludes calls from other users', async () => {
    const db = new MockDatabaseService();
    db.seedCall(makeCallRow({ call_id: 'c1', owner_user_id: 'user-1', provider: 'twilio' }));
    db.seedCall(makeCallRow({ call_id: 'c2', owner_user_id: 'user-2', provider: 'twilio' }));

    const service = createService(db);
    const stats = await service.getCallStats('user-1');

    assert.equal(stats.totalCalls, 1);
  });
});
