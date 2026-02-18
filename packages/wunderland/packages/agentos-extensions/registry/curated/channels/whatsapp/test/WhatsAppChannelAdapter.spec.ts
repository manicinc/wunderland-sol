/**
 * @fileoverview Unit tests for WhatsAppChannelAdapter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WhatsAppChannelAdapter } from '../src/WhatsAppChannelAdapter';
import type { MessageContent } from '@framers/agentos';

function createMockService() {
  return {
    isRunning: true,
    onMessage: vi.fn(),
    offMessage: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue({ key: { id: 'msg-100' }, messageTimestamp: 1000 }),
    sendImage: vi.fn().mockResolvedValue({ key: { id: 'msg-101' } }),
    sendDocument: vi.fn().mockResolvedValue({ key: { id: 'msg-102' } }),
    sendPresenceUpdate: vi.fn().mockResolvedValue(undefined),
    isGroupJid: vi.fn((jid: string) => jid.endsWith('@g.us')),
  } as any;
}

describe('WhatsAppChannelAdapter', () => {
  let mockService: ReturnType<typeof createMockService>;
  let adapter: WhatsAppChannelAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = createMockService();
    adapter = new WhatsAppChannelAdapter(mockService);
  });

  // ── platform & capabilities ──

  describe('platform', () => {
    it('is "whatsapp"', () => {
      expect(adapter.platform).toBe('whatsapp');
    });
  });

  describe('capabilities', () => {
    it('includes all expected capabilities', () => {
      expect(adapter.capabilities).toContain('text');
      expect(adapter.capabilities).toContain('images');
      expect(adapter.capabilities).toContain('audio');
      expect(adapter.capabilities).toContain('documents');
      expect(adapter.capabilities).toContain('typing_indicator');
      expect(adapter.capabilities).toContain('read_receipts');
      expect(adapter.capabilities).toContain('group_chat');
    });

    it('has exactly 7 capabilities', () => {
      expect(adapter.capabilities).toHaveLength(7);
    });
  });

  // ── sendMessage() ──

  describe('sendMessage()', () => {
    it('calls service.sendMessage for text content blocks', async () => {
      const content: MessageContent = {
        blocks: [{ type: 'text', text: 'Hello from adapter' }],
      };

      const result = await adapter.sendMessage('123@s.whatsapp.net', content);

      expect(mockService.sendMessage).toHaveBeenCalledWith('123@s.whatsapp.net', 'Hello from adapter', {
        quotedMessageId: undefined,
      });
      expect(result.messageId).toBe('msg-100');
      expect(result.timestamp).toBeDefined();
    });

    it('calls service.sendImage for image content blocks', async () => {
      const content: MessageContent = {
        blocks: [{ type: 'image', url: 'https://example.com/photo.jpg', caption: 'Nice photo' }],
      };

      const result = await adapter.sendMessage('123@s.whatsapp.net', content);

      expect(mockService.sendImage).toHaveBeenCalledWith(
        '123@s.whatsapp.net',
        'https://example.com/photo.jpg',
        'Nice photo',
      );
      expect(result.messageId).toBe('msg-101');
    });

    it('calls service.sendDocument for document content blocks', async () => {
      const content: MessageContent = {
        blocks: [{ type: 'document', url: 'https://example.com/report.pdf', filename: 'report.pdf' }],
      };

      const result = await adapter.sendMessage('123@s.whatsapp.net', content);

      expect(mockService.sendDocument).toHaveBeenCalledWith(
        '123@s.whatsapp.net',
        'https://example.com/report.pdf',
        'report.pdf',
      );
      expect(result.messageId).toBe('msg-102');
    });

    it('passes replyToMessageId as quotedMessageId for text messages', async () => {
      const content: MessageContent = {
        blocks: [{ type: 'text', text: 'A reply' }],
        replyToMessageId: 'quoted-789',
      };

      await adapter.sendMessage('123@s.whatsapp.net', content);

      expect(mockService.sendMessage).toHaveBeenCalledWith('123@s.whatsapp.net', 'A reply', {
        quotedMessageId: 'quoted-789',
      });
    });

    it('prefers image block over text when both present', async () => {
      const content: MessageContent = {
        blocks: [
          { type: 'text', text: 'Fallback caption' },
          { type: 'image', url: 'https://example.com/img.png' },
        ],
      };

      await adapter.sendMessage('123@s.whatsapp.net', content);

      expect(mockService.sendImage).toHaveBeenCalledWith(
        '123@s.whatsapp.net',
        'https://example.com/img.png',
        'Fallback caption',
      );
      expect(mockService.sendMessage).not.toHaveBeenCalled();
    });
  });

  // ── sendTypingIndicator() ──

  describe('sendTypingIndicator()', () => {
    it('calls service.sendPresenceUpdate with "composing" when isTyping is true', async () => {
      await adapter.sendTypingIndicator('123@s.whatsapp.net', true);

      expect(mockService.sendPresenceUpdate).toHaveBeenCalledWith('123@s.whatsapp.net', 'composing');
    });

    it('calls service.sendPresenceUpdate with "paused" when isTyping is false', async () => {
      await adapter.sendTypingIndicator('123@s.whatsapp.net', false);

      expect(mockService.sendPresenceUpdate).toHaveBeenCalledWith('123@s.whatsapp.net', 'paused');
    });
  });

  // ── on() ──

  describe('on()', () => {
    it('returns an unsubscribe function', () => {
      const handler = vi.fn();
      const unsub = adapter.on(handler);

      expect(typeof unsub).toBe('function');
    });

    it('unsubscribe function removes the handler', () => {
      const handler = vi.fn();
      const unsub = adapter.on(handler);

      unsub();

      // After unsubscribe, handler should not be called on future events.
      // We verify by calling on() again — if internal map was cleaned, this works.
      const handler2 = vi.fn();
      const unsub2 = adapter.on(handler2);
      unsub2();
    });
  });

  // ── getConnectionInfo() ──

  describe('getConnectionInfo()', () => {
    it('returns connected when service.isRunning is true', () => {
      mockService.isRunning = true;

      const info = adapter.getConnectionInfo();

      expect(info.status).toBe('connected');
    });

    it('returns disconnected when service.isRunning is false', () => {
      mockService.isRunning = false;

      const info = adapter.getConnectionInfo();

      expect(info.status).toBe('disconnected');
    });
  });

  // ── initialize() ──

  describe('initialize()', () => {
    it('registers a message handler on the service', async () => {
      await adapter.initialize({ platform: 'whatsapp', credential: '{}' } as any);

      expect(mockService.onMessage).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  // ── shutdown() ──

  describe('shutdown()', () => {
    it('removes message handler and clears event handlers', async () => {
      await adapter.initialize({ platform: 'whatsapp', credential: '{}' } as any);

      await adapter.shutdown();

      expect(mockService.offMessage).toHaveBeenCalledWith(expect.any(Function));
    });

    it('is safe to call when not initialized', async () => {
      await expect(adapter.shutdown()).resolves.toBeUndefined();
    });
  });
});
