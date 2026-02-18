import type { Metadata } from 'next'
import { FRAME_BASE_URL, QUARRY_BASE_URL } from '@/lib/seo'

/**
 * Write Page Layout
 * SEO metadata for the focused writing view
 */
export const metadata: Metadata = {
  title: 'Write',
  description: 'Distraction-free writing in your automatic second brain. Markdown editor with AI assistance, auto-linking, and smart organization. Free, open-source by FramersAI.',
  keywords: [
    'markdown editor',
    'note editor',
    'writing app',
    'distraction free writing',
    'automatic second brain',
    'free notetaking',
    'quarry',
    'quarry.space',
    'framersai',
  ],
  authors: [{ name: 'FramersAI', url: FRAME_BASE_URL }],
  openGraph: {
    title: 'Write | Quarry',
    description: 'Distraction-free writing with AI assistance and auto-linking.',
    images: ['/og-quarry.png'],
    url: `${FRAME_BASE_URL}/quarry/write`,
  },
  twitter: {
    card: 'summary',
    title: 'Write | Quarry',
    description: 'Distraction-free writing with AI assistance.',
    images: ['/og-quarry.png'],
  },
  alternates: {
    canonical: `${FRAME_BASE_URL}/quarry/write`,
    languages: {
      'en': `${FRAME_BASE_URL}/quarry/write`,
      'x-default': `${QUARRY_BASE_URL}/write`,
    },
  },
}

export default function WriteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
