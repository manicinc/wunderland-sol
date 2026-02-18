import type { Metadata } from 'next'
import PageLayout from '@/components/page-layout'
import Link from 'next/link'
import { Calendar, Clock, ArrowRight } from 'lucide-react'
import { blogPosts } from '@/lib/blogPosts'

export const metadata: Metadata = {
  title: 'Frame.dev Blog – AI Infrastructure, Agents, and Superintelligence',
  description:
    'Latest updates and deep dives from the Frame (framersai) team on AI infrastructure, Quarry Codex, OpenStrand, agentic AI, and superintelligence.',
}

export default function BlogPage() {
  const featuredPosts = blogPosts.filter((post) => post.featured)
  const otherPosts = blogPosts
    .filter((post) => !post.featured)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <PageLayout>
      <div className="container mx-auto px-4 max-w-4xl pt-20 pb-20">
        <h1 className="text-5xl font-bold mb-12 heading-gradient">Blog</h1>
        
        {/* Featured Post */}
        {featuredPosts.map(post => (
          <div key={post.slug} className="mb-12">
            <div className="paper-card-lifted p-8 bg-gradient-to-br from-paper-100/50 to-paper-50/50 dark:from-ink-800/50 dark:to-ink-900/50">
              <span className="inline-block px-3 py-1 bg-frame-green text-white text-xs font-semibold rounded-full mb-4">
                Featured
              </span>
              <h2 className="text-3xl font-bold mb-4 heading-display">
                <Link href={`/blog/${post.slug}`} className="hover:text-frame-green transition-colors">
                  {post.title}
                </Link>
              </h2>
              <p className="text-lg body-text mb-4">
                {post.excerpt}
              </p>
              <div className="flex items-center gap-4 text-sm text-ink-600 dark:text-paper-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(post.date).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {post.readTime}
                </span>
                <span>By {post.author}</span>
              </div>
              <Link 
                href={`/blog/${post.slug}`} 
                className="inline-flex items-center gap-2 mt-6 text-frame-green font-semibold hover:underline"
              >
                Read more
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}

        {/* Other Posts */}
        <div className="space-y-8">
          {otherPosts.map(post => (
            <article key={post.slug} className="paper-card p-6">
              <h2 className="text-2xl font-bold mb-3">
                <Link href={`/blog/${post.slug}`} className="hover:text-frame-green transition-colors">
                  {post.title}
                </Link>
              </h2>
              <p className="body-text mb-4">
                {post.excerpt}
              </p>
              <div className="flex items-center gap-4 text-sm text-ink-600 dark:text-paper-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(post.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {post.readTime}
                </span>
              </div>
            </article>
          ))}
        </div>

        {/* Newsletter Section */}
        <div className="mt-16 paper-card p-8 bg-gradient-to-br from-frame-green/5 to-frame-green-dark/5">
          <h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
          <p className="body-text mb-6">
            Get the latest updates on Frame development, new OS releases, and insights from our team.
          </p>
          <div className="flex gap-3">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="flex-1 px-4 py-2 rounded-lg border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 focus:outline-none focus:ring-2 focus:ring-frame-green"
            />
            <button className="btn-primary">
              Subscribe
            </button>
          </div>
          <p className="text-xs text-ink-500 dark:text-paper-500 mt-3">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </div>
      </div>
    </PageLayout>
  )
}