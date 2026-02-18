/**
 * @fileoverview Tests for provider-registry — PROVIDER_CATALOG and query helpers
 * @module @framers/agentos-extensions-registry/test/provider-registry.test
 */

import { describe, it, expect } from 'vitest';
import { PROVIDER_CATALOG, getProviderEntries, getProviderEntry } from '../src/provider-registry';

// ── Catalog size and structure ──────────────────────────────────────────────

describe('PROVIDER_CATALOG', () => {
  it('should have at least 13 entries', () => {
    expect(PROVIDER_CATALOG.length).toBeGreaterThanOrEqual(13);
  });

  it('should have all unique provider IDs', () => {
    const ids = PROVIDER_CATALOG.map((e) => e.providerId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(PROVIDER_CATALOG.length);
  });

  const KNOWN_PROVIDERS = [
    'openai',
    'anthropic',
    'ollama',
    'bedrock',
    'gemini',
    'github-copilot',
    'cloudflare-ai',
    'minimax',
    'qwen',
    'moonshot',
    'xiaomi-mimo',
    'venice',
    'openrouter',
  ];

  it('should include all known provider IDs', () => {
    const providerIds = new Set(PROVIDER_CATALOG.map((e) => e.providerId));
    for (const id of KNOWN_PROVIDERS) {
      expect(providerIds.has(id)).toBe(true);
    }
  });

  it('each entry should have all required fields', () => {
    for (const entry of PROVIDER_CATALOG) {
      expect(entry.packageName).toBeTruthy();
      expect(entry.providerId).toBeTruthy();
      expect(entry.name).toBeTruthy();
      expect(entry.displayName).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(entry.defaultModel).toBeTruthy();
      expect(entry.smallModel).toBeTruthy();
      expect(Array.isArray(entry.requiredSecrets)).toBe(true);
      expect(typeof entry.defaultPriority).toBe('number');
      expect(typeof entry.available).toBe('boolean');
    }
  });

  it('category should be "integration" for all entries', () => {
    for (const entry of PROVIDER_CATALOG) {
      expect(entry.category).toBe('integration');
    }
  });
});

// ── Specific provider entries ───────────────────────────────────────────────

describe('PROVIDER_CATALOG specific providers', () => {
  it('openai: gpt-4o default, gpt-4o-mini small', () => {
    const entry = PROVIDER_CATALOG.find((e) => e.providerId === 'openai');
    expect(entry).toBeDefined();
    expect(entry!.defaultModel).toBe('gpt-4o');
    expect(entry!.smallModel).toBe('gpt-4o-mini');
  });

  it('anthropic: claude-sonnet-4-5-20250929 default, claude-haiku-4-5-20251001 small', () => {
    const entry = PROVIDER_CATALOG.find((e) => e.providerId === 'anthropic');
    expect(entry).toBeDefined();
    expect(entry!.defaultModel).toBe('claude-sonnet-4-5-20250929');
    expect(entry!.smallModel).toBe('claude-haiku-4-5-20251001');
  });

  it('ollama: llama3 default, llama3.2:3b small', () => {
    const entry = PROVIDER_CATALOG.find((e) => e.providerId === 'ollama');
    expect(entry).toBeDefined();
    expect(entry!.defaultModel).toBe('llama3');
    expect(entry!.smallModel).toBe('llama3.2:3b');
  });

  it('gemini: gemini-2.0-flash default, gemini-2.0-flash-lite small', () => {
    const entry = PROVIDER_CATALOG.find((e) => e.providerId === 'gemini');
    expect(entry).toBeDefined();
    expect(entry!.defaultModel).toBe('gemini-2.0-flash');
    expect(entry!.smallModel).toBe('gemini-2.0-flash-lite');
  });
});

// ── getProviderEntries ──────────────────────────────────────────────────────

describe('getProviderEntries', () => {
  it('"all" returns all entries', () => {
    const entries = getProviderEntries('all');
    expect(entries).toHaveLength(PROVIDER_CATALOG.length);
  });

  it('default (no args) returns all entries', () => {
    const entries = getProviderEntries();
    expect(entries).toHaveLength(PROVIDER_CATALOG.length);
  });

  it('"none" returns empty array', () => {
    const entries = getProviderEntries('none');
    expect(entries).toHaveLength(0);
  });

  it('filtered by specific provider IDs returns only those', () => {
    const entries = getProviderEntries(['openai', 'anthropic']);
    expect(entries).toHaveLength(2);
    const ids = entries.map((e) => e.providerId);
    expect(ids).toContain('openai');
    expect(ids).toContain('anthropic');
  });

  it('filtered by single provider returns 1 entry', () => {
    const entries = getProviderEntries(['ollama']);
    expect(entries).toHaveLength(1);
    expect(entries[0].providerId).toBe('ollama');
  });

  it('filtered by non-existent provider returns empty array', () => {
    const entries = getProviderEntries(['nonexistent']);
    expect(entries).toHaveLength(0);
  });

  it('returns copies (not the original catalog reference)', () => {
    const entries = getProviderEntries('all');
    expect(entries).not.toBe(PROVIDER_CATALOG);
  });
});

// ── getProviderEntry ────────────────────────────────────────────────────────

describe('getProviderEntry', () => {
  it('should return the openai entry', () => {
    const entry = getProviderEntry('openai');
    expect(entry).toBeDefined();
    expect(entry!.providerId).toBe('openai');
    expect(entry!.defaultModel).toBe('gpt-4o');
  });

  it('should return undefined for nonexistent provider', () => {
    const entry = getProviderEntry('nonexistent');
    expect(entry).toBeUndefined();
  });

  it('should return correct entry for each known provider', () => {
    const knownIds = ['openai', 'anthropic', 'ollama', 'gemini', 'bedrock', 'openrouter'];
    for (const id of knownIds) {
      const entry = getProviderEntry(id);
      expect(entry).toBeDefined();
      expect(entry!.providerId).toBe(id);
    }
  });
});
