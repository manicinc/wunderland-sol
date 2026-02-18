import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that trigger module resolution
// ---------------------------------------------------------------------------

// Mock the Plivo SDK (dynamic import inside PlivoVoiceService.initialize)
vi.mock('plivo', () => {
  const mockCallsApi = {
    create: vi.fn().mockResolvedValue({
      requestUuid: 'plivo_uuid_mock',
      apiId: 'plivo_api_mock',
      message: 'call fired',
    }),
    hangup: vi.fn().mockResolvedValue({}),
    speak: vi.fn().mockResolvedValue({}),
  };
  const MockClient = vi.fn().mockImplementation(() => ({
    calls: mockCallsApi,
  }));
  return {
    default: { Client: MockClient },
    Client: MockClient,
    __mockCallsApi: mockCallsApi,
  };
});

// Mock @framers/agentos — provide the minimal surface area the extension needs
vi.mock('@framers/agentos', () => ({
  escapeXml: (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  CallManager: vi.fn().mockImplementation(() => ({
    registerProvider: vi.fn(),
    initiateCall: vi.fn(),
    speakText: vi.fn(),
    hangupCall: vi.fn(),
    getCall: vi.fn(),
    getActiveCalls: vi.fn(() => []),
    dispose: vi.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Import the extension under test
// ---------------------------------------------------------------------------

import { createExtensionPack } from '../src/index';
import type { ExtensionContext } from '@framers/agentos';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(overrides?: Record<string, unknown>): ExtensionContext {
  return {
    options: {
      secrets: {
        'plivo.authId': 'MAXXXXXXXXXX',
        'plivo.authToken': 'plivo_test_token',
        'plivo.fromNumber': '+15550003333',
      },
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

describe('Plivo Voice Extension — createExtensionPack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PLIVO_AUTH_ID;
    delete process.env.PLIVO_AUTH_TOKEN;
    delete process.env.PLIVO_FROM_NUMBER;
    delete process.env.PLIVO_PHONE_NUMBER;
  });

  // ── Basic pack structure ──

  it('returns a valid extension pack with descriptors', () => {
    const pack = createExtensionPack(makeContext());

    expect(pack).toBeDefined();
    expect(pack.name).toBe('@framers/agentos-ext-voice-plivo');
    expect(pack.version).toBe('0.1.0');
    expect(pack.descriptors).toBeDefined();
    expect(Array.isArray(pack.descriptors)).toBe(true);
    expect(pack.descriptors.length).toBeGreaterThanOrEqual(2);
  });

  it('pack has both "tool" and "voice-provider" descriptors', () => {
    const pack = createExtensionPack(makeContext());

    const kinds = pack.descriptors.map((d) => d.kind);
    expect(kinds).toContain('tool');
    expect(kinds).toContain('voice-provider');

    const toolDescriptor = pack.descriptors.find((d) => d.kind === 'tool');
    expect(toolDescriptor).toBeDefined();
    expect(toolDescriptor!.id).toBe('plivoVoiceCall');

    const providerDescriptor = pack.descriptors.find((d) => d.kind === 'voice-provider');
    expect(providerDescriptor).toBeDefined();
    expect(providerDescriptor!.id).toBe('plivoVoiceProvider');
  });

  it('extension pack name matches expected package name', () => {
    const pack = createExtensionPack(makeContext());
    expect(pack.name).toBe('@framers/agentos-ext-voice-plivo');
  });

  // ── Missing secrets ──

  it('throws when authId is missing', () => {
    const context = makeContext({
      secrets: {
        'plivo.authToken': 'token_123',
        'plivo.fromNumber': '+15550001111',
      },
    });

    expect(() => createExtensionPack(context)).toThrow(/Plivo authId not found/);
  });

  it('throws when authToken is missing', () => {
    const context = makeContext({
      secrets: {
        'plivo.authId': 'MA_SOMETHING',
        'plivo.fromNumber': '+15550001111',
      },
    });

    expect(() => createExtensionPack(context)).toThrow(/Plivo authToken not found/);
  });

  it('throws when fromNumber is missing', () => {
    const context = makeContext({
      secrets: {
        'plivo.authId': 'MA_SOMETHING',
        'plivo.authToken': 'token_123',
      },
    });

    expect(() => createExtensionPack(context)).toThrow(/Plivo fromNumber not found/);
  });

  it('throws when all secrets are missing', () => {
    const context = makeContext({ secrets: {} });

    expect(() => createExtensionPack(context)).toThrow(/Plivo authId not found/);
  });

  // ── Secrets resolution via env vars ──

  it('resolves credentials from environment variables', () => {
    process.env.PLIVO_AUTH_ID = 'env_auth_id';
    process.env.PLIVO_AUTH_TOKEN = 'env_auth_token';
    process.env.PLIVO_FROM_NUMBER = '+15559990000';

    const context: ExtensionContext = { options: {} } as ExtensionContext;
    const pack = createExtensionPack(context);

    expect(pack).toBeDefined();
    expect(pack.name).toBe('@framers/agentos-ext-voice-plivo');
  });

  it('resolves fromNumber from PLIVO_PHONE_NUMBER fallback env var', () => {
    process.env.PLIVO_AUTH_ID = 'env_auth_id';
    process.env.PLIVO_AUTH_TOKEN = 'env_auth_token';
    process.env.PLIVO_PHONE_NUMBER = '+15558887777';

    const context: ExtensionContext = { options: {} } as ExtensionContext;
    const pack = createExtensionPack(context);

    expect(pack).toBeDefined();
    expect(pack.name).toBe('@framers/agentos-ext-voice-plivo');
  });

  // ── Secrets resolution via direct options ──

  it('resolves credentials from direct options', () => {
    const context = makeContext({
      authId: 'MA_DIRECT',
      authToken: 'direct_token',
      fromNumber: '+15551112222',
      secrets: undefined,
    });

    const pack = createExtensionPack(context);
    expect(pack).toBeDefined();
    expect(pack.name).toBe('@framers/agentos-ext-voice-plivo');
  });

  // ── Lifecycle hooks ──

  it('onActivate calls service.initialize()', async () => {
    const pack = createExtensionPack(makeContext());

    expect(pack.onActivate).toBeTypeOf('function');
    await expect(pack.onActivate!({} as any)).resolves.toBeUndefined();
  });

  it('onDeactivate calls service.shutdown()', async () => {
    const pack = createExtensionPack(makeContext());

    expect(pack.onDeactivate).toBeTypeOf('function');
    await expect(pack.onDeactivate!({} as any)).resolves.toBeUndefined();
  });

  it('onActivate logs activation message', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const context = {
      options: {
        secrets: {
          'plivo.authId': 'MAXXXXXXXXXX',
          'plivo.authToken': 'plivo_test_token',
          'plivo.fromNumber': '+15550003333',
        },
      },
      logger,
    } as unknown as ExtensionContext;

    const pack = createExtensionPack(context);
    await pack.onActivate!({} as any);

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[PlivoVoice]'),
    );
  });

  it('onDeactivate logs deactivation message', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const context = {
      options: {
        secrets: {
          'plivo.authId': 'MAXXXXXXXXXX',
          'plivo.authToken': 'plivo_test_token',
          'plivo.fromNumber': '+15550003333',
        },
      },
      logger,
    } as unknown as ExtensionContext;

    const pack = createExtensionPack(context);
    await pack.onDeactivate!({} as any);

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[PlivoVoice]'),
    );
  });

  // ── Descriptor payloads ──

  it('tool descriptor payload has expected tool interface shape', () => {
    const pack = createExtensionPack(makeContext());
    const toolDescriptor = pack.descriptors.find((d) => d.kind === 'tool');

    expect(toolDescriptor).toBeDefined();
    const tool = toolDescriptor!.payload as any;
    expect(tool.id).toBe('plivoVoiceCall');
    expect(tool.name).toBe('plivoVoiceCall');
    expect(typeof tool.execute).toBe('function');
  });

  it('descriptors have default priority of 50', () => {
    const pack = createExtensionPack(makeContext());

    for (const descriptor of pack.descriptors) {
      expect(descriptor.priority).toBe(50);
    }
  });

  it('respects custom priority', () => {
    const context = makeContext({ priority: 25 });
    const pack = createExtensionPack(context);

    for (const descriptor of pack.descriptors) {
      expect(descriptor.priority).toBe(25);
    }
  });
});
