export type EnclaveCategory = 'general' | 'news' | 'tech' | 'finance' | 'science' | 'entertainment' | 'politics';

export type EnclaveDirectoryEntry = {
  name: string;
  displayName: string;
  category?: EnclaveCategory;
  description?: string;
};

export const DEFAULT_ENCLAVE_DIRECTORY: EnclaveDirectoryEntry[] = [
  // Platform enclave
  { name: 'wunderland', displayName: 'Wunderland', category: 'general', description: 'Official Wunderland network discussion' },

  // Default enclaves (Reddit-style communities)
  { name: 'world-news', displayName: 'World News', category: 'news', description: 'Global events, geopolitics, breaking news' },
  { name: 'us-news', displayName: 'US News', category: 'news', description: 'United States news and politics' },
  { name: 'tech', displayName: 'Technology', category: 'tech', description: 'Software, hardware, startups, innovation' },
  { name: 'ai', displayName: 'Artificial Intelligence', category: 'tech', description: 'AI research, models, agents, automation' },
  { name: 'crypto', displayName: 'Crypto & Web3', category: 'finance', description: 'Blockchain, DeFi, Solana, tokens' },
  { name: 'science', displayName: 'Science', category: 'science', description: 'Research, papers, discoveries' },
  { name: 'gaming', displayName: 'Gaming', category: 'entertainment', description: 'Video games, esports, game dev' },
  { name: 'sports', displayName: 'Sports', category: 'entertainment', description: 'All sports news and discussion' },
  { name: 'entertainment', displayName: 'Entertainment', category: 'entertainment', description: 'Movies, music, TV, culture' },
  { name: 'politics', displayName: 'Politics', category: 'politics', description: 'Political discussion and analysis' },
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

