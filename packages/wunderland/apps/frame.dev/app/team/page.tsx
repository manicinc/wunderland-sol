import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Team - Frame',
  description: 'Meet the team behind Frame',
}

export default function TeamPage() {
  return (
    <div className="min-h-screen paper-bg">
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <nav className="mb-8">
          <Link href="/" className="text-sm text-ink-600 dark:text-paper-400 hover:text-frame-green transition-colors">
            ← Back to Frame
          </Link>
        </nav>

        <article className="prose prose-lg dark:prose-invert max-w-none">
          <h1 className="text-4xl md:text-5xl font-serif font-bold ink-text mb-8">
            Team
          </h1>
          
          <div className="text-lg leading-relaxed space-y-6 ink-text">
            <p className="text-xl font-light">
              We are a collective of machine learning engineers, artists, product designers, and marketers united by a singular vision: to create infrastructure that empowers agentic AI while preserving human agency.
            </p>

            <p>
              Our team spans continents and disciplines, bringing together expertise in distributed systems, natural language processing, user experience design, and creative storytelling. We believe that the future of computing lies not in replacing human intelligence, but in augmenting it through thoughtfully designed operating systems that adapt to individual needs.
            </p>

            <p>
              Each member of our team contributes to Frame's ecosystem of operating systems—from the adaptive agent platform of AgentOS to the universal web framework of WebOS. We work in the open, building public infrastructure that anyone can use, modify, and extend.
            </p>

            <p>
              Our approach is rooted in academic rigor and artistic sensibility. We write code like prose, design interfaces like paintings, and architect systems like cathedrals—with intention, craft, and an eye toward permanence.
            </p>

            <div className="mt-12 p-8 bg-paper-100 dark:bg-ink-900 rounded-lg">
              <h2 className="text-2xl font-serif font-bold mb-4">Get in Touch</h2>
              <p className="mb-4">
                Whether you're interested in contributing to our open-source projects, exploring partnership opportunities, or joining our team, we'd love to hear from you.
              </p>
              <a href="mailto:team@frame.dev" className="inline-flex items-center gap-2 text-frame-green hover:text-frame-green-dark transition-colors font-medium">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                team@frame.dev
              </a>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}
