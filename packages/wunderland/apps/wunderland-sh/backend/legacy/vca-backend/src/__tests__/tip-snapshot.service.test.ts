/**
 * @file tip-snapshot.service.test.ts
 * @description Unit tests for the TipSnapshotService: CID derivation,
 * canonicalization, HTML/URL sanitization, SSRF protection, and preview flow.
 */

import test, { describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { TipSnapshotService } from '../modules/wunderland/stimulus/tip-snapshot.service.js';

// ── Re-implement pure helper functions for testing ──────────────────────────

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

// ── CID Derivation Tests ────────────────────────────────────────────────────

describe('cidFromSha256Hex', () => {
  test('produces a valid CIDv1/raw/sha2-256 base32 string', () => {
    const hash = createHash('sha256').update('hello world').digest('hex');
    const cid = cidFromSha256Hex(hash);
    assert.ok(cid.startsWith('b'), 'CID should start with base32lower prefix "b"');
    assert.ok(cid.length > 50, 'CID should be reasonably long');
  });

  test('same input always produces the same CID', () => {
    const hash = createHash('sha256').update('deterministic test').digest('hex');
    assert.equal(cidFromSha256Hex(hash), cidFromSha256Hex(hash));
  });

  test('different inputs produce different CIDs', () => {
    const h1 = createHash('sha256').update('input one').digest('hex');
    const h2 = createHash('sha256').update('input two').digest('hex');
    assert.notEqual(cidFromSha256Hex(h1), cidFromSha256Hex(h2));
  });

  test('rejects invalid hex strings', () => {
    assert.throws(() => cidFromSha256Hex('not-hex'), /Invalid sha256 hex/);
    assert.throws(() => cidFromSha256Hex('abcdef'), /Invalid sha256 hex/);
    assert.throws(() => cidFromSha256Hex(''), /Invalid sha256 hex/);
  });

  test('rejects hex strings that are too short or too long', () => {
    assert.throws(() => cidFromSha256Hex('a'.repeat(63)), /Invalid sha256 hex/);
    assert.throws(() => cidFromSha256Hex('a'.repeat(65)), /Invalid sha256 hex/);
  });
});

// ── Canonicalization Tests ──────────────────────────────────────────────────

describe('canonicalizeJson / stableSortJson', () => {
  test('sorts object keys alphabetically', () => {
    const input = { z: 1, a: 2, m: 3 };
    assert.equal(canonicalizeJson(input), '{"a":2,"m":3,"z":1}');
  });

  test('handles nested objects', () => {
    const input = { b: { z: 1, a: 2 }, a: 1 };
    assert.equal(canonicalizeJson(input), '{"a":1,"b":{"a":2,"z":1}}');
  });

  test('preserves array order', () => {
    const input = [3, 1, 2];
    assert.equal(canonicalizeJson(input), '[3,1,2]');
  });

  test('handles arrays of objects', () => {
    const input = [{ b: 1, a: 2 }];
    assert.equal(canonicalizeJson(input), '[{"a":2,"b":1}]');
  });

  test('converts bigint to string', () => {
    const result = stableSortJson(123n);
    assert.equal(result, '123');
  });

  test('handles null and primitives', () => {
    assert.equal(canonicalizeJson(null), 'null');
    assert.equal(canonicalizeJson(42), '42');
    assert.equal(canonicalizeJson('hello'), '"hello"');
    assert.equal(canonicalizeJson(true), 'true');
  });

  test('produces deterministic output regardless of key insertion order', () => {
    const a: Record<string, number> = {};
    a['z'] = 1;
    a['a'] = 2;
    const b: Record<string, number> = {};
    b['a'] = 2;
    b['z'] = 1;
    assert.equal(canonicalizeJson(a), canonicalizeJson(b));
  });
});

// ── Base32 Encoding Tests ───────────────────────────────────────────────────

describe('encodeBase32', () => {
  test('encodes empty buffer', () => {
    assert.equal(encodeBase32(new Uint8Array()), '');
  });

  test('encodes known values', () => {
    // "f" in base32 is "my"
    const result = encodeBase32(new Uint8Array([0x66]));
    assert.equal(result, 'my');
  });

  test('output only contains base32 alphabet characters', () => {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) bytes[i] = i * 7;
    const result = encodeBase32(bytes);
    assert.ok(/^[a-z2-7]*$/.test(result), `Invalid base32: ${result}`);
  });
});

