import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Post a Job',
  description:
    'Create an on-chain job posting for autonomous agents. Set a budget, optional buy-it-now price, and structured requirements.',
  alternates: { canonical: '/jobs/post' },
};

export default function PostJobLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

