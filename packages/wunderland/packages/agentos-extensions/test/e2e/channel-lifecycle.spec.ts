/**
 * E2E tests for channel extension lifecycle.
 *
 * Verifies that channel extensions can be loaded via ExtensionManager
 * and that messaging-channel descriptors end up in the correct registry.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock grammy for Telegram extension
vi.mock('grammy', () => {
  const mockApi = {
    sendMessage: vi.fn().mockResolvedValue({ message_id: 1 }),
    sendChatAction: vi.fn(),
    setWebhook: vi.fn(),
    getMe: vi.fn().mockResolvedValue({ id: 1, first_name: 'Bot', username: 'bot' }),
  };

  class MockBot {
    api = mockApi;
    on = vi.fn();
    start = vi.fn().mockImplementation(({ onStart }: any = {}) => { if (onStart) onStart(); });
    stop = vi.fn().mockResolvedValue(undefined);
  }

  return { Bot: MockBot };
});

describe('E2E: Channel Extension Lifecycle', () => {
  it('should load a channel extension pack and register descriptors', async () => {
    // Dynamic import after mock setup
    const { createExtensionPack } = await import(
      '../../registry/curated/channels/telegram/src/index'
    );

    const pack = createExtensionPack({
      options: { botToken: 'test-token' },
    } as any);

    expect(pack.name).toBe('@framers/agentos-ext-channel-telegram');
    expect(pack.descriptors).toHaveLength(3);

    // Verify descriptor kinds
    const toolDescriptors = pack.descriptors.filter((d: any) => d.kind === 'tool');
    const channelDescriptors = pack.descriptors.filter((d: any) => d.kind === 'messaging-channel');

    expect(toolDescriptors).toHaveLength(2);
    expect(channelDescriptors).toHaveLength(1);
    expect(channelDescriptors[0].id).toBe('telegramChannel');
  });

  it('should activate and deactivate cleanly', async () => {
    const { createExtensionPack } = await import(
      '../../registry/curated/channels/telegram/src/index'
    );

    const pack = createExtensionPack({
      options: { botToken: 'test-token' },
      logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
    } as any);

    // Activate
    await pack.onActivate!();

    // Verify the channel adapter is accessible
    const adapter = pack.descriptors.find((d: any) => d.kind === 'messaging-channel')?.payload;
    expect(adapter).toBeDefined();
    expect(adapter.platform).toBe('telegram');
    expect(adapter.getConnectionInfo().status).toBe('connected');

    // Deactivate
    await pack.onDeactivate!();
  });

  it('should correctly set descriptor priorities', async () => {
    const { createExtensionPack } = await import(
      '../../registry/curated/channels/telegram/src/index'
    );

    const pack = createExtensionPack({
      options: { botToken: 'test-token', priority: 75 },
    } as any);

    for (const desc of pack.descriptors) {
      expect((desc as any).priority).toBe(75);
    }
  });

  it('should support multiple channel extensions simultaneously', async () => {
    const { createExtensionPack: createTelegramPack } = await import(
      '../../registry/curated/channels/telegram/src/index'
    );

    const pack1 = createTelegramPack({
      options: { botToken: 'token-1' },
    } as any);

    const pack2 = createTelegramPack({
      options: { botToken: 'token-2' },
    } as any);

    // Both packs should be independent
    expect(pack1.descriptors[2].id).toBe('telegramChannel');
    expect(pack2.descriptors[2].id).toBe('telegramChannel');

    // Descriptors should have different adapter instances
    expect(pack1.descriptors[2].payload).not.toBe(pack2.descriptors[2].payload);
  });
});
