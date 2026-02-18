import type { Metadata } from 'next'
import PageLayout from '@/components/page-layout'
import Link from 'next/link'
import { Calendar, Clock, ArrowLeft, Github, ExternalLink } from 'lucide-react'
import { getBlogPost, getRelatedPosts } from '@/lib/blogPosts'

export const metadata: Metadata = {
  title: 'Quarry: A Public Digital Garden for AI',
  description:
    'Why we built Quarry Codex as a structured knowledge repository instead of a traditional CMS, and how it serves as the perfect substrate for OpenStrand.',
}

export default function CodexDigitalGardenPage() {
  const post = getBlogPost('codex-digital-garden')
  const relatedPosts = getRelatedPosts('codex-digital-garden')

  if (!post) return null

  return (
    <PageLayout>
      <article className="container mx-auto px-4 max-w-3xl pt-20 pb-20">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-ink-600 dark:text-paper-400 hover:text-frame-green mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 heading-display">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-ink-600 dark:text-paper-400">
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

        {/* Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="lead">
            Quarry Codex started as a simple idea: what if we treated knowledge the same way developers treat code? 
            Version-controlled, peer-reviewed, openly accessible, and structured for machines to consume.
          </p>

          <h2>The Problem with Traditional CMSs</h2>
          <p>
            Most knowledge bases are built on CMSs designed for human readers. They have rich UIs, WYSIWYG editors, 
            and complex databases. But when you want to feed that knowledge to an LLM or build a RAG system, you hit walls:
          </p>
          <ul>
            <li><strong>Locked in databases</strong> – Content lives in MySQL/Postgres, not accessible via simple HTTP</li>
            <li><strong>No version control</strong> – Changes aren't tracked, no git history, no diffs</li>
            <li><strong>Opaque structure</strong> – Relationships between content are implicit, not machine-readable</li>
            <li><strong>Heavy infrastructure</strong> – Requires servers, auth, APIs just to read static content</li>
          </ul>

          <h2>Enter the Digital Garden</h2>
          <p>
            The "digital garden" movement treats content as living documents that grow and evolve over time. 
            Instead of polished blog posts frozen in time, you cultivate interconnected notes that improve continuously.
          </p>
          <p>
            Quarry Codex takes this concept and adds <strong>structure for AI consumption</strong>:
          </p>

          <h3>1. Git-Native</h3>
          <p>
            Every piece of content is a markdown file in a GitHub repo. This gives us:
          </p>
          <ul>
            <li>Full version history (who changed what, when, why)</li>
            <li>Pull request workflow (peer review before merge)</li>
            <li>Branch-based experimentation</li>
            <li>Distributed collaboration (fork, modify, PR)</li>
          </ul>

          <h3>2. Recursive Hierarchy</h3>
          <p>
            We organized content into <strong>Weaves → Looms → Strands</strong>:
          </p>
          <ul>
            <li><strong>Strand</strong>: Atomic knowledge unit (one .md file)</li>
            <li><strong>Loom</strong>: Curated collection (folder + loom.yaml manifest)</li>
            <li><strong>Weave</strong>: Complete universe (top-level folder + weave.yaml)</li>
            <li><strong>Fabric</strong>: The entire graph when all weaves are materialized together</li>
          </ul>
          <p>
            This isn't arbitrary. The three-tier structure maps perfectly to graph databases and enables 
            powerful algorithms (more on this in our <Link href="/blog/recursive-knowledge-schema">next post</Link>).
          </p>

          <h3>3. Machine-Readable Metadata</h3>
          <p>
            Every strand has YAML frontmatter with rich metadata:
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
{`---
id: uuid-here
slug: intro-to-recursion
title: "Introduction to Recursion"
difficulty: intermediate
taxonomy:
  subjects: [technology, knowledge]
  topics: [algorithms, computer-science]
tags: [recursion, algorithms, tutorial]
relationships:
  references: [other-strand-id]
  prerequisites: [basics-strand-id]
---`}
          </pre>
          <p>
            LLMs can parse this instantly. No API calls, no database queries, just raw text.
          </p>

          <h2>Why OpenStrand Loves This</h2>
          <p>
            <Link href="https://openstrand.ai" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
              OpenStrand <ExternalLink className="w-3 h-3" />
            </Link>
            {' '}is our personal knowledge management system. It ingests <em>any</em> file type 
            (PDFs, videos, code, images) and serializes them to markdown strands.
          </p>
          <p>
            Quarry Codex is the <strong>public subset</strong> of that knowledge. When you create a strand in OpenStrand, 
            you can choose to:
          </p>
          <ol>
            <li>Keep it private (local SQLite/PGlite)</li>
            <li>Share with team (self-hosted PostgreSQL)</li>
            <li>Publish to Quarry Codex (open PR to this repo)</li>
          </ol>
          <p>
            Same schema, same tooling, zero friction. Your personal notes can become humanity's knowledge with one click.
          </p>

          <h2>SQL Caching: The Secret Sauce</h2>
          <p>
            We index thousands of markdown files on every commit. Naively, this would take 30+ seconds. 
            We brought it down to 2-5 seconds using <strong>SQL-cached incremental indexing</strong>:
          </p>
          <ul>
            <li>Store SHA-256 hash of each file in <code>.cache/codex.db</code></li>
            <li>On next run, compute diff: only re-process changed files</li>
            <li>Cache persists in GitHub Actions via <code>actions/cache</code></li>
            <li>85-95% cache hit rate on typical PRs</li>
          </ul>
          <p>
            Read the full technical breakdown in our{' '}
            <Link href="/blog/sql-cache-nlp-indexing">SQL caching post</Link>.
          </p>

          <h2>Static NLP Pipeline</h2>
          <p>
            We auto-categorize content using TF-IDF, n-gram extraction, and vocabulary matching. 
            No LLM calls, no API keys, runs in CI for free:
          </p>
          <ul>
            <li><strong>TF-IDF</strong>: Extract important keywords per document</li>
            <li><strong>N-grams</strong>: Find common phrases (2-3 word sequences)</li>
            <li><strong>Vocabulary matching</strong>: Map to controlled taxonomy</li>
            <li><strong>Readability scoring</strong>: Flesch-Kincaid grade level</li>
          </ul>
          <p>
            Output: <code>codex-index.json</code> (searchable) and <code>codex-report.json</code> (analytics).
          </p>

          <h2>Try It Yourself</h2>
          <p>
            Quarry Codex is fully open source. You can:
          </p>
          <ul>
            <li>
              <Link href="/quarry">Browse the knowledge base</Link>
            </li>
            <li>
              <a href="https://github.com/framersai/codex" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                Fork the repo <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              <a href="https://github.com/framersai/quarry/blob/main/docs/contributing/how-to-submit.md" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                Submit your own strands <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              <a href="https://openstrand.ai" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                Use OpenStrand for private knowledge <ExternalLink className="w-3 h-3" />
              </a>
            </li>
          </ul>

          <div className="mt-12 p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <h3 className="text-xl font-bold mb-3">Next in Series</h3>
            <p className="mb-4">
              In our next post, we'll explore the mathematical elegance of recursive knowledge structures 
              and how they enable powerful graph algorithms.
            </p>
            <Link 
              href="/blog/recursive-knowledge-schema"
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold"
            >
              Read: Recursive Knowledge Schema →
            </Link>
          </div>
        </div>

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-16 pt-8 border-t border-ink-200 dark:border-paper-800">
            <h3 className="text-2xl font-bold mb-6">Related Posts</h3>
            <div className="grid gap-6 md:grid-cols-2">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.slug}
                  href={`/blog/${relatedPost.slug}`}
                  className="paper-card p-6 hover:shadow-xl transition-shadow"
                >
                  <h4 className="font-bold text-lg mb-2 text-ink-900 dark:text-paper-100">
                    {relatedPost.title}
                  </h4>
                  <p className="text-sm text-ink-600 dark:text-paper-400 mb-3">
                    {relatedPost.excerpt}
                  </p>
                  <span className="text-xs text-frame-green font-semibold">
                    Read more →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </PageLayout>
  )
}

