/**
 * @file index.ts
 * @description Main entry point for @framers/agentos-ext-anchor-providers.
 *
 * External anchor providers for the AgentOS provenance system:
 * - **WormSnapshotProvider** — S3 Object Lock / WORM storage (externally-archived)
 * - **RekorProvider** — Sigstore Rekor transparency log (publicly-auditable)
 * - **OpenTimestampsProvider** — Bitcoin-anchored timestamping (publicly-timestamped)
 * - **EthereumProvider** — Ethereum on-chain anchor (publicly-timestamped)
 * - **SolanaProvider** — Solana on-chain anchor (publicly-timestamped)
 *
 * ## Quick Start
 *
 * ### Option 1: Config-driven (via registry)
 * ```typescript
 * import { registerExtensionProviders } from '@framers/agentos-ext-anchor-providers';
 * import { createAnchorProvider } from '@framers/agentos';
 *
 * registerExtensionProviders();
 * const provider = createAnchorProvider({ type: 'rekor' });
 * ```
 *
 * ### Option 2: Direct construction
 * ```typescript
 * import { RekorProvider } from '@framers/agentos-ext-anchor-providers';
 *
 * const provider = new RekorProvider({ serverUrl: 'https://rekor.sigstore.dev' });
 * ```
 *
 * @module @framers/agentos-ext-anchor-providers
 */

// Registry
export { registerExtensionProviders } from './register.js';

// Providers
export { WormSnapshotProvider } from './providers/WormSnapshotProvider.js';
export type { WormSnapshotProviderConfig } from './providers/WormSnapshotProvider.js';

export { RekorProvider } from './providers/RekorProvider.js';
export type { RekorProviderConfig } from './providers/RekorProvider.js';

export { OpenTimestampsProvider } from './providers/OpenTimestampsProvider.js';
export type { OpenTimestampsProviderConfig } from './providers/OpenTimestampsProvider.js';

export { EthereumProvider } from './providers/EthereumProvider.js';
export type { EthereumProviderConfig } from './providers/EthereumProvider.js';

export { SolanaProvider } from './providers/SolanaProvider.js';
export type { SolanaProviderConfig } from './providers/SolanaProvider.js';

// Shared types
export type { BaseProviderConfig } from './types.js';
export { resolveBaseConfig } from './types.js';

// Utilities
export { fetchWithRetry } from './utils/http-client.js';
export type { HttpRequestOptions } from './utils/http-client.js';
export { canonicalizeAnchor, hashCanonicalAnchor } from './utils/serialization.js';
