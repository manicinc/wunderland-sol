import { MetadataRoute } from 'next'

/**
 * Robots.txt generation for Frame.dev
 * 
 * Allows all crawlers while disallowing private/internal paths.
 * Points to both frame.dev and quarry.space sitemaps.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/llms.txt', '/llms-full.txt'],
        disallow: [
          '/api/',
          '/_next/',
          '/private/',
          '/admin/',
          '/*.json$',
        ],
      },
      // Googlebot specific - allow max crawling
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      // AI/LLM crawlers - full access for GEO (Generative Engine Optimization)
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'anthropic-ai',
          'ClaudeBot',
          'Claude-Web',
          'PerplexityBot',
          'Bytespider',
          'cohere-ai',
        ],
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
    ],
    sitemap: [
      'https://frame.dev/sitemap.xml',
      'https://quarry.space/sitemap.xml',
    ],
    host: 'https://frame.dev',
  }
}
