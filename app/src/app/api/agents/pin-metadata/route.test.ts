import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash } from 'crypto';
import { Connection, Keypair } from '@solana/web3.js';

import { POST } from './route';

function stableSortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableSortJson);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) out[key] = stableSortJson(record[key]);
    return out;
  }
  if (typeof value === 'bigint') return value.toString();
  return value;
}

function canonicalizeJson(value: unknown): string {
  return JSON.stringify(stableSortJson(value));
}

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

  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31] ?? '';
  return out;
}

function cidFromSha256Hex(hashHex: string): string {
  const hashBytes = Buffer.from(hashHex, 'hex');
  const multihash = Buffer.concat([Buffer.from([SHA256_CODEC, SHA256_LENGTH]), hashBytes]);
  const cidBytes = Buffer.concat([Buffer.from([0x01, RAW_CODEC]), multihash]);
  return `b${encodeBase32(cidBytes)}`;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

describe('/api/agents/pin-metadata', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('pins a raw metadata block when on-chain hash matches', async () => {
    const programKeypair = Keypair.generate();
    const agentKeypair = Keypair.generate();
    const programId = programKeypair.publicKey;

    const metadata = {
      schema: 'wunderland.agent-metadata.v1',
      displayName: 'Test Agent',
      traits: { honestyHumility: 0.7, emotionality: 0.5 },
    };

    const canonical = canonicalizeJson(metadata);
    const bytes = Buffer.from(canonical, 'utf8');
    const metadataHashHex = sha256Hex(bytes);
    const expectedCid = cidFromSha256Hex(metadataHashHex);

    const data = Buffer.alloc(219);
    data.set(Buffer.from(metadataHashHex, 'hex'), 169);

    vi.spyOn(Connection.prototype, 'getAccountInfo').mockResolvedValue({
      data,
      owner: programId,
      executable: false,
      lamports: 1,
      rentEpoch: 0,
    } as any);

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/v0/block/put')) {
        return new Response(JSON.stringify({ Key: expectedCid }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.includes('/api/v0/pin/add')) {
        return new Response(JSON.stringify({ Pins: [expectedCid] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock as any);

    process.env.WUNDERLAND_SOL_RPC_URL = 'http://127.0.0.1:8899';
    process.env.WUNDERLAND_SOL_PROGRAM_ID = programId.toBase58();
    process.env.WUNDERLAND_IPFS_API_URL = 'http://127.0.0.1:5199';

    const req = new Request('http://localhost/api/agents/pin-metadata', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        agentPda: agentKeypair.publicKey.toBase58(),
        metadataJson: JSON.stringify(metadata),
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.ok).toBe(true);
    expect(json.pinned).toBe(true);
    expect(json.cid).toBe(expectedCid);
    expect(json.metadataHashHex).toBe(metadataHashHex);
  });

  it('rejects when metadata hash does not match on-chain', async () => {
    const programKeypair = Keypair.generate();
    const agentKeypair = Keypair.generate();
    const programId = programKeypair.publicKey;

    const metadata = { schema: 'wunderland.agent-metadata.v1', displayName: 'Mismatch' };

    const data = Buffer.alloc(219);
    data.set(Buffer.alloc(32, 7), 169); // wrong hash

    vi.spyOn(Connection.prototype, 'getAccountInfo').mockResolvedValue({
      data,
      owner: programId,
      executable: false,
      lamports: 1,
      rentEpoch: 0,
    } as any);

    process.env.WUNDERLAND_SOL_RPC_URL = 'http://127.0.0.1:8899';
    process.env.WUNDERLAND_SOL_PROGRAM_ID = programId.toBase58();
    process.env.WUNDERLAND_IPFS_API_URL = 'http://127.0.0.1:5199';

    const req = new Request('http://localhost/api/agents/pin-metadata', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        agentPda: agentKeypair.publicKey.toBase58(),
        metadataJson: JSON.stringify(metadata),
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.ok).toBe(false);
    expect(String(json.error)).toMatch(/does not match/i);
  });
});
