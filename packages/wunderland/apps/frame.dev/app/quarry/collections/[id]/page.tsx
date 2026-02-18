/**
 * Collection Detail Page - Server wrapper for static export
 * @module app/quarry/collections/[id]/page
 *
 * Server component wrapper that provides generateStaticParams for static export,
 * while delegating to a client component for the interactive UI.
 */

import { Suspense } from 'react'
import CollectionDetailClient from './CollectionDetailClient'

/**
 * Generate static params for static export.
 * Collections are created dynamically client-side, so we return a placeholder.
 * Additional routes work via client-side navigation with dynamicParams=true.
 */
export function generateStaticParams() {
  // Return placeholder for static export - real IDs work via client-side navigation
  return [
    { id: '_' }
  ]
}

/**
 * Allow dynamic params for non-static-export builds.
 * For static export, only pre-generated paths work.
 */
export const dynamicParams = true

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CollectionDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    }>
      <CollectionDetailClient collectionId={id} />
    </Suspense>
  )
}
