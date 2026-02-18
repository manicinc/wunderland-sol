'use client'

import Link from 'next/link'
import { ArrowRight, BookOpen, Code2, FileText, Layers } from 'lucide-react'
import { blogPosts } from '@/lib/blogPosts'

interface RelatedLink {
  title: string
  href: string
  description?: string
  icon?: React.ReactNode
}

interface RelatedContentProps {
  /** Current page path to exclude from suggestions */
  currentPath?: string
  /** Type of content for contextual suggestions */
  contentType?: 'blog' | 'quarry' | 'docs' | 'general'
  /** Maximum number of items to show */
  maxItems?: number
  /** Optional custom links to show */
  customLinks?: RelatedLink[]
  /** Show as compact inline links */
  compact?: boolean
}

// Default related links by content type
const quarryRelatedLinks: RelatedLink[] = [
  {
    title: 'Quarry Architecture',
    href: '/quarry/architecture',
    description: 'Learn about the OpenStrand protocol and Fabric hierarchy',
    icon: <Layers className="w-4 h-4" />,
  },
  {
    title: 'Self-Hosting Guide',
    href: '/quarry/self-host',
    description: 'Deploy Quarry on your own infrastructure',
    icon: <Code2 className="w-4 h-4" />,
  },
  {
    title: 'API Documentation',
    href: '/quarry/api-docs',
    description: 'Build integrations with the Quarry API',
    icon: <FileText className="w-4 h-4" />,
  },
]

const blogRelatedLinks: RelatedLink[] = [
  {
    title: 'About Frame.dev',
    href: '/about',
    description: 'Learn about our mission for open source AI',
    icon: <BookOpen className="w-4 h-4" />,
  },
  {
    title: 'Try Quarry Free',
    href: '/quarry/app',
    description: 'Start using Quarry with no signup required',
    icon: <Code2 className="w-4 h-4" />,
  },
]

/**
 * Related Content Component
 * 
 * Displays contextual internal links for better SEO and user navigation.
 * Automatically suggests relevant content based on the current page type.
 */
export function RelatedContent({
  currentPath = '',
  contentType = 'general',
  maxItems = 3,
  customLinks,
  compact = false,
}: RelatedContentProps) {
  // Get recent blog posts for blog-related pages
  const recentBlogPosts = blogPosts
    .filter((post) => `/blog/${post.slug}` !== currentPath)
    .slice(0, 2)
    .map((post) => ({
      title: post.title,
      href: `/blog/${post.slug}`,
      description: post.excerpt.slice(0, 80) + '...',
      icon: <FileText className="w-4 h-4" />,
    }))

  // Select links based on content type
  let links: RelatedLink[] = customLinks || []

  if (!customLinks) {
    switch (contentType) {
      case 'blog':
        links = [...blogRelatedLinks, ...quarryRelatedLinks.slice(0, 1)]
        break
      case 'quarry':
        links = [...quarryRelatedLinks, ...recentBlogPosts.slice(0, 1)]
        break
      case 'docs':
        links = quarryRelatedLinks
        break
      default:
        links = [...recentBlogPosts, ...quarryRelatedLinks.slice(0, 1)]
    }
  }

  // Filter out current path and limit
  links = links.filter((link) => link.href !== currentPath).slice(0, maxItems)

  if (links.length === 0) return null

  if (compact) {
    return (
      <nav aria-label="Related content" className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-frame-green/10 hover:text-frame-green transition-colors"
          >
            {link.icon}
            {link.title}
          </Link>
        ))}
      </nav>
    )
  }

  return (
    <section aria-label="Related content" className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Related Content
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-frame-green/50 hover:bg-frame-green/5 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:bg-frame-green/10 group-hover:text-frame-green transition-colors">
                {link.icon || <FileText className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-frame-green transition-colors">
                  {link.title}
                </h3>
                {link.description && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {link.description}
                  </p>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-frame-green group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

/**
 * Breadcrumb Component with JSON-LD
 * 
 * Renders breadcrumb navigation with structured data for SEO.
 */
interface BreadcrumbItem {
  name: string
  href: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  const baseUrl = 'https://frame.dev'
  
  // Generate JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.href.startsWith('http') ? item.href : `${baseUrl}${item.href}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className={`text-sm ${className}`}>
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((item, index) => (
            <li key={item.href} className="flex items-center gap-1.5">
              {index > 0 && (
                <span className="text-gray-400 dark:text-gray-600" aria-hidden="true">
                  /
                </span>
              )}
              {index === items.length - 1 ? (
                <span className="text-gray-600 dark:text-gray-400" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-gray-500 dark:text-gray-500 hover:text-frame-green transition-colors"
                >
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}

export default RelatedContent



