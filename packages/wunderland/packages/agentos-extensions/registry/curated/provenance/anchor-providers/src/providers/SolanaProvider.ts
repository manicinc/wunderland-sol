/**
 * @file SolanaProvider.ts
 * @description Solana on-chain anchor provider (Wunderland-compatible).
 *
 * Publishes AgentOS anchor records via the `anchor_post` instruction of the
 * Wunderland Solana program (content_hash + manifest_hash).
 *
 * Proof level: `publicly-timestamped`
 *
 * Required runtime dependency: `@solana/web3.js`
 * Optional runtime dependency (only if using base58 secret keys): `bs58`
 *
 * @module @framers/agentos-ext-anchor-providers
 */

import type { AnchorProvider, AnchorRecord, AnchorProviderResult, ProofLevel } from '@framers/agentos';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import type { BaseProviderConfig } from '../types.js';
import { resolveBaseConfig } from '../types.js';
import { hashCanonicalAnchor } from '../utils/serialization.js';

export interface SolanaProviderConfig extends BaseProviderConfig {
  /** JSON-RPC endpoint URL. */
  rpcUrl: string;
  /** Wunderland on-chain program ID. */
  programId: string;

  /**
   * Owner wallet signer used for agent registration (`initialize_agent`).
   *
   * This wallet:
   * - signs `initialize_agent`
   * - pays the mint fee + rent
   *
   * Notes:
   * - Registration is permissionless (not registrar-gated).
   * - The owner wallet must be different from the agent signer (on-chain invariant).
   */
  ownerSecretKeyJson?: number[];
  ownerKeypairPath?: string;
  ownerPrivateKeyBase58?: string;

  /**
   * @deprecated Use `owner*` fields instead.
   *
   * Legacy alias for the owner wallet used for agent registration.
   *
   * Kept for backward compatibility with older configs that used the term "registrar".
   */
  registrarSecretKeyJson?: number[];
  registrarKeypairPath?: string;
  registrarPrivateKeyBase58?: string;

  /**
   * Agent signer wallet secret key (Solana Keypair secretKey bytes) as a JSON number array.
   *
   * This keypair is used to:
   * - pay transaction fees/rent (fee payer)
   * - ed25519-sign Wunderland payload messages (agent signer)
   *
   * Example: the contents of a Solana CLI keypair file.
   */
  signerSecretKeyJson?: number[];

  /** Path to agent signer wallet keypair JSON file (array of numbers). */
  signerKeypairPath?: string;

  /** Base58-encoded agent signer wallet secret key bytes (64 bytes). */
  signerPrivateKeyBase58?: string;

  /** Solana cluster label used only for `externalRef` formatting. */
  cluster?: 'devnet' | 'testnet' | 'mainnet-beta' | 'localnet';

  /** Commitment level (e.g. 'confirmed', 'finalized'). Default: 'confirmed'. */
  commitment?: string;

  /**
   * Enclave name to publish into.
   *
   * Default: 'wunderland'
   */
  enclaveName?: string;

  /**
   * If true, automatically creates the enclave (create_enclave) when missing.
   *
   * Default: false
   */
  autoCreateEnclave?: boolean;

  /**
   * Optional explicit agent_id (32-byte hex string).
   *
   * If omitted, a deterministic id is derived from the signer public key.
   */
  agentIdHex?: string;

  /**
   * If true, automatically initializes the agent (initialize_agent) when missing.
   *
   * Requires owner wallet signer configuration (see `owner*` fields).
   *
   * Default: false
   */
  autoInitializeAgent?: boolean;

  /** Display name used when auto-initializing the agent. Default: 'AgentOS'. */
  agentDisplayName?: string;

  /**
   * HEXACO traits (u16 0-1000) used when auto-initializing the agent.
   * Order: [H, E, X, A, C, O]
   */
  agentHexacoTraits?: [number, number, number, number, number, number];
}

const DEFAULT_HEXACO: [number, number, number, number, number, number] = [800, 450, 650, 750, 850, 700];

