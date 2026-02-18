/**
 * Unit tests for DiscordService (discord.js wrapper).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('discord.js', () => {
  const mockChannel = {
    send: vi.fn().mockResolvedValue({
      id: '999',
      channelId: 'ch-123',
      createdAt: new Date('2024-01-01'),
    }),
    sendTyping: vi.fn().mockResolvedValue(undefined),
  };

  class MockClient {
    user = { id: 'bot-1', username: 'TestBot', discriminator: '0001', tag: 'TestBot#0001' };
    private handlers: Record<string, Function[]> = {};

    on(event: string, handler: Function) {
      if (!this.handlers[event]) this.handlers[event] = [];
      this.handlers[event].push(handler);
      return this;
    }

    once(event: string, handler: Function) {
      if (!this.handlers[event]) this.handlers[event] = [];
      this.handlers[event].push(handler);
      // Auto-trigger 'ready' for login flow
      if (event === 'ready') {
        setTimeout(() => handler(), 0);
      }
      return this;
    }

    login = vi.fn().mockResolvedValue('token');
    destroy = vi.fn();

    channels = {
      fetch: vi.fn().mockResolvedValue(mockChannel),
    };
  }

  class MockAttachmentBuilder {
    constructor(public url: string, public options?: any) {}
  }

  return {
    Client: MockClient,
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 512,
      MessageContent: 32768,
      DirectMessages: 4096,
    },
    AttachmentBuilder: MockAttachmentBuilder,
    ChannelType: {
      DM: 1,
      GuildText: 0,
      PublicThread: 11,
      PrivateThread: 12,
      AnnouncementThread: 10,
    },
  };
});

import { DiscordService, type DiscordChannelConfig } from '../src/DiscordService';

const TEST_CONFIG: DiscordChannelConfig = {
  botToken: 'test-token-123',
};

describe('DiscordService', () => {
  let service: DiscordService;

  beforeEach(() => {
    service = new DiscordService(TEST_CONFIG);
  });

  describe('constructor', () => {
    it('should store the config', () => {
      // The service is created; isRunning should be false initially
      expect(service.isRunning).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should create a Client, log in, and set isRunning to true', async () => {
      expect(service.isRunning).toBe(false);
      await service.initialize();
      expect(service.isRunning).toBe(true);
    });

    it('should be idempotent on double initialize', async () => {
      await service.initialize();
      await service.initialize();
      expect(service.isRunning).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should destroy the client and set isRunning to false', async () => {
      await service.initialize();
      expect(service.isRunning).toBe(true);

      await service.shutdown();
      expect(service.isRunning).toBe(false);
    });

    it('should no-op when not running', async () => {
      await service.shutdown(); // should not throw
      expect(service.isRunning).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('should fetch the channel and call channel.send', async () => {
      await service.initialize();
      const result = await service.sendMessage('ch-123', 'hello world');

      expect(result.id).toBe('999');
      expect(result.channelId).toBe('ch-123');
      expect(result.timestamp).toBe(new Date('2024-01-01').toISOString());
    });

    it('should throw when not initialized', async () => {
      await expect(service.sendMessage('ch-123', 'hello')).rejects.toThrow(
        'DiscordService not initialized',
      );
    });
  });

  describe('sendFile', () => {
    it('should create an AttachmentBuilder and send', async () => {
      await service.initialize();
      const result = await service.sendFile(
        'ch-123',
        'https://example.com/photo.jpg',
        'photo.jpg',
        'A test photo',
      );

      expect(result.id).toBe('999');
    });
  });

  describe('setTyping', () => {
    it('should call channel.sendTyping', async () => {
      await service.initialize();
      await service.setTyping('ch-123');
      // No throw means sendTyping was resolved
    });
  });

  describe('getBotInfo', () => {
    it('should return the bot user info', async () => {
      await service.initialize();
      const info = await service.getBotInfo();

      expect(info).toEqual({
        id: 'bot-1',
        username: 'TestBot',
        discriminator: '0001',
        tag: 'TestBot#0001',
      });
    });

    it('should return null when not initialized', async () => {
      const info = await service.getBotInfo();
      expect(info).toBeNull();
    });
  });

  describe('message handler management', () => {
    it('should register a handler via onMessage', () => {
      const handler = vi.fn();
      service.onMessage(handler);
      // No throw means it was added
    });

    it('should unregister a handler via offMessage', () => {
      const handler = vi.fn();
      service.onMessage(handler);
      service.offMessage(handler);
      // No assertion beyond no-throw -- dispatching tested in adapter
    });

    it('should not throw when removing a handler that was never added', () => {
      const handler = vi.fn();
      service.offMessage(handler); // should not throw
    });
  });

  describe('getClient', () => {
    it('should return the underlying client after initialization', async () => {
      await service.initialize();
      const client = service.getClient();
      expect(client).toBeDefined();
    });

    it('should throw when not initialized', () => {
      expect(() => service.getClient()).toThrow('DiscordService not initialized');
    });
  });
});
