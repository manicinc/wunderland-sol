import * as net from 'node:net';
import * as tls from 'node:tls';
import * as readline from 'node:readline';
import { randomBytes } from 'node:crypto';

type AnySocket = net.Socket | tls.TLSSocket;

export type SmtpSendParams = {
  host: string;
  port?: number;
  user: string;
  pass: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  heloHost?: string;
  timeoutMs?: number;
  requireTLS?: boolean;
};

type SmtpResponse = { code: number; lines: string[] };

function withTimeout<T>(p: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return p;
  let timer: NodeJS.Timeout | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([p, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function parseHostPort(raw: string): { host: string; port?: number } {
  const value = raw.trim();
  if (!value) throw new Error('smtp_host is missing');

  // IPv6 bracket form: [::1]:587
  if (value.startsWith('[')) {
    const end = value.indexOf(']');
    if (end !== -1) {
      const host = value.slice(1, end);
      const rest = value.slice(end + 1);
      if (rest.startsWith(':')) {
        const port = Number(rest.slice(1));
        return Number.isFinite(port) ? { host, port } : { host };
      }
      return { host };
    }
  }

  // Single-colon host:port form.
  const firstColon = value.indexOf(':');
  const lastColon = value.lastIndexOf(':');
  if (firstColon !== -1 && firstColon === lastColon) {
    const host = value.slice(0, lastColon).trim();
    const port = Number(value.slice(lastColon + 1).trim());
    if (host && Number.isFinite(port)) return { host, port };
  }

  return { host: value };
}

function base64(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64');
}

function parseAuthMethods(ehloLines: string[]): Set<string> {
  const out = new Set<string>();
  for (const line of ehloLines) {
    const normalized = line.toUpperCase();
    const idx = normalized.indexOf('AUTH');
    if (idx === -1) continue;
    // Examples: "250-AUTH PLAIN LOGIN", "250 AUTH LOGIN"
    const rest = normalized.slice(idx + 4).trim();
    for (const part of rest.split(/\s+/)) {
      if (!part) continue;
      out.add(part.replace(/[^A-Z0-9_-]/g, ''));
    }
  }
  return out;
}

function dotStuff(text: string): string {
  return text
    .replace(/\r?\n/g, '\r\n')
    .split('\r\n')
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n');
}

function buildMessage(params: { from: string; to: string; subject: string; text: string }): string {
  const messageId = `<${randomBytes(16).toString('hex')}@rabbithole.inc>`;
  const headers = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="utf-8"',
    'Content-Transfer-Encoding: 7bit',
  ];
  return `${headers.join('\r\n')}\r\n\r\n${dotStuff(params.text)}\r\n`;
}

async function connectPlain(host: string, port: number, timeoutMs: number): Promise<net.Socket> {
  return withTimeout(
    new Promise((resolve, reject) => {
      const socket = net.connect({ host, port });
      socket.once('connect', () => resolve(socket));
      socket.once('error', reject);
    }),
    timeoutMs,
    `SMTP connection timed out (${host}:${port})`
  );
}

async function connectTls(host: string, port: number, timeoutMs: number): Promise<tls.TLSSocket> {
  return withTimeout(
    new Promise((resolve, reject) => {
      const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: true }, () =>
        resolve(socket)
      );
      socket.once('error', reject);
    }),
    timeoutMs,
    `SMTPS connection timed out (${host}:${port})`
  );
}

function createLineIterator(socket: AnySocket) {
  const rl = readline.createInterface({ input: socket, crlfDelay: Infinity });
  const iter = rl[Symbol.asyncIterator]();
  return { rl, iter };
}

async function readResponse(iter: AsyncIterator<string>, timeoutMs: number): Promise<SmtpResponse> {
  const lines: string[] = [];

  const first = await withTimeout(
    iter.next().then((r) => r.value),
    timeoutMs,
    'SMTP server response timed out'
  );
  if (!first) throw new Error('SMTP connection closed unexpectedly');
  lines.push(first);

  const code = Number(first.slice(0, 3));
  if (!Number.isFinite(code)) return { code: 0, lines };

  const isMulti = first[3] === '-';
  if (!isMulti) return { code, lines };

  while (true) {
    const nextLine = await withTimeout(
      iter.next().then((r) => r.value),
      timeoutMs,
      'SMTP server response timed out'
    );
    if (!nextLine) throw new Error('SMTP connection closed unexpectedly');
    lines.push(nextLine);
    if (nextLine.startsWith(`${code} `)) break;
  }

  return { code, lines };
}