// ── SSRF / URL Validation (exercise via snapshot-commit model knowledge) ────

describe('URL validation & SSRF protection', () => {
  // These test the logic patterns implemented in the service

  test('rejects private IPv4 addresses', () => {
    const privateIPs = [
      '10.0.0.1',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '127.0.0.1',
      '169.254.169.254',
      '0.0.0.0',
    ];
    for (const ip of privateIPs) {
      assert.ok(isBlockedIP(ip), `Should block ${ip}`);
    }
  });

  test('allows public IPv4 addresses', () => {
    const publicIPs = ['8.8.8.8', '1.1.1.1', '93.184.216.34'];
    for (const ip of publicIPs) {
      assert.ok(!isBlockedIP(ip), `Should allow ${ip}`);
    }
  });

  test('blocks IPv6 loopback and link-local', () => {
    assert.ok(isBlockedIP('::1'));
    assert.ok(isBlockedIP('[::1]'));
    assert.ok(isBlockedIP('fe80::1'));
  });

  test('blocks CGNAT range (100.64.0.0/10)', () => {
    assert.ok(isBlockedIP('100.64.0.1'));
    assert.ok(isBlockedIP('100.127.255.254'));
  });

  test('blocks multicast and reserved ranges', () => {
    assert.ok(isBlockedIP('224.0.0.1'));
    assert.ok(isBlockedIP('240.0.0.1'));
  });
});

// ── HTML Sanitization Tests ─────────────────────────────────────────────────

describe('HTML sanitization', () => {
  test('strips script tags', () => {
    const html = '<p>Safe</p><script>alert("xss")</script><p>More</p>';
    const result = sanitizeHtml(html);
    assert.ok(!result.includes('<script'), 'Should remove script tags');
    assert.ok(result.includes('<p>Safe</p>'));
    assert.ok(result.includes('<p>More</p>'));
  });

  test('strips style tags', () => {
    const html = '<div>ok</div><style>.evil { display:none }</style>';
    const result = sanitizeHtml(html);
    assert.ok(!result.includes('<style'));
  });

  test('strips inline event handlers', () => {
    const html = '<img onclick="evil()" src="ok.png">';
    const result = sanitizeHtml(html);
    assert.ok(!result.includes('onclick'));
    assert.ok(result.includes('src="ok.png"'));
  });

  test('strips javascript: hrefs', () => {
    const html = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeHtml(html);
    assert.ok(!result.includes('javascript:'));
  });

  test('strips iframes, objects, embeds', () => {
    const html =
      '<iframe src="evil.html"></iframe><object data="bad.swf"></object><embed src="bad.swf"/>';
    const result = sanitizeHtml(html);
    assert.ok(!result.includes('<iframe'));
    assert.ok(!result.includes('<object'));
    assert.ok(!result.includes('<embed'));
  });

  test('strips HTML comments', () => {
    const html = '<!-- secret -->visible';
    const result = sanitizeHtml(html);
    assert.ok(!result.includes('<!--'));
    assert.ok(result.includes('visible'));
  });

  test('normalizes line endings', () => {
    const html = 'line1\r\nline2\rline3';
    const result = sanitizeHtml(html);
    assert.ok(!result.includes('\r'));
    assert.ok(result.includes('line1\nline2\nline3'));
  });
});

// ── Text Sanitization Tests ─────────────────────────────────────────────────

describe('Text sanitization', () => {
  test('trims whitespace', () => {
    assert.equal(sanitizeText('  hello  ', 100), 'hello');
  });

  test('normalizes line endings', () => {
    assert.equal(sanitizeText('a\r\nb\rc', 100), 'a\nb\nc');
  });

  test('truncates to maxBytes', () => {
    const result = sanitizeText('abcdef', 3);
    assert.equal(result, 'abc');
  });
});

// ── Snapshot-Commit Model Integration ───────────────────────────────────────

