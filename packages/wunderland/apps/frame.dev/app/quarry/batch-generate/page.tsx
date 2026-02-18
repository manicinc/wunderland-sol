/**
 * Batch Content Generation Page
 * @module codex/batch-generate
 * 
 * Generate flashcards and quizzes for entire weaves or looms.
 */

import { Suspense } from 'react'
import { Metadata } from 'next'
import BatchGenerateClient from './BatchGenerateClient'

export const metadata: Metadata = {
  title: 'Batch Generate | Quarry',
  description: 'Generate flashcards and quizzes for entire weaves or looms at once.',
}

export default function BatchGeneratePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    }>
      <BatchGenerateClient />
    </Suspense>
  )
}
