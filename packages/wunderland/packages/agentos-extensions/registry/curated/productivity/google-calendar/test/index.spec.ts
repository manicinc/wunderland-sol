/**
 * Unit tests for the Google Calendar extension pack factory.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock googleapis before importing the factory so no real HTTP calls occur.
// The factory constructs tools that accept a GoogleCalendarService instance;
// GoogleCalendarService lazily imports googleapis inside initialize().
// ---------------------------------------------------------------------------

vi.mock('googleapis', () => {
  const mockCalendar = {
    events: {
      list: vi.fn().mockResolvedValue({ data: { items: [] } }),
      get: vi.fn().mockResolvedValue({ data: {} }),
      insert: vi.fn().mockResolvedValue({ data: {} }),
      patch: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({}),
    },
    calendarList: {
      list: vi.fn().mockResolvedValue({ data: { items: [] } }),
    },
    freebusy: {
      query: vi.fn().mockResolvedValue({ data: { calendars: {} } }),
    },
  };

  const mockOAuth2 = vi.fn().mockImplementation(() => ({
    setCredentials: vi.fn(),
    refreshAccessToken: vi.fn().mockResolvedValue({
      credentials: { access_token: 'refreshed-token' },
    }),
  }));

  return {
    google: {
      auth: { OAuth2: mockOAuth2 },
      calendar: vi.fn().mockReturnValue(mockCalendar),
    },
  };
});

import { createExtensionPack } from '../src/index';
import type { ExtensionContext } from '@framers/agentos';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(overrides: Record<string, any> = {}): ExtensionContext {
  return {
    options: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      refreshToken: 'test-refresh-token',
      ...overrides,
    },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  } as unknown as ExtensionContext;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Google Calendar createExtensionPack', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    // Snapshot env vars we may touch
    savedEnv.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    savedEnv.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    savedEnv.GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
  });

  afterEach(() => {
    // Restore env
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });

  // ---- Pack shape ----------------------------------------------------------

  it('should return a valid pack with 7 descriptors (6 tools + 1 service)', () => {
    const pack = createExtensionPack(makeContext());

    expect(pack.descriptors).toHaveLength(7);

    const tools = pack.descriptors.filter((d) => d.kind === 'tool');
    const services = pack.descriptors.filter((d) => d.kind === 'productivity');

    expect(tools).toHaveLength(6);
    expect(services).toHaveLength(1);
  });

  it('should have pack name "@framers/agentos-ext-calendar-google"', () => {
    const pack = createExtensionPack(makeContext());
    expect(pack.name).toBe('@framers/agentos-ext-calendar-google');
  });

  it('should have version "0.1.0"', () => {
    const pack = createExtensionPack(makeContext());
    expect(pack.version).toBe('0.1.0');
  });

  // ---- Descriptor IDs ------------------------------------------------------

  it('should expose descriptors with the expected IDs', () => {
    const pack = createExtensionPack(makeContext());
    const ids = pack.descriptors.map((d) => d.id);

    expect(ids).toContain('calendarListEvents');
    expect(ids).toContain('calendarCreateEvent');
    expect(ids).toContain('calendarUpdateEvent');
    expect(ids).toContain('calendarDeleteEvent');
    expect(ids).toContain('calendarFindFreeTime');
    expect(ids).toContain('calendarListCalendars');
    expect(ids).toContain('googleCalendarService');
  });

  it('should set default priority of 50 on all descriptors', () => {
    const pack = createExtensionPack(makeContext());
    for (const d of pack.descriptors) {
      expect(d.priority).toBe(50);
    }
  });

  it('should respect a custom priority value', () => {
    const pack = createExtensionPack(makeContext({ priority: 80 }));
    for (const d of pack.descriptors) {
      expect(d.priority).toBe(80);
    }
  });

  // ---- Credential resolution ------------------------------------------------

  it('should throw when clientId is missing', () => {
    delete process.env.GOOGLE_CLIENT_ID;

    expect(() =>
      createExtensionPack(
        makeContext({ clientId: undefined, clientSecret: 'x', refreshToken: 'x' }),
      ),
    ).toThrow(/clientId not found/i);
  });

  it('should throw when clientSecret is missing', () => {
    delete process.env.GOOGLE_CLIENT_SECRET;

    expect(() =>
      createExtensionPack(
        makeContext({ clientId: 'x', clientSecret: undefined, refreshToken: 'x' }),
      ),
    ).toThrow(/clientSecret not found/i);
  });

  it('should throw when refreshToken is missing', () => {
    delete process.env.GOOGLE_REFRESH_TOKEN;

    expect(() =>
      createExtensionPack(
        makeContext({ clientId: 'x', clientSecret: 'x', refreshToken: undefined }),
      ),
    ).toThrow(/refreshToken not found/i);
  });

  it('should resolve credentials from secrets map', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REFRESH_TOKEN;

    const pack = createExtensionPack({
      options: {
        secrets: {
          'google.clientId': 'secret-id',
          'google.clientSecret': 'secret-secret',
          'google.refreshToken': 'secret-token',
        },
      },
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    } as unknown as ExtensionContext);

    expect(pack.descriptors).toHaveLength(7);
  });

  it('should resolve credentials from env vars', () => {
    process.env.GOOGLE_CLIENT_ID = 'env-id';
    process.env.GOOGLE_CLIENT_SECRET = 'env-secret';
    process.env.GOOGLE_REFRESH_TOKEN = 'env-token';

    const pack = createExtensionPack({
      options: {},
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    } as unknown as ExtensionContext);

    expect(pack.descriptors).toHaveLength(7);
  });

  // ---- Lifecycle ------------------------------------------------------------

  it('should expose onActivate and onDeactivate hooks', () => {
    const pack = createExtensionPack(makeContext());
    expect(typeof pack.onActivate).toBe('function');
    expect(typeof pack.onDeactivate).toBe('function');
  });

  it('should activate and deactivate without errors', async () => {
    const ctx = makeContext();
    const pack = createExtensionPack(ctx);

    await expect(pack.onActivate!()).resolves.toBeUndefined();
    await expect(pack.onDeactivate!()).resolves.toBeUndefined();
  });

  it('should call logger.info on activate and deactivate', async () => {
    const ctx = makeContext();
    const pack = createExtensionPack(ctx);

    await pack.onActivate!();
    expect(ctx.logger!.info).toHaveBeenCalledWith(
      expect.stringContaining('Extension activated'),
    );

    await pack.onDeactivate!();
    expect(ctx.logger!.info).toHaveBeenCalledWith(
      expect.stringContaining('Extension deactivated'),
    );
  });

  // ---- Descriptor payloads --------------------------------------------------

  it('should attach non-null payload instances to every descriptor', () => {
    const pack = createExtensionPack(makeContext());
    for (const d of pack.descriptors) {
      expect(d.payload).toBeDefined();
      expect(d.payload).not.toBeNull();
    }
  });
});
