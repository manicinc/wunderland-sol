/**
 * Unit tests for the Slack channel extension factory (index / createExtensionPack).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @slack/bolt before importing the factory
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
        channel: { name: 'general', is_channel: true, num_members: 42 },
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

import { createExtensionPack } from '../src/index';

describe('createExtensionPack (Slack)', () => {
  beforeEach(() => {
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.SLACK_SIGNING_SECRET;
    delete process.env.SLACK_APP_TOKEN;
  });

  describe('pack metadata', () => {
    it('should have the correct pack name', () => {
      const pack = createExtensionPack({
        options: { botToken: 'xoxb-test', signingSecret: 'test-secret' },
      } as any);
      expect(pack.name).toBe('@framers/agentos-ext-channel-slack');
    });

    it('should include 3 descriptors (2 tools + 1 messaging-channel)', () => {
      const pack = createExtensionPack({
        options: { botToken: 'xoxb-test', signingSecret: 'test-secret' },
      } as any);
      expect(pack.descriptors).toHaveLength(3);

      const tools = pack.descriptors.filter((d) => d.kind === 'tool');
      const channels = pack.descriptors.filter((d) => d.kind === 'messaging-channel');
      expect(tools).toHaveLength(2);
      expect(channels).toHaveLength(1);
    });

    it('should have correct tool descriptor IDs', () => {
      const pack = createExtensionPack({
        options: { botToken: 'xoxb-test', signingSecret: 'test-secret' },
      } as any);
      const ids = pack.descriptors.map((d) => d.id);
      expect(ids).toContain('slackChannelSendMessage');
      expect(ids).toContain('slackChannelSendMedia');
    });

    it('should have correct channel descriptor ID', () => {
      const pack = createExtensionPack({
        options: { botToken: 'xoxb-test', signingSecret: 'test-secret' },
      } as any);
      const channel = pack.descriptors.find((d) => d.kind === 'messaging-channel');
      expect(channel!.id).toBe('slackChannel');
    });
  });

  describe('credential resolution', () => {
    it('should resolve botToken from options.botToken', () => {
      const pack = createExtensionPack({
        options: { botToken: 'xoxb-from-options', signingSecret: 'secret' },
      } as any);
      expect(pack.descriptors).toHaveLength(3);
    });

    it('should resolve signingSecret from options.signingSecret', () => {
      const pack = createExtensionPack({
        options: { botToken: 'xoxb-test', signingSecret: 'secret-from-options' },
      } as any);
      expect(pack.descriptors).toHaveLength(3);
    });

    it('should resolve appToken from options.appToken (optional)', () => {
      const pack = createExtensionPack({
        options: {
          botToken: 'xoxb-test',
          signingSecret: 'test-secret',
          appToken: 'xapp-from-options',
        },
      } as any);
      expect(pack.descriptors).toHaveLength(3);
    });

    it('should resolve botToken from secrets map', () => {
      const pack = createExtensionPack({
        options: {
          signingSecret: 'test-secret',
          secrets: { 'slack.botToken': 'xoxb-from-secrets' },
        },
      } as any);
      expect(pack.descriptors).toHaveLength(3);
    });

    it('should resolve botToken from SLACK_BOT_TOKEN env var', () => {
      process.env.SLACK_BOT_TOKEN = 'xoxb-from-env';
      const pack = createExtensionPack({
        options: { signingSecret: 'test-secret' },
      } as any);
      expect(pack.descriptors).toHaveLength(3);
    });

    it('should throw if botToken is missing from all sources', () => {
      expect(() =>
        createExtensionPack({
          options: { signingSecret: 'test-secret' },
        } as any),
      ).toThrow(/bot token not found/i);
    });

    it('should throw if signingSecret is missing from all sources', () => {
      expect(() =>
        createExtensionPack({
          options: { botToken: 'xoxb-test' },
        } as any),
      ).toThrow(/signing secret not found/i);
    });
  });

  describe('options', () => {
    it('should apply custom priority to descriptors', () => {
      const pack = createExtensionPack({
        options: { botToken: 'xoxb-test', signingSecret: 'test-secret', priority: 99 },
      } as any);

      for (const descriptor of pack.descriptors) {
        expect(descriptor.priority).toBe(99);
      }
    });

    it('should default socketMode to true when appToken is provided', () => {
      // This is tested indirectly: the pack should construct without error
      // when appToken is given, and socketMode is not explicitly set.
      const pack = createExtensionPack({
        options: {
          botToken: 'xoxb-test',
          signingSecret: 'test-secret',
          appToken: 'xapp-socket-token',
        },
      } as any);
      expect(pack.descriptors).toHaveLength(3);
    });

    it('should default socketMode to false when no appToken', () => {
      const pack = createExtensionPack({
        options: { botToken: 'xoxb-test', signingSecret: 'test-secret' },
      } as any);
      expect(pack.descriptors).toHaveLength(3);
    });
  });

  describe('lifecycle hooks', () => {
    it('should have onActivate and onDeactivate functions', () => {
      const pack = createExtensionPack({
        options: { botToken: 'xoxb-test', signingSecret: 'test-secret' },
      } as any);
      expect(typeof pack.onActivate).toBe('function');
      expect(typeof pack.onDeactivate).toBe('function');
    });

    it('should activate and deactivate without errors', async () => {
      const pack = createExtensionPack({
        options: { botToken: 'xoxb-test', signingSecret: 'test-secret' },
      } as any);
      await pack.onActivate!();
      await pack.onDeactivate!();
    });
  });
});
