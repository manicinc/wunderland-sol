/**
 * Unit tests for the Discord channel extension factory (createExtensionPack).
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

import { createExtensionPack } from '../src/index';

describe('createExtensionPack', () => {
  beforeEach(() => {
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_TOKEN;
  });

  it('should create a pack with the correct name', () => {
    const pack = createExtensionPack({
      options: { botToken: 'test-token' },
    } as any);
    expect(pack.name).toBe('@framers/agentos-ext-channel-discord');
  });

  it('should include 3 descriptors (2 tools + 1 messaging-channel)', () => {
    const pack = createExtensionPack({
      options: { botToken: 'test-token' },
    } as any);

    expect(pack.descriptors).toHaveLength(3);

    const tools = pack.descriptors.filter((d) => d.kind === 'tool');
    const channels = pack.descriptors.filter((d) => d.kind === 'messaging-channel');

    expect(tools).toHaveLength(2);
    expect(channels).toHaveLength(1);
  });

  it('should have the correct tool descriptor IDs', () => {
    const pack = createExtensionPack({
      options: { botToken: 'test-token' },
    } as any);

    const toolIds = pack.descriptors
      .filter((d) => d.kind === 'tool')
      .map((d) => d.id);

    expect(toolIds).toContain('discordChannelSendMessage');
    expect(toolIds).toContain('discordChannelSendMedia');
  });

  it('should have the correct channel descriptor ID', () => {
    const pack = createExtensionPack({
      options: { botToken: 'test-token' },
    } as any);

    const channel = pack.descriptors.find((d) => d.kind === 'messaging-channel');
    expect(channel?.id).toBe('discordChannel');
  });

  it('should resolve botToken from options.botToken', () => {
    const pack = createExtensionPack({
      options: { botToken: 'direct-token' },
    } as any);
    // If it resolves, pack is created without error
    expect(pack.descriptors.length).toBe(3);
  });

  it('should resolve botToken from options.secrets["discord.botToken"]', () => {
    const pack = createExtensionPack({
      options: { secrets: { 'discord.botToken': 'secret-token' } },
    } as any);
    expect(pack.descriptors.length).toBe(3);
  });

  it('should throw if no token is found', () => {
    expect(() =>
      createExtensionPack({ options: {} } as any),
    ).toThrow(/bot token not found/i);
  });

  it('should apply custom priority to descriptors', () => {
    const pack = createExtensionPack({
      options: { botToken: 'test-token', priority: 99 },
    } as any);

    for (const descriptor of pack.descriptors) {
      expect(descriptor.priority).toBe(99);
    }
  });

  it('should use default priority of 50 when not specified', () => {
    const pack = createExtensionPack({
      options: { botToken: 'test-token' },
    } as any);

    for (const descriptor of pack.descriptors) {
      expect(descriptor.priority).toBe(50);
    }
  });

  it('should have onActivate and onDeactivate lifecycle hooks', () => {
    const pack = createExtensionPack({
      options: { botToken: 'test-token' },
    } as any);
    expect(typeof pack.onActivate).toBe('function');
    expect(typeof pack.onDeactivate).toBe('function');
  });

  it('should activate and deactivate without errors', async () => {
    const pack = createExtensionPack({
      options: { botToken: 'test-token' },
    } as any);
    await pack.onActivate!();
    await pack.onDeactivate!();
  });
});
