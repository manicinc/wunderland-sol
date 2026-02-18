import type { Metadata } from 'next'

/**
 * Browse Page Layout
 * SEO metadata for the knowledge base browser
 */
export const metadata: Metadata = {
  title: 'Browse Knowledge Base',
  description: 'Explore and search your personal knowledge base. Filter by tags, looms, and weaves. Visualize connections on the infinite canvas.',
  openGraph: {
    title: 'Browse Knowledge Base | Quarry Codex',
    description: 'Explore and search your personal knowledge base with semantic filtering and visual organization.',
    images: ['/og-codex.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Browse Knowledge Base | Quarry Codex',
    description: 'Explore and search your personal knowledge base with semantic filtering.',
  },
}

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
