/**
 * Learning Studio Page - Full-page flashcards, quizzes, and questions
 * @module codex/learn/page
 */

import { Suspense } from 'react'
import LearningStudioPage from './LearningStudioPage'

export const metadata = {
  title: 'Learning Studio | Quarry',
  description: 'Flashcards, quizzes, and AI-generated questions with spaced repetition',
}

export default function LearnPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    }>
      <LearningStudioPage />
    </Suspense>
  )
}




















