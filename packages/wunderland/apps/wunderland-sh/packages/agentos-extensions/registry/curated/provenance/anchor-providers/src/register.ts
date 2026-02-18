/**
 * @file register.ts
 * @description Registers all anchor provider factories with the core AgentOS factory.
 * Call `registerExtensionProviders()` once at startup to enable config-driven
 * provider creation via `createAnchorProvider()`.
 *
 * @module @framers/agentos-ext-anchor-providers
 */

import { registerAnchorProviderFactory } from '@framers/agentos';
import { WormSnapshotProvider } from './providers/WormSnapshotProvider.js';
import type { WormSnapshotProviderConfig } from './providers/WormSnapshotProvider.js';
import { RekorProvider } from './providers/RekorProvider.js';
import type { RekorProviderConfig } from './providers/RekorProvider.js';
import { OpenTimestampsProvider } from './providers/OpenTimestampsProvider.js';
import type { OpenTimestampsProviderConfig } from './providers/OpenTimestampsProvider.js';
import { EthereumProvider } from './providers/EthereumProvider.js';
import type { EthereumProviderConfig } from './providers/EthereumProvider.js';
import { SolanaProvider } from './providers/SolanaProvider.js';
import type { SolanaProviderConfig } from './providers/SolanaProvider.js';

let registered = false;

/**
 * Register all anchor provider factories with the core AgentOS provider registry.
 * Call once at application startup, before creating any AnchorProvider via config.
 *
 * Safe to call multiple times — subsequent calls are no-ops.
 *
 * @example
 * ```typescript
 * import { registerExtensionProviders } from '@framers/agentos-ext-anchor-providers';
 * import { createAnchorProvider } from '@framers/agentos';
 *
 * // Register at startup
 * registerExtensionProviders();
 *
 * // Now config-driven creation works:
 * const provider = createAnchorProvider({
 *   type: 'rekor',
 *   options: { serverUrl: 'https://rekor.sigstore.dev' },
 * });
 * ```
 */
export function registerExtensionProviders(): void {
  if (registered) return;

  registerAnchorProviderFactory('worm-snapshot', (opts) =>
    new WormSnapshotProvider(opts as unknown as WormSnapshotProviderConfig),
  );

  registerAnchorProviderFactory('rekor', (opts) =>
    new RekorProvider(opts as unknown as RekorProviderConfig),
  );

  registerAnchorProviderFactory('opentimestamps', (opts) =>
    new OpenTimestampsProvider(opts as unknown as OpenTimestampsProviderConfig),
  );

  registerAnchorProviderFactory('ethereum', (opts) =>
    new EthereumProvider(opts as unknown as EthereumProviderConfig),
  );

  registerAnchorProviderFactory('solana', (opts) =>
    new SolanaProvider(opts as unknown as SolanaProviderConfig),
  );

  registered = true;
}
