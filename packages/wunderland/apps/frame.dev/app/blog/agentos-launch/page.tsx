import type { Metadata } from 'next'
import PageLayout from '@/components/page-layout'
import Link from 'next/link'
import { Calendar, Clock, ArrowLeft, CheckCircle2, Server, Workflow, Rocket } from 'lucide-react'
import { getBlogPost, getRelatedPosts } from '@/lib/blogPosts'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'AgentOS is Now Live - Frame Blog',
  description:
    'Our production-ready runtime for AI agents is now available. Deploy, manage, and orchestrate AI agents at scale with TypeScript.',
}

export default function AgentOSLaunchPage() {
  const post = getBlogPost('agentos-launch')
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
            AgentOS is officially production-ready. What began as the runtime that powers Frame’s own agents is now
            available to every builder who needs reliable, observable agent infrastructure without giving up the comfort
            of TypeScript.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">Why AgentOS</h2>
          <p>
            Teams told us the same story again and again: they were stuck between brittle scripts and heavyweight
            platforms that made it difficult to experiment. AgentOS gives you the best of both worlds—a batteries-included
            orchestrator with the flexibility of plain code.
          </p>

          <div className="grid gap-6 my-8 md:grid-cols-2">
            <div className="paper-card p-6">
              <CheckCircle2 className="w-6 h-6 text-frame-green mb-3" />
              <h3 className="text-xl font-bold mb-2">TypeScript Native</h3>
              <p>
                Build agents with first-class TypeScript APIs, share business logic across the stack, and enjoy full editor
                inference—no DSLs or code generation required.
              </p>
            </div>
            <div className="paper-card p-6">
              <Server className="w-6 h-6 text-frame-green mb-3" />
              <h3 className="text-xl font-bold mb-2">Production Observability</h3>
              <p>
                Built-in tracing, structured logging, and replay tools make it easy to diagnose conversations, measure
                reliability, and satisfy compliance reviews.
              </p>
            </div>
            <div className="paper-card p-6">
              <Workflow className="w-6 h-6 text-frame-green mb-3" />
              <h3 className="text-xl font-bold mb-2">Workflow Orchestration</h3>
              <p>
                Compose tool-calling agents, background jobs, and human approval steps in one place. AgentOS handles
                scheduling, retries, and state hand-offs automatically.
              </p>
            </div>
            <div className="paper-card p-6">
              <Rocket className="w-6 h-6 text-frame-green mb-3" />
              <h3 className="text-xl font-bold mb-2">Provider Agnostic</h3>
              <p>
                Swap between OpenAI, Anthropic, local models, or your own endpoints with a consistent interface. Route
                traffic dynamically without redeploying.
              </p>
            </div>
          </div>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">What’s Included Today</h2>
          <ul className="space-y-3 my-6">
            <li className="flex items-start gap-3">
              <span className="text-frame-green mt-1">•</span>
              <span>
                <strong>Agent Runtime:</strong> Deterministic execution model with multi-turn memory, tool routing, and
                structured state so you can ship with confidence.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-frame-green mt-1">•</span>
              <span>
                <strong>Dev Server:</strong> Hot reload, transcript inspection, and fixture playback accelerate iteration.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-frame-green mt-1">•</span>
              <span>
                <strong>Deploy Hooks:</strong> Seamless integration with the Frame deploy pipeline plus adapters for
                serverless platforms and traditional infrastructure.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-frame-green mt-1">•</span>
              <span>
                <strong>Guardrails & Policies:</strong> Enforce per-request limits and cover compliance requirements with
                reusable policies.
              </span>
            </li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">Start Building</h2>
          <p>
            Install the SDK with <code>pnpm add @framers/agentos</code>, scaffold a project using the
            <code>create-agentos</code> CLI, and deploy directly from the monorepo. The documentation includes quick start
            guides, migration notes for existing bots, and best practices from teams already running AgentOS in production.
          </p>

          <p>
            We can’t wait to see what you build. Join the community Discord to swap patterns with other builders, and keep
            an eye on the marketplace for reusable agent templates launching soon.
          </p>
        </div>

        <div className="mt-12 p-6 bg-frame-green/5 rounded-lg border-l-4 border-frame-green">
          <p className="font-semibold mb-2">Build with AgentOS</p>
          <p>
            Explore the code on{' '}
            <a href="https://github.com/framersai/agentos" className="text-frame-green hover:underline">
              GitHub
            </a>{' '}
            or head to{' '}
            <a href="https://agentos.sh" className="text-frame-green hover:underline">
              agentos.sh
            </a>{' '}
            to launch your first agent in minutes.
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

