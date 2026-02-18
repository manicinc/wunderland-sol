'use client'

import { useEffect } from 'react'
import { FRAME_BASE_URL } from '@/lib/seo'
import type { BlogPostMeta } from '@/lib/blogPosts'

interface BlogArticleWrapperProps {
  post: BlogPostMeta
  children: React.ReactNode
}

/**
 * BlogArticleWrapper
 * 
 * Wraps blog post content with:
 * - Article JSON-LD structured data for SEO
 * - Breadcrumb JSON-LD
 * - Proper semantic HTML structure
 */
export function BlogArticleWrapper({ post, children }: BlogArticleWrapperProps) {
  const articleUrl = `${FRAME_BASE_URL}/blog/${post.slug}`
  const ogImage = `${FRAME_BASE_URL}/og-image.png`
  
  // Generate Article JSON-LD
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${articleUrl}#article`,
    headline: post.title,
    description: post.description || post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Organization',
      '@id': `${FRAME_BASE_URL}#organization`,
      name: 'FramersAI',
      alternateName: ['Frame.dev', 'framersai'],
      url: FRAME_BASE_URL,
      email: 'team@frame.dev',
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${FRAME_BASE_URL}#organization`,
      name: 'FramersAI',
      alternateName: ['Frame.dev', 'framersai'],
      url: FRAME_BASE_URL,
      email: 'team@frame.dev',
      logo: {
        '@type': 'ImageObject',
        url: `${FRAME_BASE_URL}/frame-logo-transparent.png`,
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    image: {
      '@type': 'ImageObject',
      url: ogImage,
      width: 1200,
      height: 630,
    },
    articleSection: 'Technology',
    wordCount: estimateWordCount(post.readTime),
    timeRequired: `PT${parseReadTime(post.readTime)}M`,
    isAccessibleForFree: true,
    isPartOf: {
      '@type': 'Blog',
      '@id': `${FRAME_BASE_URL}/blog#blog`,
      name: 'Frame.dev Blog',
      url: `${FRAME_BASE_URL}/blog`,
    },
  }
  
  // Generate Breadcrumb JSON-LD
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${articleUrl}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Frame.dev',
        item: FRAME_BASE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${FRAME_BASE_URL}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: articleUrl,
      },
    ],
  }
  
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {children}
    </>
  )
}

/**
 * Estimate word count from read time string
 * Assumes ~200 words per minute reading speed
 */
function estimateWordCount(readTime: string): number {
  const minutes = parseReadTime(readTime)
  return minutes * 200
}

/**
 * Parse read time string to minutes
 */
function parseReadTime(readTime: string): number {
  const match = readTime.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 5
}

/**
 * Generate blog post metadata for Next.js
 */
export function generateBlogPostMetadata(post: BlogPostMeta) {
  const articleUrl = `${FRAME_BASE_URL}/blog/${post.slug}`
  const ogImage = `${FRAME_BASE_URL}/og-image.png`
  
  return {
    title: `${post.title} | Quarry Blog`,
    description: post.description || post.excerpt,
    keywords: [
      'automatic second brain',
      'Quarry',
      'Quarry.space',
      'quarry space',
      'Frame.dev',
      'framersai',
      'FramersAI',
      'Quarry blog',
      'free pkm',
      'open source notetaking',
      post.slug.replace(/-/g, ' '),
      'AI notes',
      'PKM blog',
    ],
    authors: [{ name: 'FramersAI', url: FRAME_BASE_URL }],
    creator: 'FramersAI (team@frame.dev)',
    publisher: 'Frame.dev',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large' as const,
      },
    },
    openGraph: {
      type: 'article' as const,
      title: post.title,
      description: post.description || post.excerpt,
      url: articleUrl,
      siteName: 'Frame.dev',
      publishedTime: post.date,
      modifiedTime: post.date,
      authors: ['Frame.dev'],
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image' as const,
      site: '@framersai',
      creator: '@framersai',
      title: post.title,
      description: post.excerpt,
      images: [ogImage],
    },
    alternates: {
      canonical: articleUrl,
    },
  }
}

export default BlogArticleWrapper



