/**
 * @fileoverview AgentOS Skills Registry.
 *
 * Single package containing curated SKILL.md prompt modules, a typed catalog,
 * and lazy-loading factory functions for SkillRegistry/SkillSnapshot.
 *
 * `@framers/agentos` is an **optional peer dependency** — the catalog helpers
 * (re-exported from `./catalog.js`) work without it.  Only the factory
 * functions that produce a live `SkillRegistry` or `SkillSnapshot` need it,
 * and they load it lazily via dynamic `import()`.
 *
 * @module @framers/agentos-skills-registry
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';

// ── Local mirror types (avoid eager import of @framers/agentos) ─────────────
// These are structurally compatible with the canonical types from
// `@framers/agentos/skills`.  Consumers who depend on the peer dep can simply
// cast or use the canonical imports.

/** @see SkillSnapshot in @framers/agentos/skills */
export interface SkillSnapshot {
  prompt: string;
  skills: Array<{ name: string; primaryEnv?: string }>;
  resolvedSkills?: unknown[];
  version?: number;
  createdAt: Date;
}

/** @see SkillsConfig in @framers/agentos/skills */
export interface SkillsConfig {
  allowBundled?: string[];
  load?: { extraDirs?: string[]; watch?: boolean; watchDebounceMs?: number };
  install?: { preferBrew: boolean; nodeManager: 'npm' | 'pnpm' | 'yarn' | 'bun' };
  entries?: Record<
    string,
    {
      enabled?: boolean;
      apiKey?: string;
      env?: Record<string, string>;
      config?: Record<string, unknown>;
    }
  >;
}

/** @see SkillEligibilityContext in @framers/agentos/skills */
export interface SkillEligibilityContext {
  platforms: string[];
  hasBin: (bin: string) => boolean;
  hasAnyBin: (bins: string[]) => boolean;
  hasEnv?: (envVar: string) => boolean;
  note?: string;
}

// ── Re-export the programmatic catalog (zero heavy deps) ────────────────────

export {
  SKILLS_CATALOG,
  getSkillsByCategory,
  getSkillByName,
  getAvailableSkills,
  getCategories,
  getSkillsByTag,
  searchSkills,
  getCuratedSkills,
  getCommunitySkills,
  getAllSkills,
} from './catalog.js';
export type { SkillCatalogEntry } from './catalog.js';

// ── Re-export registry.json schema types ────────────────────────────────────

export type {
  SkillInstallKind,
  SkillInstallSpec,
  SkillRequirements,
  SkillMetadata,
  SkillRegistryEntry,
  SkillsRegistryStats,
  SkillsRegistry,
} from './schema-types.js';

// ── Lazy loader for @framers/agentos ────────────────────────────────────────

/** Resolved module cache — loaded at most once per process. */
let _agentosSkillsMod: {
  SkillRegistry: new (config?: SkillsConfig) => {
    loadFromDirs(dirs: string[]): Promise<number>;
    loadFromDir?(dir: string, options?: { source?: string }): Promise<number>;
    buildSnapshot(options?: {
      platform?: string;
      eligibility?: SkillEligibilityContext;
      filter?: string[];
      strict?: boolean;
      runtimeConfig?: Record<string, unknown>;
    }): SkillSnapshot;
  };
} | null = null;

async function requireAgentOS(): Promise<NonNullable<typeof _agentosSkillsMod>> {
  if (_agentosSkillsMod) return _agentosSkillsMod;

  try {
    // Dynamic import — only resolved when a consumer calls a factory function.
    const mod = await import('@framers/agentos/skills');
    _agentosSkillsMod = mod as unknown as NonNullable<typeof _agentosSkillsMod>;
    return _agentosSkillsMod;
  } catch {
    throw new Error(
      '@framers/agentos is required for createCuratedSkillRegistry() and ' +
        'createCuratedSkillSnapshot().  Install it:\n\n' +
        '  npm install @framers/agentos\n\n' +
        'Or use the lightweight catalog helpers (getSkillsByCategory, searchSkills, etc.) ' +
        'which have no peer-dep requirement.'
    );
  }
}

// ── Path helpers (resolve locally — SKILL.md files are bundled in this package) ───────

const __dirname = path.dirname(new URL(import.meta.url).pathname);