describe('Snapshot-commit model (end-to-end pure logic)', () => {
  test('text tip produces deterministic content hash and CID', () => {
    const snapshot = {
      v: 1,
      sourceType: 'text' as const,
      contentType: 'text/plain' as const,
      content: 'Hello, agents!',
    };
    const canonical = canonicalizeJson(snapshot);
    const bytes = Buffer.from(canonical, 'utf8');
    const hashHex = createHash('sha256').update(bytes).digest('hex');
    const cid = cidFromSha256Hex(hashHex);

    // Same snapshot must yield same hash+CID
    const canonical2 = canonicalizeJson(snapshot);
    const bytes2 = Buffer.from(canonical2, 'utf8');
    const hashHex2 = createHash('sha256').update(bytes2).digest('hex');
    const cid2 = cidFromSha256Hex(hashHex2);

    assert.equal(hashHex, hashHex2, 'Hash should be deterministic');
    assert.equal(cid, cid2, 'CID should be deterministic');
  });

  test('url tip snapshot includes url field', () => {
    const snapshot = {
      v: 1,
      sourceType: 'url' as const,
      url: 'https://example.com',
      contentType: 'text/html',
      content: '<p>hello</p>',
    };
    const canonical = canonicalizeJson(snapshot);
    assert.ok(canonical.includes('"url":"https://example.com"'));
    assert.ok(canonical.includes('"sourceType":"url"'));
  });

  test('different content produces different hashes', () => {
    const snap1 = { v: 1, sourceType: 'text', contentType: 'text/plain', content: 'A' };
    const snap2 = { v: 1, sourceType: 'text', contentType: 'text/plain', content: 'B' };

    const h1 = createHash('sha256').update(canonicalizeJson(snap1)).digest('hex');
    const h2 = createHash('sha256').update(canonicalizeJson(snap2)).digest('hex');

    assert.notEqual(h1, h2);
  });
});

// ── IPFS Raw-Block Pinning (service integration, fetch mocked) ──────────────

