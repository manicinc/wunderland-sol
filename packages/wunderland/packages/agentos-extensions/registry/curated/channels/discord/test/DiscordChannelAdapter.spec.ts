/**
 * Unit tests for DiscordChannelAdapter (IChannelAdapter implementation).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('discord.js', () => ({
  ChannelType: {
    DM: 1,
    GuildText: 0,
    PublicThread: 11,
    PrivateThread: 12,
    AnnouncementThread: 10,
  },
}));

import { DiscordChannelAdapter } from '../src/DiscordChannelAdapter';
import type { MessageContent } from '@framers/agentos';

function createMockService() {
  const mockMsg = { edit: vi.fn(), delete: vi.fn(), react: vi.fn() };
  const mockMessages = { fetch: vi.fn().mockResolvedValue(mockMsg) };
  const mockChannel = {
    messages: mockMessages,
    isDMBased: () => false,
    type: 0,
    name: 'general',
    guildId: 'guild-1',
    guild: { memberCount: 42 },
  };

  return {
    isRunning: true,
    onMessage: vi.fn(),
    offMessage: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue({
      id: 'msg-100',
      channelId: 'ch-1',
      timestamp: new Date().toISOString(),
    }),
    sendFile: vi.fn().mockResolvedValue({ id: 'msg-101' }),
    setTyping: vi.fn().mockResolvedValue(undefined),
    getBotInfo: vi.fn().mockResolvedValue({
      id: 'bot-1',
      username: 'Bot',
      discriminator: '0001',
      tag: 'Bot#0001',
    }),
    getClient: vi.fn().mockReturnValue({
      channels: { fetch: vi.fn().mockResolvedValue(mockChannel) },
    }),
    _mockChannel: mockChannel,
    _mockMsg: mockMsg,
  } as any;
}

describe('DiscordChannelAdapter', () => {
  let adapter: DiscordChannelAdapter;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(() => {
    mockService = createMockService();
    adapter = new DiscordChannelAdapter(mockService);
  });

  describe('platform and capabilities', () => {
    it('should have platform set to discord', () => {
      expect(adapter.platform).toBe('discord');
    });

    it('should expose the full set of capabilities', () => {
      const expected = [
        'text',
        'rich_text',
        'images',
        'documents',
        'embeds',
        'reactions',
        'threads',
        'typing_indicator',
        'group_chat',
        'mentions',
        'editing',
        'deletion',
      ];
      expect(adapter.capabilities).toEqual(expected);
    });
  });

  describe('sendMessage', () => {
    it('should call service.sendMessage for text blocks', async () => {
      const content: MessageContent = {
        blocks: [{ type: 'text', text: 'Hello Discord!' }],
      };

      const result = await adapter.sendMessage('ch-1', content);

      expect(mockService.sendMessage).toHaveBeenCalledWith('ch-1', 'Hello Discord!', {
        embeds: undefined,
        replyToMessageId: undefined,
      });
      expect(result.messageId).toBe('msg-100');
    });

    it('should call service.sendFile for image blocks', async () => {
      const content: MessageContent = {
        blocks: [{ type: 'image', url: 'https://example.com/img.png', caption: 'my-image' }],
      };

      const result = await adapter.sendMessage('ch-1', content);

      expect(mockService.sendFile).toHaveBeenCalledWith(
        'ch-1',
        'https://example.com/img.png',
        'my-image',
      );
      expect(result.messageId).toBe('msg-101');
    });

    it('should call service.sendFile for document blocks', async () => {
      const content: MessageContent = {
        blocks: [{ type: 'document', url: 'https://example.com/doc.pdf', filename: 'report.pdf' }],
      };

      const result = await adapter.sendMessage('ch-1', content);

      expect(mockService.sendFile).toHaveBeenCalledWith(
        'ch-1',
        'https://example.com/doc.pdf',
        'report.pdf',
      );
      expect(result.messageId).toBe('msg-101');
    });
  });

  describe('sendTypingIndicator', () => {
    it('should call service.setTyping when isTyping is true', async () => {
      await adapter.sendTypingIndicator('ch-1', true);
      expect(mockService.setTyping).toHaveBeenCalledWith('ch-1');
    });

    it('should NOT call service.setTyping when isTyping is false', async () => {
      await adapter.sendTypingIndicator('ch-1', false);
      expect(mockService.setTyping).not.toHaveBeenCalled();
    });
  });

  describe('on / off', () => {
    it('should return an unsubscribe function', () => {
      const handler = vi.fn();
      const unsub = adapter.on(handler);
      expect(typeof unsub).toBe('function');
    });

    it('should remove handler when unsubscribe is called', () => {
      const handler = vi.fn();
      const unsub = adapter.on(handler);
      unsub();
      // After unsubscribing, the handler map should no longer contain it
      // No throw confirms cleanup
    });
  });

  describe('getConnectionInfo', () => {
    it('should return connected when service is running', () => {
      mockService.isRunning = true;
      const info = adapter.getConnectionInfo();
      expect(info.status).toBe('connected');
    });

    it('should return disconnected when service is not running', () => {
      mockService.isRunning = false;
      const info = adapter.getConnectionInfo();
      expect(info.status).toBe('disconnected');
    });
  });

  describe('editMessage', () => {
    it('should delegate through service.getClient to edit the message', async () => {
      await adapter.editMessage('ch-1', 'msg-1', {
        blocks: [{ type: 'text', text: 'Edited text' }],
      });

      expect(mockService.getClient).toHaveBeenCalled();
      const client = mockService.getClient();
      expect(client.channels.fetch).toHaveBeenCalledWith('ch-1');
    });
  });

  describe('deleteMessage', () => {
    it('should delegate through service.getClient to delete the message', async () => {
      await adapter.deleteMessage('ch-1', 'msg-1');

      expect(mockService.getClient).toHaveBeenCalled();
      const client = mockService.getClient();
      expect(client.channels.fetch).toHaveBeenCalledWith('ch-1');
    });
  });

  describe('addReaction', () => {
    it('should delegate through service.getClient to add a reaction', async () => {
      await adapter.addReaction('ch-1', 'msg-1', '👍');

      expect(mockService.getClient).toHaveBeenCalled();
      const client = mockService.getClient();
      expect(client.channels.fetch).toHaveBeenCalledWith('ch-1');
    });
  });
});