async function sendCommand(
  socket: AnySocket,
  iter: AsyncIterator<string>,
  command: string,
  expect: number[],
  timeoutMs: number
): Promise<SmtpResponse> {
  socket.write(`${command}\r\n`);
  const res = await readResponse(iter, timeoutMs);
  if (!expect.includes(res.code)) {
    throw new Error(`SMTP error for "${command}": ${res.lines.join(' | ')}`);
  }
  return res;
}

function getEhloCapabilitiesLines(res: SmtpResponse): string[] {
  // Keep the raw lines since they contain the capability tokens.
  return res.lines.map((l) => l.slice(4).trim()).filter(Boolean);
}

export async function sendSmtpMail(params: SmtpSendParams): Promise<{
  ok: true;
  serverResponse: string;
}> {
  const timeoutMs = Number.isFinite(params.timeoutMs) ? Number(params.timeoutMs) : 20_000;
  const requireTLS = params.requireTLS !== false;
  const heloHost = params.heloHost?.trim() || 'localhost';

  const { host, port } = parseHostPort(params.host);
  const resolvedPort = port ?? params.port ?? 587;

  // Port 465: implicit TLS.
  let socket: AnySocket =
    resolvedPort === 465
      ? await connectTls(host, resolvedPort, timeoutMs)
      : await connectPlain(host, resolvedPort, timeoutMs);

  let { rl, iter } = createLineIterator(socket);

  try {
    // Greeting
    const greeting = await readResponse(iter, timeoutMs);
    if (greeting.code !== 220) {
      throw new Error(`SMTP greeting failed: ${greeting.lines.join(' | ')}`);
    }

    // EHLO
    const ehlo1 = await sendCommand(socket, iter, `EHLO ${heloHost}`, [250], timeoutMs);
    const ehloLines1 = getEhloCapabilitiesLines(ehlo1);

    // STARTTLS (required unless already TLS)
    const isTls = socket instanceof tls.TLSSocket;
    const supportsStartTls = ehloLines1.some((l) => l.toUpperCase().startsWith('STARTTLS'));
    if (!isTls && requireTLS) {
      if (!supportsStartTls) {
        throw new Error('SMTP server does not support STARTTLS (TLS required)');
      }

      await sendCommand(socket, iter, 'STARTTLS', [220], timeoutMs);

      // Upgrade the existing socket to TLS.
      const upgraded = await withTimeout(
        new Promise<tls.TLSSocket>((resolve, reject) => {
          const tlsSocket = tls.connect(
            { socket: socket as net.Socket, servername: host, rejectUnauthorized: true },
            () => resolve(tlsSocket)
          );
          tlsSocket.once('error', reject);
        }),
        timeoutMs,
        'SMTP STARTTLS upgrade timed out'
      );

      rl.close();
      socket = upgraded;
      ({ rl, iter } = createLineIterator(socket));

      // EHLO again (post-TLS)
      await sendCommand(socket, iter, `EHLO ${heloHost}`, [250], timeoutMs);
    }

    // AUTH
    const ehlo2 = await sendCommand(socket, iter, `EHLO ${heloHost}`, [250], timeoutMs);
    const authMethods = parseAuthMethods(getEhloCapabilitiesLines(ehlo2));

    if (authMethods.has('PLAIN')) {
      const token = base64(`\u0000${params.user}\u0000${params.pass}`);
      await sendCommand(socket, iter, `AUTH PLAIN ${token}`, [235], timeoutMs);
    } else {
      // Fall back to LOGIN (widely supported).
      await sendCommand(socket, iter, 'AUTH LOGIN', [334], timeoutMs);
      await sendCommand(socket, iter, base64(params.user), [334], timeoutMs);
      await sendCommand(socket, iter, base64(params.pass), [235], timeoutMs);
    }

    // MAIL FROM / RCPT TO
    await sendCommand(socket, iter, `MAIL FROM:<${params.from}>`, [250], timeoutMs);
    await sendCommand(socket, iter, `RCPT TO:<${params.to}>`, [250, 251], timeoutMs);

    // DATA
    await sendCommand(socket, iter, 'DATA', [354], timeoutMs);
    socket.write(
      buildMessage({ from: params.from, to: params.to, subject: params.subject, text: params.text })
    );
    socket.write('\r\n.\r\n');
    const dataRes = await readResponse(iter, timeoutMs);
    if (dataRes.code !== 250) {
      throw new Error(`SMTP DATA rejected: ${dataRes.lines.join(' | ')}`);
    }

    // QUIT
    try {
      await sendCommand(socket, iter, 'QUIT', [221], timeoutMs);
    } catch {
      // Ignore; server may close early.
    }

    return { ok: true, serverResponse: dataRes.lines.join(' | ') };
  } finally {
    try {
      rl.close();
    } catch {
      // ignore
    }
    try {
      socket.destroy();
    } catch {
      // ignore
    }
  }
}
