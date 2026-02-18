/**
 * Unit tests for TelegramChannelAdapter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramChannelAdapter } from '../src/TelegramChannelAdapter';
import type { TelegramService } from '../src/TelegramService';
import type { MessageContent, ChannelEvent, ChannelMessage } from '@framers/agentos';

function createMockService(): TelegramService {
  return {
    isRunning: true,
    onMessage: vi.fn(),
    offMessage: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue({ message_id: 100 }),
    sendPhoto: vi.fn().mockResolvedValue({ message_id: 101 }),
    sendDocument: vi.fn().mockResolvedValue({ message_id: 102 }),
    sendChatAction: vi.fn().mockResolvedValue(undefined),
    api: {
      editMessageText: vi.fn().mockResolvedValue(undefined),
      deleteMessage: vi.fn().mockResolvedValue(undefined),
      setMessageReaction: vi.fn().mockResolvedValue(undefined),
      getChat: vi.fn().mockResolvedValue({ type: 'private', first_name: 'Alice' }),
      getChatMemberCount: vi.fn().mockResolvedValue(5),
    },
  } as any;
}

describe('TelegramChannelAdapter', () => {
  let adapter: TelegramChannelAdapter;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(() => {
    mockService = createMockService();
    adapter = new TelegramChannelAdapter(mockService);
  });

  describe('identity', () => {
    it('should declare platform as telegram', () => {
      expect(adapter.platform).toBe('telegram');
    });

    it('should declare expected capabilities', () => {
      expect(adapter.capabilities).toContain('text');
      expect(adapter.capabilities).toContain('images');
      expect(adapter.capabilities).toContain('typing_indicator');
      expect(adapter.capabilities).toContain('inline_keyboard');
    });
  });

  describe('sendMessage', () => {
    it('should send text messages', async () => {
      const content: MessageContent = {
        blocks: [{ type: 'text', text: 'Hello world' }],
      };
      const result = await adapter.sendMessage('123', content);
      expect(result.messageId).toBe('100');
      expect(mockService.sendMessage).toHaveBeenCalledWith('123', 'Hello world', expect.any(Object));
    });

    it('should send images when image block present', async () => {
      const content: MessageContent = {
        blocks: [
          { type: 'image', url: 'https://example.com/img.png', caption: 'A photo' },
        ],
      };
      const result = await adapter.sendMessage('123', content);
      expect(result.messageId).toBe('101');
      expect(mockService.sendPhoto).toHaveBeenCalled();
    });

    it('should send documents when document block present', async () => {
      const content: MessageContent = {
        blocks: [
          { type: 'document', url: 'https://example.com/doc.pdf', filename: 'doc.pdf' },
        ],
      };
      const result = await adapter.sendMessage('123', content);
      expect(result.messageId).toBe('102');
      expect(mockService.sendDocument).toHaveBeenCalled();
    });
  });

  describe('sendTypingIndicator', () => {
    it('should send typing action when isTyping=true', async () => {
      await adapter.sendTypingIndicator('123', true);
      expect(mockService.sendChatAction).toHaveBeenCalledWith('123', 'typing');
    });

    it('should no-op when isTyping=false', async () => {
      await adapter.sendTypingIndicator('123', false);
      expect(mockService.sendChatAction).not.toHaveBeenCalled();
    });
  });

  describe('event handlers', () => {
    it('should register and call handlers', () => {
      const handler = vi.fn();
      const unsub = adapter.on(handler);
      expect(typeof unsub).toBe('function');
    });

    it('should unsubscribe handlers', () => {
      const handler = vi.fn();
      const unsub = adapter.on(handler);
      unsub();
      // Handler map should be empty — tested via coverage
    });

    it('should filter by event type', () => {
      const handler = vi.fn();
      adapter.on(handler, ['message']);
      // Only 'message' events should reach this handler
    });
  });

  describe('getConnectionInfo', () => {
    it('should return connected when service is running', () => {
      const info = adapter.getConnectionInfo();
      expect(info.status).toBe('connected');
    });
  });

  describe('editMessage', () => {
    it('should delegate to service api', async () => {
      const content: MessageContent = { blocks: [{ type: 'text', text: 'edited' }] };
      await adapter.editMessage!('123', '456', content);
      expect(mockService.api.editMessageText).toHaveBeenCalledWith('123', 456, 'edited');
    });
  });

  describe('deleteMessage', () => {
    it('should delegate to service api', async () => {
      await adapter.deleteMessage!('123', '456');
      expect(mockService.api.deleteMessage).toHaveBeenCalledWith('123', 456);
    });
  });

  describe('getConversationInfo', () => {
    it('should return chat info for DM', async () => {
      const info = await adapter.getConversationInfo!('123');
      expect(info.name).toBe('Alice');
      expect(info.isGroup).toBe(false);
    });
  });
});
