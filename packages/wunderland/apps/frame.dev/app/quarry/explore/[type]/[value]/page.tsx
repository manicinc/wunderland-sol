/**
 * Tag/Subject/Topic Exploration Page
 * @module codex/explore/[type]/[value]/page
 * 
 * @description
 * Dynamic exploration page for viewing all strands related to a specific
 * tag, subject, or topic. Fully client-rendered for static export compatibility.
 * 
 * Routes:
 * - /quarry/explore/tag/[tagName]
 * - /quarry/explore/subject/[subjectName]
 * - /quarry/explore/topic/[topicName]
 */

import { Metadata } from 'next'

// Allow any dynamic parameters at runtime (client-side navigation)
export const dynamicParams = true

interface ExplorePageProps {
  params: Promise<{ type: string; value: string }>
}

/**
 * Generate static params - minimal set for static export
 * Additional routes work via client-side navigation
 */
export function generateStaticParams() {
  // Only generate minimal placeholder params for static export
  // All other routes work via client-side navigation with dynamicParams=true
  return [
    { type: 'tag', value: '_' },
    { type: 'subject', value: '_' },
    { type: 'topic', value: '_' },
  ]
}

export async function generateMetadata({ params }: ExplorePageProps): Promise<Metadata> {
  const { type, value } = await params
  
  if (value === '_') {
    return {
      title: 'Explore | Quarry',
      description: 'Explore tags, subjects, and topics in Quarry',
    }
  }
  
  const typeName = type.charAt(0).toUpperCase() + type.slice(1)
  const decodedValue = decodeURIComponent(value)
  
  return {
    title: `${typeName}: ${decodedValue} | Quarry`,
    description: `Explore all strands related to ${typeName.toLowerCase()} "${decodedValue}" in Quarry`,
  }
}

export default async function ExplorePage({ params }: ExplorePageProps) {
  const { type, value } = await params
  
  // Dynamic import to avoid SSR issues
  const { default: ExploreClient } = await import('./ExploreClient')
  
  return (
    <ExploreClient 
      type={type as 'tag' | 'subject' | 'topic'} 
      value={decodeURIComponent(value)}
      searchParams={{}}
    />
  )
}
