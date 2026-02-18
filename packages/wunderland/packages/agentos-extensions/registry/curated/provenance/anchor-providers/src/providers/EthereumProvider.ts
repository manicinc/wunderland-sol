/**
 * @file EthereumProvider.ts
 * @description Ethereum on-chain anchor provider.
 * Publishes anchor Merkle roots as calldata in Ethereum transactions.
 *
 * Proof level: `publicly-timestamped`
 * Required peer dependency: `ethers`
 *
 * @module @framers/agentos-ext-anchor-providers
 */

import type { AnchorProvider, AnchorRecord, AnchorProviderResult, ProofLevel } from '@framers/agentos';
import type { BaseProviderConfig } from '../types.js';
import { resolveBaseConfig } from '../types.js';
import { hashCanonicalAnchor } from '../utils/serialization.js';

export interface EthereumProviderConfig extends BaseProviderConfig {
  /** JSON-RPC endpoint URL. */
  rpcUrl: string;
  /** Contract address for anchor storage (optional — can use raw calldata tx). */
  contractAddress?: string;
  /** Private key hex for signing transactions. */
  signerPrivateKey?: string;
  /** Chain ID. Default: 1 (mainnet). */
  chainId?: number;
  /** Gas limit override. Default: auto-estimate. */
  gasLimit?: number;
}

export class EthereumProvider implements AnchorProvider {
  readonly id = 'ethereum';
  readonly name = 'Ethereum On-Chain Anchor';
  readonly proofLevel: ProofLevel = 'publicly-timestamped';

  private readonly config: EthereumProviderConfig;
  private readonly baseConfig: Required<BaseProviderConfig>;

  constructor(config: EthereumProviderConfig) {
    this.config = {
      chainId: 1,
      ...config,
    };
    this.baseConfig = resolveBaseConfig(config);
  }

  async publish(anchor: AnchorRecord): Promise<AnchorProviderResult> {
    // TODO: Implement using ethers.js or viem
    //
    // Implementation outline:
    //   1. Compute SHA-256 of canonical anchor: hashCanonicalAnchor(anchor)
    //   2. Create ethers.JsonRpcProvider(this.config.rpcUrl)
    //   3. Create ethers.Wallet(this.config.signerPrivateKey, provider)
    //   4. If contractAddress is set:
    //      - ABI-encode call to `anchor(bytes32 merkleRoot)` on the contract
    //      - Send contract transaction
    //   5. If no contractAddress (raw calldata):
    //      - Send self-transfer with 0x + anchorHash as calldata
    //   6. Wait for transaction receipt (1 confirmation)
    //   7. Return { success: true, externalRef: `eth:${chainId}:${txHash}`,
    //              metadata: { blockNumber, blockHash, gasUsed, chainId } }
    try {
      const _hash = await hashCanonicalAnchor(anchor);
      throw new Error(
        'EthereumProvider is not yet implemented. ' +
        'Install ethers.js and implement the Ethereum on-chain anchor integration.',
      );
    } catch (e: unknown) {
      return {
        providerId: this.id,
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async verify(anchor: AnchorRecord): Promise<boolean> {
    // TODO: Parse txHash from externalRef, fetch transaction receipt,
    //   decode calldata, compare with anchor hash
    if (!anchor.externalRef) return false;
    console.warn('[EthereumProvider] verify() is not yet implemented');
    return false;
  }

  async dispose(): Promise<void> {
    // TODO: Disconnect provider if persistent connection was established
  }
}
