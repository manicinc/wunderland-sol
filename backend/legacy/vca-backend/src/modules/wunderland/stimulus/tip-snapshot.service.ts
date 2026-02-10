/**
 * @file tip-snapshot.service.ts
 * @description Tip snapshot preview + IPFS raw-block pinning for on-chain tips.
 *
 * Implements the “snapshot-commit” model:
 * - Backend produces a deterministic, sanitized snapshot JSON (canonicalized).
 * - `content_hash = sha256(snapshot_bytes)` is what gets anchored on-chain in `submit_tip`.
 * - Snapshot bytes are pinned to IPFS as **raw blocks** so CID is derivable from the hash.
 * - Tip workers must never refetch the original URL; they fetch snapshot bytes by CID and verify the hash.
 */

import { createHash } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

type TipSnapshotV1 =
  | {
      v: 1;
      sourceType: 'text';
      contentType: 'text/plain';
      content: string;
    }
  | {
      v: 1;
      sourceType: 'url';
      url: string;
      contentType: string;
      content: string;
    };

type TipSnapshotPreview = {
  contentHashHex: string;
  cid: string;
  snapshot: {
    v: 1;
    sourceType: 'text' | 'url';
    url: string | null;
    contentType: string;
    contentPreview: string;
    contentLengthBytes: number;
  };
  ipfs: {
    apiUrl: string;
    gatewayUrl: string | null;
  };
};

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

// ── URL validation + sanitization (SSRF-safe-ish, no DNS resolution) ─────────

const ALLOWED_CONTENT_TYPES = new Set([
  'text/html',
  'text/plain',
  'application/json',
  'application/xml',
  'text/xml',
  'text/markdown',
  'application/rss+xml',
  'application/atom+xml',
]);

function isBlockedIP(hostname: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Pattern);

  if (match) {
    const octets = match.slice(1, 5).map((o) => parseInt(o, 10));
    const [a, b, c] = octets;
    if (octets.some((o) => o < 0 || o > 255)) return true;

    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local
    if (a === 0) return true; // current network
    if (a >= 224 && a <= 239) return true; // multicast
    if (a >= 240) return true; // reserved
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 192 && b === 0 && c === 0) return true; // IETF protocol assignments
    if (a === 192 && b === 0 && c === 2) return true; // TEST-NET-1
    if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
    if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  }

  // IPv6 patterns (simplified)
  if (hostname.startsWith('[') || hostname.includes(':')) {
    const ipv6 = hostname.replace(/[\[\]]/g, '').toLowerCase();
    if (ipv6 === '::1') return true; // loopback
    if (ipv6.startsWith('fe80:')) return true; // link-local
    if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true; // unique local
    if (ipv6 === '::') return true; // unspecified
  }

  return false;
}

function validateUrl(urlString: string): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new BadRequestException('Invalid URL format.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new BadRequestException(`Blocked protocol: ${url.protocol}`);
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost')
  ) {
    throw new BadRequestException('Blocked: localhost.');
  }

  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
    throw new BadRequestException('Blocked: cloud metadata endpoint.');
  }

  if (isBlockedIP(hostname)) {
    throw new BadRequestException('Blocked: private/reserved IP address.');
  }

  // Block common internal hostname patterns (very conservative).
  for (const blocked of ['internal', 'intranet', 'corp', 'private', 'admin', 'kubernetes', 'k8s']) {
    if (hostname.includes(blocked)) {
      throw new BadRequestException('Blocked: internal hostname pattern.');
    }
  }

  return url;
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
  return text
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .slice(0, maxBytes);
}

@Injectable()
export class TipSnapshotService {
  private readonly logger = new Logger(TipSnapshotService.name);
  private readonly ipfsApiUrl = process.env.WUNDERLAND_IPFS_API_URL ?? '';
  private readonly ipfsAuth = process.env.WUNDERLAND_IPFS_API_AUTH ?? '';
  private readonly ipfsGatewayUrl = process.env.WUNDERLAND_IPFS_GATEWAY_URL ?? '';
  private readonly fetchTimeoutMs = Math.max(1_000, Number(process.env.WUNDERLAND_TIP_FETCH_TIMEOUT_MS ?? 10_000));
  private readonly maxSnapshotBytes = Math.min(
    2_000_000,
    Math.max(10_000, Number(process.env.WUNDERLAND_TIP_SNAPSHOT_MAX_BYTES ?? 1_048_576))
  );
  private readonly maxPreviewChars = Math.min(
    20_000,
    Math.max(500, Number(process.env.WUNDERLAND_TIP_SNAPSHOT_PREVIEW_CHARS ?? 4_000))
  );

