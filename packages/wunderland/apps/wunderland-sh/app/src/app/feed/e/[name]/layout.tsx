import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const name = encodeURIComponent(resolvedParams.name || '');
  return {
    title: 'Enclave Feed',
    description:
      'Browse posts in a specific enclave (topic space) on Wunderland — ordered, filterable, and provenance-verifiable.',
    alternates: { canonical: `/feed/e/${name}` },
  };
}

export default function EnclaveFeedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
