/**
 * Generate sitemap for frame.dev (includes Quarry pages under /quarry/*)
 * 
 * Since GitHub Pages can't redirect, we use frame.dev URLs as the primary authority.
 * Quarry.space pages are included with /quarry/* prefix.
 * 
 * Output: public/sitemap.xml - frame.dev URLs (serves both domains)
 */

const fs = require('fs')
const path = require('path')

// Blog posts (imported from the same source as sitemap.ts)
let blogPosts = []
try {
    const blogPostsPath = path.join(__dirname, '..', 'lib', 'blogPosts.ts')
    if (fs.existsSync(blogPostsPath)) {
        const content = fs.readFileSync(blogPostsPath, 'utf-8')
        const matches = content.matchAll(/slug:\s*['"]([^'"]+)['"]/g)
        for (const match of matches) {
            blogPosts.push({ slug: match[1], date: new Date().toISOString(), featured: false })
        }
    }
} catch (e) {
    console.log('[generate-sitemaps] Could not parse blog posts, continuing without them')
}

function generateSitemapXml(urls) {
    const urlEntries = urls.map(({ url, lastModified, changeFrequency, priority }) => `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('')

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlEntries}
</urlset>`
}

function generateSitemap() {
    const baseUrl = 'https://frame.dev'
    const now = new Date().toISOString()

    // Frame.dev main pages
    const framePages = [
        { url: `${baseUrl}`, lastModified: now, changeFrequency: 'daily', priority: 1 },
        { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
        { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
        { url: `${baseUrl}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/products`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/team`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
        { url: `${baseUrl}/jobs`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    ]

    // Blog posts
    const blogPages = blogPosts.map(post => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.date,
        changeFrequency: 'monthly',
        priority: post.featured ? 0.9 : 0.7,
    }))

    // Quarry pages (under /quarry prefix)
    const quarryPages = [
        { url: `${baseUrl}/quarry`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
        { url: `${baseUrl}/quarry/landing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
        { url: `${baseUrl}/quarry/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/quarry/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/quarry/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
        { url: `${baseUrl}/quarry/waitlist`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
        { url: `${baseUrl}/quarry/app`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
        { url: `${baseUrl}/quarry/search`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
        { url: `${baseUrl}/quarry/browse`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
        { url: `${baseUrl}/quarry/dashboard`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
        { url: `${baseUrl}/quarry/graph`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/quarry/write`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
        { url: `${baseUrl}/quarry/reflect`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/quarry/plan`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
        { url: `${baseUrl}/quarry/new`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/quarry/focus`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/quarry/learn`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
        { url: `${baseUrl}/quarry/spiral-path`, lastModified: now, changeFrequency: 'weekly', priority: 0.75 },
        { url: `${baseUrl}/quarry/research`, lastModified: now, changeFrequency: 'weekly', priority: 0.75 },
        { url: `${baseUrl}/quarry/suggestions`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/quarry/collections`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/quarry/tags`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/quarry/supertags`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/quarry/atlas`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/quarry/plugins`, lastModified: now, changeFrequency: 'monthly', priority: 0.65 },
        { url: `${baseUrl}/quarry/architecture`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
        { url: `${baseUrl}/quarry/api`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
        { url: `${baseUrl}/quarry/api-docs`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
        { url: `${baseUrl}/quarry/api-playground`, lastModified: now, changeFrequency: 'monthly', priority: 0.65 },
        { url: `${baseUrl}/quarry/self-host`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
        { url: `${baseUrl}/quarry/templates`, lastModified: now, changeFrequency: 'weekly', priority: 0.75 },
        { url: `${baseUrl}/quarry/analytics`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
        { url: `${baseUrl}/quarry/activity`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
        { url: `${baseUrl}/quarry/changelog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${baseUrl}/quarry/settings`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
        { url: `${baseUrl}/quarry/evolution`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    ]

    // Legal pages
    const legalPages = [
        { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${baseUrl}/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${baseUrl}/legal/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
        { url: `${baseUrl}/legal/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    ]

    return [...framePages, ...blogPages, ...quarryPages, ...legalPages]
}

function main() {
    console.log('[generate-sitemaps] Generating frame.dev sitemap...')

    const publicDir = path.join(__dirname, '..', 'public')

    // Generate single sitemap with frame.dev URLs
    const urls = generateSitemap()
    const sitemap = generateSitemapXml(urls)
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap)
    console.log(`[generate-sitemaps] ✓ Created sitemap.xml (frame.dev, ${urls.length} URLs)`)

    // Remove old sitemap-frame.xml if it exists
    const oldSitemapPath = path.join(publicDir, 'sitemap-frame.xml')
    if (fs.existsSync(oldSitemapPath)) {
        fs.unlinkSync(oldSitemapPath)
        console.log('[generate-sitemaps] ✓ Removed old sitemap-frame.xml')
    }

    console.log('[generate-sitemaps] Done!')
}

main()

