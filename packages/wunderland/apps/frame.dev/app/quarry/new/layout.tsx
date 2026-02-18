import type { Metadata } from 'next'
import { FRAME_BASE_URL, QUARRY_BASE_URL } from '@/lib/seo'

/**
 * New Strand Page Layout
 * SEO metadata for the strand creation wizard
 */
export const metadata: Metadata = {
  title: 'Create New Note',
  description: 'Create a new note in your automatic second brain. AI-powered templates, smart organization, and instant tagging. Free, open-source personal knowledge management by FramersAI.',
  keywords: [
    'create note',
    'new note',
    'note template',
    'ai notetaking',
    'automatic second brain',
    'free pkm',
    'quarry',
    'quarry.space',
    'framersai',
  ],
  authors: [{ name: 'FramersAI', url: FRAME_BASE_URL }],
  openGraph: {
    title: 'Create New Note | Quarry',
    description: 'Create a new note with AI-powered templates and smart organization. Free, open-source PKM.',
    images: ['/og-quarry.png'],
    url: `${FRAME_BASE_URL}/quarry/new`,
  },
  twitter: {
    card: 'summary',
    title: 'Create New Note | Quarry',
    description: 'Create a new note with AI-powered templates and smart organization.',
    images: ['/og-quarry.png'],
  },
  alternates: {
    canonical: `${FRAME_BASE_URL}/quarry/new`,
    languages: {
      'en': `${FRAME_BASE_URL}/quarry/new`,
      'x-default': `${QUARRY_BASE_URL}/new`,
    },
  },
}

export default function NewStrandLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
