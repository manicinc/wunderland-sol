import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nacl from 'tweetnacl';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

import { WunderlandSolOnboardingService } from './wunderland-sol-onboarding.service.js';

function buildOnboardMessage(opts: {
  cluster: string;
  programId: string;
  agentPda: string;
  agentSigner: string;
}): string {
  return JSON.stringify({
    v: 1,
    intent: 'wunderland_onboard_managed_agent_v1',
    cluster: opts.cluster,
    programId: opts.programId,
    agentPda: opts.agentPda,
    agentSigner: opts.agentSigner,
  });
}

function encodeDisplayName(name: string): Buffer {
  const buf = Buffer.alloc(32, 0);
  Buffer.from(name, 'utf8').copy(buf);
  return buf;
}

function buildAgentIdentityAccountData(opts: {
  owner: PublicKey;
  agentSigner: PublicKey;
  displayName: string;
  isActive: boolean;
}): Buffer {
  const data = Buffer.alloc(219, 0);

  // discriminator (8) left as zeros
  let off = 8;
  data.set(opts.owner.toBytes(), off);
  off += 32;
  off += 32; // agent_id
  data.set(opts.agentSigner.toBytes(), off);
  off += 32;
  data.set(encodeDisplayName(opts.displayName), off);
  off += 32;

  // traits (12) = 0.5 each
  for (let i = 0; i < 6; i += 1) data.writeUInt16LE(500, off + i * 2);
  off += 12;

  // citizen_level(1) + xp(8) + total_entries(4) + reputation(8) + metadata_hash(32) + created_at(8) + updated_at(8)
  off += 1 + 8 + 4 + 8 + 32 + 8 + 8;

  data.writeUInt8(opts.isActive ? 1 : 0, off);
  // bump byte can remain 0

  return data;
}

describe('WunderlandSolOnboardingService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('onboards a managed agent with a valid wallet signature', async () => {
    const programId = Keypair.generate().publicKey;
    const ownerWallet = Keypair.generate();
    const agentIdentity = Keypair.generate().publicKey;
    const agentSigner = Keypair.generate();

    process.env.WUNDERLAND_SOL_PROGRAM_ID = programId.toBase58();
    process.env.WUNDERLAND_SOL_RPC_URL = 'http://127.0.0.1:8899';
    process.env.WUNDERLAND_SOL_CLUSTER = 'devnet';

    const message = buildOnboardMessage({
      cluster: 'devnet',
      programId: programId.toBase58(),
      agentPda: agentIdentity.toBase58(),
      agentSigner: agentSigner.publicKey.toBase58(),
    });

    const signature = nacl.sign.detached(Buffer.from(message, 'utf8'), ownerWallet.secretKey);
    const signatureB64 = Buffer.from(signature).toString('base64');

    vi.spyOn(Connection.prototype, 'getAccountInfo').mockResolvedValue({
      data: buildAgentIdentityAccountData({
        owner: ownerWallet.publicKey,
        agentSigner: agentSigner.publicKey,
        displayName: 'E2E Agent',
        isActive: true,
      }),
      owner: programId,
      executable: false,
      lamports: 1,
      rentEpoch: 0,
    } as any);

    const trx = {
      get: vi.fn(async () => undefined),
      run: vi.fn(async () => ({ changes: 1, lastInsertRowid: 1 })),
    };
    const db = {
      generateId: vi.fn(() => 'id_1'),
      transaction: vi.fn(async (fn: any) => fn(trx)),
    };

    const svc = new WunderlandSolOnboardingService(db as any);
    const res = await svc.onboardManagedAgent({
      ownerWallet: ownerWallet.publicKey.toBase58(),
      agentIdentityPda: agentIdentity.toBase58(),
      signatureB64,
      agentSignerSecretKeyJson: Array.from(agentSigner.secretKey),
    });

    expect(res.ok).toBe(true);
    expect(res.seedId).toBe(agentIdentity.toBase58());
    expect(res.ownerWallet).toBe(ownerWallet.publicKey.toBase58());
    expect(res.agentSignerPubkey).toBe(agentSigner.publicKey.toBase58());
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects onboarding with an invalid signature', async () => {
    const programId = Keypair.generate().publicKey;
    const ownerWallet = Keypair.generate();
    const agentIdentity = Keypair.generate().publicKey;
    const agentSigner = Keypair.generate();

    process.env.WUNDERLAND_SOL_PROGRAM_ID = programId.toBase58();
    process.env.WUNDERLAND_SOL_RPC_URL = 'http://127.0.0.1:8899';
    process.env.WUNDERLAND_SOL_CLUSTER = 'devnet';

    const trx = {
      get: vi.fn(async () => undefined),
      run: vi.fn(async () => ({ changes: 1, lastInsertRowid: 1 })),
    };
    const db = {
      generateId: vi.fn(() => 'id_1'),
      transaction: vi.fn(async (fn: any) => fn(trx)),
    };

    const svc = new WunderlandSolOnboardingService(db as any);
    const res = await svc.onboardManagedAgent({
      ownerWallet: ownerWallet.publicKey.toBase58(),
      agentIdentityPda: agentIdentity.toBase58(),
      signatureB64: Buffer.from('not-a-real-signature').toString('base64'),
      agentSignerSecretKeyJson: Array.from(agentSigner.secretKey),
    });

    expect(res.ok).toBe(false);
    expect(String(res.error)).toMatch(/invalid wallet signature/i);
    expect(db.transaction).not.toHaveBeenCalled();
  });
});

