/**
 * @fileoverview Manifest builder — creates pre-configured ExtensionManifest
 * instances from the curated extension catalog.
 *
 * This is the primary API of the registry package. Instead of manually wiring
 * each extension pack in the backend, consumers call `createCuratedManifest()`
 * with their desired configuration.
 *
 * @module @framers/agentos-extensions-registry/manifest-builder
 */

import type { ExtensionManifest, ExtensionPackManifestEntry } from '@framers/agentos';
import type { RegistryOptions, ExtensionInfo, RegistryLogger } from './types.js';
import { CHANNEL_CATALOG, getChannelEntries } from './channel-registry.js';
import { PROVIDER_CATALOG, getProviderEntries } from './provider-registry.js';
import { TOOL_CATALOG } from './tool-registry.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function isPackageInstalled(packageName: string): boolean {
  if (!packageName) return false;

  // Resolution-only check (no module side effects).
  try {
    require.resolve(packageName);
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempt to dynamically import a package. Returns the module if available,
 * or `null` if the package is not installed.
 */
async function tryImport(packageName: string): Promise<any | null> {
  try {
    return await import(packageName);
  } catch {
    return null;
  }
}

/**
 * Check which extensions from the catalog are actually installed
 * and mark them as available.
 */
export async function getAvailableExtensions(): Promise<ExtensionInfo[]> {
  const allEntries: ExtensionInfo[] = [...TOOL_CATALOG, ...CHANNEL_CATALOG, ...PROVIDER_CATALOG];
  // Prefer pure resolution checks. Dynamic-importing every optional dependency
  // can be very slow in bundler/test runtimes that shim `import.meta`.
  return allEntries.map((entry) => ({ ...entry, available: isPackageInstalled(entry.packageName) }));
}

/**
 * Get available channel extensions.
 */
export async function getAvailableChannels(): Promise<ExtensionInfo[]> {
  return CHANNEL_CATALOG.map((entry) => ({ ...entry, available: isPackageInstalled(entry.packageName) }));
}

/**
 * Creates a pre-configured `ExtensionManifest` with all available curated
 * extensions. Missing optional dependencies are silently skipped.
 *
 * @example
 * ```typescript
 * import { createCuratedManifest } from '@framers/agentos-extensions-registry';
 *
 * // Enable all available extensions
 * const manifest = await createCuratedManifest();
 *
 * // Selective: only Telegram + Discord channels, all tools
 * const manifest = await createCuratedManifest({
 *   channels: ['telegram', 'discord'],
 *   tools: 'all',
 *   secrets: {
 *     'telegram.botToken': process.env.TELEGRAM_BOT_TOKEN!,
 *     'discord.botToken': process.env.DISCORD_BOT_TOKEN!,
 *   },
 * });
 *
 * // Pass to AgentOS config
 * const agentOS = new AgentOS({ extensionManifest: manifest });
 * ```
 */
export async function createCuratedManifest(options?: RegistryOptions): Promise<ExtensionManifest> {
  const basePriority = options?.basePriority ?? 0;
  const secrets = options?.secrets;
  const logger: RegistryLogger | undefined = options?.logger ?? console;
  const packs: ExtensionPackManifestEntry[] = [];

  // Helper to load and push a catalog entry
  const loadEntry = async (entry: ExtensionInfo) => {
    const override = options?.overrides?.[entry.name];
    if (override?.enabled === false) return;

    const mod = await tryImport(entry.packageName);
    if (!mod) return;

    const factory = mod.createExtensionPack ?? mod.default?.createExtensionPack ?? mod.default;
    if (typeof factory !== 'function') return;

    const effectivePriority = override?.priority ?? basePriority + entry.defaultPriority;
    const effectiveOptions = {
      ...override?.options,
      secrets,
      // Most curated packs accept `options.priority` and map it onto descriptor priorities.
      priority: (override?.options as Record<string, unknown> | undefined)?.priority ?? effectivePriority,
    };

    packs.push({
      factory: () =>
        factory({
          options: effectiveOptions,
          getSecret: (secretId: string) => secrets?.[secretId],
          logger,
        }),
      // Priority applied to descriptors unless they override it individually.
      priority: effectivePriority,
      enabled: true,
      identifier: `registry:${entry.name}`,
      // Populate manifest entry options so AgentOS can evaluate `requiredSecrets` gating.
      options: effectiveOptions,
    });
  };

  // Split TOOL_CATALOG by category
  const toolOnlyEntries = TOOL_CATALOG.filter(
    (t) => t.category === 'tool' || t.category === 'integration'
  );
  const voiceEntries = TOOL_CATALOG.filter((t) => t.category === 'voice');
  const productivityEntries = TOOL_CATALOG.filter((t) => t.category === 'productivity');

  // ── Tool Extensions ──
  const toolFilter = options?.tools ?? 'all';
  const filteredTools =
    toolFilter === 'none'
      ? []
      : toolFilter === 'all'
        ? toolOnlyEntries
        : toolOnlyEntries.filter((t) => toolFilter.includes(t.name));

  for (const entry of filteredTools) {
    await loadEntry(entry);
  }

  // ── Voice Provider Extensions ──
  const voiceFilter = options?.voice ?? 'all';
  const filteredVoice =
    voiceFilter === 'none'
      ? []
      : voiceFilter === 'all'
        ? voiceEntries
        : voiceEntries.filter((t) => voiceFilter.includes(t.name));

  for (const entry of filteredVoice) {
    await loadEntry(entry);
  }

  // ── Productivity Extensions ──
  const prodFilter = options?.productivity ?? 'all';
  const filteredProd =
    prodFilter === 'none'
      ? []
      : prodFilter === 'all'
        ? productivityEntries
        : productivityEntries.filter((t) => prodFilter.includes(t.name));

  for (const entry of filteredProd) {
    await loadEntry(entry);
  }

  // ── Channel Extensions ──
  const channelEntries = getChannelEntries(options?.channels);

  for (const entry of channelEntries) {
    await loadEntry(entry);
  }

  // ── Build Overrides ──
  const manifestOverrides = options?.overrides
    ? {
        tools: Object.fromEntries(
          Object.entries(options.overrides)
            .filter(([, v]) => v.enabled !== undefined || v.priority !== undefined)
            .map(([k, v]) => [k, { enabled: v.enabled, priority: v.priority }])
        ),
      }
    : undefined;

  return {
    packs,
    overrides: manifestOverrides,
  };
}
