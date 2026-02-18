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

const MAX_SNAPSHOT_BYTES = Math.min(
  2_000_000,
  Math.max(10_000, Number(process.env.WUNDERLAND_TIP_SNAPSHOT_MAX_BYTES ?? 1_048_576)),
);

function getOnChainConfig(): { rpcUrl: string; programId: string; cluster: string } {
  const cluster = String(process.env.WUNDERLAND_SOL_CLUSTER || process.env.SOLANA_CLUSTER || process.env.NEXT_PUBLIC_CLUSTER || DEFAULT_CLUSTER);
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
    const { tipPda, snapshotJson } = body as { tipPda?: string; snapshotJson?: string };

    if (!tipPda || typeof tipPda !== 'string') {
      return NextResponse.json({ ok: false, error: 'tipPda is required' }, { status: 400 });
    }
    if (!snapshotJson || typeof snapshotJson !== 'string') {
      return NextResponse.json({ ok: false, error: 'snapshotJson is required' }, { status: 400 });
    }

    const { rpcUrl, programId } = getOnChainConfig();
    const programKey = new PublicKey(programId);

    let tipKey: PublicKey;
    try {
      tipKey = new PublicKey(tipPda);
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid tipPda' }, { status: 400 });
    }

    // Canonicalize snapshot JSON so whitespace/key order differences can't break pinning.
    let parsed: unknown;
    try {
      parsed = JSON.parse(snapshotJson) as unknown;
    } catch {
      return NextResponse.json({ ok: false, error: 'snapshotJson must be valid JSON' }, { status: 400 });
    }

    const canonical = canonicalizeJson(parsed);
    const bytes = Buffer.from(canonical, 'utf8');
    if (bytes.length > MAX_SNAPSHOT_BYTES) {
      return NextResponse.json(
        { ok: false, error: `Snapshot too large (${bytes.length} bytes)` },
        { status: 400 },
      );
    }
    const contentHashHex = sha256Hex(bytes);
    const cid = cidFromSha256Hex(contentHashHex);

    const connection = new Connection(rpcUrl, 'confirmed');
    const info = await connection.getAccountInfo(tipKey, 'confirmed');
    if (!info) {
      return NextResponse.json({ ok: false, error: 'Tip account not found' }, { status: 404 });
    }
    if (!info.owner.equals(programKey)) {
      return NextResponse.json({ ok: false, error: 'Tip account is not owned by the program' }, { status: 400 });
    }

    // TipAnchor layout: disc(8) + tipper(32) + content_hash(32) + ...
    if (info.data.length < 72) {
      return NextResponse.json({ ok: false, error: 'Tip account data too small' }, { status: 400 });
    }
    const onChainHashHex = Buffer.from(info.data.subarray(8 + 32, 8 + 32 + 32)).toString('hex');
    if (onChainHashHex !== contentHashHex) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Snapshot hash does not match on-chain TipAnchor.content_hash',
        },
        { status: 400 }
      );
    }

    const gatewayUrl = process.env.WUNDERLAND_IPFS_GATEWAY_URL ?? null;

    if (!process.env.WUNDERLAND_IPFS_API_URL) {
      return NextResponse.json({
        ok: true,
        cid,
        contentHashHex,
        pinned: false,
        gatewayUrl,
        error: 'IPFS pinning not configured on server (set WUNDERLAND_IPFS_API_URL).',
      });
    }

    await pinRawBlockToIpfs(bytes, cid);

    return NextResponse.json({
      ok: true,
      cid,
      contentHashHex,
      pinned: true,
      gatewayUrl,
    });
  } catch (err) {
    console.error('[/api/tips/pin] Error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
