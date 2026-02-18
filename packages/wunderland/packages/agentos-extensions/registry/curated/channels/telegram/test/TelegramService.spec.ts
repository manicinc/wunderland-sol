/**
 * Unit tests for TelegramService (grammY wrapper).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramService, type TelegramChannelConfig } from '../src/TelegramService';

// Mock grammy's Bot class
vi.mock('grammy', () => {
  const mockApi = {
    sendMessage: vi.fn().mockResolvedValue({ message_id: 42, chat: { id: 123 }, date: 1000, text: 'hello' }),
    sendPhoto: vi.fn().mockResolvedValue({ message_id: 43 }),
    sendDocument: vi.fn().mockResolvedValue({ message_id: 44 }),
    sendChatAction: vi.fn().mockResolvedValue(true),
    setWebhook: vi.fn().mockResolvedValue(true),
    getMe: vi.fn().mockResolvedValue({ id: 1, first_name: 'TestBot', username: 'testbot' }),
  };

  class MockBot {
    api = mockApi;
    private handlers: Record<string, Function[]> = {};

    on(event: string, handler: Function) {
      if (!this.handlers[event]) this.handlers[event] = [];
      this.handlers[event].push(handler);
    }

    start = vi.fn().mockImplementation(({ onStart }: any = {}) => {
      if (onStart) onStart();
    });

    stop = vi.fn().mockResolvedValue(undefined);
  }

  return { Bot: MockBot };
});

const TEST_CONFIG: TelegramChannelConfig = {
  botToken: 'test-token-123',
  rateLimit: { maxRequests: 100, windowMs: 1000 },
};

describe('TelegramService', () => {
  let service: TelegramService;

  beforeEach(() => {
    service = new TelegramService(TEST_CONFIG);
  });

  describe('lifecycle', () => {
    it('should initialize and mark as running', async () => {
      expect(service.isRunning).toBe(false);
      await service.initialize();
      expect(service.isRunning).toBe(true);
    });

    it('should be idempotent on double initialize', async () => {
      await service.initialize();
      await service.initialize();
      expect(service.isRunning).toBe(true);
    });

    it('should shutdown cleanly', async () => {
      await service.initialize();
      await service.shutdown();
      expect(service.isRunning).toBe(false);
    });

    it('should no-op shutdown when not running', async () => {
      await service.shutdown(); // should not throw
      expect(service.isRunning).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('should send a text message via api', async () => {
      await service.initialize();
      const result = await service.sendMessage('123', 'hello world');
      expect(result.message_id).toBe(42);
      expect(result.text).toBe('hello');
    });

    it('should throw when not initialized', async () => {
      await expect(service.sendMessage('123', 'hello')).rejects.toThrow('not initialized');
    });
  });

  describe('sendPhoto', () => {
    it('should send a photo via api', async () => {
      await service.initialize();
      const result = await service.sendPhoto('123', 'https://example.com/photo.jpg', { caption: 'test' });
      expect(result.message_id).toBe(43);
    });
  });

  describe('sendDocument', () => {
    it('should send a document via api', async () => {
      await service.initialize();
      const result = await service.sendDocument('123', 'https://example.com/doc.pdf');
      expect(result.message_id).toBe(44);
    });
  });

  describe('sendChatAction', () => {
    it('should send typing action', async () => {
      await service.initialize();
      await service.sendChatAction('123', 'typing');
      expect(service.api.sendChatAction).toHaveBeenCalledWith('123', 'typing');
    });
  });

  describe('getBotInfo', () => {
    it('should return bot metadata', async () => {
      await service.initialize();
      const info = await service.getBotInfo();
      expect(info.id).toBe(1);
      expect(info.username).toBe('testbot');
    });
  });

  describe('message handlers', () => {
    it('should register and unregister handlers', () => {
      const handler = vi.fn();
      service.onMessage(handler);
      service.offMessage(handler);
      // No assertion beyond no-throw — actual dispatching tested in adapter
    });
  });
});
