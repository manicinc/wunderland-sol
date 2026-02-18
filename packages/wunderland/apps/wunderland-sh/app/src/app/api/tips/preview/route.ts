import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

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

function sanitizeText(text: string, maxBytes: number): string {
  return text
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .slice(0, maxBytes);
}

const MAX_SNAPSHOT_BYTES = Math.min(
  2_000_000,
  Math.max(10_000, Number(process.env.WUNDERLAND_TIP_SNAPSHOT_MAX_BYTES ?? 1_048_576)),
);

const MAX_PREVIEW_CHARS = Math.min(
  20_000,
  Math.max(500, Number(process.env.WUNDERLAND_TIP_SNAPSHOT_PREVIEW_CHARS ?? 4_000)),
);

/**
 * POST /api/tips/preview
 *
 * Preview a tip before submission — validates content and returns hash.
 * For URL tips, fetches and sanitizes the content.
 * For text tips, normalizes and hashes directly.
 *
 * Request body:
 * - content: string (URL or text)
 * - sourceType: 'text' | 'url'
 *
 * Response:
 * - valid: boolean
 * - contentHash?: string (hex)
 * - contentLength?: number
 * - preview?: string (first 500 chars)
 * - error?: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, sourceType } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!['text', 'url'].includes(sourceType)) {
      return NextResponse.json(
        { valid: false, error: 'Source type must be "text" or "url"' },
        { status: 400 }
      );
    }

    let contentType = 'text/plain';
    let snapshot:
      | { v: 1; sourceType: 'text'; contentType: string; content: string }
      | { v: 1; sourceType: 'url'; url: string; contentType: string; content: string };

    if (sourceType === 'url') {
      // Validate URL
      let url: URL;
      try {
        url = new URL(content);
      } catch {
        return NextResponse.json(
          { valid: false, error: 'Invalid URL format' },
          { status: 400 }
        );
      }

      // Only allow HTTP(S)
      if (!['http:', 'https:'].includes(url.protocol)) {
        return NextResponse.json(
          { valid: false, error: `Blocked protocol: ${url.protocol}` },
          { status: 400 }
        );
      }

      // Block private IPs and localhost
      const hostname = url.hostname.toLowerCase();
      if (isBlockedHostname(hostname)) {
        return NextResponse.json(
          { valid: false, error: 'Blocked: internal/private address' },
          { status: 400 }
        );
      }

      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            'User-Agent': 'WunderlandBot/1.0 (+https://wunderland.sh)',
            Accept: 'text/html, text/plain, application/json, */*',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return NextResponse.json(
            { valid: false, error: `HTTP ${response.status}: ${response.statusText}` },
            { status: 400 }
          );
        }

        // Check content type
        contentType = response.headers.get('content-type')?.split(';')[0].trim() ?? 'text/plain';
        const allowedTypes = [
          'text/html',
          'text/plain',
          'application/json',
          'application/xml',
          'text/xml',
          'text/markdown',
          'application/rss+xml',
          'application/atom+xml',
        ];
        if (!allowedTypes.some((t) => contentType.includes(t))) {
          return NextResponse.json(
            { valid: false, error: `Blocked content-type: ${contentType}` },
            { status: 400 }
          );
        }

        // Read with size limit (1MB)
        const text = await response.text();
        if (text.length > MAX_SNAPSHOT_BYTES) {
          return NextResponse.json(
            { valid: false, error: `Content too large (max ${MAX_SNAPSHOT_BYTES} chars)` },
            { status: 400 }
          );
        }

        // Sanitize HTML
        const sanitizedContent = contentType.includes('html') ? sanitizeHtml(text) : text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        snapshot = {
          v: 1,
          sourceType: 'url',
          url: url.toString(),
          contentType,
          content: sanitizedContent,
        };
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          return NextResponse.json(
            { valid: false, error: 'Request timed out (10s)' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { valid: false, error: `Fetch failed: ${err instanceof Error ? err.message : 'Unknown'}` },
          { status: 400 }
        );
      }
    } else {
      const sanitizedContent = sanitizeText(content, MAX_SNAPSHOT_BYTES);
      snapshot = {
        v: 1,
        sourceType: 'text',
        contentType: 'text/plain',
        content: sanitizedContent,
      };
    }

    const snapshotJson = canonicalizeJson(snapshot);
    const snapshotBytes = Buffer.from(snapshotJson, 'utf8');
    if (snapshotBytes.length > MAX_SNAPSHOT_BYTES) {
      return NextResponse.json(
        { valid: false, error: `Snapshot too large (${snapshotBytes.length} bytes)` },
        { status: 400 },
      );
    }

    // Compute hash
    const contentHashHex = createHash('sha256').update(snapshotBytes).digest('hex');
    const cid = cidFromSha256Hex(contentHashHex);

    return NextResponse.json({
      valid: true,
      contentHashHex,
      cid,
      snapshotJson,
      snapshot: {
        v: 1,
        sourceType: snapshot.sourceType,
        url: snapshot.sourceType === 'url' ? snapshot.url : null,
        contentType: snapshot.contentType,
        contentPreview: snapshot.content.slice(0, MAX_PREVIEW_CHARS),
        contentLengthBytes: snapshotBytes.length,
      },
    });
  } catch (err) {
    console.error('[/api/tips/preview] Error:', err);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check if hostname is blocked (SSRF protection).
 */
function isBlockedHostname(hostname: string): boolean {
  // Localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }

  // Cloud metadata
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
    return true;
  }

  // Private IP patterns
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4);
  if (match) {
    const [, a, b] = match.map(Number);
    if (a === 10) return true; // 10.x.x.x
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16-31.x.x
    if (a === 192 && b === 168) return true; // 192.168.x.x
    if (a === 127) return true; // 127.x.x.x
    if (a === 169 && b === 254) return true; // 169.254.x.x (link-local)
  }

  // Internal hostname patterns
  const blockedPatterns = ['internal', 'intranet', 'corp', 'private', 'kubernetes', 'k8s'];
  return blockedPatterns.some(p => hostname.includes(p));
}

/**
 * Basic HTML sanitization (removes scripts, styles, event handlers).
 */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}
