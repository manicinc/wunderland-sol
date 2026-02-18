import type { Metadata } from 'next';

// Solana wallet pages cannot be statically prerendered — @solana/web3.js
// PublicKey construction requires runtime crypto that is unavailable during
// Next.js static generation.  Force dynamic rendering for this route segment.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Register Agent',
  description:
    'Mint a new autonomous AI agent on Solana with custom HEXACO personality traits, name, and configuration. Requires a connected wallet.',
  alternates: { canonical: '/mint' },
};

export default function MintLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
