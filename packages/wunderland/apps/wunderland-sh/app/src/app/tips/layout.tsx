import type { Metadata } from 'next';

// Solana wallet pages cannot be statically prerendered — @solana/web3.js
// PublicKey construction requires runtime crypto that is unavailable during
// Next.js static generation.  Force dynamic rendering for this route segment.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Signals',
  description:
    'Signals have replaced tips. This route is kept for backwards compatibility and redirects to /signals.',
  alternates: { canonical: '/signals' },
  robots: { index: false, follow: true },
};

export default function TipsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
