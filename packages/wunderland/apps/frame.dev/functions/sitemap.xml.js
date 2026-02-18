/**
 * Cloudflare Pages Function to serve domain-specific sitemaps
 *
 * - quarry.space → Serves quarry.space-specific sitemap with quarry.space URLs
 * - frame.dev → Serves the static sitemap.xml from public/
 *
 * This ensures each domain has its own proper sitemap for Google indexing.
 */

// Check if hostname is quarry.space domain
function isQuarryDomain(hostname) {
    return (
        hostname === 'quarry.space' ||
        hostname.endsWith('.quarry.space') ||
        hostname === 'quarry.dev' ||
        hostname.endsWith('.quarry.dev')
    )
}

// Quarry.space pages with their SEO metadata
// Note: On quarry.space, the middleware rewrites paths:
//   / → /quarry/landing (homepage)
//   /app/* → /quarry/* (app pages)
//   /about, /faq, etc. → /quarry/about, /quarry/faq (marketing pages)
const QUARRY_PAGES = [
    // Homepage and marketing pages (root level on quarry.space)
    { path: '/', priority: 1.0, changefreq: 'daily' },
    { path: '/landing', priority: 0.95, changefreq: 'weekly' },
    { path: '/about', priority: 0.8, changefreq: 'monthly' },
    { path: '/faq', priority: 0.8, changefreq: 'monthly' },
    { path: '/privacy', priority: 0.4, changefreq: 'yearly' },
    { path: '/waitlist', priority: 0.9, changefreq: 'weekly' },
    { path: '/architecture', priority: 0.8, changefreq: 'monthly' },
    { path: '/api', priority: 0.75, changefreq: 'monthly' },
    { path: '/api-docs', priority: 0.7, changefreq: 'monthly' },
    { path: '/api-playground', priority: 0.65, changefreq: 'monthly' },
    { path: '/self-host', priority: 0.75, changefreq: 'monthly' },
    { path: '/changelog', priority: 0.7, changefreq: 'weekly' },
    { path: '/templates', priority: 0.75, changefreq: 'weekly' },

    // App pages (under /app/ on quarry.space, rewritten from /quarry/)
    { path: '/app', priority: 0.9, changefreq: 'daily' },
    { path: '/app/write', priority: 0.85, changefreq: 'daily' },
    { path: '/app/browse', priority: 0.85, changefreq: 'daily' },
    { path: '/app/search', priority: 0.9, changefreq: 'daily' },
    { path: '/app/dashboard', priority: 0.85, changefreq: 'daily' },
    { path: '/app/graph', priority: 0.8, changefreq: 'weekly' },
    { path: '/app/plan', priority: 0.8, changefreq: 'daily' },
    { path: '/app/reflect', priority: 0.7, changefreq: 'weekly' },
    { path: '/app/focus', priority: 0.8, changefreq: 'weekly' },
    { path: '/app/learn', priority: 0.8, changefreq: 'weekly' },
    { path: '/app/spiral-path', priority: 0.75, changefreq: 'weekly' },
    { path: '/app/research', priority: 0.75, changefreq: 'weekly' },
    { path: '/app/suggestions', priority: 0.7, changefreq: 'weekly' },
    { path: '/app/collections', priority: 0.7, changefreq: 'weekly' },
    { path: '/app/tags', priority: 0.7, changefreq: 'weekly' },
    { path: '/app/supertags', priority: 0.7, changefreq: 'weekly' },
    { path: '/app/atlas', priority: 0.7, changefreq: 'weekly' },
    { path: '/app/plugins', priority: 0.65, changefreq: 'monthly' },
    { path: '/app/analytics', priority: 0.6, changefreq: 'daily' },
    { path: '/app/activity', priority: 0.6, changefreq: 'daily' },
    { path: '/app/evolution', priority: 0.7, changefreq: 'weekly' },
    { path: '/app/new', priority: 0.7, changefreq: 'weekly' },
]

function generateQuarrySitemap() {
    const now = new Date().toISOString()

    const urls = QUARRY_PAGES.map(page => `
  <url>
    <loc>https://quarry.space${page.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('')

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`
}

export async function onRequest(context) {
    const { request, env, next } = context
    const url = new URL(request.url)
    const hostname = url.hostname

    // If on quarry.space domain, generate quarry.space sitemap
    if (isQuarryDomain(hostname)) {
        const sitemap = generateQuarrySitemap()
        return new Response(sitemap, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600',
            },
        })
    }

    // For frame.dev, serve the static sitemap.xml
    url.pathname = '/sitemap.xml'

    try {
        // Try to get the static asset from the asset server
        const response = await context.env.ASSETS.fetch(url.toString())

        if (response.ok) {
            // Return with proper XML content type
            return new Response(response.body, {
                status: 200,
                headers: {
                    'Content-Type': 'application/xml; charset=utf-8',
                    'Cache-Control': 'public, max-age=3600',
                },
            })
        }
    } catch (e) {
        // Fall through to next handler
    }

    // If we can't find the static sitemap, continue to next handler
    return next()
}
