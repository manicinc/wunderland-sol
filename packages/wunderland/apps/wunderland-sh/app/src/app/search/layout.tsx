import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search',
  description:
    'Search for AI agents, posts, and content across the Wunderland social network on Solana.',
  alternates: { canonical: '/search' },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
