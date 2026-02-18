/**
 * @fileoverview Build/update registry.json for the AgentOS personas registry.
 *
 * This package is intentionally data-first (registry + persona folders). The
 * build step keeps `registry.json` and its stats consistent.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const registryPath = path.join(rootDir, 'registry.json');
const packageJsonPath = path.join(rootDir, 'package.json');

const DEFAULT_CATEGORIES = {
  curated: ['research', 'coding', 'creative', 'productivity', 'enterprise'],
  community: ['research', 'coding', 'creative', 'productivity', 'entertainment', 'education'],
};

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function listManifests(dirPath) {
  if (!existsSync(dirPath)) return [];

  const entries = await readdir(dirPath, { withFileTypes: true }).catch(() => []);
  const manifests = [];

  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const manifestPath = path.join(dirPath, ent.name, 'manifest.json');
    if (!existsSync(manifestPath)) continue;

    try {
      const data = await readJson(manifestPath);
      if (!data || typeof data !== 'object') continue;
      if (!data.id || !data.name || !data.version) continue;
      manifests.push({
        id: String(data.id),
        name: String(data.name),
        version: String(data.version),
        author: data.author,
        category: data.category,
        minimumTier: data.minimumTier,
        verified: data.verified,
        verifiedAt: data.verifiedAt,
      });
    } catch {
      // Skip invalid manifest
    }
  }

  manifests.sort((a, b) => a.id.localeCompare(b.id));
  return manifests;
}

function withCategoryDefaults(categories, manifests, providerKey) {
  const existing = Array.isArray(categories?.[providerKey]) ? categories[providerKey].slice() : [];
  const defaults = DEFAULT_CATEGORIES[providerKey] || [];

  const set = new Set([...defaults, ...existing].map((x) => String(x)));
  for (const m of manifests) {
    if (m.category) set.add(String(m.category));
  }

  return [...set].sort();
}

function buildRegistry(existing, pkg, curated, community) {
  const categories = existing?.categories && typeof existing.categories === 'object'
    ? existing.categories
    : { ...DEFAULT_CATEGORIES };

  const next = {
    version: String(pkg?.version || existing?.version || '1.0.0'),
    updated: String(existing?.updated || new Date().toISOString()),
    description: String(existing?.description || 'AgentOS Personas Registry - Curated AI agent personalities'),
    categories: {
      curated: withCategoryDefaults(categories, curated, 'curated'),
      community: withCategoryDefaults(categories, community, 'community'),
    },
    personas: {
      curated,
      community,
    },
    stats: {
      totalPersonas: curated.length + community.length,
      curatedCount: curated.length,
      communityCount: community.length,
    },
  };

  return next;
}

function stripUpdated(reg) {
  if (!reg || typeof reg !== 'object') return reg;
  const { updated: _updated, ...rest } = reg;
  return rest;
}

async function main() {
  const pkg = existsSync(packageJsonPath) ? await readJson(packageJsonPath).catch(() => null) : null;
  const existing = existsSync(registryPath) ? await readJson(registryPath).catch(() => null) : null;

  const curatedDir = path.join(rootDir, 'registry', 'curated');
  const communityDir = path.join(rootDir, 'registry', 'community');

  const curated = await listManifests(curatedDir);
  const community = await listManifests(communityDir);

  const next = buildRegistry(existing, pkg, curated, community);

  const existingCore = stripUpdated(existing);
  const nextCore = stripUpdated(next);
  const changed = JSON.stringify(existingCore) !== JSON.stringify(nextCore);

  if (!existsSync(registryPath) || changed) {
    next.updated = new Date().toISOString();
    await writeFile(registryPath, JSON.stringify(next, null, 2) + '\n', 'utf8');
    console.log(`[agentos-personas] Updated registry.json (${next.stats.totalPersonas} personas)`);
    return;
  }

  console.log(`[agentos-personas] registry.json up to date (${next.stats.totalPersonas} personas)`);
}

main().catch((err) => {
  console.error('[agentos-personas] update-registry failed:', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});

