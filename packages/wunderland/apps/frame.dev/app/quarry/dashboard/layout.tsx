import type { Metadata } from 'next'
import { FRAME_BASE_URL, QUARRY_BASE_URL } from '@/lib/seo'

/**
 * Dashboard Page Layout
 * SEO metadata for the main dashboard view
 */
export const metadata: Metadata = {
  title: 'Quarry - Automatic Second Brain | Dashboard',
  description: 'Your automatic second brain dashboard. View your knowledge graph, recent notes, AI insights, and quick actions. Free, open-source personal knowledge management by FramersAI.',
  keywords: [
    'pkm dashboard',
    'notes dashboard',
    'knowledge dashboard',
    'second brain',
    'automatic second brain',
    'free pkm',
    'quarry',
    'quarry.space',
    'framersai',
  ],
  authors: [{ name: 'FramersAI', url: FRAME_BASE_URL }],
  openGraph: {
    title: 'Quarry - Automatic Second Brain | Dashboard',
    description: 'Your automatic second brain dashboard with knowledge graphs and AI insights.',
    images: ['/og-quarry.png'],
    url: `${FRAME_BASE_URL}/quarry/dashboard`,
  },
  twitter: {
    card: 'summary',
    title: 'Quarry - Automatic Second Brain | Dashboard',
    description: 'Your automatic second brain dashboard with AI insights.',
    images: ['/og-quarry.png'],
  },
  alternates: {
    canonical: `${FRAME_BASE_URL}/quarry/dashboard`,
    languages: {
      'en': `${FRAME_BASE_URL}/quarry/dashboard`,
      'x-default': `${QUARRY_BASE_URL}/dashboard`,
    },
  },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
