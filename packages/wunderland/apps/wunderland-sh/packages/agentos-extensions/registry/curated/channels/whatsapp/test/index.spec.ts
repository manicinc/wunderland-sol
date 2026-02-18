/**
 * @fileoverview Unit tests for the WhatsApp channel extension pack factory (createExtensionPack).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@whiskeysockets/baileys', () => {
  const mockEv = {
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  };

  const mockSocket = {
    ev: mockEv,
    sendMessage: vi.fn().mockResolvedValue({ key: { id: 'msg-123' }, messageTimestamp: 1000 }),
    sendPresenceUpdate: vi.fn().mockResolvedValue(undefined),
    end: vi.fn(),
  };

  return {
    default: vi.fn(() => mockSocket), // makeWASocket is the default export
    DisconnectReason: { loggedOut: 401 },
  };
});

import { createExtensionPack } from '../src/index';
import { _setBaileysForTesting } from '../src/WhatsAppService';
import * as baileysMock from '@whiskeysockets/baileys';
import type { ExtensionContext } from '@framers/agentos';

function createContext(options: Record<string, any> = {}): ExtensionContext {
  return {
    options,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  } as unknown as ExtensionContext;
}

describe('createExtensionPack', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    _setBaileysForTesting(baileysMock);
    // Save and clean env vars that resolveSessionData checks
    for (const key of ['WHATSAPP_SESSION_DATA', 'WHATSAPP_AUTH_STATE']) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  // Restore env vars after each test
  afterEach(() => {
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = val;
      }
    }
  });

  // ── Pack metadata ──

  describe('pack metadata', () => {
    it('has correct name', () => {
      const pack = createExtensionPack(
        createContext({ sessionData: '{"creds":{},"keys":{}}' }),
      );

      expect(pack.name).toBe('@framers/agentos-ext-channel-whatsapp');
    });

    it('has 3 descriptors (2 tools + 1 messaging-channel)', () => {
      const pack = createExtensionPack(
        createContext({ sessionData: '{"creds":{},"keys":{}}' }),
      );

      expect(pack.descriptors).toHaveLength(3);

      const tools = pack.descriptors.filter((d) => d.kind === 'tool');
      const channels = pack.descriptors.filter((d) => d.kind === 'messaging-channel');
      expect(tools).toHaveLength(2);
      expect(channels).toHaveLength(1);
    });
  });

  // ── Descriptor IDs ──

  describe('descriptor IDs', () => {
    it('has tool descriptor with ID whatsappChannelSendMessage', () => {
      const pack = createExtensionPack(
        createContext({ sessionData: '{"creds":{},"keys":{}}' }),
      );

      const descriptor = pack.descriptors.find((d) => d.id === 'whatsappChannelSendMessage');
      expect(descriptor).toBeDefined();
      expect(descriptor!.kind).toBe('tool');
    });

    it('has tool descriptor with ID whatsappChannelSendMedia', () => {
      const pack = createExtensionPack(
        createContext({ sessionData: '{"creds":{},"keys":{}}' }),
      );

      const descriptor = pack.descriptors.find((d) => d.id === 'whatsappChannelSendMedia');
      expect(descriptor).toBeDefined();
      expect(descriptor!.kind).toBe('tool');
    });

    it('has channel descriptor with ID whatsappChannel', () => {
      const pack = createExtensionPack(
        createContext({ sessionData: '{"creds":{},"keys":{}}' }),
      );

      const descriptor = pack.descriptors.find((d) => d.id === 'whatsappChannel');
      expect(descriptor).toBeDefined();
      expect(descriptor!.kind).toBe('messaging-channel');
    });
  });

  // ── Session data resolution ──

  describe('session data resolution', () => {
    it('resolves sessionData from options.sessionData', () => {
      // Should not throw — sessionData provided directly
      const pack = createExtensionPack(
        createContext({ sessionData: '{"creds":{},"keys":{}}' }),
      );

      expect(pack.name).toBe('@framers/agentos-ext-channel-whatsapp');
    });

    it('resolves sessionData from options.secrets["whatsapp.sessionData"]', () => {
      const pack = createExtensionPack(
        createContext({
          secrets: { 'whatsapp.sessionData': '{"creds":{},"keys":{}}' },
        }),
      );

      expect(pack.name).toBe('@framers/agentos-ext-channel-whatsapp');
    });

    it('resolves sessionData from WHATSAPP_SESSION_DATA env var', () => {
      process.env.WHATSAPP_SESSION_DATA = '{"creds":{},"keys":{}}';

      const pack = createExtensionPack(createContext({}));

      expect(pack.name).toBe('@framers/agentos-ext-channel-whatsapp');
    });

    it('resolves sessionData from WHATSAPP_AUTH_STATE env var as fallback', () => {
      process.env.WHATSAPP_AUTH_STATE = '{"creds":{},"keys":{}}';

      const pack = createExtensionPack(createContext({}));

      expect(pack.name).toBe('@framers/agentos-ext-channel-whatsapp');
    });

    it('throws if no session data is found anywhere', () => {
      expect(() => createExtensionPack(createContext({}))).toThrow(
        'WhatsApp session data not found',
      );
    });
  });

  // ── Custom priority ──

  describe('custom priority', () => {
    it('applies custom priority to all descriptors', () => {
      const pack = createExtensionPack(
        createContext({ sessionData: '{"creds":{},"keys":{}}', priority: 99 }),
      );

      for (const descriptor of pack.descriptors) {
        expect(descriptor.priority).toBe(99);
      }
    });

    it('uses default priority of 50 when not specified', () => {
      const pack = createExtensionPack(
        createContext({ sessionData: '{"creds":{},"keys":{}}' }),
      );

      for (const descriptor of pack.descriptors) {
        expect(descriptor.priority).toBe(50);
      }
    });
  });

  // ── Lifecycle hooks ──

  describe('lifecycle hooks', () => {
    it('exposes an onActivate hook', () => {
      const pack = createExtensionPack(
        createContext({ sessionData: '{"creds":{},"keys":{}}' }),
      );

      expect(pack.onActivate).toBeDefined();
      expect(typeof pack.onActivate).toBe('function');
    });

    it('exposes an onDeactivate hook', () => {
      const pack = createExtensionPack(
        createContext({ sessionData: '{"creds":{},"keys":{}}' }),
      );

      expect(pack.onDeactivate).toBeDefined();
      expect(typeof pack.onDeactivate).toBe('function');
    });

    it('onActivate initializes service and adapter', async () => {
      const ctx = createContext({ sessionData: '{"creds":{},"keys":{}}' });
      const pack = createExtensionPack(ctx);

      await pack.onActivate!();

      expect(ctx.logger!.info).toHaveBeenCalledWith('[WhatsAppChannel] Extension activated');
    });

    it('onDeactivate shuts down adapter and service', async () => {
      const ctx = createContext({ sessionData: '{"creds":{},"keys":{}}' });
      const pack = createExtensionPack(ctx);

      // Activate first so there is state to clean up
      await pack.onActivate!();
      await pack.onDeactivate!();

      expect(ctx.logger!.info).toHaveBeenCalledWith('[WhatsAppChannel] Extension deactivated');
    });
  });
});
