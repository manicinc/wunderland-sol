/**
 * Unit tests for WebChatService (lightweight event broker).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebChatService } from '../src/WebChatService';
import type { WebChatInboundMessage } from '../src/WebChatService';

function createTestMessage(overrides: Partial<WebChatInboundMessage> = {}): WebChatInboundMessage {
  return {
    messageId: 'msg-001',
    conversationId: 'conv-001',
    sender: { id: 'user-1', displayName: 'Alice', username: 'alice' },
    text: 'Hello from test',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe('WebChatService', () => {
  let service: WebChatService;

  beforeEach(() => {
    service = new WebChatService();
  });

  describe('lifecycle', () => {
    it('should start with isRunning as false', () => {
      expect(service.isRunning).toBe(false);
    });

    it('should set isRunning to true after initialize()', async () => {
      await service.initialize();
      expect(service.isRunning).toBe(true);
    });

    it('should be idempotent on double initialize', async () => {
      await service.initialize();
      await service.initialize();
      expect(service.isRunning).toBe(true);
    });

    it('should set isRunning to false after shutdown()', async () => {
      await service.initialize();
      await service.shutdown();
      expect(service.isRunning).toBe(false);
    });

    it('should no-op shutdown when not running', async () => {
      await service.shutdown(); // should not throw
      expect(service.isRunning).toBe(false);
    });

    it('should clear inbound handlers on shutdown', async () => {
      await service.initialize();
      const handler = vi.fn();
      service.onInbound(handler);

      await service.shutdown();

      // Re-initialize and inject — handler should NOT be called
      await service.initialize();
      service.injectMessage(createTestMessage());

      // Allow microtasks to flush
      await new Promise((r) => setTimeout(r, 10));
      expect(handler).not.toHaveBeenCalled();
    });

    it('should clear the onSend callback on shutdown', async () => {
      await service.initialize();
      service.onSend = vi.fn();
      expect(service.onSend).not.toBeNull();

      await service.shutdown();
      expect(service.onSend).toBeNull();
    });
  });

  describe('sendMessage', () => {
    it('should call the registered onSend callback', async () => {
      await service.initialize();
      const callback = vi.fn().mockResolvedValue(undefined);
      service.onSend = callback;

      await service.sendMessage('conv-001', 'hello', { typing: false });

      expect(callback).toHaveBeenCalledWith('conv-001', 'hello', { typing: false });
    });

    it('should throw when not running', async () => {
      await expect(service.sendMessage('conv-001', 'hello')).rejects.toThrow(
        'WebChatService is not running',
      );
    });

    it('should silently no-op when no callback is registered', async () => {
      await service.initialize();
      // No onSend set — should not throw
      await expect(service.sendMessage('conv-001', 'hello')).resolves.toBeUndefined();
    });
  });

  describe('onSend setter/getter', () => {
    it('should allow setting and getting the onSend callback', () => {
      const cb = vi.fn();
      service.onSend = cb;
      expect(service.onSend).toBe(cb);
    });

    it('should allow clearing the onSend callback by setting null', () => {
      service.onSend = vi.fn();
      service.onSend = null;
      expect(service.onSend).toBeNull();
    });
  });

  describe('inbound handler management', () => {
    it('should register handlers via onInbound', () => {
      const handler = vi.fn();
      service.onInbound(handler);

      service.injectMessage(createTestMessage());
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should unregister handlers via offInbound', () => {
      const handler = vi.fn();
      service.onInbound(handler);
      service.offInbound(handler);

      service.injectMessage(createTestMessage());
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow multiple handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      service.onInbound(handler1);
      service.onInbound(handler2);

      const msg = createTestMessage();
      service.injectMessage(msg);

      expect(handler1).toHaveBeenCalledWith(msg);
      expect(handler2).toHaveBeenCalledWith(msg);
    });

    it('should only remove the specific handler on offInbound', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      service.onInbound(handler1);
      service.onInbound(handler2);
      service.offInbound(handler1);

      service.injectMessage(createTestMessage());

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should no-op offInbound for unregistered handler', () => {
      const handler = vi.fn();
      // Should not throw
      service.offInbound(handler);
    });
  });

  describe('injectMessage', () => {
    it('should dispatch to all registered handlers', () => {
      const handlers = [vi.fn(), vi.fn(), vi.fn()];
      handlers.forEach((h) => service.onInbound(h));

      const msg = createTestMessage();
      service.injectMessage(msg);

      handlers.forEach((h) => {
        expect(h).toHaveBeenCalledWith(msg);
      });
    });

    it('should handle async handlers without throwing', async () => {
      const asyncHandler = vi.fn().mockResolvedValue(undefined);
      service.onInbound(asyncHandler);

      service.injectMessage(createTestMessage());

      // Allow microtasks to flush
      await new Promise((r) => setTimeout(r, 10));
      expect(asyncHandler).toHaveBeenCalledTimes(1);
    });

    it('should catch and log errors from handlers without breaking dispatch', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const failingHandler = vi.fn().mockRejectedValue(new Error('handler boom'));
      const goodHandler = vi.fn();
      service.onInbound(failingHandler);
      service.onInbound(goodHandler);

      service.injectMessage(createTestMessage());

      // Allow promise rejection to propagate
      await new Promise((r) => setTimeout(r, 10));

      expect(failingHandler).toHaveBeenCalledTimes(1);
      expect(goodHandler).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith(
        '[WebChatService] Inbound handler error:',
        expect.any(Error),
      );

      consoleError.mockRestore();
    });

    it('should pass full message shape to handlers', () => {
      const handler = vi.fn();
      service.onInbound(handler);

      const msg = createTestMessage({
        messageId: 'test-123',
        conversationId: 'room-42',
        sender: { id: 'u1', displayName: 'Bob', username: 'bob', avatarUrl: 'https://example.com/bob.png' },
        text: 'specific text',
        metadata: { clientVersion: '2.0' },
      });

      service.injectMessage(msg);

      const received = handler.mock.calls[0][0];
      expect(received.messageId).toBe('test-123');
      expect(received.conversationId).toBe('room-42');
      expect(received.sender.avatarUrl).toBe('https://example.com/bob.png');
      expect(received.text).toBe('specific text');
      expect(received.metadata).toEqual({ clientVersion: '2.0' });
    });
  });
});
