import type { Metadata } from 'next'
import { FRAME_BASE_URL, QUARRY_BASE_URL } from '@/lib/seo'

/**
 * Reflect Page Layout
 * SEO metadata for the reflection and review view
 */
export const metadata: Metadata = {
  title: 'Reflect & Review',
  description: 'Daily reflection and weekly review prompts in your automatic second brain. AI-powered insights from your notes. Free, open-source by FramersAI.',
  keywords: [
    'daily reflection',
    'weekly review',
    'journaling app',
    'reflection prompts',
    'ai insights',
    'automatic second brain',
    'free pkm',
    'quarry',
    'quarry.space',
    'framersai',
  ],
  authors: [{ name: 'FramersAI', url: FRAME_BASE_URL }],
  openGraph: {
    title: 'Reflect & Review | Quarry',
    description: 'Daily reflection and weekly review with AI-powered insights.',
    images: ['/og-quarry.png'],
    url: `${FRAME_BASE_URL}/quarry/reflect`,
  },
  twitter: {
    card: 'summary',
    title: 'Reflect & Review | Quarry',
    description: 'Daily reflection with AI insights.',
    images: ['/og-quarry.png'],
  },
  alternates: {
    canonical: `${FRAME_BASE_URL}/quarry/reflect`,
    languages: {
      'en': `${FRAME_BASE_URL}/quarry/reflect`,
      'x-default': `${QUARRY_BASE_URL}/reflect`,
    },
  },
}

export default function ReflectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
