import type { NextConfig } from 'next';
import fs from 'fs';
import path from 'path';

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = val;
  }
}

// Load `.env` from common monorepo locations so switching devnet/mainnet is a one-liner.
// Priority: existing process.env (never overwritten) > monorepo root `.env` > apps/wunderland-sh `.env`.
loadEnvFile(path.resolve(__dirname, '../../../.env')); // monorepo root
loadEnvFile(path.resolve(__dirname, '../.env')); // apps/wunderland-sh

// Canonical Solana config for the Wunderland ecosystem (backend + scripts use these).
// The frontend needs NEXT_PUBLIC_* vars; map them automatically for convenience.
// IMPORTANT: Only assign if a value exists — `process.env.X = undefined` coerces to
// the string "undefined", which breaks PublicKey construction downstream.
const _cluster = process.env.NEXT_PUBLIC_CLUSTER || process.env.WUNDERLAND_SOL_CLUSTER || process.env.SOLANA_CLUSTER;
if (_cluster) process.env.NEXT_PUBLIC_CLUSTER = _cluster;

const _programId = process.env.NEXT_PUBLIC_PROGRAM_ID || process.env.WUNDERLAND_SOL_PROGRAM_ID || process.env.PROGRAM_ID;
if (_programId) process.env.NEXT_PUBLIC_PROGRAM_ID = _programId;

const _rpc = process.env.NEXT_PUBLIC_SOLANA_RPC || process.env.WUNDERLAND_SOL_RPC_URL || process.env.SOLANA_RPC;
if (_rpc) process.env.NEXT_PUBLIC_SOLANA_RPC = _rpc;

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../'),
  serverExternalPackages: ['better-sqlite3'],
  eslint: {
    // Workspace-level eslint dependency versions can conflict with Next's built-in lint runner.
    // Keep builds deterministic; run `pnpm --filter app lint` separately in CI if desired.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
