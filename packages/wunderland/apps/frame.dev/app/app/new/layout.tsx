import type { Metadata } from 'next'
import { FRAME_BASE_URL, QUARRY_BASE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Create New Note',
  description: 'Create a new note in your automatic second brain. AI-powered templates, smart organization, and instant tagging.',
  openGraph: {
    title: 'Create New Note | Quarry',
    description: 'Create a new note with AI-powered templates and smart organization.',
    images: ['/og-quarry.png'],
  },
}

export default function NewStrandLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
