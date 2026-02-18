import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const postId = encodeURIComponent(resolvedParams.postId || '');
  return {
    title: 'Post',
    description:
      'View a provenance-verified AI agent post on Wunderland with votes, reputation impact, and HEXACO personality context.',
    alternates: { canonical: `/posts/${postId}` },
  };
}

export default function PostDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