/** Package root (one level up from dist/ or src/) */
function resolvePackageRoot(): string {
  // Works from both dist/index.js and src/index.ts
  return path.resolve(__dirname, '..');
}

function resolveCatalogPath(): string {
  return path.join(resolvePackageRoot(), 'registry.json');
}

/**
 * Absolute path to the bundled curated skills directory.
 *
 * This directory can be passed to `SkillRegistry.loadFromDirs([dir])`.
 */
export function getBundledCuratedSkillsDir(): string {
  return path.join(resolvePackageRoot(), 'registry', 'curated');
}

/**
 * Absolute path to the bundled community skills directory.
 */
export function getBundledCommunitySkillsDir(): string {
  return path.join(resolvePackageRoot(), 'registry', 'community');
}

// ── Options ─────────────────────────────────────────────────────────────────

export type CuratedSkillsSelection = 'all' | 'none' | string[];

export interface CuratedSkillsOptions {
  /** Which curated skills to include. Default: 'all'. */
  skills?: CuratedSkillsSelection;
  /** Optional skills config (disable entries, env overrides, etc.). */
  config?: SkillsConfig;
  /** Platform filter for snapshot building. */
  platform?: string;
  /** Eligibility filter for snapshot building. */
  eligibility?: SkillEligibilityContext;
}

// ── Catalog types ───────────────────────────────────────────────────────────

export interface SkillsCatalogEntry {
  id: string;
  name: string;
  version: string;
  path: string;
  description: string;
  verified: boolean;
  verifiedAt?: string;
  keywords?: string[];
  metadata?: Record<string, unknown>;
}

export interface SkillsCatalog {
  version: string;
  updated: string;
  categories: { curated: string[]; community: string[] };
  skills: { curated: SkillsCatalogEntry[]; community: SkillsCatalogEntry[] };
  stats?: Record<string, unknown>;
}

// ── Catalog JSON loader ─────────────────────────────────────────────────────

/**
 * Load the bundled registry.json catalog.
 */
export async function getSkillsCatalog(): Promise<SkillsCatalog> {
  const registryPath = resolveCatalogPath();
  const raw = await fs.readFile(registryPath, 'utf-8');
  return JSON.parse(raw) as SkillsCatalog;
}

/**
 * Convenience: list curated skills from the catalog.
 */
export async function getAvailableCuratedSkills(): Promise<SkillsCatalogEntry[]> {
  const catalog = await getSkillsCatalog();
  return catalog.skills.curated ?? [];
}

// ── Factory functions (lazy-load @framers/agentos) ──────────────────────────

/**
 * Create a SkillRegistry loaded with bundled curated skills.
 *
 * **Requires** `@framers/agentos` as a peer dependency.
 * Throws a descriptive error if the peer dep is missing.
 */
export async function createCuratedSkillRegistry(
  options?: Pick<CuratedSkillsOptions, 'config'>
): Promise<InstanceType<Awaited<ReturnType<typeof requireAgentOS>>['SkillRegistry']>> {
  const { SkillRegistry } = await requireAgentOS();
  const registry = new SkillRegistry(options?.config);
  if (typeof registry.loadFromDir === 'function') {
    await registry.loadFromDir(getBundledCuratedSkillsDir(), { source: 'bundled' });
  } else {
    await registry.loadFromDirs([getBundledCuratedSkillsDir()]);
  }
  return registry;
}

/**
 * Build a SkillSnapshot from bundled curated skills.
 *
 * **Requires** `@framers/agentos` as a peer dependency.
 * Throws a descriptive error if the peer dep is missing.
 */
export async function createCuratedSkillSnapshot(
  options?: CuratedSkillsOptions
): Promise<SkillSnapshot> {
  const createdAt = new Date();
  const selection = options?.skills ?? 'all';

  if (selection === 'none') {
    return {
      prompt: '',
      skills: [],
      resolvedSkills: [],
      version: 1,
      createdAt,
    };
  }

  const registry = await createCuratedSkillRegistry({ config: options?.config });
  const filter = Array.isArray(selection) ? selection : undefined;

  return registry.buildSnapshot({
    platform: options?.platform,
    eligibility: options?.eligibility,
    filter,
  });
}
