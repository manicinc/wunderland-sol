/**
 * @file providers.spec.ts
 * @description Tests for all anchor provider implementations.
 */

import { describe, it, expect } from 'vitest';
import { WormSnapshotProvider } from '../src/providers/WormSnapshotProvider.js';
import { RekorProvider } from '../src/providers/RekorProvider.js';
import { OpenTimestampsProvider } from '../src/providers/OpenTimestampsProvider.js';
import { EthereumProvider } from '../src/providers/EthereumProvider.js';
import { SolanaProvider } from '../src/providers/SolanaProvider.js';
import type { AnchorRecord } from '@framers/agentos';

function createMockAnchor(overrides?: Partial<AnchorRecord>): AnchorRecord {
  return {
    id: 'anchor-001',
    merkleRoot: 'abc123def456',
    sequenceFrom: 1,
    sequenceTo: 10,
    eventCount: 10,
    timestamp: '2025-01-15T00:00:00.000Z',
    signature: 'mock-signature-base64',
    ...overrides,
  };
}

// =============================================================================
// WormSnapshotProvider
// =============================================================================

describe('WormSnapshotProvider', () => {
  it('should have correct id, name, and proofLevel', () => {
    const provider = new WormSnapshotProvider({ bucket: 'test', region: 'us-east-1' });
    expect(provider.id).toBe('worm-snapshot');
    expect(provider.name).toBe('WORM Snapshot (S3 Object Lock)');
    expect(provider.proofLevel).toBe('externally-archived');
  });

  it('should return failure from stub publish()', async () => {
    const provider = new WormSnapshotProvider({ bucket: 'test', region: 'us-east-1' });
    const result = await provider.publish(createMockAnchor());
    expect(result.providerId).toBe('worm-snapshot');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not yet implemented');
  });

  it('should return false from stub verify()', async () => {
    const provider = new WormSnapshotProvider({ bucket: 'test', region: 'us-east-1' });
    const valid = await provider.verify(createMockAnchor({ externalRef: 's3://bucket/key' }));
    expect(valid).toBe(false);
  });
});

// =============================================================================
// RekorProvider
// =============================================================================

describe('RekorProvider', () => {
  it('should have correct id, name, and proofLevel', () => {
    const provider = new RekorProvider();
    expect(provider.id).toBe('rekor');
    expect(provider.name).toBe('Sigstore Rekor Transparency Log');
    expect(provider.proofLevel).toBe('publicly-auditable');
  });

  it('should use default server URL when none provided', () => {
    const provider = new RekorProvider();
    expect(provider).toBeDefined();
  });

  it('should return failure from stub publish()', async () => {
    const provider = new RekorProvider();
    const result = await provider.publish(createMockAnchor());
    expect(result.providerId).toBe('rekor');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not yet implemented');
  });

  it('should return false from stub verify() without externalRef', async () => {
    const provider = new RekorProvider();
    const valid = await provider.verify(createMockAnchor());
    expect(valid).toBe(false);
  });
});

// =============================================================================
// OpenTimestampsProvider
// =============================================================================

describe('OpenTimestampsProvider', () => {
  it('should have correct id, name, and proofLevel', () => {
    const provider = new OpenTimestampsProvider();
    expect(provider.id).toBe('opentimestamps');
    expect(provider.name).toBe('OpenTimestamps (Bitcoin)');
    expect(provider.proofLevel).toBe('publicly-timestamped');
  });

  it('should return failure from stub publish()', async () => {
    const provider = new OpenTimestampsProvider();
    const result = await provider.publish(createMockAnchor());
    expect(result.providerId).toBe('opentimestamps');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not yet implemented');
  });

  it('should accept custom calendar URLs', () => {
    const provider = new OpenTimestampsProvider({
      calendarUrls: ['https://custom.calendar.org'],
    });
    expect(provider).toBeDefined();
  });
});

// =============================================================================
// EthereumProvider
// =============================================================================

describe('EthereumProvider', () => {
  it('should have correct id, name, and proofLevel', () => {
    const provider = new EthereumProvider({ rpcUrl: 'https://eth.example.com' });
    expect(provider.id).toBe('ethereum');
    expect(provider.name).toBe('Ethereum On-Chain Anchor');
    expect(provider.proofLevel).toBe('publicly-timestamped');
  });

  it('should return failure from stub publish()', async () => {
    const provider = new EthereumProvider({ rpcUrl: 'https://eth.example.com' });
    const result = await provider.publish(createMockAnchor());
    expect(result.providerId).toBe('ethereum');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not yet implemented');
  });

  it('should accept chain ID and contract address', () => {
    const provider = new EthereumProvider({
      rpcUrl: 'https://eth.example.com',
      chainId: 11155111,
      contractAddress: '0x1234567890abcdef',
    });
    expect(provider).toBeDefined();
  });
});

// =============================================================================
// SolanaProvider
// =============================================================================

describe('SolanaProvider', () => {
  it('should have correct id, name, and proofLevel', () => {
    const provider = new SolanaProvider({ rpcUrl: 'https://solana.test', programId: '11111111111111111111111111111111' });
    expect(provider.id).toBe('solana');
    expect(provider.name).toBe('Solana On-Chain Anchor (Wunderland)');
    expect(provider.proofLevel).toBe('publicly-timestamped');
  });

  it('should return failure from publish() when signer config is missing', async () => {
    const provider = new SolanaProvider({ rpcUrl: 'https://solana.test', programId: '11111111111111111111111111111111' });
    const result = await provider.publish(createMockAnchor());
    expect(result.providerId).toBe('solana');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing signer configuration');
  });
});
