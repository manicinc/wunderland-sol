import { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/markdown';
import { getAllJobs } from '@/lib/markdown';
import { locales, defaultLocale } from '@/i18n';

const baseUrl = 'https://agentos.sh';

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const jobs = getAllJobs();

  // Static pages with their priorities
  const staticPages = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/blog', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/docs', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/faq', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/careers', priority: 0.6, changeFrequency: 'weekly' as const },
    { path: '/legal/terms', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/legal/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
  ];

  // Generate URLs for all locales for static pages
  const staticUrls: MetadataRoute.Sitemap = staticPages.flatMap((page) =>
    locales.map((locale) => ({
      url: locale === defaultLocale 
        ? `${baseUrl}${page.path}` 
        : `${baseUrl}/${locale}${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    }))
  );

  // Generate URLs for blog posts across all locales
  const blogUrls: MetadataRoute.Sitemap = posts.flatMap((post) =>
    locales.map((locale) => ({
      url: locale === defaultLocale
        ? `${baseUrl}/blog/${post.slug}`
        : `${baseUrl}/${locale}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  );

  // Generate URLs for career pages across all locales
  const careerUrls: MetadataRoute.Sitemap = jobs.flatMap((job) =>
    locales.map((locale) => ({
      url: locale === defaultLocale
        ? `${baseUrl}/careers/${job.slug}`
        : `${baseUrl}/${locale}/careers/${job.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  );

  return [...staticUrls, ...blogUrls, ...careerUrls];
}
