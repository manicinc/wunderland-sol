/**
 * Unit tests for the Gmail extension pack factory.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock googleapis + google-auth-library before importing the factory so no
// real HTTP calls occur. GmailService uses these directly (not lazily), so
// the mock must be in place before the import chain resolves.
// ---------------------------------------------------------------------------

vi.mock('googleapis', () => {
  const mockGmail = {
    users: {
      getProfile: vi.fn().mockResolvedValue({
        data: { emailAddress: 'test@gmail.com', messagesTotal: 100, threadsTotal: 50 },
      }),
      messages: {
        list: vi.fn().mockResolvedValue({ data: { messages: [] } }),
        get: vi.fn().mockResolvedValue({ data: {} }),
        send: vi.fn().mockResolvedValue({ data: { id: 'msg-1', threadId: 'thread-1' } }),
      },
      labels: {
        list: vi.fn().mockResolvedValue({ data: { labels: [] } }),
        get: vi.fn().mockResolvedValue({ data: {} }),
      },
    },
  };

  return {
    google: {
      gmail: vi.fn().mockReturnValue(mockGmail),
    },
  };
});

vi.mock('google-auth-library', () => {
  class MockOAuth2Client {
    setCredentials = vi.fn();
  }
  return { OAuth2Client: MockOAuth2Client };
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

describe('Gmail createExtensionPack', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    savedEnv.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    savedEnv.GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
    savedEnv.GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
    savedEnv.GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
    savedEnv.GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
  });

  afterEach(() => {
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

  it('should have pack name "@framers/agentos-ext-email-gmail"', () => {
    const pack = createExtensionPack(makeContext());
    expect(pack.name).toBe('@framers/agentos-ext-email-gmail');
  });

  it('should have version "0.1.0"', () => {
    const pack = createExtensionPack(makeContext());
    expect(pack.version).toBe('0.1.0');
  });

  // ---- Descriptor IDs ------------------------------------------------------

  it('should expose descriptors with the expected IDs', () => {
    const pack = createExtensionPack(makeContext());
    const ids = pack.descriptors.map((d) => d.id);

    expect(ids).toContain('gmailListMessages');
    expect(ids).toContain('gmailReadMessage');
    expect(ids).toContain('gmailSendMessage');
    expect(ids).toContain('gmailReplyMessage');
    expect(ids).toContain('gmailSearchMessages');
    expect(ids).toContain('gmailListLabels');
    expect(ids).toContain('gmailService');
  });

  it('should set default priority of 50 on all descriptors', () => {
    const pack = createExtensionPack(makeContext());
    for (const d of pack.descriptors) {
      expect(d.priority).toBe(50);
    }
  });

  it('should respect a custom priority value', () => {
    const pack = createExtensionPack(makeContext({ priority: 75 }));
    for (const d of pack.descriptors) {
      expect(d.priority).toBe(75);
    }
  });

  // ---- Credential resolution ------------------------------------------------

  it('should throw when clientId is missing', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GMAIL_CLIENT_ID;

    expect(() =>
      createExtensionPack(
        makeContext({ clientId: undefined, clientSecret: 'x', refreshToken: 'x' }),
      ),
    ).toThrow(/clientId not found/i);
  });

  it('should throw when clientSecret is missing', () => {
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GMAIL_CLIENT_SECRET;

    expect(() =>
      createExtensionPack(
        makeContext({ clientId: 'x', clientSecret: undefined, refreshToken: 'x' }),
      ),
    ).toThrow(/clientSecret not found/i);
  });

  it('should throw when refreshToken is missing', () => {
    delete process.env.GOOGLE_REFRESH_TOKEN;
    delete process.env.GMAIL_REFRESH_TOKEN;

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
    delete process.env.GMAIL_CLIENT_ID;
    delete process.env.GMAIL_CLIENT_SECRET;
    delete process.env.GMAIL_REFRESH_TOKEN;

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

  it('should resolve credentials from GOOGLE_* env vars', () => {
    process.env.GOOGLE_CLIENT_ID = 'env-id';
    process.env.GOOGLE_CLIENT_SECRET = 'env-secret';
    process.env.GOOGLE_REFRESH_TOKEN = 'env-token';

    const pack = createExtensionPack({
      options: {},
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    } as unknown as ExtensionContext);

    expect(pack.descriptors).toHaveLength(7);
  });

  it('should resolve credentials from GMAIL_* env vars', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REFRESH_TOKEN;

    process.env.GMAIL_CLIENT_ID = 'gmail-id';
    process.env.GMAIL_CLIENT_SECRET = 'gmail-secret';
    process.env.GMAIL_REFRESH_TOKEN = 'gmail-token';

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
