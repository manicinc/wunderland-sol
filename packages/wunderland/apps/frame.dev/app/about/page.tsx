import { Metadata } from 'next'
import Link from 'next/link'
import PageLayout from '@/components/page-layout'
import { Github, Linkedin, Twitter, Mail, Zap, Shield, Globe, Brain } from 'lucide-react'
import { FRAME_BASE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'About Frame.dev - Creators of Quarry & Quarry Codex | AI Infrastructure',
  description: 'Frame.dev builds Quarry (free open source PKM), Quarry Codex digital garden, and AI infrastructure for superintelligence. Learn about our mission to create open source SAFE AI tools.',
  keywords: [
    'Frame.dev',
    'about Frame.dev',
    'Quarry creators',
    'Quarry Codex',
    'Quarry by Frame',
    'Frame.dev Quarry',
    'Quarry.space',
    'quarry space',
    'framers ai quarry',
    'AI infrastructure',
    'open source PKM',
    'superintelligence',
    'OpenStrand',
    'digital garden',
    'free open source notes',
    'AI notetaking company',
    'best free PKM 2025',
  ],
  authors: [{ name: 'Frame.dev', url: FRAME_BASE_URL }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  openGraph: {
    title: 'About Frame.dev - Creators of Quarry & Quarry Codex',
    description: 'Frame.dev builds Quarry (free open source PKM), Quarry Codex digital garden, and AI infrastructure. Learn about our mission.',
    url: `${FRAME_BASE_URL}/about`,
    siteName: 'Frame.dev',
    type: 'website',
    images: [`${FRAME_BASE_URL}/og-image.png`],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@framersai',
    creator: '@framersai',
    title: 'About Frame.dev - Creators of Quarry',
    description: 'Learn about Frame.dev and our mission to build open source SAFE AI infrastructure.',
    images: [`${FRAME_BASE_URL}/og-image.png`],
  },
  alternates: {
    canonical: `${FRAME_BASE_URL}/about`,
  },
}

export default function AboutPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 max-w-4xl pt-20 pb-20">
        <h1 className="text-5xl font-bold mb-8 heading-gradient">About Frame.dev</h1>
        
        {/* Tagline */}
        <div className="text-center mb-12">
          <p className="text-2xl font-serif bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            The OS for humans, the codex of humanity.
          </p>
        </div>
        
        {/* Mission */}
        <section className="mb-16" id="superintelligence">
          <h2 className="text-3xl font-bold mb-6 heading-display">Our Mission</h2>
          <div className="space-y-6 body-text">
            <p className="text-xl font-medium text-gray-900 dark:text-white">
              We&apos;re building the AI infrastructure for superintelligence.
            </p>
            <p className="text-lg">
              Frame.dev is creating the foundation for open source SAFE superintelligence—infrastructure 
              that ensures AGI and superintelligence remain transparent, auditable, and aligned with human values. 
              Our work spans three core pillars:
            </p>
            <div className="grid gap-6 md:grid-cols-3 mt-8">
              <div className="paper-card p-6">
                <Brain className="w-12 h-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Adaptive Intelligence</h3>
                <p className="text-ink-600 dark:text-paper-400">
                  Building AI that is emergent and permanent, capable of continuous learning and adaptation 
                  while maintaining safety guarantees.
            </p>
          </div>
              <div className="paper-card p-6">
                <Shield className="w-12 h-12 text-green-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">SAFE Architecture</h3>
                <p className="text-ink-600 dark:text-paper-400">
                  Open source infrastructure with built-in safety mechanisms, transparency, and 
                  human-aligned values by design.
                </p>
              </div>
              <div className="paper-card p-6">
                <Globe className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Denoising the Web</h3>
                <p className="text-ink-600 dark:text-paper-400">
                  Curating humanity&apos;s knowledge into structured, verifiable formats that AI systems 
                  can understand and trust.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Vision */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6 heading-display">The Superintelligence Computer</h2>
          <div className="space-y-6 body-text">
            <p className="text-lg">
              Our ultimate vision is the Superintelligence Computer—a system that ingests all of Frame&apos;s 
              knowledge to answer any question and perform any task, while remaining safe, transparent, and 
              aligned with human values.
            </p>
            <p className="text-lg">
              This isn&apos;t just about building powerful AI. It&apos;s about ensuring that as we approach 
              AGI and superintelligence, the infrastructure remains open, auditable, and beneficial to all 
              humanity. We believe the path to safe superintelligence requires:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Open source development for transparency and trust</li>
              <li>Structured knowledge that AI can verify and understand</li>
              <li>Local-first architecture giving users control</li>
              <li>Community governance and oversight</li>
              <li>Safety mechanisms built into every layer</li>
            </ul>
          </div>
        </section>

        {/* Products */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6 heading-display">Our Infrastructure</h2>
          <div className="space-y-6 body-text">
            <p className="text-lg">
              Frame.dev&apos;s infrastructure forms the foundation for safe superintelligence:
            </p>
            <div className="space-y-8 mt-8">
              <div className="paper-card p-6">
                <h3 className="text-xl font-semibold mb-3 text-purple-600">Quarry Codex</h3>
                <p className="text-ink-600 dark:text-paper-400 mb-3">
                  The codex of humanity—a structured repository of human knowledge designed for LLM ingestion. 
                  Organized as strands, looms, and weaves for optimal AI understanding.
                </p>
                <Link href="/quarry" className="text-frame-green hover:underline">
                  Explore the Codex →
                </Link>
              </div>
              
              <div className="paper-card p-6">
                <h3 className="text-xl font-semibold mb-3 text-frame-green">OpenStrand</h3>
                <p className="text-ink-600 dark:text-paper-400 mb-3">
                  The universal knowledge schema protocol that makes your content AI-native. OpenStrand adds an invisible intelligence layer to standard Markdown through YAML frontmatter, typed semantic relationships, and LLM instructions. 
                  Every Strand carries metadata that AI systems understand—relationships like requires, extends, and contradicts create a navigable knowledge graph. Your documentation becomes queryable via natural language with sourced citations, semantic search by meaning not keywords, all running locally via WebAssembly.
                </p>
                <a href="https://openstrand.ai" target="_blank" rel="noopener noreferrer" 
                   className="text-frame-green hover:underline">
                  Learn more →
                </a>
              </div>
              
              <div className="paper-card p-6">
                <h3 className="text-xl font-semibold mb-3 text-green-600">AgentOS</h3>
                <p className="text-ink-600 dark:text-paper-400 mb-3">
                  Adaptive AI agency runtime that orchestrates intelligent agents with safety guardrails, 
                  human-in-the-loop controls, and transparent decision-making.
                </p>
                <a href="https://agentos.sh" target="_blank" rel="noopener noreferrer" 
                   className="text-frame-green hover:underline">
                  Get started →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Open Source Philosophy */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6 heading-display">Open Source for Open Superintelligence</h2>
          <div className="space-y-6 body-text">
            <p className="text-lg">
              We demand and build infrastructure for open source SAFE superintelligence. Every line of code, 
              every design decision, and every architectural choice is made with transparency and safety in mind.
            </p>
            <p className="text-lg">
              All Frame projects are available under MIT or Apache 2.0 licenses. We believe that the path to 
              safe superintelligence requires radical transparency, community collaboration, and collective 
              oversight. No single entity should control the infrastructure of superintelligence.
            </p>
          </div>
        </section>

        {/* Join Us */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6 heading-display">Join the Mission</h2>
          <div className="space-y-6 body-text">
            <p className="text-lg">
              We&apos;re looking for collaborators and experts who share our vision of building infrastructure 
              for open source SAFE superintelligence. Whether you&apos;re a researcher, developer, or thinker, 
              there&apos;s a place for you in this mission.
            </p>
            <div className="paper-card p-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
              <h3 className="text-xl font-semibold mb-4">Ways to Contribute</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-purple-600 mt-0.5" />
                  <span>Contribute code to our open source repositories</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-purple-600 mt-0.5" />
                  <span>Add knowledge to Quarry Codex</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-purple-600 mt-0.5" />
                  <span>Build applications using our APIs</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-purple-600 mt-0.5" />
                  <span>Join discussions on safety and alignment</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-purple-600 mt-0.5" />
                  <span>Help us denoise the web</span>
                </li>
              </ul>
              <div className="flex flex-wrap gap-4 mt-6">
                <a href="https://github.com/framersai" target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 text-frame-green hover:underline">
                  <Github className="w-5 h-5" />
                  GitHub
                </a>
                <a href="https://github.com/framersai/discussions" target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 text-frame-green hover:underline">
                  <Mail className="w-5 h-5" />
                  Discussions
                </a>
                <a href="mailto:team@frame.dev"
                   className="inline-flex items-center gap-2 text-frame-green hover:underline">
                  <Mail className="w-5 h-5" />
                  Contact
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6 heading-display">Our Values</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Transparency</h3>
              <p className="text-ink-600 dark:text-paper-400">
                Open source everything. No black boxes. Every decision and implementation detail is public.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Safety First</h3>
              <p className="text-ink-600 dark:text-paper-400">
                Every feature is designed with safety in mind. We build guardrails before capabilities.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Human Alignment</h3>
              <p className="text-ink-600 dark:text-paper-400">
                Technology should amplify human potential, not replace it. Humans remain in control.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Community Driven</h3>
              <p className="text-ink-600 dark:text-paper-400">
                The future of AI belongs to everyone. We build with and for the global community.
              </p>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <div className="text-center paper-card p-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <h2 className="text-3xl font-bold mb-4">Ready to build the future?</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Join us in building the infrastructure for open source SAFE superintelligence. 
            Every contribution matters in shaping how AI will serve humanity.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/products" className="btn-primary">
              Explore Our Products
            </Link>
            <a 
              href="https://github.com/framersai" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-secondary"
            >
              Start Contributing
            </a>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}