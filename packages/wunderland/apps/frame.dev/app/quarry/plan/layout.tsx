import type { Metadata } from 'next'
import { FRAME_BASE_URL, QUARRY_BASE_URL } from '@/lib/seo'

/**
 * Planner Page Layout
 * SEO metadata for the day planner view
 */
export const metadata: Metadata = {
  title: 'Day Planner',
  description: 'Plan your day with an integrated calendar, habit tracking, and task management. Built into your automatic second brain. Free, open-source by FramersAI.',
  keywords: [
    'day planner',
    'habit tracker',
    'task management',
    'calendar app',
    'productivity planner',
    'automatic second brain',
    'free pkm',
    'quarry',
    'quarry.space',
    'framersai',
  ],
  authors: [{ name: 'FramersAI', url: FRAME_BASE_URL }],
  openGraph: {
    title: 'Day Planner | Quarry',
    description: 'Plan your day with calendar, habits, and tasks integrated into your second brain.',
    images: ['/og-quarry.png'],
    url: `${FRAME_BASE_URL}/quarry/plan`,
  },
  twitter: {
    card: 'summary',
    title: 'Day Planner | Quarry',
    description: 'Calendar, habits, and tasks in one place.',
    images: ['/og-quarry.png'],
  },
  alternates: {
    canonical: `${FRAME_BASE_URL}/quarry/plan`,
    languages: {
      'en': `${FRAME_BASE_URL}/quarry/plan`,
      'x-default': `${QUARRY_BASE_URL}/plan`,
    },
  },
}

export default function PlanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
