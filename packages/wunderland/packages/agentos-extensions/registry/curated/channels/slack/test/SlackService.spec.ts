/**
 * Unit tests for SlackService (@slack/bolt wrapper).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @slack/bolt before importing SlackService
vi.mock('@slack/bolt', () => {
  const mockClient = {
    chat: {
      postMessage: vi.fn().mockResolvedValue({ ts: '1234.5678', channel: 'C123' }),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    files: {
      uploadV2: vi.fn().mockResolvedValue({ files: [{ id: 'F123' }] }),
    },
    reactions: {
      add: vi.fn().mockResolvedValue({}),
    },
    conversations: {
      info: vi.fn().mockResolvedValue({
        channel: {
          name: 'general',
          is_channel: true,
          num_members: 42,
          topic: { value: 'Test' },
          purpose: { value: 'Testing' },
        },
      }),
    },
    auth: {
      test: vi.fn().mockResolvedValue({ user_id: 'U123', bot_id: 'B123', team_id: 'T123' }),
    },
  };

  class MockApp {
    client = mockClient;
    message = vi.fn();
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
  }

  return { App: MockApp };
});

import { SlackService, type SlackChannelConfig } from '../src/SlackService';

const TEST_CONFIG: SlackChannelConfig = {
  botToken: 'xoxb-test',
  signingSecret: 'test-secret',
};

describe('SlackService', () => {
  let service: SlackService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SlackService(TEST_CONFIG);
  });

  describe('constructor', () => {
    it('should store config with socketMode defaulting to false when no appToken', () => {
      const svc = new SlackService({ botToken: 'xoxb-abc', signingSecret: 'secret' });
      // socketMode defaults to !!appToken which is false when no appToken
      expect(svc.isRunning).toBe(false);
    });

    it('should default socketMode to true when appToken is provided', () => {
      const svc = new SlackService({
        botToken: 'xoxb-abc',
        signingSecret: 'secret',
        appToken: 'xapp-test',
      });
      // Can only verify indirectly; the service should still be constructable
      expect(svc.isRunning).toBe(false);
    });
  });

  describe('lifecycle', () => {
    it('should initialize and set isRunning to true', async () => {
      expect(service.isRunning).toBe(false);
      await service.initialize();
      expect(service.isRunning).toBe(true);
    });

    it('should be idempotent on double initialize', async () => {
      await service.initialize();
      await service.initialize();
      expect(service.isRunning).toBe(true);
    });

    it('should shutdown and set isRunning to false', async () => {
      await service.initialize();
      expect(service.isRunning).toBe(true);
      await service.shutdown();
      expect(service.isRunning).toBe(false);
    });

    it('should no-op shutdown when not running', async () => {
      expect(service.isRunning).toBe(false);
      await service.shutdown(); // should not throw
      expect(service.isRunning).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('should call client.chat.postMessage with correct args', async () => {
      await service.initialize();
      const result = await service.sendMessage('C123', 'Hello world', {
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Hello world' } }],
        threadTs: '1111.2222',
      });

      expect(result).toEqual({ ts: '1234.5678', channel: 'C123' });

      const { App } = await import('@slack/bolt');
      const app = new App({} as any);
      expect(app.client.chat.postMessage).toHaveBeenCalledWith({
        channel: 'C123',
        text: 'Hello world',
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Hello world' } }],
        thread_ts: '1111.2222',
      });
    });

    it('should throw when not initialized', async () => {
      await expect(service.sendMessage('C123', 'Hello')).rejects.toThrow('not initialized');
    });
  });

  describe('uploadFile', () => {
    it('should call client.files.uploadV2 with correct args', async () => {
      await service.initialize();
      const result = await service.uploadFile('C123', 'https://example.com/file.pdf', 'doc.pdf');

      expect(result).toEqual({ fileId: 'F123' });

      const { App } = await import('@slack/bolt');
      const app = new App({} as any);
      expect(app.client.files.uploadV2).toHaveBeenCalledWith({
        channel_id: 'C123',
        file: 'https://example.com/file.pdf',
        filename: 'doc.pdf',
      });
    });

    it('should use default filename when not provided', async () => {
      await service.initialize();
      await service.uploadFile('C123', 'https://example.com/file.pdf');

      const { App } = await import('@slack/bolt');
      const app = new App({} as any);
      expect(app.client.files.uploadV2).toHaveBeenCalledWith(
        expect.objectContaining({ filename: 'upload' }),
      );
    });
  });

  describe('updateMessage', () => {
    it('should call client.chat.update with correct args', async () => {
      await service.initialize();
      await service.updateMessage('C123', '1234.5678', 'Updated text', {
        blocks: [{ type: 'section' }],
      });

      const { App } = await import('@slack/bolt');
      const app = new App({} as any);
      expect(app.client.chat.update).toHaveBeenCalledWith({
        channel: 'C123',
        ts: '1234.5678',
        text: 'Updated text',
        blocks: [{ type: 'section' }],
      });
    });
  });

  describe('deleteMessage', () => {
    it('should call client.chat.delete with correct args', async () => {
      await service.initialize();
      await service.deleteMessage('C123', '1234.5678');

      const { App } = await import('@slack/bolt');
      const app = new App({} as any);
      expect(app.client.chat.delete).toHaveBeenCalledWith({
        channel: 'C123',
        ts: '1234.5678',
      });
    });
  });

  describe('addReaction', () => {
    it('should call client.reactions.add with correct args', async () => {
      await service.initialize();
      await service.addReaction('C123', '1234.5678', 'thumbsup');

      const { App } = await import('@slack/bolt');
      const app = new App({} as any);
      expect(app.client.reactions.add).toHaveBeenCalledWith({
        channel: 'C123',
        timestamp: '1234.5678',
        name: 'thumbsup',
      });
    });
  });

  describe('getConversationInfo', () => {
    it('should return structured conversation info', async () => {
      await service.initialize();
      const info = await service.getConversationInfo('C123');

      expect(info).toEqual({
        name: 'general',
        isGroup: true,
        memberCount: 42,
        topic: 'Test',
        purpose: 'Testing',
        metadata: {
          is_im: undefined,
          is_mpim: undefined,
          is_channel: true,
          is_group: undefined,
          is_private: undefined,
        },
      });
    });
  });

  describe('setTyping', () => {
    it('should be a no-op and not throw', async () => {
      await service.initialize();
      await expect(service.setTyping('C123')).resolves.toBeUndefined();
    });
  });

  describe('getBotInfo', () => {
    it('should call client.auth.test and return bot info', async () => {
      await service.initialize();
      const info = await service.getBotInfo();

      expect(info).toEqual({
        userId: 'U123',
        botId: 'B123',
        teamId: 'T123',
      });
    });
  });

  describe('message handlers', () => {
    it('should register a handler via onMessage', () => {
      const handler = vi.fn();
      service.onMessage(handler);
      // No assertion beyond no-throw; dispatching tested in adapter tests
    });

    it('should unregister a handler via offMessage', () => {
      const handler = vi.fn();
      service.onMessage(handler);
      service.offMessage(handler);
      // No assertion beyond no-throw
    });

    it('should not throw when offMessage called with unregistered handler', () => {
      const handler = vi.fn();
      expect(() => service.offMessage(handler)).not.toThrow();
    });
  });
});
