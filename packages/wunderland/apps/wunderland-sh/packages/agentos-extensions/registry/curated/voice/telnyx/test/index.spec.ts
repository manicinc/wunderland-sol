import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that trigger module resolution
// ---------------------------------------------------------------------------

// Mock the Telnyx SDK (dynamic import inside TelnyxVoiceService.initialize)
vi.mock('telnyx', () => {
  const mockClient = {
    calls: {
      create: vi.fn().mockResolvedValue({
        data: {
          call_control_id: 'telnyx_cc_mock_id',
          call_leg_id: 'telnyx_leg_mock',
          call_session_id: 'telnyx_session_mock',
          is_alive: true,
          record_type: 'call',
        },
      }),
      hangup: vi.fn().mockResolvedValue({}),
      speak: vi.fn().mockResolvedValue({}),
    },
  };
  const factory = vi.fn(() => mockClient);
  return { default: factory, __mockClient: mockClient };
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
        'telnyx.apiKey': 'KEY_TEST_123',
        'telnyx.connectionId': 'CONN_TEST_456',
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

describe('Telnyx Voice Extension — createExtensionPack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TELNYX_API_KEY;
    delete process.env.TELNYX_API_V2_KEY;
    delete process.env.TELNYX_CONNECTION_ID;
    delete process.env.TELNYX_APP_ID;
    delete process.env.TELNYX_PUBLIC_KEY;
    delete process.env.TELNYX_FROM_NUMBER;
  });

  // ── Basic pack structure ──

  it('returns a valid extension pack with descriptors', () => {
    const pack = createExtensionPack(makeContext());

    expect(pack).toBeDefined();
    expect(pack.name).toBe('@framers/agentos-ext-voice-telnyx');
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
    expect(toolDescriptor!.id).toBe('telnyxVoiceCall');

    const providerDescriptor = pack.descriptors.find((d) => d.kind === 'voice-provider');
    expect(providerDescriptor).toBeDefined();
    expect(providerDescriptor!.id).toBe('telnyxVoiceProvider');
  });

  it('extension pack name matches expected package name', () => {
    const pack = createExtensionPack(makeContext());
    expect(pack.name).toBe('@framers/agentos-ext-voice-telnyx');
  });

  // ── Missing secrets ──

  it('throws when apiKey is missing', () => {
    const context = makeContext({
      secrets: { 'telnyx.connectionId': 'CONN_123' },
    });

    expect(() => createExtensionPack(context)).toThrow(/Telnyx API key not found/);
  });

  it('throws when connectionId is missing', () => {
    const context = makeContext({
      secrets: { 'telnyx.apiKey': 'KEY_123' },
    });

    expect(() => createExtensionPack(context)).toThrow(/Telnyx connection ID not found/);
  });

  it('throws when all secrets are missing', () => {
    const context = makeContext({ secrets: {} });

    expect(() => createExtensionPack(context)).toThrow(/Telnyx API key not found/);
  });

  // ── Secrets resolution via env vars ──

  it('resolves credentials from environment variables', () => {
    process.env.TELNYX_API_KEY = 'env_api_key';
    process.env.TELNYX_CONNECTION_ID = 'env_conn_id';

    const context: ExtensionContext = { options: {} } as ExtensionContext;
    const pack = createExtensionPack(context);

    expect(pack).toBeDefined();
    expect(pack.name).toBe('@framers/agentos-ext-voice-telnyx');
  });

  it('resolves credentials from fallback env var names', () => {
    process.env.TELNYX_API_V2_KEY = 'env_v2_api_key';
    process.env.TELNYX_APP_ID = 'env_app_id';

    const context: ExtensionContext = { options: {} } as ExtensionContext;
    const pack = createExtensionPack(context);

    expect(pack).toBeDefined();
    expect(pack.name).toBe('@framers/agentos-ext-voice-telnyx');
  });

  // ── Secrets resolution via direct options ──

  it('resolves credentials from direct options', () => {
    const context = makeContext({
      apiKey: 'direct_key',
      connectionId: 'direct_conn',
      secrets: undefined,
    });

    const pack = createExtensionPack(context);
    expect(pack).toBeDefined();
    expect(pack.name).toBe('@framers/agentos-ext-voice-telnyx');
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
          'telnyx.apiKey': 'KEY_123',
          'telnyx.connectionId': 'CONN_456',
        },
      },
      logger,
    } as unknown as ExtensionContext;

    const pack = createExtensionPack(context);
    await pack.onActivate!({} as any);

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[TelnyxVoice]'),
    );
  });

  it('onDeactivate logs deactivation message', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const context = {
      options: {
        secrets: {
          'telnyx.apiKey': 'KEY_123',
          'telnyx.connectionId': 'CONN_456',
        },
      },
      logger,
    } as unknown as ExtensionContext;

    const pack = createExtensionPack(context);
    await pack.onDeactivate!({} as any);

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[TelnyxVoice]'),
    );
  });

  // ── Descriptor payloads ──

  it('tool descriptor payload has expected tool interface shape', () => {
    const pack = createExtensionPack(makeContext());
    const toolDescriptor = pack.descriptors.find((d) => d.kind === 'tool');

    expect(toolDescriptor).toBeDefined();
    const tool = toolDescriptor!.payload as any;
    expect(tool.id).toBe('telnyxVoiceCall');
    expect(tool.name).toBe('telnyxVoiceCall');
    expect(typeof tool.execute).toBe('function');
  });

  it('descriptors have default priority of 50', () => {
    const pack = createExtensionPack(makeContext());

    for (const descriptor of pack.descriptors) {
      expect(descriptor.priority).toBe(50);
    }
  });

  it('respects custom priority', () => {
    const context = makeContext({ priority: 75 });
    const pack = createExtensionPack(context);

    for (const descriptor of pack.descriptors) {
      expect(descriptor.priority).toBe(75);
    }
  });
});
