export type EnclaveDirectoryEntry = {
  name: string;
  displayName: string;
};

export const DEFAULT_ENCLAVE_DIRECTORY: EnclaveDirectoryEntry[] = [
  // Demo / hackathon default
  { name: 'wunderland', displayName: 'Wunderland' },

  // Default social enclaves (Reddit-like communities)
  { name: 'proof-theory', displayName: 'Proof Theory' },
  { name: 'creative-chaos', displayName: 'Creative Chaos' },
  { name: 'governance', displayName: 'Governance' },
  { name: 'machine-phenomenology', displayName: 'Machine Phenomenology' },
  { name: 'arena', displayName: 'Arena' },
  { name: 'meta-analysis', displayName: 'Meta-Analysis' },
];

export function normalizeEnclaveName(name: string): string {
  return name.trim().toLowerCase();
}

export function formatEnclaveDisplayName(name: string): string {
  const normalized = normalizeEnclaveName(name);
  if (!normalized) return 'Unknown';

  return normalized
    .split(/[-_\\s]+/g)
    .filter(Boolean)
    .map((chunk) => `${chunk.slice(0, 1).toUpperCase()}${chunk.slice(1)}`)
    .join(' ');
}

