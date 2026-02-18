import { describe, it, expect } from 'vitest';
import {
  SKILLS,
  CHANNELS,
  PROVIDERS,
  TOOLS,
  SECRETS_MAP,
  SKILL_CATEGORIES,
  CHANNEL_TIERS,
  TOOL_CATEGORIES,
  formatSecretEnv,
  collectRequiredSecrets,
  type CatalogSkill,
  type CatalogChannel,
  type CatalogProvider,
  type CatalogTool,
} from '@/data/catalog-data';

// ── SKILLS ─────────────────────────────────────────────────────────────────

describe('SKILLS', () => {
  it('has at least 15 skills', () => {
    expect(SKILLS.length).toBeGreaterThanOrEqual(15);
  });

  it('every skill has required fields', () => {
    for (const skill of SKILLS) {
      expect(skill.name).toBeTruthy();
      expect(skill.displayName).toBeTruthy();
      expect(skill.description).toBeTruthy();
      expect(skill.category).toBeTruthy();
      expect(Array.isArray(skill.tags)).toBe(true);
      expect(Array.isArray(skill.requiredSecrets)).toBe(true);
      expect(Array.isArray(skill.requiredTools)).toBe(true);
      expect(skill.skillPath).toBeTruthy();
    }
  });

  it('skill names are unique', () => {
    const names = SKILLS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all skill categories are in SKILL_CATEGORIES', () => {
    for (const skill of SKILLS) {
      expect(SKILL_CATEGORIES).toContain(skill.category);
    }
  });

  it('contains known skills', () => {
    const names = SKILLS.map((s) => s.name);
    expect(names).toContain('web-search');
    expect(names).toContain('github');
    expect(names).toContain('coding-agent');
    expect(names).toContain('image-gen');
  });
});

// ── CHANNELS ───────────────────────────────────────────────────────────────

describe('CHANNELS', () => {
  it('has at least 13 channels', () => {
    expect(CHANNELS.length).toBeGreaterThanOrEqual(13);
  });

  it('every channel has required fields', () => {
    for (const channel of CHANNELS) {
      expect(channel.platform).toBeTruthy();
      expect(channel.displayName).toBeTruthy();
      expect(channel.description).toBeTruthy();
      expect(['P0', 'P1', 'P2', 'P3']).toContain(channel.tier);
      expect(Array.isArray(channel.requiredSecrets)).toBe(true);
      expect(channel.packageName).toBeTruthy();
    }
  });

  it('channel platforms are unique', () => {
    const platforms = CHANNELS.map((c) => c.platform);
    expect(new Set(platforms).size).toBe(platforms.length);
  });

  it('P0 tier contains core platforms', () => {
    const p0 = CHANNELS.filter((c) => c.tier === 'P0').map((c) => c.platform);
    expect(p0).toContain('telegram');
    expect(p0).toContain('discord');
    expect(p0).toContain('webchat');
  });

  it('webchat has no required secrets', () => {
    const webchat = CHANNELS.find((c) => c.platform === 'webchat');
    expect(webchat).toBeDefined();
    expect(webchat!.requiredSecrets).toEqual([]);
  });
});

// ── PROVIDERS ──────────────────────────────────────────────────────────────

