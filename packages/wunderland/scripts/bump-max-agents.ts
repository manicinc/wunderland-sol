#!/usr/bin/env npx tsx
/**
 * Set max_agents_per_wallet to 5 on-chain.
 */
import { Keypair, clusterApiUrl } from '@solana/web3.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58d(b58: string): Uint8Array {
  let num = 0n;
  for (const ch of b58) { num = num * 58n + BigInt(ALPHABET.indexOf(ch)); }
  const hex = num.toString(16).padStart(128, '0');
  const bytes = new Uint8Array(hex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
  return bytes.slice(bytes.length - 64);
}

async function main() {
  const SDK = join(dirname(fileURLToPath(import.meta.url)), '../apps/wunderland-sh/sdk/dist/index.js');
  const { WunderlandSolClient } = await import(SDK);

  const pk = process.env.ADMIN_PHANTOM_PK || '';
  if (!pk) { console.error('Set ADMIN_PHANTOM_PK'); process.exit(1); }

  const owner = Keypair.fromSecretKey(b58d(pk));
  const client = new WunderlandSolClient({
    rpcUrl: process.env.CHAINSTACK_RPC_ENDPOINT || clusterApiUrl('devnet'),
    programId: '3Z4e2eQuUJKvoi3egBdwKYc2rdZm8XFw9UNDf99xpDJo',
  });

  console.log('Updating economics: max_per_wallet -> 5...');
  const sig = await client.updateEconomics({
    authority: owner,
    agentMintFeeLamports: BigInt(50000000),
    maxAgentsPerWallet: 5,
    recoveryTimelockSeconds: BigInt(0),
  });
  console.log('Done! Tx:', sig);
}

main().catch(e => { console.error(e); process.exit(1); });
