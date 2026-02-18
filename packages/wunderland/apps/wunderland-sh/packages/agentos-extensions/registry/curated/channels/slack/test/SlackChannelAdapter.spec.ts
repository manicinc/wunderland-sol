/**
 * Unit tests for SlackChannelAdapter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @slack/bolt for the MessageEvent type import
vi.mock('@slack/bolt', () => ({}));

import { SlackChannelAdapter } from '../src/SlackChannelAdapter';
import type { SlackService } from '../src/SlackService';
import type { MessageContent } from '@framers/agentos';

function createMockService(): SlackService {
  return {
    isRunning: true,
    onMessage: vi.fn(),
    offMessage: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue({ ts: '1234.5678', channel: 'C123' }),
    uploadFile: vi.fn().mockResolvedValue({ fileId: 'F123' }),
    updateMessage: vi.fn().mockResolvedValue(undefined),
    deleteMessage: vi.fn().mockResolvedValue(undefined),
    addReaction: vi.fn().mockResolvedValue(undefined),
    getConversationInfo: vi.fn().mockResolvedValue({
      name: 'general',
      isGroup: true,
      memberCount: 42,
      topic: 'Test',
      purpose: 'Testing',
      metadata: { is_channel: true },
    }),
    setTyping: vi.fn().mockResolvedValue(undefined),
    getBotInfo: vi.fn().mockResolvedValue({ userId: 'U123', botId: 'B123', teamId: 'T123' }),
  } as any;
}

describe('SlackChannelAdapter', () => {
  let adapter: SlackChannelAdapter;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = createMockService();
    adapter = new SlackChannelAdapter(mockService);
  });

  describe('identity', () => {
    it('should declare platform as slack', () => {
      expect(adapter.platform).toBe('slack');
    });

    it('should declare expected capabilities', () => {
      const expected = [
        'text',
        'rich_text',
        'images',
        'documents',
        'threads',
        'reactions',
        'mentions',
        'group_chat',
        'editing',
        'deletion',
      ];
      for (const cap of expected) {
        expect(adapter.capabilities).toContain(cap);
      }
    });
  });

  describe('sendMessage', () => {
    it('should send text message with Slack blocks', async () => {
      const content: MessageContent = {
        blocks: [{ type: 'text', text: 'Hello Slack' }],
      };
      const result = await adapter.sendMessage('C123', content);

      expect(result.messageId).toBe('1234.5678');
      expect(mockService.sendMessage).toHaveBeenCalledWith('C123', 'Hello Slack', {
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: 'Hello Slack' },
          },
        ],
        threadTs: undefined,
      });
    });

    it('should add image block to slack blocks when image present', async () => {
      const content: MessageContent = {
        blocks: [
          { type: 'text', text: 'Check this out' },
          { type: 'image', url: 'https://example.com/img.png', caption: 'A photo' },
        ],
      };
      await adapter.sendMessage('C123', content);

      expect(mockService.sendMessage).toHaveBeenCalledWith(
        'C123',
        'Check this out',
        expect.objectContaining({
          blocks: [
            { type: 'section', text: { type: 'mrkdwn', text: 'Check this out' } },
            { type: 'image', image_url: 'https://example.com/img.png', alt_text: 'A photo' },
          ],
        }),
      );
    });

    it('should call service.uploadFile when document block present', async () => {
      const content: MessageContent = {
        blocks: [
          { type: 'document', url: 'https://example.com/doc.pdf', filename: 'doc.pdf' },
        ],
      };
      await adapter.sendMessage('C123', content);

      expect(mockService.uploadFile).toHaveBeenCalledWith(
        'C123',
        'https://example.com/doc.pdf',
        'doc.pdf',
      );
    });

    it('should pass replyToMessageId as threadTs', async () => {
      const content: MessageContent = {
        blocks: [{ type: 'text', text: 'Thread reply' }],
        replyToMessageId: '9999.0000',
      };
      await adapter.sendMessage('C123', content);

      expect(mockService.sendMessage).toHaveBeenCalledWith(
        'C123',
        'Thread reply',
        expect.objectContaining({ threadTs: '9999.0000' }),
      );
    });
  });

  describe('sendTypingIndicator', () => {
    it('should be a no-op when isTyping is true', async () => {
      await expect(adapter.sendTypingIndicator('C123', true)).resolves.toBeUndefined();
    });

    it('should be a no-op when isTyping is false', async () => {
      await expect(adapter.sendTypingIndicator('C123', false)).resolves.toBeUndefined();
    });
  });

  describe('event handlers', () => {
    it('should return an unsubscribe function from on()', () => {
      const handler = vi.fn();
      const unsub = adapter.on(handler);
      expect(typeof unsub).toBe('function');
    });

    it('should unsubscribe handler when calling returned function', () => {
      const handler = vi.fn();
      const unsub = adapter.on(handler);
      unsub();
      // Handler removed; no assertion beyond no-throw
    });

    it('should accept event type filter', () => {
      const handler = vi.fn();
      const unsub = adapter.on(handler, ['message']);
      expect(typeof unsub).toBe('function');
      unsub();
    });
  });

  describe('getConnectionInfo', () => {
    it('should return connected when service is running', () => {
      const info = adapter.getConnectionInfo();
      expect(info.status).toBe('connected');
    });

    it('should return disconnected when service is not running', () => {
      (mockService as any).isRunning = false;
      const info = adapter.getConnectionInfo();
      expect(info.status).toBe('disconnected');
    });
  });

  describe('editMessage', () => {
    it('should call service.updateMessage with text and blocks', async () => {
      const content: MessageContent = {
        blocks: [{ type: 'text', text: 'edited text' }],
      };
      await adapter.editMessage('C123', '1234.5678', content);

      expect(mockService.updateMessage).toHaveBeenCalledWith('C123', '1234.5678', 'edited text', {
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'edited text' } }],
      });
    });
  });

  describe('deleteMessage', () => {
    it('should call service.deleteMessage', async () => {
      await adapter.deleteMessage('C123', '1234.5678');
      expect(mockService.deleteMessage).toHaveBeenCalledWith('C123', '1234.5678');
    });
  });

  describe('addReaction', () => {
    it('should call service.addReaction with stripped colons', async () => {
      await adapter.addReaction('C123', '1234.5678', ':thumbsup:');
      expect(mockService.addReaction).toHaveBeenCalledWith('C123', '1234.5678', 'thumbsup');
    });

    it('should pass through emoji without colons unchanged', async () => {
      await adapter.addReaction('C123', '1234.5678', 'fire');
      expect(mockService.addReaction).toHaveBeenCalledWith('C123', '1234.5678', 'fire');
    });
  });

  describe('getConversationInfo', () => {
    it('should delegate to service and return structured info', async () => {
      const info = await adapter.getConversationInfo('C123');

      expect(info).toEqual({
        name: 'general',
        memberCount: 42,
        isGroup: true,
        metadata: {
          topic: 'Test',
          purpose: 'Testing',
          is_channel: true,
        },
      });

      expect(mockService.getConversationInfo).toHaveBeenCalledWith('C123');
    });
  });
});
