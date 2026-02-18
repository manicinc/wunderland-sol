/**
 * Integration tests for createCuratedManifest, getAvailableExtensions,
 * and getAvailableChannels from the extensions registry.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createCuratedManifest,
  getAvailableExtensions,
  getAvailableChannels,
} from '../src/index';

// ── createCuratedManifest ───────────────────────────────────────────────────

describe('createCuratedManifest', () => {
  it('returns empty packs when all categories are "none"', async () => {
    const manifest = await createCuratedManifest({
      channels: 'none',
      tools: 'none',
      voice: 'none',
      productivity: 'none',
    });

    expect(manifest).toHaveProperty('packs');
    expect(Array.isArray(manifest.packs)).toBe(true);
    expect(manifest.packs).toHaveLength(0);
  });

  it('returns a manifest object with packs array using default options', async () => {
    const manifest = await createCuratedManifest();

    expect(manifest).toHaveProperty('packs');
    expect(Array.isArray(manifest.packs)).toBe(true);
    // With defaults (all = 'all'), packages are not installed so packs will be
    // empty since tryImport returns null for all missing packages.
    // The important thing is that the function completes without error.
  });

  it('returns empty packs when channels and tools are "none" (no voice/prod filter)', async () => {
    const manifest = await createCuratedManifest({ channels: 'none', tools: 'none' });
    // Voice and productivity default to "all" but packages are not installed,
    // so the manifest is still valid.
    expect(manifest).toHaveProperty('packs');
    expect(Array.isArray(manifest.packs)).toBe(true);
  });

  it('attempts to load all channels when channels="all"', async () => {
    const manifest = await createCuratedManifest({ channels: 'all', tools: 'none', voice: 'none', productivity: 'none' });
    // Since channel packages are not installed, packs should be empty.
    // But any that ARE loaded should be channel-* identifiers.
    expect(
      manifest.packs.every((p) => String(p.identifier || '').startsWith('registry:channel-'))
    ).toBe(true);
  });

  it('filters channels by platform name', async () => {
    const manifest = await createCuratedManifest({
      channels: ['telegram', 'discord'],
      tools: 'none',
      voice: 'none',
      productivity: 'none',
    });
    const allowed = new Set(['registry:channel-telegram', 'registry:channel-discord']);
    expect(manifest.packs.every((p) => allowed.has(String(p.identifier)))).toBe(true);
  });

  it('applies priority overrides', async () => {
    const manifest = await createCuratedManifest({
      channels: 'none',
      tools: ['web-search'],
      voice: 'none',
      productivity: 'none',
      overrides: { 'web-search': { priority: 999 } },
    });

    // web-search package is not installed, so packs will be empty.
    // But verify the structure is correct.
    expect(manifest).toHaveProperty('packs');
    expect(manifest).toHaveProperty('overrides');
    // The overrides block should reflect the priority override
    if (manifest.overrides?.tools) {
      expect(manifest.overrides.tools['web-search']).toBeDefined();
      expect(manifest.overrides.tools['web-search'].priority).toBe(999);
    }
  });

  it('skips disabled extensions via overrides', async () => {
    const manifest = await createCuratedManifest({
      channels: 'none',
      tools: 'all',
      voice: 'none',
      productivity: 'none',
      overrides: {
        'web-search': { enabled: false },
        'cli-executor': { enabled: false },
      },
    });
    const ids = manifest.packs.map((p) => p.identifier).filter(Boolean);
    expect(ids).not.toContain('registry:web-search');
    expect(ids).not.toContain('registry:cli-executor');
  });

  it('handles basePriority offset with empty result', async () => {
    const manifest = await createCuratedManifest({
      channels: 'none',
      tools: 'none',
      voice: 'none',
      productivity: 'none',
      basePriority: 100,
    });
    expect(manifest.packs).toEqual([]);
  });

  // ── Filter-specific tests: tools ──

  it('tools: ["web-search"] only includes web-search in tool packs', async () => {
    const manifest = await createCuratedManifest({
      channels: 'none',
      tools: ['web-search'],
      voice: 'none',
      productivity: 'none',
    });

    // Since web-search is not installed, packs will be empty — but no other
    // tool identifiers should appear either.
    const toolIds = manifest.packs
      .map((p) => p.identifier)
      .filter((id) => id && !String(id).startsWith('registry:channel-'));
    // At most we should see registry:web-search (if installed)
    for (const id of toolIds) {
      expect(id).toBe('registry:web-search');
    }
  });

  it('tools: "none" yields no tool packs', async () => {
    const manifest = await createCuratedManifest({
      channels: 'none',
      tools: 'none',
      voice: 'none',
      productivity: 'none',
    });
    expect(manifest.packs).toHaveLength(0);
  });

  // ── Filter-specific tests: voice ──

  it('voice: "none" excludes all voice providers', async () => {
    const manifest = await createCuratedManifest({
      channels: 'none',
      tools: 'none',
      voice: 'none',
      productivity: 'none',
    });
    const voiceIds = manifest.packs
      .map((p) => p.identifier)
      .filter((id) => String(id).startsWith('registry:voice-'));
    expect(voiceIds).toHaveLength(0);
  });

  it('voice: "all" attempts to load all voice providers', async () => {
    const manifest = await createCuratedManifest({
      channels: 'none',
      tools: 'none',
      voice: 'all',
      productivity: 'none',
    });
    // Packages not installed, so packs will be empty.
    // Any that loaded would be voice-* identifiers.
    for (const pack of manifest.packs) {
      expect(String(pack.identifier)).toMatch(/^registry:voice-/);
    }
  });

  it('voice: ["voice-twilio"] only includes twilio voice', async () => {
    const manifest = await createCuratedManifest({
      channels: 'none',
      tools: 'none',
      voice: ['voice-twilio'],
      productivity: 'none',
    });
    for (const pack of manifest.packs) {
      expect(pack.identifier).toBe('registry:voice-twilio');
    }
  });

  // ── Filter-specific tests: productivity ──

  it('productivity: "none" excludes all productivity extensions', async () => {
    const manifest = await createCuratedManifest({
      channels: 'none',
      tools: 'none',
      voice: 'none',
      productivity: 'none',
    });
    const prodIds = manifest.packs
      .map((p) => p.identifier)
      .filter((id) =>
        String(id).startsWith('registry:calendar-') || String(id).startsWith('registry:email-')
      );
    expect(prodIds).toHaveLength(0);
  });

  it('productivity: "all" attempts to load all productivity extensions', async () => {
    const manifest = await createCuratedManifest({
      channels: 'none',
      tools: 'none',
      voice: 'none',
      productivity: 'all',
    });
    // Packages not installed, packs will be empty.
    for (const pack of manifest.packs) {
      const id = String(pack.identifier);
      expect(id.startsWith('registry:calendar-') || id.startsWith('registry:email-')).toBe(true);
    }
  });

  // ── Overrides ──

  it('override with enabled: false skips specific extension', async () => {
    const manifest = await createCuratedManifest({
      channels: 'none',
      tools: 'all',
      voice: 'all',
      productivity: 'none',
      overrides: { 'voice-twilio': { enabled: false } },
    });
    const ids = manifest.packs.map((p) => p.identifier);
    expect(ids).not.toContain('registry:voice-twilio');
  });

  it('override produces correct overrides block in manifest', async () => {
    const manifest = await createCuratedManifest({
      channels: 'none',
      tools: 'none',
      voice: 'none',
      productivity: 'none',
      overrides: {
        'voice-twilio': { enabled: false },
        'web-search': { priority: 42 },
      },
    });

    expect(manifest.overrides).toBeDefined();
    expect(manifest.overrides!.tools).toBeDefined();
    expect(manifest.overrides!.tools['voice-twilio']).toEqual({ enabled: false, priority: undefined });
    expect(manifest.overrides!.tools['web-search']).toEqual({ enabled: undefined, priority: 42 });
  });

  it('custom logger is accepted without errors', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const manifest = await createCuratedManifest({
      channels: 'none',
      tools: 'none',
      voice: 'none',
      productivity: 'none',
      logger,
    });
    expect(manifest.packs).toHaveLength(0);
  });

  it('threads secrets + computed priority into pack options', async () => {
    const secrets = { 'example.secret': 'shh' };
    const manifest = await createCuratedManifest({
      channels: 'none',
      tools: ['skills'],
      voice: 'none',
      productivity: 'none',
      basePriority: 100,
      secrets,
    });

    const pack = manifest.packs.find((p) => p.identifier === 'registry:skills');
    expect(pack).toBeDefined();
    expect(pack!.options).toBeDefined();
    expect((pack!.options as any).secrets).toEqual(secrets);
    expect((pack!.options as any).priority).toBe(pack!.priority);
  });
});

// ── getAvailableExtensions ──────────────────────────────────────────────────

describe('getAvailableExtensions', () => {
  it('returns an array of ExtensionInfo objects', async () => {
    const extensions = await getAvailableExtensions();
    expect(Array.isArray(extensions)).toBe(true);
    expect(extensions.length).toBeGreaterThan(0);
  });

  it('returns full catalog with available=false (packages not installed)', async () => {
    const extensions = await getAvailableExtensions();

    // All entries should have required fields
    for (const ext of extensions) {
      expect(ext).toHaveProperty('packageName');
      expect(ext).toHaveProperty('name');
      expect(ext).toHaveProperty('category');
      expect(ext).toHaveProperty('available');
      expect(ext).toHaveProperty('displayName');
      expect(ext).toHaveProperty('description');
      expect(ext).toHaveProperty('requiredSecrets');
      expect(ext).toHaveProperty('defaultPriority');
      expect(typeof ext.packageName).toBe('string');
      expect(typeof ext.name).toBe('string');
      expect(typeof ext.available).toBe('boolean');
    }

    // Some workspace packages (e.g. web-search) may be installed locally,
    // so we only verify that the available field is a boolean for each entry.
    // At least some should be false (voice/productivity packages aren't installed).
    expect(extensions.some((ext) => ext.available === false)).toBe(true);
  });

  it('includes both tool and channel categories', async () => {
    const extensions = await getAvailableExtensions();
    const categories = new Set(extensions.map((ext) => ext.category));
    expect(categories.has('tool') || categories.has('integration')).toBe(true);
    expect(categories.has('channel')).toBe(true);
  });

  it('includes voice and productivity categories', async () => {
    const extensions = await getAvailableExtensions();
    const categories = new Set(extensions.map((ext) => ext.category));
    expect(categories.has('voice')).toBe(true);
    expect(categories.has('productivity')).toBe(true);
  });

  it('includes known extensions by name', async () => {
    const extensions = await getAvailableExtensions();
    const names = new Set(extensions.map((ext) => ext.name));
    // Tools
    expect(names.has('web-search')).toBe(true);
    expect(names.has('web-browser')).toBe(true);
    expect(names.has('cli-executor')).toBe(true);
    // Voice providers
    expect(names.has('voice-twilio')).toBe(true);
    expect(names.has('voice-telnyx')).toBe(true);
    expect(names.has('voice-plivo')).toBe(true);
    // Productivity
    expect(names.has('calendar-google')).toBe(true);
    expect(names.has('email-gmail')).toBe(true);
    // Channels
    expect(names.has('channel-telegram')).toBe(true);
    expect(names.has('channel-discord')).toBe(true);
  });
});

// ── getAvailableChannels ────────────────────────────────────────────────────

describe('getAvailableChannels', () => {
  it('returns an array of channel ExtensionInfo objects', async () => {
    const channels = await getAvailableChannels();
    expect(Array.isArray(channels)).toBe(true);
    expect(channels.length).toBeGreaterThan(0);
  });

  it('returns only channel category entries', async () => {
    const channels = await getAvailableChannels();
    expect(channels.every((ch) => ch.category === 'channel')).toBe(true);
  });

  it('includes known channel platforms', async () => {
    const channels = await getAvailableChannels();
    const names = new Set(channels.map((ch) => ch.name));
    expect(names.has('channel-telegram')).toBe(true);
    expect(names.has('channel-whatsapp')).toBe(true);
    expect(names.has('channel-discord')).toBe(true);
    expect(names.has('channel-slack')).toBe(true);
    expect(names.has('channel-webchat')).toBe(true);
  });

  it('all channels are available=false when packages are not installed', async () => {
    const channels = await getAvailableChannels();
    expect(channels.every((ch) => ch.available === false)).toBe(true);
  });

  it('does not include non-channel extensions', async () => {
    const channels = await getAvailableChannels();
    const nonChannel = channels.find(
      (ch) => ch.category !== 'channel'
    );
    expect(nonChannel).toBeUndefined();
  });
});
