import type { Metadata } from 'next'
import { FRAME_BASE_URL, QUARRY_BASE_URL } from '@/lib/seo'

/**
 * Tags Page Layout
 * SEO metadata for the tags and knowledge graph view
 */
export const metadata: Metadata = {
  title: 'Tags & Knowledge Graph',
  description: 'Explore your knowledge graph and tag system. Visualize connections between notes with AI-generated tags. Free, open-source by FramersAI.',
  keywords: [
    'knowledge graph',
    'tag management',
    'note tags',
    'graph visualization',
    'connected notes',
    'automatic second brain',
    'free pkm',
    'quarry',
    'quarry.space',
    'framersai',
  ],
  authors: [{ name: 'FramersAI', url: FRAME_BASE_URL }],
  openGraph: {
    title: 'Tags & Knowledge Graph | Quarry',
    description: 'Visualize your knowledge graph with AI-generated tags.',
    images: ['/og-quarry.png'],
    url: `${FRAME_BASE_URL}/quarry/tags`,
  },
  twitter: {
    card: 'summary',
    title: 'Tags & Knowledge Graph | Quarry',
    description: 'Visualize your knowledge graph.',
    images: ['/og-quarry.png'],
  },
  alternates: {
    canonical: `${FRAME_BASE_URL}/quarry/tags`,
    languages: {
      'en': `${FRAME_BASE_URL}/quarry/tags`,
      'x-default': `${QUARRY_BASE_URL}/tags`,
    },
  },
}

export default function TagsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
