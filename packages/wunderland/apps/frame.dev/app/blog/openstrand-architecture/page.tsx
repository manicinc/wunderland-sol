import type { Metadata } from 'next'
import PageLayout from '@/components/page-layout'
import Link from 'next/link'
import { Calendar, Clock, ArrowLeft, Network, ShieldCheck, Layers3, Zap } from 'lucide-react'
import { getBlogPost, getRelatedPosts } from '@/lib/blogPosts'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Understanding OpenStrand Architecture – Frame.dev',
  description:
    'Deep dive into OpenStrand, the distributed substrate behind Quarry Codex, AI agents, and superintelligence across the Frame.dev ecosystem.',
}

export default function OpenStrandArchitecturePage() {
  const post = getBlogPost('openstrand-architecture')
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
          <h1 className="text-5xl font-bold mb-6 heading-gradient">{post.title}</h1>
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
            OpenStrand is the connective tissue behind every Frame operating system. It is a distributed substrate that
            keeps data consistent, enforces security guarantees, and allows developers to extend the platform without
            reinventing the wheel.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">Why OpenStrand Matters</h2>
          <p>
            Traditional knowledge systems force a choice between human readability and machine parsability.
            OpenStrand eliminates this trade-off by adding an invisible intelligence layer to standard Markdown.
            Every piece of content—a Strand—carries YAML frontmatter with typed semantic relationships
            (requires, extends, contradicts), LLM instructions for traversal and citation, and metadata
            that enables semantic search.
          </p>
          <p className="mt-4">
            The result: your documentation becomes a queryable knowledge graph where AI agents can answer
            questions with sourced citations. Unlike proprietary formats, OpenStrand is Git-native—every
            change is versioned, every relationship is auditable, and your knowledge remains portable.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">Design Principles</h2>
          <p>
            We designed OpenStrand for a world where personal, home, and enterprise systems need to collaborate in real
            time while respecting privacy boundaries. Four principles guided the architecture:
          </p>
          <ul className="space-y-3 my-6">
            <li className="flex items-start gap-3">
              <span className="text-frame-green mt-1">•</span>
              <span>
                <strong>Event First:</strong> Every interaction is an event that can be replayed, audited, and routed to the
                right subsystem.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-frame-green mt-1">•</span>
              <span>
                <strong>Zero Trust:</strong> Security boundaries are explicit; components authenticate every message before
                acting.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-frame-green mt-1">•</span>
              <span>
                <strong>Extensible by Default:</strong> Developers can attach new processors, adapters, or data sinks without
                forking core systems.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-frame-green mt-1">•</span>
              <span>
                <strong>Deterministic State:</strong> Federated state machines ensure that replicas converge even when
                networks partition.
              </span>
            </li>
          </ul>

          <div className="grid gap-6 my-8 md:grid-cols-2">
            <div className="paper-card p-6">
              <Network className="w-6 h-6 text-frame-green mb-3" />
              <h3 className="text-xl font-bold mb-2">Event Bus</h3>
              <p>
                A high-throughput event bus coordinates messages between AgentOS, WorkOS, and external services. Subscribers
                can apply custom logic with latency budgets under 20ms.
              </p>
            </div>
            <div className="paper-card p-6">
              <ShieldCheck className="w-6 h-6 text-frame-green mb-3" />
              <h3 className="text-xl font-bold mb-2">Secure Envelope</h3>
              <p>
                Every payload is wrapped in an encrypted envelope with per-tenant signing keys. Policies can redact or
                transform messages at the edge.
              </p>
            </div>
            <div className="paper-card p-6">
              <Layers3 className="w-6 h-6 text-frame-green mb-3" />
              <h3 className="text-xl font-bold mb-2">State Mesh</h3>
              <p>
                CRDT-inspired synchronization keeps shared knowledge bases consistent while allowing each OS to cache and
                mutate local context safely.
              </p>
            </div>
            <div className="paper-card p-6">
              <Zap className="w-6 h-6 text-frame-green mb-3" />
              <h3 className="text-xl font-bold mb-2">Extensibility Hooks</h3>
              <p>
                Developers can register hooks to stream events into analytics pipelines, trigger automations, or integrate
                with existing infrastructure.
              </p>
            </div>
          </div>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">How Developers Extend OpenStrand</h2>
          <p>
            The OpenStrand SDK offers strongly typed bindings for TypeScript, Python, and Rust. You can publish custom
            services that listen for events, enrich them, and emit outcomes back into the mesh. Access control is handled by
            reusable policies so you can focus on business logic.
          </p>

          <p>
            We’re already seeing partners build automation bridges, domain-specific knowledge bases, and even hardware
            integrations on top of OpenStrand. Whether you’re orchestrating a fleet of devices or embedding AI copilots in
            enterprise workflows, the substrate is ready for you.
          </p>
        </div>

        <div className="mt-12 p-6 bg-frame-green/5 rounded-lg border-l-4 border-frame-green">
          <p className="font-semibold mb-2">Explore the OpenStrand Stack</p>
          <p>
            Dive into reference implementations on{' '}
            <a href="https://github.com/framersai" className="text-frame-green hover:underline">
              GitHub
            </a>{' '}
            and join the architecture office hours in our{' '}
            <a href="https://discord.gg/VXXC4SJMKh" className="text-frame-green hover:underline">
              Discord
            </a>
            .
          </p>
        </div>

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
                <p className="text-sm text-ink-600 dark:text-paper-400 mb-3">{related.excerpt}</p>
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

