#!/usr/bin/env node
import http from 'node:http';
import { createHash } from 'node:crypto';

const RAW_CODEC = 0x55;
const SHA256_CODEC = 0x12;
const SHA256_LENGTH = 32;
const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

function encodeBase32(bytes) {
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

function cidFromBytes(bytes) {
  const hash = createHash('sha256').update(bytes).digest();
  const multihash = Buffer.concat([Buffer.from([SHA256_CODEC, SHA256_LENGTH]), hash]);
  const cidBytes = Buffer.concat([Buffer.from([0x01, RAW_CODEC]), multihash]);
  return `b${encodeBase32(cidBytes)}`;
}

function parseArgs(argv) {
  const out = { port: 5199, host: '127.0.0.1' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--port') out.port = Number(argv[i + 1] ?? out.port);
    if (a === '--host') out.host = String(argv[i + 1] ?? out.host);
  }
  return out;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function getBoundary(contentType) {
  const match = /boundary=([^;]+)/i.exec(contentType);
  if (!match?.[1]) return null;
  return match[1].replace(/^"|"$/g, '');
}

function extractMultipartFile(body, boundary) {
  const boundaryMarker = Buffer.from(`--${boundary}`);
  const headerSep = Buffer.from('\r\n\r\n');

  const firstBoundary = body.indexOf(boundaryMarker);
  if (firstBoundary === -1) throw new Error('Malformed multipart (missing boundary)');

  const headerStart = firstBoundary + boundaryMarker.length;
  const headerEnd = body.indexOf(headerSep, headerStart);
  if (headerEnd === -1) throw new Error('Malformed multipart (missing header separator)');

  const contentStart = headerEnd + headerSep.length;
  const endMarker = Buffer.from(`\r\n--${boundary}`);
  const contentEnd = body.indexOf(endMarker, contentStart);
  if (contentEnd === -1) throw new Error('Malformed multipart (missing closing boundary)');

  return body.subarray(contentStart, contentEnd);
}

function sendJson(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(body.length),
  });
  res.end(body);
}

const { port, host } = parseArgs(process.argv.slice(2));

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('ok');
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/v0/version') {
      sendJson(res, 200, { Version: '0.0.0-fake', Commit: 'fake', Repo: 'fake-ipfs' });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v0/block/put') {
      const contentType = String(req.headers['content-type'] ?? '');
      const boundary = getBoundary(contentType);
      if (!boundary) {
        sendJson(res, 400, { Message: 'Missing multipart boundary' });
        return;
      }
      const raw = await readBody(req);
      const fileBytes = extractMultipartFile(raw, boundary);
      const cid = cidFromBytes(fileBytes);
      sendJson(res, 200, { Key: cid, Size: fileBytes.length });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v0/pin/add') {
      const arg = url.searchParams.get('arg') ?? '';
      sendJson(res, 200, { Pins: arg ? [arg] : [] });
      return;
    }

    sendJson(res, 404, { Message: 'Not found' });
  } catch (err) {
    sendJson(res, 500, { Message: err instanceof Error ? err.message : String(err) });
  }
});

server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`[fake-ipfs] listening on http://${host}:${port}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
}

