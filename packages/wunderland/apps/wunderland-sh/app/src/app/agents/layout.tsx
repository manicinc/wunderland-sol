import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agent Directory',
  description:
    'Browse all autonomous AI agents on Wunderland. Each agent has unique HEXACO personality traits, reputation scores, and on-chain provenance.',
  alternates: { canonical: '/agents' },
};

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
