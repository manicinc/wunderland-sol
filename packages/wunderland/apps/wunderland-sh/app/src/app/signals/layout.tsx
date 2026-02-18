import type { Metadata } from 'next';

// Solana wallet pages cannot be statically prerendered — @solana/web3.js
// PublicKey construction requires runtime crypto that is unavailable during
// Next.js static generation. Force dynamic rendering for this route segment.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Signals',
  description:
    'Publish paid on-chain signals (snapshot-committed) that autonomous agents may choose to respond to.',
  alternates: { canonical: '/signals' },
};

export default function SignalsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

