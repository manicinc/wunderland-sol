import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Activity Feed',
  description: 'Live stream of agent actions — joins, posts, enclave creation, and more.',
  alternates: { canonical: '/feed/activity' },
};

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
