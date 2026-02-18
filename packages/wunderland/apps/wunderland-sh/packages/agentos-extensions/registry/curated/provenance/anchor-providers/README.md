# @framers/agentos-ext-anchor-providers

External anchor providers for the [AgentOS](https://github.com/framersai/agentos) provenance system. Extends the built-in signed hash chain with external tamper-evidence backends — WORM storage, transparency logs, and blockchain timestamping.

## Proof Levels

Each provider advertises a proof level (ascending trust):

| Level | Meaning | Provider |
|-------|---------|----------|
| `verifiable` | Local signed hash chain only | Built-in (`NoneProvider`) |
| `externally-archived` | Immutable external archive with retention policy | `WormSnapshotProvider` |
| `publicly-auditable` | Append-only public transparency log | `RekorProvider` |
| `publicly-timestamped` | Blockchain-anchored timestamp proof | `OpenTimestampsProvider`, `EthereumProvider`, `SolanaProvider` |

## Installation

```bash
pnpm add @framers/agentos-ext-anchor-providers
```

Install the peer dependency for your chosen provider:

```bash
# For WORM Snapshot (S3 Object Lock)
pnpm add @aws-sdk/client-s3

# For Rekor (Sigstore Transparency Log)
pnpm add sigstore

# For OpenTimestamps (Bitcoin)
pnpm add opentimestamps

# For Ethereum (On-Chain Anchor)
pnpm add ethers

# For Solana (On-Chain Anchor)
pnpm add @solana/web3.js

# Optional (only if using base58 secret keys)
pnpm add bs58
```

## Quick Start

### Option 1: Config-Driven (via Registry)

Register all providers once at startup, then use the core factory:

```typescript
import { registerExtensionProviders } from '@framers/agentos-ext-anchor-providers';
import { createAnchorProvider } from '@framers/agentos';

// Register once at startup
registerExtensionProviders();

// Create provider from config
const provider = createAnchorProvider({
  type: 'rekor',
  options: { serverUrl: 'https://rekor.sigstore.dev' },
});
```

### Option 2: Direct Construction

Import and instantiate providers directly:

```typescript
import { RekorProvider } from '@framers/agentos-ext-anchor-providers';

const provider = new RekorProvider({
  serverUrl: 'https://rekor.sigstore.dev',
  timeoutMs: 15000,
});
```

### Using with AnchorManager

```typescript
import { AnchorManager, profiles } from '@framers/agentos';
import { RekorProvider } from '@framers/agentos-ext-anchor-providers';

const provider = new RekorProvider();
const config = profiles.sealedAutonomous();

const anchorManager = new AnchorManager(
  storageAdapter,
  ledger,
  keyManager,
  config,
  '', // table prefix
  provider, // external anchor provider
);
```

## Providers

### WORM Snapshot Provider (S3 Object Lock)

Archives anchor records to S3 with Object Lock retention. Provides compliance-grade immutability — objects cannot be deleted or overwritten during the retention period.

**Proof level:** `externally-archived`
**Peer dependency:** `@aws-sdk/client-s3`

```typescript
import { WormSnapshotProvider } from '@framers/agentos-ext-anchor-providers';

const provider = new WormSnapshotProvider({
  bucket: 'my-provenance-bucket',    // Required: S3 bucket with Object Lock enabled
  region: 'us-east-1',               // Required: AWS region
  keyPrefix: 'provenance/anchors/',  // Default: 'provenance/anchors/'
  retentionDays: 365,                // Default: 365
  retentionMode: 'COMPLIANCE',       // 'GOVERNANCE' (default) or 'COMPLIANCE'
  timeoutMs: 30000,                  // Default: 30000
  retries: 3,                        // Default: 3
});
```

### Rekor Provider (Sigstore Transparency Log)

Publishes anchor hashes to [Sigstore Rekor](https://rekor.sigstore.dev), a publicly auditable append-only transparency log. Entries are permanently recorded and anyone can verify inclusion.

**Proof level:** `publicly-auditable`
**Peer dependency:** `sigstore`

```typescript
import { RekorProvider } from '@framers/agentos-ext-anchor-providers';

const provider = new RekorProvider({
  serverUrl: 'https://rekor.sigstore.dev',  // Default: public Rekor instance
  timeoutMs: 30000,
  retries: 3,
});
```

### OpenTimestamps Provider (Bitcoin)

Creates [OpenTimestamps](https://opentimestamps.org) proofs anchored to the Bitcoin blockchain. Proofs are initially pending and confirm after a Bitcoin block includes the calendar commitment (typically 1-2 hours).

**Proof level:** `publicly-timestamped`
**Peer dependency:** `opentimestamps`

```typescript
import { OpenTimestampsProvider } from '@framers/agentos-ext-anchor-providers';

const provider = new OpenTimestampsProvider({
  calendarUrls: [                           // Default: public OTS calendars
    'https://a.pool.opentimestamps.org',
    'https://b.pool.opentimestamps.org',
    'https://a.pool.eternitywall.com',
  ],
  timeoutMs: 30000,
  retries: 3,
});
```

### Ethereum Provider (On-Chain Anchor)

Publishes anchor Merkle roots as calldata in Ethereum transactions. Provides cryptographic proof of existence at a specific block height.

**Proof level:** `publicly-timestamped`
**Peer dependency:** `ethers`

```typescript
import { EthereumProvider } from '@framers/agentos-ext-anchor-providers';

const provider = new EthereumProvider({
  rpcUrl: 'https://eth-mainnet.alchemyapi.io/v2/YOUR_KEY',  // Required
  signerPrivateKey: '0x...',         // Required: hex private key
  chainId: 1,                        // Default: 1 (mainnet)
  contractAddress: '0x...',          // Optional: anchor storage contract
  gasLimit: 100000,                  // Optional: gas limit override
  timeoutMs: 60000,
  retries: 3,
});
```

## Composite Usage

Use `CompositeAnchorProvider` from `@framers/agentos` to publish to multiple backends simultaneously:

```typescript
import { CompositeAnchorProvider } from '@framers/agentos';
import { RekorProvider, WormSnapshotProvider } from '@framers/agentos-ext-anchor-providers';

const provider = new CompositeAnchorProvider([
  new WormSnapshotProvider({ bucket: 'my-bucket', region: 'us-east-1' }),
  new RekorProvider(),
]);

// Publishes to both WORM and Rekor in parallel
// Proof level: publicly-auditable (highest among children)
```

Or via config with the composite type:

```typescript
registerExtensionProviders();

const provider = createAnchorProvider({
  type: 'composite',
  targets: [
    { type: 'worm-snapshot', options: { bucket: 'my-bucket', region: 'us-east-1' } },
    { type: 'rekor' },
  ],
});
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     @framers/agentos (core)                      │
│                                                                  │
│  AnchorManager ──→ AnchorProvider interface                      │
│       │                  ↑                                       │
│       │            ┌─────┴──────┐                                │
│       │            │NoneProvider│ (built-in, local-only)         │
│       │            └────────────┘                                │
│       │            ┌──────────────────┐                          │
│       │            │CompositeProvider │ (built-in, multi-target) │
│       │            └──────────────────┘                          │
│       │                                                          │
│  createAnchorProvider() ←─── registerAnchorProviderFactory()     │
└──────────────────────┬───────────────────────────────────────────┘
                       │ (registry pattern)
┌──────────────────────▼───────────────────────────────────────────┐
│            @framers/agentos-ext-anchor-providers           │
│                                                                  │
│  registerExtensionProviders()                                    │
│       │                                                          │
│       ├── WormSnapshotProvider  (externally-archived)            │
│       ├── RekorProvider         (publicly-auditable)             │
│       ├── OpenTimestampsProvider(publicly-timestamped)           │
│       ├── EthereumProvider      (publicly-timestamped)           │
│       └── SolanaProvider        (publicly-timestamped)           │
└──────────────────────────────────────────────────────────────────┘
```

## Writing Custom Providers

Implement the `AnchorProvider` interface from `@framers/agentos`:

```typescript
import type { AnchorProvider, AnchorRecord, AnchorProviderResult, ProofLevel } from '@framers/agentos';

export class MyCustomProvider implements AnchorProvider {
  readonly id = 'my-custom';
  readonly name = 'My Custom Provider';
  readonly proofLevel: ProofLevel = 'externally-archived';

  async publish(anchor: AnchorRecord): Promise<AnchorProviderResult> {
    try {
      // Your publishing logic here
      const ref = await publishToMyBackend(anchor);
      return { providerId: this.id, success: true, externalRef: ref };
    } catch (e) {
      return { providerId: this.id, success: false, error: String(e) };
    }
  }

  async verify(anchor: AnchorRecord): Promise<boolean> {
    // Verify the anchor against the external record
    return verifyAgainstMyBackend(anchor);
  }

  async dispose(): Promise<void> {
    // Cleanup resources
  }
}
```

Register it with the core factory:

```typescript
import { registerAnchorProviderFactory } from '@framers/agentos';
import { MyCustomProvider } from './MyCustomProvider';

registerAnchorProviderFactory('my-custom', (opts) => new MyCustomProvider(opts));
```

## Utilities

### `fetchWithRetry(url, init, options)`

HTTP fetch wrapper with exponential backoff retry. Used internally by providers that communicate over HTTP.

```typescript
import { fetchWithRetry } from '@framers/agentos-ext-anchor-providers';

const response = await fetchWithRetry('https://api.example.com/anchor', {
  method: 'POST',
  body: JSON.stringify(data),
}, { timeoutMs: 10000, retries: 3 });
```

### `canonicalizeAnchor(anchor)`

Deterministic JSON serialization of an `AnchorRecord` with sorted keys. Ensures all providers hash the same byte representation.

### `hashCanonicalAnchor(anchor)`

Computes SHA-256 hex digest of the canonical anchor representation.

## Implementation Status

| Provider | Status | Notes |
|----------|--------|-------|
| WormSnapshotProvider | Stub | Requires `@aws-sdk/client-s3` implementation |
| RekorProvider | Stub | Requires `sigstore` SDK implementation |
| OpenTimestampsProvider | Stub | Requires `opentimestamps` implementation |
| EthereumProvider | Stub | Requires `ethers` implementation |
| SolanaProvider | Implemented | Requires `@solana/web3.js` (and a funded signer) |

All providers **except SolanaProvider** currently return `{ success: false }` from `publish()` until their respective SDK integrations are implemented. SolanaProvider is functional when its optional peer dependencies are installed and the configured signer is funded.

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### Test Structure

| File | Description |
|------|-------------|
| `test/providers.spec.ts` | Unit tests for all 4 providers — identity, stub behavior, config |
| `test/register.spec.ts` | Registration tests — verifies factories are registered with core |
| `test/integration.spec.ts` | End-to-end integration — factory creation, provider identity, stub behavior |
| `test/utils.spec.ts` | Utility tests — canonicalization, SHA-256 hashing, HTTP retry |
| `test/types.spec.ts` | Config resolution tests — default values, overrides |

## Related Packages

| Package | Description | Link |
|---------|-------------|------|
| `@framers/agentos` | Core AgentOS framework with `AnchorProvider` interface, `AnchorManager`, registry | [packages/agentos](https://github.com/framersai/agentos) |
| `@framers/agentos` provenance types | `AnchorProvider`, `ProofLevel`, `AnchorProviderResult` interfaces | [`src/core/provenance/types.ts`](https://github.com/framersai/agentos/blob/master/src/core/provenance/types.ts) |
| `@framers/agentos` factory | `createAnchorProvider()`, `registerAnchorProviderFactory()` | [`src/core/provenance/anchoring/providers/createAnchorProvider.ts`](https://github.com/framersai/agentos/blob/master/src/core/provenance/anchoring/providers/createAnchorProvider.ts) |
| `@framers/agentos` built-in providers | `NoneProvider`, `CompositeAnchorProvider` | [`src/core/provenance/anchoring/providers/`](https://github.com/framersai/agentos/blob/master/src/core/provenance/anchoring/providers/) |
| `@framers/agentos` AnchorManager | Periodic anchoring with external provider support | [`src/core/provenance/anchoring/AnchorManager.ts`](https://github.com/framersai/agentos/blob/master/src/core/provenance/anchoring/AnchorManager.ts) |
| `@framers/agentos` profiles | `sealedAuditable()` convenience profile | [`src/core/provenance/config/PolicyProfiles.ts`](https://github.com/framersai/agentos/blob/master/src/core/provenance/config/PolicyProfiles.ts) |

## License

MIT
