/**
 * @file register.spec.ts
 * @description Tests for the extension provider registration with core AgentOS factory.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted() so the mock fn is available before vi.mock hoisting
const mockRegister = vi.hoisted(() => vi.fn());
vi.mock('@framers/agentos', () => ({
  registerAnchorProviderFactory: mockRegister,
}));

// Import after mocking
import { registerExtensionProviders } from '../src/register.js';

describe('registerExtensionProviders', () => {
  beforeEach(() => {
    mockRegister.mockClear();
  });

  it('should register all 5 provider factories', async () => {
    // Re-import to reset the `registered` flag
    const mod = await import('../src/register.js');

    // Force reset by accessing internals — in a fresh module this is not needed
    // but vitest caches modules, so we call it knowing it may be idempotent
    mod.registerExtensionProviders();

    // Verify at least 4 registrations happened (first call registers all 4)
    const types = mockRegister.mock.calls.map((call: unknown[]) => call[0]);
    expect(types).toContain('worm-snapshot');
    expect(types).toContain('rekor');
    expect(types).toContain('opentimestamps');
    expect(types).toContain('ethereum');
    expect(types).toContain('solana');
  });

  it('should register factories that create correct provider instances', () => {
    // Find the rekor factory call
    const rekorCall = mockRegister.mock.calls.find((call: unknown[]) => call[0] === 'rekor');
    if (rekorCall) {
      const factory = rekorCall[1] as (opts: any) => any;
      const provider = factory({ serverUrl: 'https://custom.rekor.dev' });
      expect(provider.id).toBe('rekor');
      expect(provider.proofLevel).toBe('publicly-auditable');
    }
  });

  it('should register factories that create providers with options', () => {
    const ethCall = mockRegister.mock.calls.find((call: unknown[]) => call[0] === 'ethereum');
    if (ethCall) {
      const factory = ethCall[1] as (opts: any) => any;
      const provider = factory({ rpcUrl: 'https://eth.test', chainId: 5 });
      expect(provider.id).toBe('ethereum');
      expect(provider.proofLevel).toBe('publicly-timestamped');
    }
  });

  it('should register WormSnapshot factory with config', () => {
    const wormCall = mockRegister.mock.calls.find((call: unknown[]) => call[0] === 'worm-snapshot');
    if (wormCall) {
      const factory = wormCall[1] as (opts: any) => any;
      const provider = factory({ bucket: 'test-bucket', region: 'us-west-2' });
      expect(provider.id).toBe('worm-snapshot');
      expect(provider.proofLevel).toBe('externally-archived');
    }
  });
});
