import { Suspense } from 'react'
import AskPageClient from './AskPageClient'

export const metadata = {
  title: 'Ask | Quarry Codex',
  description: 'AI-powered knowledge discovery - ask questions about your knowledge base',
}

export default function AskPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="animate-pulse text-purple-500">Loading Ask...</div>
      </div>
    }>
      <AskPageClient />
    </Suspense>
  )
}





