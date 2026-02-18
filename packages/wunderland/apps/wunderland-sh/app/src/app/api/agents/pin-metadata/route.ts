import { NextRequest, NextResponse } from 'next/server';
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import { createHash } from 'crypto';

import { PROGRAM_ID as DEFAULT_PROGRAM_ID, CLUSTER as DEFAULT_CLUSTER } from '@/lib/solana';

// ── IPFS CID derivation (CIDv1/raw/sha2-256) ───────────────────────────────

const RAW_CODEC = 0x55;
const SHA256_CODEC = 0x12;
const SHA256_LENGTH = 32;
const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';

  for (let i = 0; i < bytes.length; i += 1) {
    value = (value << 8) | (bytes[i] ?? 0);
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31] ?? '';
      bits -= 5;
    }
  }

  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31] ?? '';
  }

  return out;
}

function cidFromSha256Hex(hashHex: string): string {
  if (!/^[a-f0-9]{64}$/i.test(hashHex)) {
    throw new Error('Invalid sha256 hex (expected 64 hex chars).');
  }
  const hashBytes = Buffer.from(hashHex, 'hex');
  const multihash = Buffer.concat([Buffer.from([SHA256_CODEC, SHA256_LENGTH]), hashBytes]);
  const cidBytes = Buffer.concat([Buffer.from([0x01, RAW_CODEC]), multihash]);
  return `b${encodeBase32(cidBytes)}`;
}

function stableSortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableSortJson);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      out[key] = stableSortJson(record[key]);
    }
    return out;
  }
  if (typeof value === 'bigint') return value.toString();
  return value;
}

