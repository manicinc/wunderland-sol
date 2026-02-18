import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that trigger module resolution
// ---------------------------------------------------------------------------

// Mock the Twilio SDK (dynamic import inside TwilioVoiceService.initialize)
vi.mock('twilio', () => {
  const mockClient = {
    calls: {
      create: vi.fn().mockResolvedValue({
        sid: 'CA_MOCK_SID',
        status: 'initiated',
        direction: 'outbound-api',
        from: '+15550001111',
        to: '+15550002222',
        dateCreated: new Date(),
      }),
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
        'twilio.accountSid': 'AC_TEST_SID',
        'twilio.authToken': 'test_auth_token',
        'twilio.fromNumber': '+15550001111',
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

describe('Twilio Voice Extension — createExtensionPack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any leftover env vars
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_FROM_NUMBER;
  });

  // ── Basic pack structure ──

  it('returns a valid extension pack with descriptors', () => {
    const pack = createExtensionPack(makeContext());

    expect(pack).toBeDefined();
    expect(pack.name).toBe('@framers/agentos-ext-voice-twilio');
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
    expect(toolDescriptor!.id).toBe('twilioVoiceCall');

    const providerDescriptor = pack.descriptors.find((d) => d.kind === 'voice-provider');
    expect(providerDescriptor).toBeDefined();
    expect(providerDescriptor!.id).toBe('twilioVoiceProvider');
  });

  it('extension pack name matches expected package name', () => {
    const pack = createExtensionPack(makeContext());
    expect(pack.name).toBe('@framers/agentos-ext-voice-twilio');
  });

  // ── Missing secrets ──

  it('throws when accountSid and authToken are missing', () => {
    const context = makeContext({ secrets: {} });

    expect(() => createExtensionPack(context)).toThrow(/Twilio credentials not found/);
  });

  it('throws when accountSid is present but authToken is missing', () => {
    const context = makeContext({
      secrets: { 'twilio.accountSid': 'AC_SOMETHING' },
    });

    expect(() => createExtensionPack(context)).toThrow(/Twilio credentials not found/);
  });

  it('throws when authToken is present but accountSid is missing', () => {
    const context = makeContext({
      secrets: { 'twilio.authToken': 'some_token' },
    });

    expect(() => createExtensionPack(context)).toThrow(/Twilio credentials not found/);
  });

  // ── Secrets resolution via env vars ──

  it('resolves credentials from environment variables', () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_ENV_SID';
    process.env.TWILIO_AUTH_TOKEN = 'env_auth_token';
    process.env.TWILIO_FROM_NUMBER = '+15559990000';

    const context: ExtensionContext = { options: {} } as ExtensionContext;
    const pack = createExtensionPack(context);

    expect(pack).toBeDefined();
    expect(pack.name).toBe('@framers/agentos-ext-voice-twilio');
  });

  // ── Secrets resolution via direct options ──

  it('resolves credentials from direct options', () => {
    const context = makeContext({
      accountSid: 'AC_DIRECT',
      authToken: 'direct_token',
      fromNumber: '+15551112222',
      secrets: undefined,
    });

    const pack = createExtensionPack(context);
    expect(pack).toBeDefined();
    expect(pack.name).toBe('@framers/agentos-ext-voice-twilio');
  });

  // ── Lifecycle hooks ──

  it('onActivate calls service.initialize()', async () => {
    const pack = createExtensionPack(makeContext());

    expect(pack.onActivate).toBeTypeOf('function');
    // onActivate should not throw — initialize() dynamically imports twilio (mocked)
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
          'twilio.accountSid': 'AC_TEST_SID',
          'twilio.authToken': 'test_auth_token',
        },
      },
      logger,
    } as unknown as ExtensionContext;

    const pack = createExtensionPack(context);
    await pack.onActivate!({} as any);

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[TwilioVoice]'),
    );
  });

  it('onDeactivate logs deactivation message', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const context = {
      options: {
        secrets: {
          'twilio.accountSid': 'AC_TEST_SID',
          'twilio.authToken': 'test_auth_token',
        },
      },
      logger,
    } as unknown as ExtensionContext;

    const pack = createExtensionPack(context);
    await pack.onDeactivate!({} as any);

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[TwilioVoice]'),
    );
  });

  // ── Descriptor payloads ──

  it('tool descriptor payload has expected tool interface shape', () => {
    const pack = createExtensionPack(makeContext());
    const toolDescriptor = pack.descriptors.find((d) => d.kind === 'tool');

    expect(toolDescriptor).toBeDefined();
    const tool = toolDescriptor!.payload as any;
    expect(tool.id).toBe('twilioVoiceCall');
    expect(tool.name).toBe('twilioVoiceCall');
    expect(typeof tool.execute).toBe('function');
  });

  it('descriptors have default priority of 50', () => {
    const pack = createExtensionPack(makeContext());

    for (const descriptor of pack.descriptors) {
      expect(descriptor.priority).toBe(50);
    }
  });

  it('respects custom priority', () => {
    const context = makeContext({ priority: 100 });
    const pack = createExtensionPack(context);

    for (const descriptor of pack.descriptors) {
      expect(descriptor.priority).toBe(100);
    }
  });
});
