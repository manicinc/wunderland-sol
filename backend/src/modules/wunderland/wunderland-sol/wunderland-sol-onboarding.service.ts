/**
 * @file wunderland-sol-onboarding.service.ts
 * @description Wallet-signed onboarding for managed/hosted Solana agents.
 *
 * Purpose:
 * - Bridge the on-chain AgentIdentity (minted by a human wallet) to the hosted
 *   Wunderland backend runtime so agents can act autonomously (post/bid/etc.).
 *
 * Security:
 * - Requires a wallet signature by the AgentIdentity.owner authorizing onboarding.
 * - Verifies on-chain AgentIdentity.owner and AgentIdentity.agent_signer match the request.
 * - Stores the agent signer secret key encrypted at rest (server-side).
 */

import { Injectable } from '@nestjs/common';
import { createHash, createPublicKey, randomBytes, verify as cryptoVerify } from 'node:crypto';
import { clusterApiUrl, Connection, Keypair, PublicKey } from '@solana/web3.js';
import { DatabaseService } from '../../../database/database.service.js';
import { encryptSecret } from '../../../utils/crypto.js';

const ONBOARD_INTENT = 'wunderland_onboard_managed_agent_v1';

function sha256HexUtf8(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function buildOnboardMessage(opts: { agentPda: string; agentSigner: string; programId: string; cluster: string }): string {
  return JSON.stringify({
    v: 1,
    intent: ONBOARD_INTENT,
    cluster: opts.cluster,
    programId: opts.programId,
    agentPda: opts.agentPda,
    agentSigner: opts.agentSigner,
  });
}

function solanaPublicKeyToSpkiDer(pubkeyBytes: Uint8Array): Buffer {
  return Buffer.concat([
    Buffer.from('302a300506032b6570032100', 'hex'),
    Buffer.from(pubkeyBytes),
  ]);
}

function verifyWalletSignatureBase64(opts: {
  wallet: string;
  message: string;
  signatureB64: string;
}): boolean {
  const walletKey = new PublicKey(opts.wallet);
  const keyDer = solanaPublicKeyToSpkiDer(walletKey.toBytes());
  const keyObject = createPublicKey({ key: keyDer, format: 'der', type: 'spki' });
  const signature = Buffer.from(opts.signatureB64, 'base64');
  const messageBytes = Buffer.from(opts.message, 'utf8');
  return cryptoVerify(null, messageBytes, keyObject, signature);
}

function decodeNullPaddedUtf8(bytes: Uint8Array): string {
  // Node TextDecoder is global in modern runtimes, but keep it explicit.
  const text = Buffer.from(bytes).toString('utf8');
  return text.replace(/\0/g, '').trim();
}

function readU16LE(buf: Buffer, offset: number): number {
  return buf.readUInt16LE(offset);
}

type DecodedAgentIdentity = {
  ownerWallet: string;
  agentSigner: string;
  displayName: string;
  hexaco: {
    honesty_humility: number;
    emotionality: number;
    extraversion: number;
    agreeableness: number;
    conscientiousness: number;
    openness: number;
  };
  isActive: boolean;
};

function decodeAgentIdentityAccount(data: Buffer): DecodedAgentIdentity {
  // Layout matches apps/wunderland-sh/anchor/programs/wunderland_sol/src/state.rs
  // discriminator(8) + owner(32) + agent_id(32) + agent_signer(32) + display_name(32) + traits(12)
  // + citizen_level(1) + xp(8) + total_entries(4) + reputation(8) + metadata_hash(32) + created_at(8)
  // + updated_at(8) + is_active(1) + bump(1)
  if (data.length < 219) {
    throw new Error(`AgentIdentity account data too small (${data.length} bytes).`);
  }

  let off = 8;
  const owner = new PublicKey(data.subarray(off, off + 32)).toBase58();
  off += 32;
  off += 32; // agent_id
  const signer = new PublicKey(data.subarray(off, off + 32)).toBase58();
  off += 32;
  const displayName = decodeNullPaddedUtf8(data.subarray(off, off + 32));
  off += 32;

  const traitsRaw = [
    readU16LE(data, off + 0),
    readU16LE(data, off + 2),
    readU16LE(data, off + 4),
    readU16LE(data, off + 6),
    readU16LE(data, off + 8),
    readU16LE(data, off + 10),
  ];
  off += 12;

  // Skip citizen_level(1) + xp(8) + total_entries(4) + reputation(8) + metadata_hash(32) + created_at(8) + updated_at(8)
  off += 1 + 8 + 4 + 8 + 32 + 8 + 8;

  const isActive = data.readUInt8(off) === 1;

  const toFloat = (v: number) => Math.max(0, Math.min(1, v / 1000));
  const hexaco = {
    honesty_humility: toFloat(traitsRaw[0] ?? 500),
    emotionality: toFloat(traitsRaw[1] ?? 500),
    extraversion: toFloat(traitsRaw[2] ?? 500),
    agreeableness: toFloat(traitsRaw[3] ?? 500),
    conscientiousness: toFloat(traitsRaw[4] ?? 500),
    openness: toFloat(traitsRaw[5] ?? 500),
  };

  return { ownerWallet: owner, agentSigner: signer, displayName, hexaco, isActive };
}

function getOnChainConfig(): { rpcUrl: string; rpcUrls: string[]; programId: string; cluster: string } {
  const cluster = String(
    process.env.WUNDERLAND_SOL_CLUSTER ||
      process.env.SOLANA_CLUSTER ||
      process.env.NEXT_PUBLIC_CLUSTER ||
      'devnet',
  ).trim();

  // Build ordered RPC list: Chainstack → configured → public fallback
  const rpcCandidates: string[] = [];
  const chainstack1 = process.env.CHAINSTACK_RPC_ENDPOINT;
  const chainstack2 = process.env.CHAINSTACK_RPC_ENDPOINT_2;
  if (chainstack1) rpcCandidates.push(chainstack1.trim());
  if (chainstack2) rpcCandidates.push(chainstack2.trim());

  const rpcEnv =
    process.env.WUNDERLAND_SOL_RPC_URL ||
    process.env.SOLANA_RPC ||
    process.env.NEXT_PUBLIC_SOLANA_RPC;
  if (rpcEnv && /^https?:\/\//i.test(String(rpcEnv).trim())) rpcCandidates.push(String(rpcEnv).trim());

  const publicRpc = clusterApiUrl(cluster as any);
  if (!rpcCandidates.includes(publicRpc)) rpcCandidates.push(publicRpc);

  const rpcUrl = rpcCandidates[0] || publicRpc;

  const programId = String(
    process.env.WUNDERLAND_SOL_PROGRAM_ID ||
      process.env.PROGRAM_ID ||
      process.env.NEXT_PUBLIC_PROGRAM_ID ||
      '',
  ).trim();

  if (!programId) {
    throw new Error('Missing WUNDERLAND_SOL_PROGRAM_ID (required for onboarding).');
  }

  return { rpcUrl, rpcUrls: rpcCandidates, programId, cluster };
}

function walletEmail(wallet: string): string {
  return `wallet:${wallet}`;
}

function randomPasswordHash(): string {
  // This is a non-login identity used only to satisfy FK constraints. It is never returned.
  return sha256HexUtf8(randomBytes(32).toString('hex'));
}

export type OnboardManagedAgentParams = {
  ownerWallet: string;
  agentIdentityPda: string;
  signatureB64: string;
  agentSignerSecretKeyJson: number[];
};

@Injectable()
export class WunderlandSolOnboardingService {
  constructor(private readonly db: DatabaseService) {}

  async onboardManagedAgent(
    params: OnboardManagedAgentParams,
    context?: { ownerUserId?: string }
  ): Promise<{
    ok: boolean;
    seedId?: string;
    agentIdentityPda?: string;
    agentSignerPubkey?: string;
    ownerWallet?: string;
    displayName?: string;
    error?: string;
  }> {
    const ownerWallet = new PublicKey(params.ownerWallet).toBase58();
    const agentIdentityPda = new PublicKey(params.agentIdentityPda).toBase58();
    const signatureB64 = typeof params.signatureB64 === 'string' ? params.signatureB64.trim() : '';
    if (!signatureB64) return { ok: false, error: 'Missing signatureB64' };

    const secretKey = params.agentSignerSecretKeyJson;
    if (!Array.isArray(secretKey) || secretKey.length !== 64) {
      return { ok: false, error: 'agentSignerSecretKeyJson must be a 64-byte secret key array' };
    }
    const secretKeyBytes = Uint8Array.from(secretKey.map((n) => (Number(n) ?? 0) & 0xff));

    let agentSignerKeypair: Keypair;
    try {
      agentSignerKeypair = Keypair.fromSecretKey(secretKeyBytes);
    } catch {
      return { ok: false, error: 'Invalid agentSignerSecretKeyJson (could not construct Keypair)' };
    }

    const { rpcUrl, programId, cluster } = getOnChainConfig();
    const programKey = new PublicKey(programId);

    const message = buildOnboardMessage({
      agentPda: agentIdentityPda,
      agentSigner: agentSignerKeypair.publicKey.toBase58(),
      programId,
      cluster,
    });

    let signatureOk = false;
    try {
      signatureOk = verifyWalletSignatureBase64({ wallet: ownerWallet, message, signatureB64 });
    } catch {
      signatureOk = false;
    }

    if (!signatureOk) {
      return { ok: false, error: 'Invalid wallet signature' };
    }

    // Verify on-chain AgentIdentity ownership + signer match.
    const connection = new Connection(rpcUrl, 'confirmed');
    const info = await connection.getAccountInfo(new PublicKey(agentIdentityPda), 'confirmed');
    if (!info) {
      return { ok: false, error: 'AgentIdentity account not found on-chain' };
    }
    if (!info.owner.equals(programKey)) {
      return { ok: false, error: 'AgentIdentity account is not owned by configured program' };
    }

    let decoded: DecodedAgentIdentity;
    try {
      decoded = decodeAgentIdentityAccount(Buffer.from(info.data));
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }

    if (decoded.ownerWallet !== ownerWallet) {
      return { ok: false, error: 'Owner wallet does not match on-chain AgentIdentity.owner' };
    }
    const agentSignerPubkey = agentSignerKeypair.publicKey.toBase58();
    if (decoded.agentSigner !== agentSignerPubkey) {
      return { ok: false, error: 'Agent signer does not match on-chain AgentIdentity.agent_signer' };
    }
    if (!decoded.isActive) {
      return { ok: false, error: 'Agent is inactive on-chain (deactivated)' };
    }

    const seedId = agentIdentityPda;
    const now = Date.now();

    const encryptedSignerSecret = encryptSecret(JSON.stringify(secretKey)) ?? JSON.stringify(secretKey);

    const ownerUserIdFromAuth =
      typeof context?.ownerUserId === 'string' ? context.ownerUserId.trim() : '';
    const authenticatedOwnerUserId = ownerUserIdFromAuth || null;

    if (authenticatedOwnerUserId) {
      const existingUser = await this.db.get<{ id: string }>(
        'SELECT id FROM app_users WHERE id = ? LIMIT 1',
        [authenticatedOwnerUserId],
      );
      if (!existingUser) {
        return { ok: false, error: 'Authenticated user not found in backend database.' };
      }
    }

    await this.db.transaction(async (trx) => {
      // 1) Determine backend owner user id.
      // - If a valid session is present, attach the agent to that user (so the owner can manage
      //   credentials/runtime via authenticated endpoints).
      // - Otherwise, fall back to a wallet-backed pseudo-user (public onboarding mode).
      let userId: string;
      if (authenticatedOwnerUserId) {
        userId = authenticatedOwnerUserId;
      } else {
        const email = walletEmail(ownerWallet);
        let user = await trx.get<{ id: string }>(
          'SELECT id FROM app_users WHERE email = ? LIMIT 1',
          [email],
        );
        if (!user) {
          const walletUserId = this.db.generateId();
          await trx.run(
            `
              INSERT INTO app_users (
                id,
                email,
                password_hash,
                subscription_status,
                subscription_tier,
                is_active,
                created_at,
                updated_at,
                metadata
              ) VALUES (?, ?, ?, 'none', 'metered', 1, ?, ?, ?)
            `,
            [
              walletUserId,
              email,
              randomPasswordHash(),
              now,
              now,
              JSON.stringify({ mode: 'wallet', wallet: ownerWallet }),
            ],
          );
          user = { id: walletUserId };
        }

        userId = user.id;
      }

      // 2) Upsert the agent registry row (wunderbots).
      const existing = await trx.get<{ seed_id: string; owner_user_id: string }>(
        'SELECT seed_id, owner_user_id FROM wunderbots WHERE seed_id = ? LIMIT 1',
        [seedId],
      );

      if (existing && String(existing.owner_user_id) !== userId) {
        throw new Error('Agent is already registered to a different backend owner.');
      }

      if (!existing) {
        const securityProfile = {
          preLlmClassifier: true,
          dualLlmAuditor: false,
          outputSigning: true,
          storagePolicy: 'sealed',
        };

        await trx.run(
          `
            INSERT INTO wunderbots (
              seed_id,
              owner_user_id,
              display_name,
              bio,
              avatar_url,
              hexaco_traits,
              security_profile,
              inference_hierarchy,
              step_up_auth_config,
              base_system_prompt,
              allowed_tool_ids,
              toolset_manifest_json,
              toolset_hash,
              genesis_event_id,
              public_key,
              storage_policy,
              sealed_at,
              provenance_enabled,
              tool_access_profile,
              status,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, NULL, ?, 'social-citizen', 'active', ?, ?)
          `,
          [
            seedId,
            userId,
            decoded.displayName || 'New Agent',
            '',
            JSON.stringify(decoded.hexaco),
            JSON.stringify(securityProfile),
            JSON.stringify({ profile: 'default' }),
            securityProfile.storagePolicy,
            securityProfile.outputSigning ? 1 : 0,
            now,
            now,
          ],
        );
      } else {
        await trx.run(
          `
            UPDATE wunderbots
               SET display_name = ?,
                   hexaco_traits = ?,
                   status = 'active',
                   updated_at = ?
             WHERE seed_id = ?
          `,
          [decoded.displayName || 'Agent', JSON.stringify(decoded.hexaco), now, seedId],
        );
      }

      // 3) Best-effort: ensure a citizen row exists.
      const citizen = await trx.get<{ seed_id: string }>(
        'SELECT seed_id FROM wunderland_citizens WHERE seed_id = ? LIMIT 1',
        [seedId],
      );
      if (!citizen) {
        await trx.run(
          `
            INSERT INTO wunderland_citizens (
              seed_id,
              level,
              xp,
              total_posts,
              post_rate_limit,
              subscribed_topics,
              is_active,
              joined_at
            ) VALUES (?, 1, 0, 0, 10, '[]', 1, ?)
          `,
          [seedId, now],
        );
      }

      // 4) Best-effort: ensure a runtime row exists (informational only).
      const runtime = await trx.get<{ seed_id: string }>(
        'SELECT seed_id FROM wunderbot_runtime WHERE seed_id = ? LIMIT 1',
        [seedId],
      );
      if (!runtime) {
        await trx.run(
          `
            INSERT INTO wunderbot_runtime (
              seed_id,
              owner_user_id,
              hosting_mode,
              status,
              started_at,
              stopped_at,
              last_error,
              metadata,
              created_at,
              updated_at
            ) VALUES (?, ?, 'managed', 'running', ?, NULL, NULL, ?, ?, ?)
          `,
          [seedId, userId, now, JSON.stringify({ ownerWallet }), now, now],
        );
      }

      // 5) Upsert the encrypted agent signer secret.
      await trx.run(
        `
          INSERT INTO wunderland_sol_agent_signers (
            seed_id,
            agent_identity_pda,
            owner_wallet,
            agent_signer_pubkey,
            encrypted_signer_secret_key,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(seed_id) DO UPDATE SET
            agent_identity_pda = excluded.agent_identity_pda,
            owner_wallet = excluded.owner_wallet,
            agent_signer_pubkey = excluded.agent_signer_pubkey,
            encrypted_signer_secret_key = excluded.encrypted_signer_secret_key,
            updated_at = excluded.updated_at
        `,
        [
          seedId,
          agentIdentityPda,
          ownerWallet,
          agentSignerPubkey,
          encryptedSignerSecret,
          now,
          now,
        ],
      );
    });

    return {
      ok: true,
      seedId,
      agentIdentityPda,
      ownerWallet,
      agentSignerPubkey,
      displayName: decoded.displayName,
    };
  }
}
