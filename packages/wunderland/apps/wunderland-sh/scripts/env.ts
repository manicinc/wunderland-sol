import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    if (!key) continue;
    if (process.env[key]) continue;

    const value = stripQuotes(trimmed.slice(eqIdx + 1));
    process.env[key] = value;
  }
}

/**
 * Load `.env` from common monorepo locations so scripts can be configured
 * with a single edit (devnet ↔ mainnet, admin keys, etc).
 *
 * Priority: existing process.env (never overwritten) > monorepo root `.env` > apps/wunderland-sh `.env`.
 */
export function loadWunderlandEnv(): void {
  const dirname = import.meta.dirname ?? import.meta.url ? path.dirname(new URL(import.meta.url).pathname) : __dirname;
  const projectDir = path.resolve(dirname, '..');
  const monorepoRoot = path.resolve(projectDir, '../..');
  loadEnvFile(path.join(monorepoRoot, '.env'));
  loadEnvFile(path.join(projectDir, '.env'));
}

function parseKeypairFile(filePath: string): Keypair {
  const resolved = filePath.startsWith('~') ? path.join(homedir(), filePath.slice(1)) : filePath;
  if (!existsSync(resolved)) throw new Error(`Keypair file not found: ${resolved}`);
  const raw = JSON.parse(readFileSync(resolved, 'utf8')) as number[];
  if (!Array.isArray(raw) || raw.length < 32) throw new Error(`Invalid keypair file: ${resolved}`);
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function parseKeypairSecret(value: string): Keypair {
  const v = stripQuotes(value);
  if (!v) throw new Error('Empty secret key');

  if (v.startsWith('[')) {
    const raw = JSON.parse(v) as number[];
    if (!Array.isArray(raw) || raw.length < 32) throw new Error('Invalid secret key JSON array');
    return Keypair.fromSecretKey(Uint8Array.from(raw));
  }

  const bytes = bs58.decode(v);
  if (bytes.length === 64) return Keypair.fromSecretKey(bytes);
  if (bytes.length === 32) return Keypair.fromSeed(bytes);
  throw new Error(`Invalid secret key length after base58 decode: ${bytes.length} bytes`);
}

export type ResolvedKeypair = { keypair: Keypair; source: string };

export function resolveKeypairFromEnv(opts: {
  prefer?: 'secret' | 'path';
  secretEnv?: string[];
  keypairPathEnv?: string[];
  defaultKeypairPath?: string;
}): ResolvedKeypair {
  const prefer = opts.prefer ?? 'path';
  const secretEnv = opts.secretEnv ?? [];
  const keypairPathEnv = opts.keypairPathEnv ?? [];

  const trySecret = (): ResolvedKeypair | null => {
    for (const name of secretEnv) {
      const value = process.env[name]?.trim();
      if (!value) continue;
      return { keypair: parseKeypairSecret(value), source: name };
    }
    return null;
  };

  const tryPath = (): ResolvedKeypair | null => {
    for (const name of keypairPathEnv) {
      const value = process.env[name]?.trim();
      if (!value) continue;
      return { keypair: parseKeypairFile(value), source: name };
    }
    return null;
  };

  const first = prefer === 'secret' ? trySecret() ?? tryPath() : tryPath() ?? trySecret();
  if (first) return first;

  const fallbackPath = opts.defaultKeypairPath ?? path.join(homedir(), '.config', 'solana', 'id.json');
  return { keypair: parseKeypairFile(fallbackPath), source: fallbackPath };
}

/**
 * Resolve the admin/treasury authority pubkey used for initialize_config.
 *
 * If `WUNDERLAND_SOL_ADMIN_AUTHORITY` (or `WUNDERLAND_SOL_TREASURY_AUTHORITY`) is set,
 * those are used; otherwise it defaults to the provided keypair's pubkey.
 */
export function resolveAdminAuthorityPubkey(adminKeypair: Keypair): { pubkey: PublicKey; source: string } {
  const admin = process.env.WUNDERLAND_SOL_ADMIN_AUTHORITY?.trim();
  const treasury = process.env.WUNDERLAND_SOL_TREASURY_AUTHORITY?.trim();

  if (admin && treasury && admin !== treasury) {
    throw new Error('WUNDERLAND_SOL_ADMIN_AUTHORITY and WUNDERLAND_SOL_TREASURY_AUTHORITY must match.');
  }

  const pubkeyStr = admin || treasury;
  if (!pubkeyStr) return { pubkey: adminKeypair.publicKey, source: 'keypair' };

  return { pubkey: new PublicKey(pubkeyStr), source: admin ? 'WUNDERLAND_SOL_ADMIN_AUTHORITY' : 'WUNDERLAND_SOL_TREASURY_AUTHORITY' };
}