const SIGN_DOMAIN = Buffer.from('WUNDERLAND_SOL_V2', 'utf8');
const ACTION_CREATE_ENCLAVE = 1;
const ACTION_ANCHOR_POST = 2;
const ENTRY_KIND_POST = 0;
const AGENT_IDENTITY_DATA_SIZE = 219;

function instructionDiscriminator(methodName: string): Buffer {
  return createHash('sha256')
    .update(`global:${methodName}`)
    .digest()
    .subarray(0, 8);
}

// ── base58 (needed for getProgramAccounts memcmp discriminator filter) ─────

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  const digits = [0];

  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i += 1) {
      carry += (digits[i] ?? 0) << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  // Preserve leading zeros (bs58 behavior).
  for (let k = 0; k < bytes.length && bytes[k] === 0 && k < bytes.length - 1; k += 1) {
    digits.push(0);
  }

  return digits
    .reverse()
    .map((d) => BASE58_ALPHABET[d] ?? '')
    .join('');
}

function accountDiscriminator(accountName: string): Buffer {
  return createHash('sha256').update(`account:${accountName}`).digest().subarray(0, 8);
}

function encodeName32(displayName: string): Buffer {
  const bytes = Buffer.alloc(32, 0);
  Buffer.from(displayName, 'utf-8').copy(bytes, 0, 0, Math.min(displayName.length, 32));
  return bytes;
}

function normalizeEnclaveName(name: string): string {
  return name.trim().toLowerCase();
}

function enclaveNameHash(name: string): Buffer {
  return createHash('sha256').update(normalizeEnclaveName(name), 'utf8').digest();
}

function buildAgentMessage(opts: {
  action: number;
  programId: Buffer;
  agentIdentityPda: Buffer;
  payload: Buffer;
}): Buffer {
  return Buffer.concat([
    SIGN_DOMAIN,
    Buffer.from([opts.action & 0xff]),
    opts.programId,
    opts.agentIdentityPda,
    opts.payload,
  ]);
}

