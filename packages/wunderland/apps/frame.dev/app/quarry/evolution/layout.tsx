import type { Metadata } from 'next'
import { FRAME_BASE_URL, QUARRY_BASE_URL } from '@/lib/seo'

/**
 * Evolution Page Layout
 * SEO metadata for the knowledge evolution view
 */
export const metadata: Metadata = {
  title: 'Knowledge Evolution',
  description: 'Track how your knowledge evolves over time. View note history, connections formed, and insights gained in your automatic second brain. Free, open-source by FramersAI.',
  keywords: [
    'knowledge evolution',
    'note history',
    'learning progress',
    'knowledge growth',
    'insight tracking',
    'automatic second brain',
    'free pkm',
    'quarry',
    'quarry.space',
    'framersai',
  ],
  authors: [{ name: 'FramersAI', url: FRAME_BASE_URL }],
  openGraph: {
    title: 'Knowledge Evolution | Quarry',
    description: 'Track how your knowledge evolves over time.',
    images: ['/og-quarry.png'],
    url: `${FRAME_BASE_URL}/quarry/evolution`,
  },
  twitter: {
    card: 'summary',
    title: 'Knowledge Evolution | Quarry',
    description: 'Track your knowledge evolution.',
    images: ['/og-quarry.png'],
  },
  alternates: {
    canonical: `${FRAME_BASE_URL}/quarry/evolution`,
    languages: {
      'en': `${FRAME_BASE_URL}/quarry/evolution`,
      'x-default': `${QUARRY_BASE_URL}/evolution`,
    },
  },
}

export default function EvolutionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
