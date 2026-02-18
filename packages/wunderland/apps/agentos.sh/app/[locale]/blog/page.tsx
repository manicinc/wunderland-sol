import Link from 'next/link';
import { getAllPosts } from '@/lib/markdown';
import { Metadata } from 'next';
import { Calendar, Clock, ArrowRight, Tag } from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'AgentOS Blog - News & Insights on Adaptive AI Agents',
    description: 'Latest news, updates, and insights about AgentOS, AI agents, multi-agent orchestration, and building adaptive intelligence systems.',
    keywords: [
      'AgentOS blog',
      'AI agents',
      'adaptive AI',
      'emergent intelligence',
      'multi-agent systems',
      'TypeScript AI',
      'AI development',
      'machine learning news',
    ],
    openGraph: {
      title: 'AgentOS Blog',
      description: 'Latest news, updates, and insights about AgentOS, AI agents, and multi-agent orchestration.',
      type: 'website',
    },
  };
}

export default async function BlogPage({ params: { locale } }: { params: { locale: string } }) {
  const posts = getAllPosts();

  // Get featured post (first post) and rest
  const [featuredPost, ...otherPosts] = posts;

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 bg-[var(--color-background-primary)]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-4">
            News & Insights
          </h1>
          <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Updates from the AgentOS team on the future of adaptive AI, multi-agent systems, and open source development.
          </p>
        </header>

        {/* Featured Post */}
        {featuredPost && (
          <section className="mb-16">
            <Link
              href={`/${locale}/blog/${featuredPost.slug}`}
              className="group block"
            >
              <article className="holographic-card overflow-hidden">
                <div className="grid md:grid-cols-2 gap-0">
                  {/* Image/Placeholder */}
                  <div className="relative h-64 md:h-full min-h-[300px] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent-primary)]/20 to-[var(--color-accent-secondary)]/20 flex items-center justify-center">
                      <span className="text-6xl font-bold opacity-10 text-[var(--color-text-primary)]">AgentOS</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-accent-primary)] text-white text-xs font-semibold">
                        Featured
                      </span>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-8 flex flex-col justify-center">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] text-xs font-semibold border border-[var(--color-accent-primary)]/20">
                        <Tag className="w-3 h-3" />
                        {featuredPost.category || 'Update'}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                        <Calendar className="w-3 h-3" />
                        {new Date(featuredPost.date).toLocaleDateString(locale, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                        <Clock className="w-3 h-3" />
                        {Math.ceil(featuredPost.content?.split(/\s+/).length / 200 || 5)} min read
                      </span>
                    </div>
                    
                    <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] mb-4 group-hover:text-[var(--color-accent-primary)] transition-colors">
                      {featuredPost.title}
                    </h2>
                    
                    <p className="text-[var(--color-text-secondary)] mb-6 line-clamp-3">
                      {featuredPost.excerpt}
                    </p>
                    
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-accent-primary)] group-hover:gap-3 transition-all">
                      Read article
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          </section>
        )}

        {/* All Posts Grid */}
        {otherPosts.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-8">
              All Articles
            </h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {otherPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/${locale}/blog/${post.slug}`}
                  className="group block h-full"
                >
                  <article className="holographic-card h-full overflow-hidden flex flex-col">
                    {/* Image placeholder */}
                    <div className="relative h-48 overflow-hidden border-b border-[var(--color-border-subtle)]">
                      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent-primary)]/10 to-[var(--color-accent-secondary)]/10 flex items-center justify-center">
                        <span className="text-4xl font-bold opacity-10 text-[var(--color-text-primary)]">AgentOS</span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    </div>
                    
                    {/* Content */}
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] text-xs font-semibold border border-[var(--color-accent-primary)]/20">
                          <Tag className="w-3 h-3" />
                          {post.category || 'Update'}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {new Date(post.date).toLocaleDateString(locale, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-3 group-hover:text-[var(--color-accent-primary)] transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      
                      <p className="text-sm text-[var(--color-text-secondary)] line-clamp-3 mb-4 flex-1">
                        {post.excerpt}
                      </p>
                      
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-accent-primary)] group-hover:gap-3 transition-all">
                        Read more
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {posts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[var(--color-text-muted)] text-lg">
              No posts yet. Check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
