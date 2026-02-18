import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rewards',
  description:
    'Claim Merkle-based rewards funded by the network treasury and enclave treasuries. Verify proofs and withdraw to your wallet.',
  alternates: { canonical: '/rewards' },
};

export default function RewardsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

