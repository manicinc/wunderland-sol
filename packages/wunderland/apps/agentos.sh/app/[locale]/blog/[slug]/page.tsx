import { getAllPosts, getPostBySlug } from '@/lib/markdown';
import ReactMarkdown from 'react-markdown';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { ChevronLeft, Clock, User, Calendar, Tag, ExternalLink, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { locales } from '@/i18n';

interface Props {
  params: {
    locale: string;
    slug: string;
  };
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  // Generate paths for every supported locale and every post
  return locales.flatMap((locale) =>
    posts.map((post) => ({
      locale,
      slug: post.slug,
    }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPostBySlug(params.slug);
  if (!post) return {};

  return {
    title: `${post.title} | AgentOS Blog`,
    description: post.excerpt,
    keywords: [
      'AgentOS',
      'AI agents',
      'adaptive AI',
      'emergent intelligence',
      'TypeScript AI',
      post.category || 'AI Development',
      ...(post.tags || []),
    ],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author || 'AgentOS Team'],
      tags: post.tags,
    },
  };
}

// Extract headings from markdown content for TOC
function extractHeadings(content: string): { id: string; text: string; level: number }[] {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const headings: { id: string; text: string; level: number }[] = [];
  let match;
  
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    headings.push({ id, text, level });
  }
  
  return headings;
}

// Get related posts based on category or tags
function getRelatedPosts(currentSlug: string, category?: string, tags?: string[], limit = 3) {
  const allPosts = getAllPosts();
  return allPosts
    .filter((post) => {
      if (post.slug === currentSlug) return false;
      if (category && post.category === category) return true;
      if (tags && post.tags?.some((tag: string) => tags.includes(tag))) return true;
      return false;
    })
    .slice(0, limit);
}

export default function BlogPostPage({ params }: Props) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const headings = extractHeadings(post.content);
  const relatedPosts = getRelatedPosts(params.slug, post.category, post.tags);
  const readingTime = Math.ceil(post.content.split(/\s+/).length / 200);

  // Article structured data for SEO
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || '',
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Person',
      name: post.author || 'AgentOS Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'AgentOS',
      url: 'https://agentos.sh',
      logo: {
        '@type': 'ImageObject',
        url: 'https://agentos.sh/og-image.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://agentos.sh/${params.locale}/blog/${params.slug}`,
    },
    image: post.image || 'https://agentos.sh/og-image.png',
    articleSection: post.category || 'Technology',
    keywords: post.tags?.join(', ') || 'AI, AgentOS',
    wordCount: post.content.split(/\s+/).length,
    timeRequired: `PT${readingTime}M`,
  };

  // BreadcrumbList for navigation
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://agentos.sh',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `https://agentos.sh/${params.locale}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `https://agentos.sh/${params.locale}/blog/${params.slug}`,
      },
    ],
  };

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 bg-[var(--color-background-primary)]">
      {/* Article JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_280px] gap-8">
          {/* Main Content */}
          <article className="max-w-3xl">
            {/* Back Link */}
            <Link 
              href={`/${params.locale}/blog`}
              className="inline-flex items-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent-primary)] mb-8 transition-colors group"
            >
              <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
              Back to Blog
            </Link>

            {/* Article Header */}
            <header className="mb-10">
              {/* Metadata Row */}
              <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] font-medium border border-[var(--color-accent-primary)]/20">
                  <Tag className="w-3 h-3" />
                  {post.category || 'Update'}
                </span>
                <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                  <Calendar className="w-4 h-4" />
                  {new Date(post.date).toLocaleDateString(params.locale, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                  <Clock className="w-4 h-4" />
                  {readingTime} min read
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--color-text-primary)] leading-tight mb-6">
                {post.title}
              </h1>

              {/* Author */}
              {post.author && (
                <div className="flex items-center gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] flex items-center justify-center text-white font-bold">
                    {post.author.charAt(0)}
                  </div>
                  <div>
                    <span className="flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
                      <User className="w-3 h-3" />
                      Written by
                    </span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{post.author}</span>
                  </div>
                </div>
              )}
            </header>

            {/* Article Body */}
            <div className="prose prose-lg max-w-none
              prose-headings:text-[var(--color-text-primary)] prose-headings:font-bold prose-headings:scroll-mt-24
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-[var(--color-border-subtle)]
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:text-[var(--color-text-secondary)] prose-p:leading-relaxed
              prose-a:text-[var(--color-accent-primary)] prose-a:no-underline prose-a:font-medium hover:prose-a:underline
              prose-strong:text-[var(--color-text-primary)] prose-strong:font-semibold
              prose-code:text-[var(--color-accent-primary)] prose-code:bg-[var(--color-background-secondary)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-[''] prose-code:after:content-['']
              prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-[var(--color-border-subtle)] prose-pre:rounded-xl prose-pre:shadow-lg
              prose-ul:text-[var(--color-text-secondary)]
              prose-ol:text-[var(--color-text-secondary)]
              prose-li:marker:text-[var(--color-accent-primary)]
              prose-blockquote:border-l-[var(--color-accent-primary)] prose-blockquote:bg-[var(--color-background-secondary)] prose-blockquote:rounded-r-lg prose-blockquote:py-1
              prose-img:rounded-xl prose-img:shadow-lg
              dark:prose-invert
            ">
              <ReactMarkdown
                components={{
                  a: ({ href, children, ...props }) => {
                    const isExternal = href?.startsWith('http');
                    return (
                      <a
                        href={href}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        className="inline-flex items-center gap-1"
                        {...props}
                      >
                        {children}
                        {isExternal && <ExternalLink className="w-3 h-3 inline" />}
                      </a>
                    );
                  },
                  h2: ({ children, ...props }) => {
                    const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    return <h2 id={id} {...props}>{children}</h2>;
                  },
                  h3: ({ children, ...props }) => {
                    const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    return <h3 id={id} {...props}>{children}</h3>;
                  },
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-10 pt-6 border-t border-[var(--color-border-subtle)]">
                <span className="text-sm font-medium text-[var(--color-text-muted)] mb-3 block">Tags</span>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-xs font-medium bg-[var(--color-background-secondary)] text-[var(--color-text-secondary)] rounded-full border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)] transition-colors cursor-default"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start space-y-6">
            {/* Table of Contents */}
            {headings.length > 0 && (
              <nav className="holographic-card p-5">
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-4 text-sm uppercase tracking-wider">
                  On This Page
                </h3>
                <ul className="space-y-2">
                  {headings.map((heading) => (
                    <li key={heading.id}>
                      <a
                        href={`#${heading.id}`}
                        className={`text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent-primary)] transition-colors block py-1 ${
                          heading.level === 3 ? 'pl-4' : ''
                        }`}
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="holographic-card p-5">
                <h3 className="font-semibold text-[var(--color-text-primary)] mb-4 text-sm uppercase tracking-wider">
                  Related Posts
                </h3>
                <ul className="space-y-4">
                  {relatedPosts.map((relatedPost) => (
                    <li key={relatedPost.slug}>
                      <Link
                        href={`/${params.locale}/blog/${relatedPost.slug}`}
                        className="group block"
                      >
                        <span className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors line-clamp-2">
                          {relatedPost.title}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mt-1">
                          Read more <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA Card */}
            <div className="holographic-card p-5 text-center">
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">
                Build with AgentOS
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                Start building adaptive AI agents today.
              </p>
              <a
                href="https://github.com/framersai/agentos"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-semibold bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white rounded-lg shadow-lg hover:shadow-xl hover:brightness-110 transition-all"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
