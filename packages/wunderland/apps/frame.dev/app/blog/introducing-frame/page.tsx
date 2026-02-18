import type { Metadata } from 'next'
import PageLayout from '@/components/page-layout'
import Link from 'next/link'
import { Calendar, Clock, ArrowLeft, Github, ExternalLink } from 'lucide-react'
import { getBlogPost, getRelatedPosts } from '@/lib/blogPosts'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Introducing Frame.dev – The OS for Humans and the Codex of Humanity',
  description:
    'Discover how Frame.dev unifies AgentOS, Quarry Codex, and OpenStrand to denoise the web and build AI infrastructure for agents, knowledge graphs, and superintelligence.',
}

export default function IntroducingFramePage() {
  const post = getBlogPost('introducing-frame')
  if (!post) {
    notFound()
  }
  const relatedPosts = getRelatedPosts(post.slug)

  return (
    <PageLayout>
      <article className="container mx-auto px-4 max-w-3xl pt-20 pb-20">
        <Link href="/blog" className="inline-flex items-center gap-2 text-frame-green hover:underline mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to blog
        </Link>

        <header className="mb-12">
          <h1 className="text-5xl font-bold mb-6 heading-gradient">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-ink-600 dark:text-paper-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(post.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {post.readTime}
            </span>
            <span>By {post.author}</span>
          </div>
        </header>

        <div className="prose prose-lg dark:prose-invert max-w-none body-text">
          <p className="text-xl font-medium mb-8">
            Today, we're thrilled to announce Frame—a revolutionary suite of operating systems designed to organize, 
            simplify, and enhance every aspect of your digital existence. Frame isn't just another platform; it's a 
            fundamental reimagining of how we interact with technology in our daily lives.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">The Problem We're Solving</h2>
          
          <p>
            The modern digital experience is fragmented. We juggle dozens of apps, manage multiple identities, and 
            struggle to maintain control over our data. Our devices are powerful, but they lack the cohesion and 
            intelligence to truly serve as extensions of ourselves.
          </p>

          <p>
            Frame addresses this fragmentation by providing specialized operating systems for every domain of digital 
            life, all built on our revolutionary OpenStrand architecture that ensures seamless interoperability and 
            data sovereignty.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">The Frame Ecosystem</h2>

          <div className="grid gap-6 my-8">
            <div className="paper-card p-6">
              <h3 className="text-xl font-bold mb-3 text-frame-green">AgentOS</h3>
              <p>
                Our flagship product, now live. AgentOS is a production-ready runtime for AI agents, enabling developers 
                to deploy, manage, and orchestrate intelligent agents at scale. Built with TypeScript and supporting all 
                major AI providers.
              </p>
              <div className="flex gap-3 mt-4">
                <a href="https://agentos.sh" className="inline-flex items-center gap-1 text-frame-green hover:underline">
                  Visit site <ExternalLink className="w-3 h-3" />
                </a>
                <a href="https://github.com/framersai/agentos" className="inline-flex items-center gap-1 text-frame-green hover:underline">
                  View code <Github className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="paper-card p-6">
              <h3 className="text-xl font-bold mb-3">WebOS</h3>
              <p>
                Your OS interface for the web. A unified layer bridging Web 2.0 and Web 3.0 standards, 
                authentication systems, and protocols—providing a consistent interface for all web interactions.
              </p>
            </div>

            <div className="paper-card p-6">
              <h3 className="text-xl font-bold mb-3">HomeOS</h3>
              <p>
                All-in-one intelligent smart home. The complete platform with AI integrations and assistants 
                managing everything from security to comfort, energy to entertainment.
              </p>
            </div>

            <div className="paper-card p-6">
              <h3 className="text-xl font-bold mb-3">SafeOS</h3>
              <p>
                Digital trusted safe vault. Your secure digital vault for documents, identity monitoring, and 
                malware protection. Features automated signing, death switches, and dependent management intelligence.
              </p>
            </div>

            <div className="paper-card p-6">
              <h3 className="text-xl font-bold mb-3">WorkOS</h3>
              <p>
                CRM & work platform with AI agents. The complete work platform combining CRM, project management, 
                and AI agents. Built on AgentOS and OpenStrand for seamless enterprise automation.
              </p>
            </div>

            <div className="paper-card p-6">
              <h3 className="text-xl font-bold mb-3">MyOS</h3>
              <p>
                Your personalized virtual assistant. The central dashboard customized for you, managing all 
                Frame OS integrations, data sharing, and syncing across your digital life.
              </p>
            </div>
          </div>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">Built on OpenStrand</h2>

          <p>
            At the heart of Frame is OpenStrand, our distributed architecture that enables all Frame operating systems 
            to work together seamlessly. OpenStrand provides:
          </p>

          <ul className="space-y-3 my-6">
            <li className="flex items-start gap-3">
              <span className="text-frame-green mt-1">•</span>
              <span><strong>Event-driven message passing</strong> for real-time communication between OS layers</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-frame-green mt-1">•</span>
              <span><strong>Federated state management</strong> with distributed consensus</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-frame-green mt-1">•</span>
              <span><strong>Zero-trust security model</strong> with end-to-end encryption by default</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-frame-green mt-1">•</span>
              <span><strong>Infinite extensibility</strong> through a modular, plugin-based architecture</span>
            </li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">Open Source First</h2>

          <p>
            We believe the future of computing should be open and accessible to everyone. That's why all Frame projects 
            are open source, available under MIT or Apache 2.0 licenses. We're building in public and invite developers 
            worldwide to contribute to and build upon our work.
          </p>

          <p>
            Frame offers both Community and Enterprise editions, ensuring that individuals and small teams have full 
            access to core features while providing advanced capabilities and support for organizations deploying at scale.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">What's Next</h2>

          <p>
            AgentOS is live today, and we're actively developing the rest of the Frame ecosystem. Over the coming months, 
            we'll be releasing early access versions of our other operating systems and expanding the capabilities of 
            OpenStrand.
          </p>

          <p>
            We're also launching the Voice Chat Assistant Marketplace, where developers can share and monetize AI agents 
            compatible with AgentOS. This marketplace will become the hub for the next generation of AI applications.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">Join Us</h2>

          <p>
            Frame is more than a product—it's a movement to reclaim control over our digital lives. We're looking for 
            developers, designers, and dreamers who share our vision of a more organized, intelligent, and humane 
            digital future.
          </p>

          <div className="flex flex-wrap gap-4 mt-8">
            <a href="https://github.com/framersai" className="btn-primary flex items-center gap-2">
              <Github className="w-4 h-4" />
              Explore on GitHub
            </a>
            <a href="https://discord.gg/VXXC4SJMKh" className="btn-secondary">
              Join our Discord
            </a>
            <a href="mailto:team@frame.dev" className="btn-ghost">
              Contact Us
            </a>
          </div>

          <div className="mt-12 p-6 bg-frame-green/5 rounded-lg border-l-4 border-frame-green">
            <p className="font-semibold mb-2">Ready to get started?</p>
            <p>
              Visit <a href="https://agentos.sh" className="text-frame-green hover:underline">agentos.sh</a> to 
              try AgentOS today, or explore our{' '}
              <a href="https://github.com/framersai" className="text-frame-green hover:underline">GitHub repositories</a> to 
              see how we're building the future of computing.
            </p>
          </div>
        </div>

        {/* Related Posts */}
        <div className="mt-16 pt-8 border-t border-ink-200/20 dark:border-paper-200/10">
          <h2 className="text-2xl font-bold mb-6">Read Next</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {relatedPosts.map((related) => (
              <Link
                key={related.slug}
                href={`/blog/${related.slug}`}
                className="paper-card p-6 hover:shadow-lg transition-shadow group"
              >
                <h3 className="text-xl font-bold mb-2 group-hover:text-frame-green transition-colors">
                  {related.title}
                </h3>
                <p className="text-sm text-ink-600 dark:text-paper-400 mb-3">
                  {related.excerpt}
                </p>
                <span className="text-frame-green text-sm font-semibold inline-flex items-center gap-1">
                  Read more →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </article>
    </PageLayout>
  )
}
