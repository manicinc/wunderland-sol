/**
 * Study Suggestions Page
 * @module codex/suggestions
 *
 * Generates personalized learning suggestions based on current content.
 */

import { Suspense } from 'react'
import { Metadata } from 'next'
import SuggestionsClient from './SuggestionsClient'

export const metadata: Metadata = {
  title: 'Study Suggestions | Quarry',
  description: 'Get personalized learning suggestions and study prompts based on your current content.',
}

export default function SuggestionsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    }>
      <SuggestionsClient />
    </Suspense>
  )
}