describe('PROVIDERS', () => {
  it('has at least 10 providers', () => {
    expect(PROVIDERS.length).toBeGreaterThanOrEqual(10);
  });

  it('every provider has required fields', () => {
    for (const provider of PROVIDERS) {
      expect(provider.providerId).toBeTruthy();
      expect(provider.displayName).toBeTruthy();
      expect(provider.description).toBeTruthy();
      expect(provider.defaultModel).toBeTruthy();
      expect(provider.smallModel).toBeTruthy();
      expect(Array.isArray(provider.requiredSecrets)).toBe(true);
      expect(provider.packageName).toBeTruthy();
    }
  });

  it('provider IDs are unique', () => {
    const ids = PROVIDERS.map((p) => p.providerId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ollama has no required secrets', () => {
    const ollama = PROVIDERS.find((p) => p.providerId === 'ollama');
    expect(ollama).toBeDefined();
    expect(ollama!.requiredSecrets).toEqual([]);
  });

  it('openai requires an API key', () => {
    const openai = PROVIDERS.find((p) => p.providerId === 'openai');
    expect(openai).toBeDefined();
    expect(openai!.requiredSecrets.length).toBeGreaterThan(0);
  });
});

// ── TOOLS ──────────────────────────────────────────────────────────────────

describe('TOOLS', () => {
  it('has at least 10 tools', () => {
    expect(TOOLS.length).toBeGreaterThanOrEqual(10);
  });

  it('every tool has required fields', () => {
    for (const tool of TOOLS) {
      expect(tool.name).toBeTruthy();
      expect(tool.displayName).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.category).toBeTruthy();
      expect(Array.isArray(tool.requiredSecrets)).toBe(true);
      expect(tool.packageName).toBeTruthy();
    }
  });

  it('tool names are unique', () => {
    const names = TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

// ── SECRETS_MAP ────────────────────────────────────────────────────────────

describe('SECRETS_MAP', () => {
  it('has entries for skills with required secrets', () => {
    expect(SECRETS_MAP['github']).toBeDefined();
    expect(SECRETS_MAP['github'].keys).toContain('GITHUB_TOKEN');
  });

  it('has entries for channels with required secrets', () => {
    expect(SECRETS_MAP['telegram']).toBeDefined();
    expect(SECRETS_MAP['telegram'].keys).toContain('TELEGRAM_BOT_TOKEN');
  });

  it('has entries for providers with required secrets', () => {
    expect(SECRETS_MAP['openai']).toBeDefined();
    expect(SECRETS_MAP['openai'].keys).toContain('OPENAI_API_KEY');
    expect(SECRETS_MAP['anthropic']).toBeDefined();
    expect(SECRETS_MAP['anthropic'].keys).toContain('ANTHROPIC_API_KEY');
  });

  it('every entry has a label and non-empty keys array', () => {
    for (const [id, entry] of Object.entries(SECRETS_MAP)) {
      expect(entry.label).toBeTruthy();
      expect(Array.isArray(entry.keys)).toBe(true);
      expect(entry.keys.length).toBeGreaterThan(0);
    }
  });
});

// ── formatSecretEnv ────────────────────────────────────────────────────────

describe('formatSecretEnv', () => {
  it('converts dotted secret names to uppercased env vars', () => {
    expect(formatSecretEnv('openai.apiKey')).toBe('OPENAI_APIKEY');
    expect(formatSecretEnv('slack.bot_token')).toBe('SLACK_BOT_TOKEN');
    expect(formatSecretEnv('aws.accessKeyId')).toBe('AWS_ACCESSKEYID');
  });

  it('handles secrets without dots', () => {
    expect(formatSecretEnv('SIMPLE')).toBe('SIMPLE');
    expect(formatSecretEnv('already_upper')).toBe('ALREADY_UPPER');
  });
});

// ── collectRequiredSecrets ─────────────────────────────────────────────────

describe('collectRequiredSecrets', () => {
  it('returns empty array when nothing is selected', () => {
    const result = collectRequiredSecrets([], [], null);
    expect(result).toEqual([]);
  });

  it('returns secrets for selected skills', () => {
    const result = collectRequiredSecrets(['github'], [], null);
    expect(result).toEqual([{ key: 'GITHUB_TOKEN', source: 'GitHub' }]);
  });

  it('returns secrets for selected channels', () => {
    const result = collectRequiredSecrets([], ['telegram'], null);
    expect(result).toEqual([{ key: 'TELEGRAM_BOT_TOKEN', source: 'Telegram' }]);
  });

  it('returns secrets for selected provider', () => {
    const result = collectRequiredSecrets([], [], 'anthropic');
    expect(result).toEqual([{ key: 'ANTHROPIC_API_KEY', source: 'Anthropic' }]);
  });

  it('deduplicates shared secrets across skills and channels', () => {
    // 'discord-helper' skill and 'discord' channel both need DISCORD_BOT_TOKEN
    const result = collectRequiredSecrets(['discord-helper'], ['discord'], null);
    const discordKeys = result.filter((r) => r.key === 'DISCORD_BOT_TOKEN');
    expect(discordKeys).toHaveLength(1);
  });

  it('deduplicates OPENAI_API_KEY across whisper and image-gen', () => {
    const result = collectRequiredSecrets(['whisper-transcribe', 'image-gen'], [], null);
    const openaiKeys = result.filter((r) => r.key === 'OPENAI_API_KEY');
    expect(openaiKeys).toHaveLength(1);
  });

  it('combines skills, channels, and provider secrets', () => {
    const result = collectRequiredSecrets(['github'], ['telegram'], 'openai');
    const keys = result.map((r) => r.key);
    expect(keys).toContain('GITHUB_TOKEN');
    expect(keys).toContain('TELEGRAM_BOT_TOKEN');
    expect(keys).toContain('OPENAI_API_KEY');
  });

  it('returns multiple keys for multi-secret entries', () => {
    const result = collectRequiredSecrets([], ['email'], null);
    const keys = result.map((r) => r.key);
    expect(keys).toContain('SMTP_HOST');
    expect(keys).toContain('SMTP_USER');
    expect(keys).toContain('SMTP_PASSWORD');
    expect(keys).toHaveLength(3);
  });

  it('ignores unknown skill/channel IDs', () => {
    const result = collectRequiredSecrets(['nonexistent-skill'], ['no-such-channel'], null);
    expect(result).toEqual([]);
  });

  it('ignores unknown provider IDs', () => {
    const result = collectRequiredSecrets([], [], 'no-such-provider');
    expect(result).toEqual([]);
  });

  it('first-encountered source label wins for deduplication', () => {
    // Both 'discord-helper' (skill) and 'discord' (channel) map to DISCORD_BOT_TOKEN
    // The skill comes first, so its label should be used
    const result = collectRequiredSecrets(['discord-helper'], ['discord'], null);
    const entry = result.find((r) => r.key === 'DISCORD_BOT_TOKEN');
    expect(entry).toBeDefined();
    expect(entry!.source).toBe('Discord');
  });
});

// ── Category/tier constant arrays ──────────────────────────────────────────

describe('Category and tier constants', () => {
  it('SKILL_CATEGORIES starts with "all"', () => {
    expect(SKILL_CATEGORIES[0]).toBe('all');
  });

  it('CHANNEL_TIERS starts with "all" then P0-P3', () => {
    expect(CHANNEL_TIERS).toEqual(['all', 'P0', 'P1', 'P2', 'P3']);
  });

  it('TOOL_CATEGORIES starts with "all"', () => {
    expect(TOOL_CATEGORIES[0]).toBe('all');
  });
});
