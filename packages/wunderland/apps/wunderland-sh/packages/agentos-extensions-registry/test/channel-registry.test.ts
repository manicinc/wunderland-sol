/**
 * @fileoverview Tests for channel-registry — CHANNEL_CATALOG and query helpers
 * @module @framers/agentos-extensions-registry/test/channel-registry.test
 */

import { describe, it, expect } from 'vitest';
import { CHANNEL_CATALOG, getChannelEntries, getChannelEntry } from '../src/channel-registry';

// ── Catalog size and uniqueness ─────────────────────────────────────────────

describe('CHANNEL_CATALOG', () => {
  it('should have exactly 20 entries', () => {
    expect(CHANNEL_CATALOG).toHaveLength(20);
  });

  it('should have all unique platform IDs', () => {
    const platforms = CHANNEL_CATALOG.map((entry) => entry.platform);
    const uniquePlatforms = new Set(platforms);
    expect(uniquePlatforms.size).toBe(CHANNEL_CATALOG.length);
  });

  it('should have all unique entry names', () => {
    const names = CHANNEL_CATALOG.map((entry) => entry.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(CHANNEL_CATALOG.length);
  });

  it('should have all unique package names', () => {
    const pkgs = CHANNEL_CATALOG.map((entry) => entry.packageName);
    const uniquePkgs = new Set(pkgs);
    expect(uniquePkgs.size).toBe(CHANNEL_CATALOG.length);
  });

  it('all entries should have category "channel"', () => {
    for (const entry of CHANNEL_CATALOG) {
      expect(entry.category).toBe('channel');
    }
  });

  it('all entries should have required fields', () => {
    for (const entry of CHANNEL_CATALOG) {
      expect(entry.packageName).toBeTruthy();
      expect(entry.name).toBeTruthy();
      expect(entry.platform).toBeTruthy();
      expect(entry.displayName).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(entry.sdkPackage).toBeTruthy();
      expect(Array.isArray(entry.requiredSecrets)).toBe(true);
      expect(typeof entry.defaultPriority).toBe('number');
      expect(typeof entry.available).toBe('boolean');
    }
  });
});

// ── P0 core channels ────────────────────────────────────────────────────────

describe('CHANNEL_CATALOG P0 core channels', () => {
  const P0_PLATFORMS = ['telegram', 'whatsapp', 'discord', 'slack', 'webchat'];

  it('should include all P0 core channels', () => {
    const platforms = new Set(CHANNEL_CATALOG.map((e) => e.platform));
    for (const p of P0_PLATFORMS) {
      expect(platforms.has(p)).toBe(true);
    }
  });

  it('P0 channels should have priority 50', () => {
    for (const p of P0_PLATFORMS) {
      const entry = CHANNEL_CATALOG.find((e) => e.platform === p);
      expect(entry).toBeDefined();
      expect(entry!.defaultPriority).toBe(50);
    }
  });
});

// ── P3 OpenClaw parity channels ─────────────────────────────────────────────

describe('CHANNEL_CATALOG P3 channels', () => {
  const P3_PLATFORMS = [
    'nostr',
    'twitch',
    'line',
    'feishu',
    'mattermost',
    'nextcloud-talk',
    'tlon',
  ];

  it('should include all P3 OpenClaw parity channels', () => {
    const platforms = new Set(CHANNEL_CATALOG.map((e) => e.platform));
    for (const p of P3_PLATFORMS) {
      expect(platforms.has(p)).toBe(true);
    }
  });

  it('P3 channels should have priority 20', () => {
    for (const p of P3_PLATFORMS) {
      const entry = CHANNEL_CATALOG.find((e) => e.platform === p);
      expect(entry).toBeDefined();
      expect(entry!.defaultPriority).toBe(20);
    }
  });
});

// ── getChannelEntries ───────────────────────────────────────────────────────

describe('getChannelEntries', () => {
  it('"all" returns all entries', () => {
    const entries = getChannelEntries('all');
    expect(entries).toHaveLength(CHANNEL_CATALOG.length);
  });

  it('default (no args) returns all entries', () => {
    const entries = getChannelEntries();
    expect(entries).toHaveLength(CHANNEL_CATALOG.length);
  });

  it('"none" returns empty array', () => {
    const entries = getChannelEntries('none');
    expect(entries).toHaveLength(0);
  });

  it('filtered by specific platforms returns only those', () => {
    const entries = getChannelEntries(['telegram', 'discord']);
    expect(entries).toHaveLength(2);
    const platforms = entries.map((e) => e.platform);
    expect(platforms).toContain('telegram');
    expect(platforms).toContain('discord');
  });

  it('filtered by single platform returns 1 entry', () => {
    const entries = getChannelEntries(['webchat']);
    expect(entries).toHaveLength(1);
    expect(entries[0].platform).toBe('webchat');
  });

  it('filtered by non-existent platform returns empty array', () => {
    const entries = getChannelEntries(['nonexistent-platform']);
    expect(entries).toHaveLength(0);
  });

  it('returns copies (not the original catalog references)', () => {
    const entries = getChannelEntries('all');
    expect(entries).not.toBe(CHANNEL_CATALOG);
  });
});

// ── getChannelEntry ─────────────────────────────────────────────────────────

describe('getChannelEntry', () => {
  it('should return the correct entry for a known platform', () => {
    const entry = getChannelEntry('telegram');
    expect(entry).toBeDefined();
    expect(entry!.platform).toBe('telegram');
    expect(entry!.name).toBe('channel-telegram');
  });

  it('should return undefined for an unknown platform', () => {
    const entry = getChannelEntry('nonexistent');
    expect(entry).toBeUndefined();
  });
});
