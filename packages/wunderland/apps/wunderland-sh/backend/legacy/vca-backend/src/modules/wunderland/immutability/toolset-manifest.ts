import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

type ExtensionsRegistry = {
  version?: string;
  updated?: string;
  extensions?: {
    curated?: ExtensionsRegistryEntry[];
    community?: ExtensionsRegistryEntry[];
  };
};

type ExtensionsRegistryEntry = {
  id: string;
  package: string;
  version: string;
  tools?: string[];
};

export type ToolsetManifestV1 = {
  schemaVersion: 1;
  capabilities: string[];
  registry: {
    version?: string;
    updated?: string;
  } | null;
  resolvedExtensions: Array<{
    id: string;
    package: string;
    version: string;
    tools: string[];
  }>;
  unresolvedCapabilities: string[];
};

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function uniqSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => normalizeString(v)).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function stableStringify(value: unknown): string {
  if (value == null) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

function candidateRegistryPaths(): string[] {
  const override = normalizeString(process.env.AGENTOS_EXTENSIONS_REGISTRY_PATH);

  const cwd = process.cwd();
  return [
    override,
    path.resolve(cwd, 'packages/agentos-extensions/registry.json'),
    path.resolve(cwd, '../packages/agentos-extensions/registry.json'),
    path.resolve(cwd, '../../packages/agentos-extensions/registry.json'),
  ].filter(Boolean);
}

export function resolveAgentosExtensionsRegistryPath(): string | null {
  for (const candidate of candidateRegistryPaths()) {
    try {
      if (candidate && fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore
    }
  }
  return null;
}

export function loadAgentosExtensionsRegistrySnapshot(
  registryPath?: string | null
): ExtensionsRegistry | null {
  const resolved = registryPath ?? resolveAgentosExtensionsRegistryPath();
  if (!resolved) return null;

  try {
    const raw = fs.readFileSync(resolved, 'utf8');
    const parsed = JSON.parse(raw) as ExtensionsRegistry;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function entrySlug(entry: ExtensionsRegistryEntry): string {
  const id = normalizeString(entry.id);
  if (!id) return '';
  const parts = id.split('.');
  return parts.length > 0 ? parts[parts.length - 1] : id;
}

function entryPackageSlug(entry: ExtensionsRegistryEntry): string {
  const pkg = normalizeString(entry.package);
  const idx = pkg.lastIndexOf('/');
  const name = idx >= 0 ? pkg.slice(idx + 1) : pkg;
  return name.replace(/^agentos-ext-/, '');
}

export function buildToolsetManifestV1(
  capabilitiesRaw: string[],
  registrySnapshot?: ExtensionsRegistry | null
): ToolsetManifestV1 {
  const capabilities = uniqSorted(capabilitiesRaw);
  const registry = registrySnapshot ?? loadAgentosExtensionsRegistrySnapshot();
  const entries = [
    ...(registry?.extensions?.curated ?? []),
    ...(registry?.extensions?.community ?? []),
  ].filter((e) => e && typeof e.id === 'string' && typeof e.package === 'string');

  const byId = new Map<string, ExtensionsRegistryEntry>();
  const byPackage = new Map<string, ExtensionsRegistryEntry>();
  const bySlug = new Map<string, ExtensionsRegistryEntry[]>();
  const byTool = new Map<string, ExtensionsRegistryEntry[]>();

  for (const entry of entries) {
    const id = normalizeString(entry.id);
    const pkg = normalizeString(entry.package);
    if (id) byId.set(id, entry);
    if (pkg) byPackage.set(pkg, entry);

    const slug = entrySlug(entry);
    const pkgSlug = entryPackageSlug(entry);
    for (const s of uniqSorted([slug, pkgSlug])) {
      if (!s) continue;
      const list = bySlug.get(s) ?? [];
      list.push(entry);
      bySlug.set(s, list);
    }

    for (const tool of uniqSorted(Array.isArray(entry.tools) ? entry.tools : [])) {
      const list = byTool.get(tool) ?? [];
      list.push(entry);
      byTool.set(tool, list);
    }
  }

  const resolvedById = new Map<string, ExtensionsRegistryEntry>();
  const unresolved: string[] = [];

  const resolveCapability = (capability: string): ExtensionsRegistryEntry | null => {
    const cap = normalizeString(capability);
    if (!cap) return null;

    const toolMatches = byTool.get(cap);
    if (toolMatches && toolMatches.length === 1) return toolMatches[0];
    if (toolMatches && toolMatches.length > 1) return null;

    const byIdMatch = byId.get(cap);
    if (byIdMatch) return byIdMatch;

    const byPkgMatch = byPackage.get(cap);
    if (byPkgMatch) return byPkgMatch;

    const slugMatches = bySlug.get(cap);
    if (slugMatches && slugMatches.length === 1) return slugMatches[0];
    return null;
  };

  for (const capability of capabilities) {
    const match = resolveCapability(capability);
    if (!match) {
      unresolved.push(capability);
      continue;
    }
    resolvedById.set(match.id, match);
  }

  const resolvedExtensions = Array.from(resolvedById.values())
    .map((entry) => ({
      id: normalizeString(entry.id),
      package: normalizeString(entry.package),
      version: normalizeString(entry.version),
      tools: uniqSorted(Array.isArray(entry.tools) ? entry.tools : []),
    }))
    .sort((a, b) => a.package.localeCompare(b.package));

  return {
    schemaVersion: 1,
    capabilities,
    registry: registry ? { version: registry.version, updated: registry.updated } : null,
    resolvedExtensions,
    unresolvedCapabilities: uniqSorted(unresolved),
  };
}

export function computeToolsetHashV1(manifest: ToolsetManifestV1): {
  manifestJson: string;
  toolsetHash: string;
} {
  const manifestJson = stableStringify(manifest);
  const toolsetHash = createHash('sha256').update(manifestJson, 'utf8').digest('hex');
  return { manifestJson, toolsetHash };
}