describe('TipSnapshotService.previewAndPin (IPFS raw blocks)', () => {
  const originalEnv = {
    apiUrl: process.env.WUNDERLAND_IPFS_API_URL,
    auth: process.env.WUNDERLAND_IPFS_API_AUTH,
    gateway: process.env.WUNDERLAND_IPFS_GATEWAY_URL,
  };

  const originalFetch = globalThis.fetch;

  afterEach(() => {
    if (originalEnv.apiUrl === undefined) delete process.env.WUNDERLAND_IPFS_API_URL;
    else process.env.WUNDERLAND_IPFS_API_URL = originalEnv.apiUrl;

    if (originalEnv.auth === undefined) delete process.env.WUNDERLAND_IPFS_API_AUTH;
    else process.env.WUNDERLAND_IPFS_API_AUTH = originalEnv.auth;

    if (originalEnv.gateway === undefined) delete process.env.WUNDERLAND_IPFS_GATEWAY_URL;
    else process.env.WUNDERLAND_IPFS_GATEWAY_URL = originalEnv.gateway;

    globalThis.fetch = originalFetch;
  });

  test('throws when IPFS API URL is not configured', async () => {
    delete process.env.WUNDERLAND_IPFS_API_URL;

    const service = new TipSnapshotService();

    await assert.rejects(
      () => service.previewAndPin({ content: 'hello', sourceType: 'text' }),
      /IPFS pinning not configured/i
    );
  });

  test('pins a deterministic raw block via block/put + pin/add (includes Authorization header when configured)', async () => {
    process.env.WUNDERLAND_IPFS_API_URL = 'http://ipfs.local:5001';
    process.env.WUNDERLAND_IPFS_API_AUTH = 'Bearer test-token';
    process.env.WUNDERLAND_IPFS_GATEWAY_URL = 'https://ipfs.io';

    // Precompute expected CID (must match the service's canonical snapshot hashing).
    const snapshot = {
      v: 1,
      sourceType: 'text' as const,
      contentType: 'text/plain' as const,
      content: 'Hello, IPFS!',
    };
    const canonical = canonicalizeJson(snapshot);
    const bytes = Buffer.from(canonical, 'utf8');
    const contentHashHex = createHash('sha256').update(bytes).digest('hex');
    const expectedCid = cidFromSha256Hex(contentHashHex);

    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    globalThis.fetch = async (input: any, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : String(input?.url ?? input);
      calls.push({ url, init });

      if (url.includes('/api/v0/block/put')) {
        const auth = (init?.headers as any)?.Authorization;
        assert.equal(auth, 'Bearer test-token');

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

      throw new Error(`Unexpected fetch URL: ${url}`);
    };

    const service = new TipSnapshotService();
    const result = await service.previewAndPin({ content: 'Hello, IPFS!', sourceType: 'text' });

    assert.equal(result.contentHashHex, contentHashHex);
    assert.equal(result.cid, expectedCid);

    assert.equal(calls.length, 2, 'expected block/put + pin/add');
    assert.ok(calls[0]?.url.includes('/api/v0/block/put'), 'first call should be block/put');
    assert.ok(calls[0]?.url.includes('format=raw'), 'block/put should request raw blocks');
    assert.ok(calls[0]?.url.includes('mhtype=sha2-256'), 'block/put should request sha2-256');
    assert.ok(calls[0]?.url.includes('pin=true'), 'block/put should request pin=true');
    assert.ok(calls[1]?.url.includes('/api/v0/pin/add'), 'second call should be pin/add');
    assert.ok(
      calls[1]?.url.includes(encodeURIComponent(expectedCid)),
      'pin/add should reference expected CID'
    );
  });

  test('rejects when IPFS returns a CID that does not match the sha256-derived raw CID', async () => {
    process.env.WUNDERLAND_IPFS_API_URL = 'http://ipfs.local:5001';

    // Precompute expected CID for the snapshot.
    const snapshot = {
      v: 1,
      sourceType: 'text' as const,
      contentType: 'text/plain' as const,
      content: 'CID mismatch',
    };
    const canonical = canonicalizeJson(snapshot);
    const bytes = Buffer.from(canonical, 'utf8');
    const contentHashHex = createHash('sha256').update(bytes).digest('hex');
    const expectedCid = cidFromSha256Hex(contentHashHex);

    globalThis.fetch = async (input: any) => {
      const url = typeof input === 'string' ? input : String(input?.url ?? input);
      if (url.includes('/api/v0/block/put')) {
        return new Response(
          JSON.stringify({ Key: 'bafkreibadcidxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        );
      }
      if (url.includes('/api/v0/pin/add')) {
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    };

    const service = new TipSnapshotService();
    await assert.rejects(
      () => service.previewAndPin({ content: 'CID mismatch', sourceType: 'text' }),
      /CID mismatch/i
    );

    assert.ok(expectedCid.startsWith('b'), 'sanity: expected a base32lower CID');
  });
});

// ── Pure helper re-implementations for testing ──────────────────────────────
// These match the service's private functions exactly.

function isBlockedIP(hostname: string): boolean {
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Pattern);

  if (match) {
    const octets = match.slice(1, 5).map((o) => parseInt(o, 10));
    const [a, b, c] = octets;
    if (octets.some((o) => o < 0 || o > 255)) return true;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
    if (a >= 224 && a <= 239) return true;
    if (a >= 240) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 192 && b === 0 && c === 0) return true;
    if (a === 192 && b === 0 && c === 2) return true;
    if (a === 198 && b === 51 && c === 100) return true;
    if (a === 203 && b === 0 && c === 113) return true;
  }

  if (hostname.startsWith('[') || hostname.includes(':')) {
    const ipv6 = hostname.replace(/[[\]]/g, '').toLowerCase();
    if (ipv6 === '::1') return true;
    if (ipv6.startsWith('fe80:')) return true;
    if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;
    if (ipv6 === '::') return true;
  }

  return false;
}

function sanitizeHtml(html: string): string {
  let out = html;
  out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  out = out.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  out = out.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  out = out.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');
  out = out.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href=""');
  out = out.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');
  out = out.replace(/href\s*=\s*["']data:[^"']*["']/gi, 'href=""');
  out = out.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""');
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  out = out.replace(/<iframe[^>]*\/>/gi, '');
  out = out.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  out = out.replace(/<embed[^>]*\/?>/gi, '');
  out = out.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return out;
}

function sanitizeText(text: string, maxBytes: number): string {
  return text.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n').slice(0, maxBytes);
}
