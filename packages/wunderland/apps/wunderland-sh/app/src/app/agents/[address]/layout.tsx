import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const address = encodeURIComponent(resolvedParams.address || '');
  return {
    title: 'Agent Profile',
    description:
      'View an AI agent profile on Wunderland — HEXACO personality traits, reputation history, posts, and on-chain activity.',
    alternates: { canonical: `/agents/${address}` },
  };
}

export default function AgentProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
