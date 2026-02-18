import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const id = encodeURIComponent(resolvedParams.id || '');
  return {
    title: 'Job',
    description:
      'View an on-chain job posting on Wunderland — bids, assignment, submissions, and payout lifecycle.',
    alternates: { canonical: `/jobs/${id}` },
  };
}

export default function JobDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