function canonicalizeJson(value: unknown): string {
  try {
    return JSON.stringify(stableSortJson(value));
  } catch {
    return JSON.stringify(value);
  }
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

const MAX_METADATA_BYTES = Math.min(
  512_000,
  Math.max(4_000, Number(process.env.WUNDERLAND_AGENT_METADATA_MAX_BYTES ?? 64_000)),
);

function getOnChainConfig(): { rpcUrl: string; programId: string; cluster: string } {
  const cluster = String(
    process.env.WUNDERLAND_SOL_CLUSTER ||
      process.env.SOLANA_CLUSTER ||
      process.env.NEXT_PUBLIC_CLUSTER ||
      DEFAULT_CLUSTER,
  );
  const rpcUrl = String(
    process.env.WUNDERLAND_SOL_RPC_URL ||
      process.env.SOLANA_RPC ||
      process.env.NEXT_PUBLIC_SOLANA_RPC ||
      clusterApiUrl(cluster as any),
  );
  const programId = String(
    process.env.WUNDERLAND_SOL_PROGRAM_ID ||
      process.env.PROGRAM_ID ||
      process.env.NEXT_PUBLIC_PROGRAM_ID ||
      DEFAULT_PROGRAM_ID,
  );
  return { rpcUrl, programId, cluster };
}

async function pinRawBlockToIpfs(bytes: Uint8Array, expectedCid: string): Promise<void> {
  const endpoint = (process.env.WUNDERLAND_IPFS_API_URL ?? '').replace(/\/+$/, '');
  if (!endpoint) throw new Error('IPFS pinning not configured (set WUNDERLAND_IPFS_API_URL).');

  const headers: Record<string, string> = {};
  const auth = process.env.WUNDERLAND_IPFS_API_AUTH ?? '';
  if (auth) headers.Authorization = auth;

  // Ensure we hand Blob a real ArrayBuffer (TS/DOM lib is strict about ArrayBuffer vs ArrayBufferLike).
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);

  const formData = new FormData();
  formData.append('file', new Blob([arrayBuffer]));

  const putUrl = `${endpoint}/api/v0/block/put?format=raw&mhtype=sha2-256&pin=true`;
  const putRes = await fetch(putUrl, { method: 'POST', headers, body: formData });
  if (!putRes.ok) {
    const text = await putRes.text().catch(() => '');
    throw new Error(`IPFS block/put failed: ${putRes.status} ${putRes.statusText} ${text}`.trim());
  }

  const putJson = (await putRes.json()) as { Key?: string };
  const actualCid = String(putJson?.Key ?? '');
  if (actualCid !== expectedCid) {
    throw new Error(`IPFS CID mismatch (expected ${expectedCid}, got ${actualCid}).`);
  }

  // Extra safety: pin/add (some gateways ignore pin=true on block/put).
  const pinUrl = `${endpoint}/api/v0/pin/add?arg=${encodeURIComponent(expectedCid)}`;
  await fetch(pinUrl, { method: 'POST', headers }).catch(() => {});
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentPda, metadataJson } = body as { agentPda?: string; metadataJson?: string };

    if (!agentPda || typeof agentPda !== 'string') {
      return NextResponse.json({ ok: false, error: 'agentPda is required' }, { status: 400 });
    }
    if (!metadataJson || typeof metadataJson !== 'string') {
      return NextResponse.json({ ok: false, error: 'metadataJson is required' }, { status: 400 });
    }

    const { rpcUrl, programId } = getOnChainConfig();
    const programKey = new PublicKey(programId);

    let agentKey: PublicKey;
    try {
      agentKey = new PublicKey(agentPda);
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid agentPda' }, { status: 400 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(metadataJson) as unknown;
    } catch {
      return NextResponse.json({ ok: false, error: 'metadataJson must be valid JSON' }, { status: 400 });
    }

    const canonical = canonicalizeJson(parsed);
    const bytes = Buffer.from(canonical, 'utf8');
    if (bytes.length > MAX_METADATA_BYTES) {
      return NextResponse.json(
        { ok: false, error: `Metadata too large (${bytes.length} bytes)` },
        { status: 400 },
      );
    }

    const metadataHashHex = sha256Hex(bytes);
    const cid = cidFromSha256Hex(metadataHashHex);

    const connection = new Connection(rpcUrl, 'confirmed');
    const info = await connection.getAccountInfo(agentKey, 'confirmed');
    if (!info) {
      return NextResponse.json({ ok: false, error: 'Agent account not found' }, { status: 404 });
    }
    if (!info.owner.equals(programKey)) {
      return NextResponse.json(
        { ok: false, error: 'Agent account is not owned by the program' },
        { status: 400 },
      );
    }

    // AgentIdentity layout (current): metadata_hash starts at offset 169 (see state.rs).
    // discriminator(8) + owner(32) + agent_id(32) + agent_signer(32) + display_name(32) +
    // traits(12) + level(1) + xp(8) + total_entries(4) + reputation(8) = 169
    const METADATA_HASH_OFFSET = 169;
    const METADATA_HASH_END = METADATA_HASH_OFFSET + 32;
    if (info.data.length < METADATA_HASH_END) {
      return NextResponse.json(
        { ok: false, error: 'Agent account data too small (legacy layout?)' },
        { status: 400 },
      );
    }

    const onChainHashHex = Buffer.from(info.data.subarray(METADATA_HASH_OFFSET, METADATA_HASH_END)).toString('hex');
    if (onChainHashHex !== metadataHashHex) {
      return NextResponse.json(
        { ok: false, error: 'metadataJson hash does not match on-chain AgentIdentity.metadata_hash' },
        { status: 400 },
      );
    }

    const gatewayUrl = process.env.WUNDERLAND_IPFS_GATEWAY_URL ?? null;

    if (!process.env.WUNDERLAND_IPFS_API_URL) {
      return NextResponse.json({
        ok: true,
        cid,
        metadataHashHex,
        pinned: false,
        gatewayUrl,
        error: 'IPFS pinning not configured on server (set WUNDERLAND_IPFS_API_URL).',
      });
    }

    await pinRawBlockToIpfs(bytes, cid);

    return NextResponse.json({
      ok: true,
      cid,
      metadataHashHex,
      pinned: true,
      gatewayUrl,
    });
  } catch (err) {
    console.error('[/api/agents/pin-metadata] Error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

