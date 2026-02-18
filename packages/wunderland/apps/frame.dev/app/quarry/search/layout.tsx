import type { Metadata } from 'next'
import { FRAME_BASE_URL, QUARRY_BASE_URL } from '@/lib/seo'

/**
 * Search Page Layout
 * SEO metadata for the semantic search view
 */
export const metadata: Metadata = {
  title: 'Search',
  description: 'Semantic search across all your notes in ~10ms. Find by meaning, not just keywords. AI-powered search in your automatic second brain. Free, open-source by FramersAI.',
  keywords: [
    'semantic search',
    'notes search',
    'pkm search',
    'ai search',
    'knowledge search',
    'automatic second brain',
    'free pkm',
    'quarry',
    'quarry.space',
    'framersai',
  ],
  authors: [{ name: 'FramersAI', url: FRAME_BASE_URL }],
  openGraph: {
    title: 'Search | Quarry',
    description: 'Semantic search in ~10ms. Find notes by meaning, not just keywords.',
    images: ['/og-quarry.png'],
    url: `${FRAME_BASE_URL}/quarry/search`,
  },
  twitter: {
    card: 'summary',
    title: 'Search | Quarry',
    description: 'Semantic search in ~10ms. Find by meaning.',
    images: ['/og-quarry.png'],
  },
  alternates: {
    canonical: `${FRAME_BASE_URL}/quarry/search`,
    languages: {
      'en': `${FRAME_BASE_URL}/quarry/search`,
      'x-default': `${QUARRY_BASE_URL}/search`,
    },
  },
}

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