  async previewAndPin(opts: { content: string; sourceType: 'text' | 'url' }): Promise<TipSnapshotPreview> {
    if (!this.ipfsApiUrl) {
      throw new ServiceUnavailableException('IPFS pinning not configured (set WUNDERLAND_IPFS_API_URL).');
    }

    const snapshot = await this.buildSnapshot(opts);
    const canonical = canonicalizeJson(snapshot);
    const bytes = Buffer.from(canonical, 'utf8');
    if (bytes.length > this.maxSnapshotBytes) {
      throw new BadRequestException(`Snapshot too large (${bytes.length} bytes).`);
    }

    const contentHashHex = createHash('sha256').update(bytes).digest('hex');
    const cid = cidFromSha256Hex(contentHashHex);

    await this.pinRawBlockToIpfs(bytes, cid);

    return {
      contentHashHex,
      cid,
      snapshot: {
        v: 1,
        sourceType: snapshot.sourceType,
        url: snapshot.sourceType === 'url' ? snapshot.url : null,
        contentType: snapshot.contentType,
        contentPreview: snapshot.content.slice(0, this.maxPreviewChars),
        contentLengthBytes: bytes.length,
      },
      ipfs: {
        apiUrl: this.ipfsApiUrl,
        gatewayUrl: this.ipfsGatewayUrl || null,
      },
    };
  }

  private async buildSnapshot(opts: { content: string; sourceType: 'text' | 'url' }): Promise<TipSnapshotV1> {
    const raw = opts.content ?? '';
    if (!raw.trim()) {
      throw new BadRequestException('Tip content is required.');
    }

    if (opts.sourceType === 'text') {
      const sanitized = sanitizeText(raw, this.maxSnapshotBytes);
      return {
        v: 1,
        sourceType: 'text',
        contentType: 'text/plain',
        content: sanitized,
      };
    }

    const { url, contentType, content } = await this.fetchAndSanitizeUrl(raw);
    return {
      v: 1,
      sourceType: 'url',
      url,
      contentType,
      content,
    };
  }

  private async fetchAndSanitizeUrl(urlString: string): Promise<{ url: string; contentType: string; content: string }> {
    const url = validateUrl(urlString);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.fetchTimeoutMs);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'WunderlandBot/1.0 (+https://wunderland.sh)',
          Accept: 'text/html, text/plain, application/json, */*',
        },
        redirect: 'follow',
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new BadRequestException(`Request timed out after ${this.fetchTimeoutMs}ms.`);
      }
      throw new BadRequestException(`Fetch failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new BadRequestException(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw new BadRequestException(`Blocked content-type: ${contentType || '(missing)'}`);
    }

    const declaredLength = response.headers.get('content-length');
    if (declaredLength) {
      const size = parseInt(declaredLength, 10);
      if (Number.isFinite(size) && size > this.maxSnapshotBytes) {
        throw new BadRequestException(`Content too large: ${size} bytes.`);
      }
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new BadRequestException('No response body.');
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > this.maxSnapshotBytes) {
          throw new BadRequestException(`Content too large: exceeded ${this.maxSnapshotBytes} bytes.`);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const rawText = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
    const sanitized =
      contentType === 'text/html'
        ? sanitizeHtml(rawText)
        : rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    return {
      url: url.toString(),
      contentType,
      content: sanitized,
    };
  }

  private async pinRawBlockToIpfs(content: Buffer, expectedCid: string): Promise<void> {
    const endpoint = this.ipfsApiUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = {};
    if (this.ipfsAuth) headers.Authorization = this.ipfsAuth;

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(content)]));

    const putUrl = `${endpoint}/api/v0/block/put?format=raw&mhtype=sha2-256&pin=true`;
    const putRes = await fetch(putUrl, { method: 'POST', headers, body: formData });
    if (!putRes.ok) {
      const text = await putRes.text().catch(() => '');
      throw new BadRequestException(`IPFS block/put failed: ${putRes.status} ${putRes.statusText} ${text}`.trim());
    }

    const putJson = (await putRes.json()) as { Key?: string };
    const actualCid = String(putJson?.Key ?? '');
    if (actualCid !== expectedCid) {
      this.logger.warn(`IPFS returned CID "${actualCid}" but expected "${expectedCid}".`);
      throw new BadRequestException('IPFS CID mismatch: raw block CID does not match sha256-derived CID.');
    }

    // Extra safety: pin/add (some gateways ignore pin=true on block/put).
    const pinUrl = `${endpoint}/api/v0/pin/add?arg=${encodeURIComponent(expectedCid)}`;
    const pinRes = await fetch(pinUrl, { method: 'POST', headers });
    if (!pinRes.ok) {
      const text = await pinRes.text().catch(() => '');
      this.logger.warn(`IPFS pin/add failed for ${expectedCid}: ${pinRes.status} ${pinRes.statusText} ${text}`.trim());
    }
  }
}

