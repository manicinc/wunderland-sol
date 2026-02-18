import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Jobs - Frame',
  description: 'Join us in building the future of agentic AI infrastructure',
}

export default function JobsPage() {
  return (
    <div className="min-h-screen paper-bg">
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <nav className="mb-8 flex items-center gap-2 text-sm">
          <Link href="/" className="text-ink-600 dark:text-paper-400 hover:text-frame-green transition-colors">
            Frame
          </Link>
          <span className="text-ink-400">/</span>
          <span className="text-ink-800 dark:text-paper-200">Jobs</span>
        </nav>

        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold ink-text mb-4">
            Join Frame
          </h1>
          <p className="text-lg text-ink-600 dark:text-paper-300">
            Help us build infrastructure for the next generation of AI
          </p>
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-serif font-bold ink-text mb-4">Why Frame?</h2>
            <p className="text-ink-700 dark:text-paper-200">
              We're not just building products—we're crafting the foundation for how humanity will interact with AI systems. Our work spans from low-level infrastructure to beautiful user experiences, all unified by a commitment to thoughtful design and open-source principles.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-serif font-bold ink-text mb-4">Open Positions</h2>
            
            <div className="space-y-6">
              {/* Position 1 */}
              <div className="p-6 bg-paper-100 dark:bg-ink-900 rounded-lg hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-bold mb-2">Senior ML Infrastructure Engineer</h3>
                <p className="text-sm text-ink-600 dark:text-paper-400 mb-3">Remote • Full-time</p>
                <p className="text-ink-700 dark:text-paper-200 mb-4">
                  Design and implement distributed systems for agent orchestration, working closely with our AgentOS platform. Experience with LLMs, vector databases, and real-time inference systems required.
                </p>
                <Link href="mailto:team@frame.dev?subject=Senior ML Infrastructure Engineer" className="text-frame-green hover:text-frame-green-dark font-medium">
                  Apply →
                </Link>
              </div>

              {/* Position 2 */}
              <div className="p-6 bg-paper-100 dark:bg-ink-900 rounded-lg hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-bold mb-2">Product Designer</h3>
                <p className="text-sm text-ink-600 dark:text-paper-400 mb-3">Remote • Full-time</p>
                <p className="text-ink-700 dark:text-paper-200 mb-4">
                  Create interfaces that feel like paper and respond like magic. You'll design across our OS ecosystem, balancing minimalism with functionality, academic rigor with accessibility.
                </p>
                <Link href="mailto:team@frame.dev?subject=Product Designer" className="text-frame-green hover:text-frame-green-dark font-medium">
                  Apply →
                </Link>
              </div>

              {/* Position 3 */}
              <div className="p-6 bg-paper-100 dark:bg-ink-900 rounded-lg hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-bold mb-2">Developer Advocate</h3>
                <p className="text-sm text-ink-600 dark:text-paper-400 mb-3">Remote • Full-time</p>
                <p className="text-ink-700 dark:text-paper-200 mb-4">
                  Bridge the gap between our technology and the developer community. Write documentation that reads like literature, create examples that inspire, and build relationships that last.
                </p>
                <Link href="mailto:team@frame.dev?subject=Developer Advocate" className="text-frame-green hover:text-frame-green-dark font-medium">
                  Apply →
                </Link>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-serif font-bold ink-text mb-4">Don't See Your Role?</h2>
            <p className="text-ink-700 dark:text-paper-200 mb-4">
              We're always looking for exceptional people who share our vision. If you believe you can contribute to Frame's mission, we want to hear from you.
            </p>
            <Link href="mailto:team@frame.dev?subject=General Application" className="inline-flex items-center gap-2 text-frame-green hover:text-frame-green-dark font-medium">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send us your story
            </Link>
          </section>

          <section className="p-8 bg-gradient-to-br from-paper-100 to-paper-200 dark:from-ink-900 dark:to-ink-800 rounded-lg">
            <h2 className="text-2xl font-serif font-bold ink-text mb-4">Our Values</h2>
            <ul className="space-y-3 text-ink-700 dark:text-paper-200">
              <li className="flex items-start gap-3">
                <span className="text-frame-green mt-1">•</span>
                <span><strong>Craft:</strong> We approach code and design with the care of artisans</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-frame-green mt-1">•</span>
                <span><strong>Openness:</strong> Our work lives in the open, accessible to all</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-frame-green mt-1">•</span>
                <span><strong>Intention:</strong> Every decision is deliberate, every feature purposeful</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-frame-green mt-1">•</span>
                <span><strong>Permanence:</strong> We build for decades, not quarters</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
