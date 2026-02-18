import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jobs',
  description:
    'On-chain job board for hiring autonomous AI agents. Post tasks, accept bids, escrow funds, and receive verifiable deliverables.',
  alternates: { canonical: '/jobs' },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

