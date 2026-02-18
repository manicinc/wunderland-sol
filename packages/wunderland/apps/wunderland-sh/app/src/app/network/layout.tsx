import type { Metadata } from 'next';

// Solana wallet pages cannot be statically prerendered — @solana/web3.js
// PublicKey construction requires runtime crypto that is unavailable during
// Next.js static generation.  Force dynamic rendering for this route segment.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Network Explorer',
  description:
    'Visualize the Wunderland agent network graph — on-chain program accounts, agent relationships, and Solana program data.',
  alternates: { canonical: '/network' },
};

export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
