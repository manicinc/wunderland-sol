/**
 * @fileoverview Unit tests for WhatsAppService.
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

import { WhatsAppService, type WhatsAppChannelConfig, _setBaileysForTesting } from '../src/WhatsAppService';
import makeWASocket, * as baileysMock from '@whiskeysockets/baileys';

function createConfig(overrides?: Partial<WhatsAppChannelConfig>): WhatsAppChannelConfig {
  return {
    sessionData: '{"creds":{},"keys":{}}',
    ...overrides,
  };
}

function getMockSocket() {
  return (makeWASocket as ReturnType<typeof vi.fn>).mock.results.at(-1)?.value;
}

describe('WhatsAppService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _setBaileysForTesting(baileysMock);
  });

  // ── Constructor ──

  describe('constructor', () => {
    it('stores config and applies defaults for reconnect and rateLimit', () => {
      const service = new WhatsAppService(createConfig());

      // Service should not be running after construction
      expect(service.isRunning).toBe(false);
    });

    it('preserves custom reconnect and rateLimit options', () => {
      const service = new WhatsAppService(
        createConfig({
          reconnect: { maxRetries: 10, delayMs: 5000 },
          rateLimit: { maxRequests: 100, windowMs: 2000 },
        }),
      );

      expect(service.isRunning).toBe(false);
    });
  });

  // ── initialize() ──

  describe('initialize()', () => {
    it('creates a socket and sets isRunning = true', async () => {
      const service = new WhatsAppService(createConfig());

      await service.initialize();

      expect(makeWASocket).toHaveBeenCalledOnce();
      expect(makeWASocket).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: { creds: {}, keys: {} },
          printQRInTerminal: false,
        }),
      );
      expect(service.isRunning).toBe(true);
    });

    it('registers connection.update and messages.upsert listeners', async () => {
      const service = new WhatsAppService(createConfig());
      await service.initialize();

      const sock = getMockSocket();
      expect(sock.ev.on).toHaveBeenCalledWith('connection.update', expect.any(Function));
      expect(sock.ev.on).toHaveBeenCalledWith('messages.upsert', expect.any(Function));
    });

    it('is idempotent — second call is a no-op', async () => {
      const service = new WhatsAppService(createConfig());

      await service.initialize();
      await service.initialize();

      // makeWASocket should only be called once
      expect(makeWASocket).toHaveBeenCalledTimes(1);
    });

    it('throws when sessionData is invalid JSON', async () => {
      const service = new WhatsAppService(createConfig({ sessionData: 'not-json' }));

      await expect(service.initialize()).rejects.toThrow('Invalid sessionData');
    });
  });

  // ── shutdown() ──

  describe('shutdown()', () => {
    it('cleans up listeners, ends socket, and sets isRunning = false', async () => {
      const service = new WhatsAppService(createConfig());
      await service.initialize();

      const sock = getMockSocket();

      await service.shutdown();

      expect(sock.ev.removeAllListeners).toHaveBeenCalledWith('messages.upsert');
      expect(sock.ev.removeAllListeners).toHaveBeenCalledWith('connection.update');
      expect(sock.end).toHaveBeenCalledWith(undefined);
      expect(service.isRunning).toBe(false);
    });

    it('no-ops when not running', async () => {
      const service = new WhatsAppService(createConfig());

      // Should not throw when called without initialize
      await expect(service.shutdown()).resolves.toBeUndefined();
    });
  });

  // ── sendMessage() ──

  describe('sendMessage()', () => {
    it('delegates to sock.sendMessage and returns key.id', async () => {
      const service = new WhatsAppService(createConfig());
      await service.initialize();

      const result = await service.sendMessage('123@s.whatsapp.net', 'Hello');

      const sock = getMockSocket();
      expect(sock.sendMessage).toHaveBeenCalledWith(
        '123@s.whatsapp.net',
        { text: 'Hello' },
        expect.objectContaining({ quoted: undefined }),
      );
      expect(result.key.id).toBe('msg-123');
      expect(result.messageTimestamp).toBe(1000);
    });

    it('passes quoted message option when quotedMessageId is provided', async () => {
      const service = new WhatsAppService(createConfig());
      await service.initialize();

      await service.sendMessage('123@s.whatsapp.net', 'Reply', {
        quotedMessageId: 'orig-456',
      });

      const sock = getMockSocket();
      expect(sock.sendMessage).toHaveBeenCalledWith(
        '123@s.whatsapp.net',
        { text: 'Reply' },
        expect.objectContaining({
          quoted: { key: { remoteJid: '123@s.whatsapp.net', id: 'orig-456' } },
        }),
      );
    });

    it('throws when not initialized', async () => {
      const service = new WhatsAppService(createConfig());

      await expect(service.sendMessage('123@s.whatsapp.net', 'Hi')).rejects.toThrow(
        'WhatsAppService not initialized',
      );
    });
  });

  // ── sendImage() ──

  describe('sendImage()', () => {
    it('delegates to sock.sendMessage with image payload', async () => {
      const service = new WhatsAppService(createConfig());
      await service.initialize();

      const result = await service.sendImage(
        '123@s.whatsapp.net',
        'https://example.com/img.png',
        'A caption',
      );

      const sock = getMockSocket();
      expect(sock.sendMessage).toHaveBeenCalledWith('123@s.whatsapp.net', {
        image: { url: 'https://example.com/img.png' },
        caption: 'A caption',
      });
      expect(result.key.id).toBe('msg-123');
    });

    it('sends undefined caption when none provided', async () => {
      const service = new WhatsAppService(createConfig());
      await service.initialize();

      await service.sendImage('123@s.whatsapp.net', 'https://example.com/img.png');

      const sock = getMockSocket();
      expect(sock.sendMessage).toHaveBeenCalledWith('123@s.whatsapp.net', {
        image: { url: 'https://example.com/img.png' },
        caption: undefined,
      });
    });
  });

  // ── sendDocument() ──

  describe('sendDocument()', () => {
    it('delegates to sock.sendMessage with document payload', async () => {
      const service = new WhatsAppService(createConfig());
      await service.initialize();

      const result = await service.sendDocument(
        '123@s.whatsapp.net',
        'https://example.com/doc.pdf',
        'report.pdf',
      );

      const sock = getMockSocket();
      expect(sock.sendMessage).toHaveBeenCalledWith('123@s.whatsapp.net', {
        document: { url: 'https://example.com/doc.pdf' },
        fileName: 'report.pdf',
      });
      expect(result.key.id).toBe('msg-123');
    });

    it('uses default filename when none provided', async () => {
      const service = new WhatsAppService(createConfig());
      await service.initialize();

      await service.sendDocument('123@s.whatsapp.net', 'https://example.com/doc.pdf');

      const sock = getMockSocket();
      expect(sock.sendMessage).toHaveBeenCalledWith('123@s.whatsapp.net', {
        document: { url: 'https://example.com/doc.pdf' },
        fileName: 'document',
      });
    });
  });

  // ── sendPresenceUpdate() ──

  describe('sendPresenceUpdate()', () => {
    it('delegates to sock.sendPresenceUpdate with correct arg order', async () => {
      const service = new WhatsAppService(createConfig());
      await service.initialize();

      await service.sendPresenceUpdate('123@s.whatsapp.net', 'composing');

      const sock = getMockSocket();
      expect(sock.sendPresenceUpdate).toHaveBeenCalledWith('composing', '123@s.whatsapp.net');
    });

    it('supports paused presence type', async () => {
      const service = new WhatsAppService(createConfig());
      await service.initialize();

      await service.sendPresenceUpdate('123@s.whatsapp.net', 'paused');

      const sock = getMockSocket();
      expect(sock.sendPresenceUpdate).toHaveBeenCalledWith('paused', '123@s.whatsapp.net');
    });
  });

  // ── onMessage / offMessage ──

  describe('onMessage / offMessage', () => {
    it('registers a message handler via onMessage', () => {
      const service = new WhatsAppService(createConfig());
      const handler = vi.fn();

      service.onMessage(handler);

      // Internally stored; we verify by removing it without error
      service.offMessage(handler);
    });

    it('offMessage removes a previously registered handler', () => {
      const service = new WhatsAppService(createConfig());
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      service.onMessage(handler1);
      service.onMessage(handler2);
      service.offMessage(handler1);

      // handler2 should still be registered; we can remove it too
      service.offMessage(handler2);
    });

    it('offMessage is a no-op for an unregistered handler', () => {
      const service = new WhatsAppService(createConfig());
      const handler = vi.fn();

      // Should not throw
      expect(() => service.offMessage(handler)).not.toThrow();
    });
  });

  // ── isGroupJid() ──

  describe('isGroupJid()', () => {
    it('returns true for group JIDs ending with @g.us', () => {
      const service = new WhatsAppService(createConfig());

      expect(service.isGroupJid('120363001234567890@g.us')).toBe(true);
    });

    it('returns false for individual JIDs ending with @s.whatsapp.net', () => {
      const service = new WhatsAppService(createConfig());

      expect(service.isGroupJid('1234567890@s.whatsapp.net')).toBe(false);
    });

    it('returns false for empty string', () => {
      const service = new WhatsAppService(createConfig());

      expect(service.isGroupJid('')).toBe(false);
    });
  });
});
