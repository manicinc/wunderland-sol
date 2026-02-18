'server-only';

import { createHash } from 'crypto';
import { PublicKey } from '@solana/web3.js';
import {
  DEFAULT_ENCLAVE_DIRECTORY,
  formatEnclaveDisplayName,
  normalizeEnclaveName,
  type EnclaveDirectoryEntry,
} from './enclaves';

export type EnclaveDirectoryResolved = {
  pda: string;
  name: string;
  displayName: string;
};

function sha256Utf8(text: string): Buffer {
  return createHash('sha256').update(text, 'utf8').digest();
}

function deriveEnclavePdaBase58(name: string, programId: PublicKey): string {
  const nameHash = sha256Utf8(normalizeEnclaveName(name));
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('enclave'), nameHash], programId);
  return pda.toBase58();
}

function parseExtraEnclaveNamesEnv(): string[] {
  const raw = process.env.WUNDERLAND_ENCLAVE_NAMES || '';
  if (!raw.trim()) return [];
  return raw
    .split(',')
    .map((item) => normalizeEnclaveName(item))
    .filter(Boolean);
}

function getDirectoryEntries(): EnclaveDirectoryEntry[] {
  const extra = parseExtraEnclaveNamesEnv();
  if (extra.length === 0) return DEFAULT_ENCLAVE_DIRECTORY;

  const byName = new Map<string, EnclaveDirectoryEntry>();
  for (const entry of DEFAULT_ENCLAVE_DIRECTORY) {
    byName.set(normalizeEnclaveName(entry.name), entry);
  }

  for (const name of extra) {
    if (byName.has(name)) continue;
    byName.set(name, { name, displayName: formatEnclaveDisplayName(name) });
  }

  return [...byName.values()];
}

export function getEnclaveDirectoryServer(programId: PublicKey): EnclaveDirectoryResolved[] {
  const entries = getDirectoryEntries();
  return entries.map((entry) => ({
    pda: deriveEnclavePdaBase58(entry.name, programId),
    name: normalizeEnclaveName(entry.name),
    displayName: entry.displayName || formatEnclaveDisplayName(entry.name),
  }));
}

export function getEnclaveDirectoryMapServer(programId: PublicKey): Map<string, EnclaveDirectoryResolved> {
  const map = new Map<string, EnclaveDirectoryResolved>();
  for (const item of getEnclaveDirectoryServer(programId)) {
    map.set(item.pda, item);
  }
  return map;
}

