/**
 * Unit tests for the Telegram channel extension factory.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock grammy before importing the factory
vi.mock('grammy', () => {
  const mockApi = {
    sendMessage: vi.fn().mockResolvedValue({ message_id: 1 }),
    setWebhook: vi.fn().mockResolvedValue(true),
    getMe: vi.fn().mockResolvedValue({ id: 1, first_name: 'Bot', username: 'bot' }),
    sendChatAction: vi.fn(),
  };

  class MockBot {
    api = mockApi;
    on = vi.fn();
    start = vi.fn().mockImplementation(({ onStart }: any = {}) => { if (onStart) onStart(); });
    stop = vi.fn().mockResolvedValue(undefined);
  }

  return { Bot: MockBot };
});

import { createExtensionPack } from '../src/index';

describe('createExtensionPack', () => {
  it('should create a pack with the correct name', () => {
    const pack = createExtensionPack({
      options: { botToken: 'test-token' },
    } as any);
    expect(pack.name).toBe('@framers/agentos-ext-channel-telegram');
    expect(pack.version).toBe('0.1.0');
  });

  it('should include tool and messaging-channel descriptors', () => {
    const pack = createExtensionPack({
      options: { botToken: 'test-token' },
    } as any);

    expect(pack.descriptors).toHaveLength(3);

    const tools = pack.descriptors.filter((d) => d.kind === 'tool');
    const channels = pack.descriptors.filter((d) => d.kind === 'messaging-channel');

    expect(tools).toHaveLength(2);
    expect(channels).toHaveLength(1);
    expect(channels[0].id).toBe('telegramChannel');
  });

  it('should resolve token from secrets map', () => {
    const pack = createExtensionPack({
      options: { secrets: { 'telegram.botToken': 'secret-token' } },
    } as any);
    expect(pack.descriptors.length).toBe(3);
  });

  it('should throw when no bot token is available', () => {
    // Clear env vars
    const origEnv = process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_TOKEN;

    expect(() =>
      createExtensionPack({ options: {} } as any),
    ).toThrow(/bot token not found/i);

    if (origEnv) process.env.TELEGRAM_BOT_TOKEN = origEnv;
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
