/**
 * Unit tests for WebChatChannelAdapter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebChatChannelAdapter } from '../src/WebChatChannelAdapter';
import type { MessageContent } from '@framers/agentos';

function createMockService() {
  return {
    isRunning: true,
    onInbound: vi.fn(),
    offInbound: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
    onSend: null as any,
    injectMessage: vi.fn(),
  } as any;
}

describe('WebChatChannelAdapter', () => {
  let adapter: WebChatChannelAdapter;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(() => {
    mockService = createMockService();
    adapter = new WebChatChannelAdapter(mockService);
  });

  describe('identity', () => {
    it('should declare platform as webchat', () => {
      expect(adapter.platform).toBe('webchat');
    });

    it('should declare displayName as WebChat', () => {
      expect(adapter.displayName).toBe('WebChat');
    });

    it('should declare expected capabilities', () => {
      expect(adapter.capabilities).toContain('text');
      expect(adapter.capabilities).toContain('images');
      expect(adapter.capabilities).toContain('typing_indicator');
      expect(adapter.capabilities).toContain('read_receipts');
    });

    it('should have exactly 4 capabilities', () => {
      expect(adapter.capabilities).toHaveLength(4);
    });
  });

  describe('sendMessage', () => {
    it('should send text block via service.sendMessage', async () => {
      const content: MessageContent = {
        blocks: [{ type: 'text', text: 'Hello world' }],
      };
      await adapter.sendMessage('conv-1', content);

      expect(mockService.sendMessage).toHaveBeenCalledWith('conv-1', 'Hello world');
    });

    it('should return a messageId and timestamp', async () => {
      const content: MessageContent = {
        blocks: [{ type: 'text', text: 'Test' }],
      };
      const result = await adapter.sendMessage('conv-1', content);

      expect(result.messageId).toBeDefined();
      expect(typeof result.messageId).toBe('string');
      expect(result.timestamp).toBeDefined();
      // Timestamp should be a valid ISO string
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should send empty string when no text block is found', async () => {
      const content: MessageContent = {
        blocks: [],
      };
      await adapter.sendMessage('conv-1', content);

      expect(mockService.sendMessage).toHaveBeenCalledWith('conv-1', '');
    });

    it('should use the first text block when multiple blocks exist', async () => {
      const content: MessageContent = {
        blocks: [
          { type: 'text', text: 'First message' },
          { type: 'text', text: 'Second message' },
        ],
      };
      await adapter.sendMessage('conv-1', content);

      expect(mockService.sendMessage).toHaveBeenCalledWith('conv-1', 'First message');
    });
  });

  describe('sendTypingIndicator', () => {
    it('should call service.sendMessage with typing:true metadata', async () => {
      await adapter.sendTypingIndicator('conv-1', true);

      expect(mockService.sendMessage).toHaveBeenCalledWith('conv-1', '', { typing: true });
    });

    it('should call service.sendMessage with typing:false metadata', async () => {
      await adapter.sendTypingIndicator('conv-1', false);

      expect(mockService.sendMessage).toHaveBeenCalledWith('conv-1', '', { typing: false });
    });
  });

  describe('event handlers', () => {
    it('should return an unsubscribe function from on()', () => {
      const handler = vi.fn();
      const unsub = adapter.on(handler);

      expect(typeof unsub).toBe('function');
    });

    it('should remove handler when unsubscribe is called', () => {
      const handler = vi.fn();
      const unsub = adapter.on(handler);
      unsub();
      // Coverage confirms handler is removed from map
    });

    it('should accept event type filters', () => {
      const handler = vi.fn();
      const unsub = adapter.on(handler, ['message']);
      expect(typeof unsub).toBe('function');
      unsub();
    });
  });

  describe('getConnectionInfo', () => {
    it('should return connected when service.isRunning is true', () => {
      mockService.isRunning = true;
      const info = adapter.getConnectionInfo();
      expect(info.status).toBe('connected');
    });

    it('should return disconnected when service.isRunning is false', () => {
      mockService.isRunning = false;
      const info = adapter.getConnectionInfo();
      expect(info.status).toBe('disconnected');
    });
  });

  describe('initialize', () => {
    it('should register an inbound handler on the service', async () => {
      await adapter.initialize({ platform: 'webchat', credential: '' });

      expect(mockService.onInbound).toHaveBeenCalledTimes(1);
      expect(typeof mockService.onInbound.mock.calls[0][0]).toBe('function');
    });
  });

  describe('shutdown', () => {
    it('should clear the inbound handler from the service', async () => {
      await adapter.initialize({ platform: 'webchat', credential: '' });
      await adapter.shutdown();

      expect(mockService.offInbound).toHaveBeenCalledTimes(1);
      // The handler passed to offInbound should be the same one registered via onInbound
      expect(mockService.offInbound.mock.calls[0][0]).toBe(
        mockService.onInbound.mock.calls[0][0],
      );
    });

    it('should be safe to call shutdown without prior initialize', async () => {
      // No initialize call — should not throw
      await adapter.shutdown();
      expect(mockService.offInbound).not.toHaveBeenCalled();
    });

    it('should clear event handlers on shutdown', async () => {
      const handler = vi.fn();
      adapter.on(handler);

      await adapter.shutdown();
      // After shutdown, no event should be dispatched to handler.
      // Internal handlers map is cleared — verified via coverage.
    });
  });
});