function parseSolExternalRef(externalRef: string): { cluster?: string; postPda?: string; txSignature?: string } | null {
  // Format: sol:<cluster>:<postPda>:<txSignature>
  const parts = externalRef.split(':');
  if (parts.length < 4) return null;
  const [prefix, cluster, postPda, txSignature] = parts;
  if (prefix !== 'sol' && prefix !== 'solana') return null;
  return { cluster, postPda, txSignature };
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function canonicalizeSolanaManifest(anchor: AnchorRecord): string {
  // Deterministic (sorted keys) is achieved by constructing object literal in stable order.
  return JSON.stringify({
    anchorId: anchor.id,
    eventCount: anchor.eventCount,
    merkleRoot: anchor.merkleRoot,
    schema: 'agentos.solana-anchor-manifest.v1',
    sequenceFrom: anchor.sequenceFrom,
    sequenceTo: anchor.sequenceTo,
    signature: anchor.signature,
    timestamp: anchor.timestamp,
  });
}

// Account decoding offsets (must match on-chain Anchor structs).
const AGENT_TOTAL_ENTRIES_OFFSET = 8 + 32 + 32 + 32 + 32 + 12 + 1 + 8; // 157
const POST_CONTENT_HASH_OFFSET = 8 + 32 + 32 + 1 + 32 + 4; // 109

function decodeAgentTotalEntries(agentData: Buffer): number {
  const minLen = AGENT_TOTAL_ENTRIES_OFFSET + 4;
  if (agentData.length < minLen) {
    throw new Error(`AgentIdentity account data too small (${agentData.length} bytes).`);
  }
  return agentData.readUInt32LE(AGENT_TOTAL_ENTRIES_OFFSET);
}

export class SolanaProvider implements AnchorProvider {
  readonly id = 'solana';
  readonly name = 'Solana On-Chain Anchor (Wunderland)';
  readonly proofLevel: ProofLevel = 'publicly-timestamped';

  private readonly config: SolanaProviderConfig;
  private readonly baseConfig: Required<BaseProviderConfig>;

  constructor(config: SolanaProviderConfig) {
    this.config = {
      cluster: 'devnet',
      commitment: 'confirmed',
      enclaveName: 'wunderland',
      autoCreateEnclave: false,
      autoInitializeAgent: false,
      agentDisplayName: 'AgentOS',
      ...config,
    };
    this.baseConfig = resolveBaseConfig(config);
  }

  async publish(anchor: AnchorRecord): Promise<AnchorProviderResult> {
    const publishedAt = new Date().toISOString();

    try {
      if (!this.config.rpcUrl) {
        throw new Error('Missing required config: rpcUrl');
      }
      if (!this.config.programId) {
        throw new Error('Missing required config: programId');
      }

      const hasSigner =
        (this.config.signerSecretKeyJson && this.config.signerSecretKeyJson.length > 0) ||
        !!this.config.signerKeypairPath ||
        !!this.config.signerPrivateKeyBase58;
      if (!hasSigner) {
        throw new Error(
          'Missing signer configuration. Provide one of: signerSecretKeyJson, signerKeypairPath, signerPrivateKeyBase58.',
        );
      }
      if (this.config.signerKeypairPath && !existsSync(this.config.signerKeypairPath)) {
        throw new Error(`signerKeypairPath does not exist: ${this.config.signerKeypairPath}`);
      }

      const web3 = await this.loadWeb3();
      const signer = await this.loadSigner(web3);
      const connection = new web3.Connection(this.config.rpcUrl, this.config.commitment);

      const programId = new web3.PublicKey(this.config.programId);

      const [configPda] = web3.PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
      const [treasuryPda] = web3.PublicKey.findProgramAddressSync([Buffer.from('treasury')], programId);
      const [economicsPda] = web3.PublicKey.findProgramAddressSync([Buffer.from('econ')], programId);

      const cfgInfo = await connection.getAccountInfo(configPda, this.config.commitment);
      if (!cfgInfo) {
        throw new Error(
          'ProgramConfig not found. Run initialize_config as the program upgrade authority before anchoring.',
        );
      }

      const econInfo = await connection.getAccountInfo(economicsPda, this.config.commitment);
      if (!econInfo && this.config.autoInitializeAgent) {
        throw new Error(
          'EconomicsConfig not found. Run initialize_economics as the program authority before using autoInitializeAgent.',
        );
      }

      const agentId = (() => {
        if (this.config.agentIdHex) {
          const cleaned = this.config.agentIdHex.trim().toLowerCase();
          if (!/^[0-9a-f]{64}$/.test(cleaned)) {
            throw new Error(`agentIdHex must be 64 hex chars (got ${this.config.agentIdHex.length}).`);
          }
          return Buffer.from(cleaned, 'hex');
        }
        return createHash('sha256')
          .update(`agentos:${signer.publicKey.toBase58()}`, 'utf8')
          .digest();
      })();

      if (agentId.length !== 32) {
        throw new Error(`agentId must be 32 bytes (got ${agentId.length}).`);
      }

      // ── Ensure agent exists (optional auto-init) ───────────────────────
      const owner = await this.tryLoadOwnerSigner(web3);

      // Preferred: derive via owner (fast, avoids full scan).
      const derivedAgentPda = owner
        ? web3.PublicKey.findProgramAddressSync(
            [Buffer.from('agent'), owner.publicKey.toBuffer(), agentId],
            programId,
          )[0]
        : null;

      const derivedAgentInfo = derivedAgentPda
        ? await connection.getAccountInfo(derivedAgentPda, this.config.commitment)
        : null;

      const found = derivedAgentInfo
        ? { pda: derivedAgentPda!, info: derivedAgentInfo }
        : await this.findAgentIdentityBySearch({
            connection,
            web3,
            programId,
            agentId,
            agentSigner: signer.publicKey,
          });

      let agentPda = found?.pda ?? derivedAgentPda;
      let agentInfo = found?.info ?? derivedAgentInfo;

      if (!agentInfo && this.config.autoInitializeAgent) {
        if (!owner) {
          throw new Error(
            'autoInitializeAgent requires owner signer configuration. Provide one of: ownerSecretKeyJson, ownerKeypairPath, ownerPrivateKeyBase58 (or legacy registrar* aliases).',
          );
        }

        if (owner.publicKey.equals(signer.publicKey)) {
          throw new Error('Invalid config: owner wallet must not equal agent signer (agent_signer != owner).');
        }

        // Ensure we use the owner-derived PDA for initialization.
        const [initAgentPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from('agent'), owner.publicKey.toBuffer(), agentId],
          programId,
        );
        agentPda = initAgentPda;

        const [vaultPda] = web3.PublicKey.findProgramAddressSync([Buffer.from('vault'), agentPda.toBuffer()], programId);
        const [ownerCounterPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from('owner_counter'), owner.publicKey.toBuffer()],
          programId,
        );

        const displayName = this.config.agentDisplayName || 'AgentOS';
        const traits = this.config.agentHexacoTraits || DEFAULT_HEXACO;

        const traitBytes = Buffer.alloc(12);
        for (let i = 0; i < 6; i++) {
          const val = traits[i];
          if (val < 0 || val > 1000) {
            throw new Error(`Invalid agentHexacoTraits[${i}] value: ${val} (expected 0..1000)`);
          }
          traitBytes.writeUInt16LE(val >>> 0, i * 2);
        }

        const metadataHash = createHash('sha256')
          .update(
            JSON.stringify({
              schema: 'wunderland.agent-metadata.v1',
              displayName,
              hexacoU16: traits,
              createdBy: 'agentos.solana-provider',
              agentIdHex: agentId.toString('hex'),
            }),
            'utf8',
          )
          .digest();

        const initData = Buffer.concat([
          instructionDiscriminator('initialize_agent'),
          agentId,
          encodeName32(displayName),
          traitBytes,
          metadataHash,
          signer.publicKey.toBuffer(), // agent_signer
        ]);

        const initIx = new web3.TransactionInstruction({
          programId,
          keys: [
            { pubkey: configPda, isSigner: false, isWritable: true },
            { pubkey: treasuryPda, isSigner: false, isWritable: true },
            { pubkey: economicsPda, isSigner: false, isWritable: false },
            { pubkey: ownerCounterPda, isSigner: false, isWritable: true },
            { pubkey: owner.publicKey, isSigner: true, isWritable: true },
            { pubkey: agentPda, isSigner: false, isWritable: true },
            { pubkey: vaultPda, isSigner: false, isWritable: true },
            { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: initData,
        });

        const initTx = new web3.Transaction().add(initIx);
        initTx.feePayer = owner.publicKey;
        await web3.sendAndConfirmTransaction(connection, initTx, [owner]);
        agentInfo = await connection.getAccountInfo(agentPda, this.config.commitment);
      }

      if (!agentPda || !agentInfo) {
        throw new Error(
          `AgentIdentity not found. Register this agent on-chain (initialize_agent) or enable autoInitializeAgent with an owner signer. agentId=${agentId.toString('hex')}, agentSigner=${signer.publicKey.toBase58()}`,
        );
      }

      // ── Ensure enclave exists (optional auto-create) ───────────────────
      const enclaveName = this.config.enclaveName || 'wunderland';
      const nameHash = enclaveNameHash(enclaveName);
      const [enclavePda] = web3.PublicKey.findProgramAddressSync([Buffer.from('enclave'), nameHash], programId);
      const [enclaveTreasuryPda] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from('enclave_treasury'), enclavePda.toBuffer()],
        programId,
      );

      let enclaveInfo = await connection.getAccountInfo(enclavePda, this.config.commitment);
      if (!enclaveInfo && this.config.autoCreateEnclave) {
        const metadataHash = createHash('sha256')
          .update(
            JSON.stringify({
              schema: 'wunderland.enclave-metadata.v1',
              name: normalizeEnclaveName(enclaveName),
              createdBy: 'agentos.solana-provider',
            }),
            'utf8',
          )
          .digest();

        const payload = Buffer.concat([nameHash, metadataHash]);
        const message = buildAgentMessage({
          action: ACTION_CREATE_ENCLAVE,
          programId: programId.toBuffer(),
          agentIdentityPda: agentPda.toBuffer(),
          payload,
        });

        const ed25519Ix = web3.Ed25519Program.createInstructionWithPrivateKey({
          privateKey: signer.secretKey,
          message,
        });

        const createData = Buffer.concat([
          instructionDiscriminator('create_enclave'),
          nameHash,
          metadataHash,
        ]);

        const createIx = new web3.TransactionInstruction({
          programId,
          keys: [
            { pubkey: configPda, isSigner: false, isWritable: true },
            { pubkey: agentPda, isSigner: false, isWritable: false },
            { pubkey: enclavePda, isSigner: false, isWritable: true },
            { pubkey: enclaveTreasuryPda, isSigner: false, isWritable: true },
            { pubkey: signer.publicKey, isSigner: true, isWritable: true },
            { pubkey: web3.SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: createData,
        });

        const createTx = new web3.Transaction().add(ed25519Ix, createIx);
        createTx.feePayer = signer.publicKey;
        await web3.sendAndConfirmTransaction(connection, createTx, [signer]);
        enclaveInfo = await connection.getAccountInfo(enclavePda, this.config.commitment);
      }

      if (!enclaveInfo) {
        throw new Error(
          `Enclave not found (${enclavePda.toBase58()}). Create it on-chain or enable autoCreateEnclave.`,
        );
      }

      const agentData = Buffer.from(agentInfo.data);
      const entryIndex = decodeAgentTotalEntries(agentData);

      const indexBuf = Buffer.alloc(4);
      indexBuf.writeUInt32LE(entryIndex >>> 0, 0);
      const [postPda] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from('post'), agentPda.toBuffer(), indexBuf],
        programId,
      );

      // ── Hashes ──────────────────────────────────────────────────────────
      const contentHashHex = await hashCanonicalAnchor(anchor);
      const manifestHashHex = sha256Hex(canonicalizeSolanaManifest(anchor));

      const contentHash = Buffer.from(contentHashHex, 'hex');
      const manifestHash = Buffer.from(manifestHashHex, 'hex');

      if (contentHash.length !== 32 || manifestHash.length !== 32) {
        throw new Error('Computed hashes are not 32 bytes.');
      }

      const payload = Buffer.concat([
        enclavePda.toBuffer(),
        Buffer.from([ENTRY_KIND_POST]),
        Buffer.alloc(32, 0), // reply_to = none
        indexBuf,
        contentHash,
        manifestHash,
      ]);

      const message = buildAgentMessage({
        action: ACTION_ANCHOR_POST,
        programId: programId.toBuffer(),
        agentIdentityPda: agentPda.toBuffer(),
        payload,
      });

      const ed25519Ix = web3.Ed25519Program.createInstructionWithPrivateKey({
        privateKey: signer.secretKey,
        message,
      });

      const data = Buffer.concat([
        instructionDiscriminator('anchor_post'),
        contentHash,
        manifestHash,
      ]);

      const postIx = new web3.TransactionInstruction({
        programId,
        keys: [
          { pubkey: postPda, isSigner: false, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: true },
          { pubkey: enclavePda, isSigner: false, isWritable: false },
          { pubkey: signer.publicKey, isSigner: true, isWritable: true },
          { pubkey: web3.SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
          { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
      });

      const postTx = new web3.Transaction().add(ed25519Ix, postIx);
      postTx.feePayer = signer.publicKey;
      const txSignature = await web3.sendAndConfirmTransaction(connection, postTx, [signer]);

      return {
        providerId: this.id,
        success: true,
        publishedAt,
        externalRef: `sol:${this.config.cluster}:${postPda.toBase58()}:${txSignature}`,
        metadata: {
          cluster: this.config.cluster,
          commitment: this.config.commitment,
          postPda: postPda.toBase58(),
          agentPda: agentPda.toBase58(),
          enclavePda: enclavePda.toBase58(),
          postIndex: entryIndex,
          txSignature,
        },
      };
    } catch (e: unknown) {
      return {
        providerId: this.id,
        success: false,
        publishedAt,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async verify(anchor: AnchorRecord): Promise<boolean> {
    try {
      if (!anchor.externalRef) return false;
      const parsed = parseSolExternalRef(anchor.externalRef);
      if (!parsed?.postPda) return false;

      const web3 = await this.loadWeb3();
      const connection = new web3.Connection(this.config.rpcUrl, this.config.commitment);
      const postKey = new web3.PublicKey(parsed.postPda);

      const postInfo = await connection.getAccountInfo(postKey, this.config.commitment);
      if (!postInfo) return false;

      const data = Buffer.from(postInfo.data);
      const offset = POST_CONTENT_HASH_OFFSET;
      if (data.length < offset + 64) return false;

      const onChainContentHash = data.subarray(offset, offset + 32);
      const onChainManifestHash = data.subarray(offset + 32, offset + 64);

      const expectedContentHash = Buffer.from(await hashCanonicalAnchor(anchor), 'hex');
      const expectedManifestHash = Buffer.from(sha256Hex(canonicalizeSolanaManifest(anchor)), 'hex');

      return onChainContentHash.equals(expectedContentHash) && onChainManifestHash.equals(expectedManifestHash);
    } catch {
      return false;
    }
  }

  async dispose(): Promise<void> {
    // No persistent resources.
  }

  private async loadWeb3(): Promise<any> {
    const moduleName: string = '@solana/web3.js';
    try {
      return await import(moduleName);
    } catch (e: unknown) {
      throw new Error(
        'SolanaProvider requires @solana/web3.js at runtime. ' +
        'Install it in your project to enable Solana anchoring.',
      );
    }
  }

  private async loadSigner(web3: any): Promise<any> {
    if (this.config.signerSecretKeyJson && this.config.signerSecretKeyJson.length > 0) {
      return web3.Keypair.fromSecretKey(Uint8Array.from(this.config.signerSecretKeyJson));
    }

    if (this.config.signerKeypairPath) {
      if (!existsSync(this.config.signerKeypairPath)) {
        throw new Error(`signerKeypairPath does not exist: ${this.config.signerKeypairPath}`);
      }
      const raw = JSON.parse(readFileSync(this.config.signerKeypairPath, 'utf-8')) as number[];
      return web3.Keypair.fromSecretKey(Uint8Array.from(raw));
    }

    if (this.config.signerPrivateKeyBase58) {
      const bs58 = await this.loadBs58();
      const secretKey = (bs58.decode as (input: string) => Uint8Array)(this.config.signerPrivateKeyBase58);
      return web3.Keypair.fromSecretKey(secretKey);
    }

    throw new Error(
      'Missing signer configuration. Provide one of: signerSecretKeyJson, signerKeypairPath, signerPrivateKeyBase58.',
    );
  }

  private async loadRegistrarSigner(web3: any): Promise<any> {
    // Deprecated: retain method for backward compatibility, but treat "registrar" as "owner".
    return this.loadOwnerSigner(web3);
  }

  private async loadBs58(): Promise<any> {
    const moduleName: string = 'bs58';
    try {
      const mod = await import(moduleName);
      return (mod as any).default ?? mod;
    } catch {
      throw new Error('signerPrivateKeyBase58 requires the optional dependency "bs58" at runtime.');
    }
  }

  private async tryLoadOwnerSigner(web3: any): Promise<any | null> {
    try {
      return await this.loadOwnerSigner(web3);
    } catch {
      return null;
    }
  }

  private async loadOwnerSigner(web3: any): Promise<any> {
    if (this.config.ownerSecretKeyJson && this.config.ownerSecretKeyJson.length > 0) {
      return web3.Keypair.fromSecretKey(Uint8Array.from(this.config.ownerSecretKeyJson));
    }

    if (this.config.ownerKeypairPath) {
      if (!existsSync(this.config.ownerKeypairPath)) {
        throw new Error(`ownerKeypairPath does not exist: ${this.config.ownerKeypairPath}`);
      }
      const raw = JSON.parse(readFileSync(this.config.ownerKeypairPath, 'utf-8')) as number[];
      return web3.Keypair.fromSecretKey(Uint8Array.from(raw));
    }

    if (this.config.ownerPrivateKeyBase58) {
      const bs58 = await this.loadBs58();
      const secretKey = (bs58.decode as (input: string) => Uint8Array)(this.config.ownerPrivateKeyBase58);
      return web3.Keypair.fromSecretKey(secretKey);
    }

    // Legacy aliases
    if (this.config.registrarSecretKeyJson && this.config.registrarSecretKeyJson.length > 0) {
      return web3.Keypair.fromSecretKey(Uint8Array.from(this.config.registrarSecretKeyJson));
    }

    if (this.config.registrarKeypairPath) {
      if (!existsSync(this.config.registrarKeypairPath)) {
        throw new Error(`registrarKeypairPath does not exist: ${this.config.registrarKeypairPath}`);
      }
      const raw = JSON.parse(readFileSync(this.config.registrarKeypairPath, 'utf-8')) as number[];
      return web3.Keypair.fromSecretKey(Uint8Array.from(raw));
    }

    if (this.config.registrarPrivateKeyBase58) {
      const bs58 = await this.loadBs58();
      const secretKey = (bs58.decode as (input: string) => Uint8Array)(this.config.registrarPrivateKeyBase58);
      return web3.Keypair.fromSecretKey(secretKey);
    }

    throw new Error(
      'Missing owner signer configuration. Provide one of: ownerSecretKeyJson, ownerKeypairPath, ownerPrivateKeyBase58 (or legacy registrar* aliases).',
    );
  }

  private async findAgentIdentityBySearch(opts: {
    connection: any;
    web3: any;
    programId: any;
    agentId: Buffer;
    agentSigner: any;
  }): Promise<{ pda: any; info: any } | null> {
    try {
      const disc = accountDiscriminator('AgentIdentity');
      const discBase58 = base58Encode(disc);
      const agentIdBase58 = base58Encode(opts.agentId);

      // Account layout (current): disc(8) + owner(32) + agent_id(32) + agent_signer(32) + ...
      const AGENT_ID_OFFSET = 8 + 32;
      const AGENT_SIGNER_OFFSET = 8 + 32 + 32;

      const accounts = await opts.connection.getProgramAccounts(opts.programId, {
        filters: [
          { dataSize: AGENT_IDENTITY_DATA_SIZE },
          { memcmp: { offset: 0, bytes: discBase58 } },
          { memcmp: { offset: AGENT_ID_OFFSET, bytes: agentIdBase58 } },
          { memcmp: { offset: AGENT_SIGNER_OFFSET, bytes: opts.agentSigner.toBase58() } },
        ],
      });

      if (!Array.isArray(accounts) || accounts.length === 0) return null;
      if (accounts.length > 1) {
        // Should not happen when filtering by both agent_id + agent_signer, but guard anyway.
        throw new Error(`Multiple AgentIdentity accounts matched (count=${accounts.length}).`);
      }

      const acc = accounts[0];
      if (!acc?.pubkey || !acc?.account?.data) return null;

      return {
        pda: acc.pubkey,
        info: { data: acc.account.data },
      };
    } catch {
      return null;
    }
  }
}
