/**
 * @fileoverview AgentOS Extensions Registry Bundle.
 *
 * Single-import package that discovers, configures, and registers all
 * curated AgentOS extensions (channels, tools, integrations).
 *
 * @example
 * ```typescript
 * import { createCuratedManifest } from '@framers/agentos-extensions-registry';
 *
 * const manifest = await createCuratedManifest({
 *   channels: ['telegram', 'whatsapp', 'discord'],
 *   tools: 'all',
 *   secrets: resolvedSecrets,
 * });
 *
 * const agentOS = new AgentOS({ extensionManifest: manifest });
 * ```
 *
 * @module @framers/agentos-extensions-registry
 */

export {
  createCuratedManifest,
  getAvailableExtensions,
  getAvailableChannels,
} from './manifest-builder.js';

export { CHANNEL_CATALOG, getChannelEntries, getChannelEntry } from './channel-registry.js';

export { PROVIDER_CATALOG, getProviderEntries, getProviderEntry } from './provider-registry.js';

export { TOOL_CATALOG, getToolEntries, getToolEntry } from './tool-registry.js';

export type {
  RegistryOptions,
  ExtensionOverrideConfig,
  ExtensionInfo,
  ChannelRegistryEntry,
} from './types.js';

export type { ProviderRegistryEntry } from './provider-registry.js';
