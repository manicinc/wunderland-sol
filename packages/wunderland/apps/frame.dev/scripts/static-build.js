/**
 * Static Build Script
 *
 * Handles building for static export by temporarily excluding API routes
 * which are incompatible with Next.js output: 'export' mode.
 *
 * For quarry.space deployments only: creates root-level aliases for marketing
 * pages to ensure 200 OK responses instead of 404→JS redirect (SEO optimization).
 *
 * API routes work in server mode but must be excluded for static HTML export.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const API_DIR = path.join(__dirname, '..', 'app', 'api')
const API_BACKUP = path.join(__dirname, '..', 'app', '_api_backup')
const OUT_DIR = path.join(__dirname, '..', 'out')
const CNAME_FILE = path.join(__dirname, '..', 'public', 'CNAME')

const isStaticExport = process.env.STATIC_EXPORT === 'true'

function moveApiRoutes() {
  if (fs.existsSync(API_DIR)) {
    console.log('[static-build] Moving API routes aside for static export...')
    fs.renameSync(API_DIR, API_BACKUP)
  }
}

function restoreApiRoutes() {
  if (fs.existsSync(API_BACKUP)) {
    console.log('[static-build] Restoring API routes...')
    // Remove api dir if it was recreated
    if (fs.existsSync(API_DIR)) {
      fs.rmSync(API_DIR, { recursive: true })
    }
    fs.renameSync(API_BACKUP, API_DIR)
  }
}

/**
 * Check if this build is for quarry.space domain
 * Determined by the CNAME file in public/
 */
function isQuarrySpaceBuild() {
  if (!fs.existsSync(CNAME_FILE)) {
    return false
  }
  const cname = fs.readFileSync(CNAME_FILE, 'utf-8').trim().toLowerCase()
  return cname === 'quarry.space' || cname.endsWith('.quarry.space')
}

/**
 * Generate quarry.space sitemap as sitemap-quarry.xml
 *
 * Since frame.dev and quarry.space share the same GitHub Pages deployment,
 * we generate BOTH sitemaps:
 * - sitemap.xml → frame.dev URLs (from public/sitemap.xml via generate-sitemaps.js)
 * - sitemap-quarry.xml → quarry.space URLs (generated here)
 *
 * Both files are accessible from both domains. robots.txt references both.
 */
function generateQuarrySitemap() {
  console.log('[static-build] Generating quarry.space sitemap...')

  const now = new Date().toISOString()

  // Quarry.space pages - user-facing URLs on quarry.space domain
  // quarry.space/ maps to frame.dev/quarry/landing
  // quarry.space/app/* maps to frame.dev/quarry/*
  const pages = [
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

  const urls = pages.map(page => `
  <url>
    <loc>https://quarry.space${page.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('')

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`

  // Write as sitemap-quarry.xml (separate from frame.dev's sitemap.xml)
  // Write to root for frame.dev/sitemap-quarry.xml
  const sitemapPath = path.join(OUT_DIR, 'sitemap-quarry.xml')
  fs.writeFileSync(sitemapPath, sitemap)
  console.log(`[static-build]   ✓ Generated sitemap-quarry.xml with ${pages.length} URLs`)

  // Also write to quarry/ subdirectory for quarry.space/sitemap-quarry.xml
  // (quarry.space domain points to frame.dev/quarry/)
  const quarryDir = path.join(OUT_DIR, 'quarry')
  if (fs.existsSync(quarryDir)) {
    const quarrySitemapPath = path.join(quarryDir, 'sitemap-quarry.xml')
    fs.writeFileSync(quarrySitemapPath, sitemap)
    console.log(`[static-build]   ✓ Copied sitemap-quarry.xml to /quarry/ for quarry.space`)
  }
}

/**
 * Copy robots.txt to quarry/ subdirectory for quarry.space domain
 * Since quarry.space points to frame.dev/quarry/, we need robots.txt there too.
 */
function copyRobotsToQuarry() {
  const quarryDir = path.join(OUT_DIR, 'quarry')
  if (!fs.existsSync(quarryDir)) {
    console.log('[static-build] quarry/ directory not found, skipping robots.txt copy')
    return
  }

  const sourceRobots = path.join(OUT_DIR, 'robots.txt')
  if (!fs.existsSync(sourceRobots)) {
    console.log('[static-build] robots.txt not found in output, skipping')
    return
  }

  // Copy robots.txt to quarry/ subdirectory
  const destRobots = path.join(quarryDir, 'robots.txt')
  fs.copyFileSync(sourceRobots, destRobots)
  console.log('[static-build]   ✓ Copied robots.txt to /quarry/ for quarry.space')
}

/**
 * Create root-level aliases for quarry.space domain ONLY
 *
 * NOTE: Does NOT overwrite root index.html - the 404.html handles root redirects.
 * Only copies marketing pages so they return 200 OK instead of 404→redirect.
 *
 * This function ONLY runs when CNAME=quarry.space
 */
function createQuarrySpaceAliases() {
  if (!isQuarrySpaceBuild()) {
    console.log('[static-build] Not a quarry.space build (CNAME != quarry.space), skipping aliases')
    return
  }

  console.log('[static-build] quarry.space build detected, creating marketing page aliases...')

  // Marketing pages ONLY - do NOT touch root index.html
  // Root / redirect is handled by 404.html client-side script
  const aliases = [
    { src: 'quarry/about', dest: 'about' },
    { src: 'quarry/faq', dest: 'faq' },
    { src: 'quarry/privacy', dest: 'privacy' },
    { src: 'quarry/waitlist', dest: 'waitlist' },
    { src: 'quarry/api-docs', dest: 'api-docs' },
    { src: 'quarry/architecture', dest: 'architecture' },
    { src: 'quarry/self-host', dest: 'self-host' },
    { src: 'quarry/changelog', dest: 'changelog' },
  ]

  let copiedCount = 0

  for (const { src, dest } of aliases) {
    const srcPath = path.join(OUT_DIR, src)
    const destPath = path.join(OUT_DIR, dest)

    if (!fs.existsSync(srcPath)) {
      console.log(`[static-build]   ⚠ Source not found: ${src}`)
      continue
    }

    // Copy the entire directory
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true })
    }

    // Copy all files from source to destination
    const files = fs.readdirSync(srcPath)
    for (const file of files) {
      const srcFile = path.join(srcPath, file)
      const destFile = path.join(destPath, file)

      const stat = fs.statSync(srcFile)
      if (stat.isFile()) {
        fs.copyFileSync(srcFile, destFile)
      } else if (stat.isDirectory()) {
        // Recursively copy subdirectories
        fs.cpSync(srcFile, destFile, { recursive: true })
      }
    }
    console.log(`[static-build]   ✓ Copied ${src}/ → /${dest}/`)
    copiedCount++
  }

  console.log(`[static-build] Created ${copiedCount} marketing page aliases`)
}

async function main() {
  if (!isStaticExport) {
    console.log('[static-build] Not in static export mode, running normal build')
    execSync('npx next build', { stdio: 'inherit' })
    return
  }

  console.log('[static-build] Static export mode detected')

  try {
    // Step 1: Move API routes aside
    moveApiRoutes()

    // Step 2: Run the build
    console.log('[static-build] Running Next.js build...')
    execSync('npx next build', { stdio: 'inherit' })

    // Step 3: Create quarry.space aliases ONLY if CNAME=quarry.space
    createQuarrySpaceAliases()

    // Step 4: Generate quarry.space sitemap (sitemap-quarry.xml)
    // frame.dev sitemap (sitemap.xml) comes from public/ via generate-sitemaps.js
    generateQuarrySitemap()

    // Step 5: Copy robots.txt to quarry/ for quarry.space domain
    copyRobotsToQuarry()

    console.log('[static-build] Build completed successfully')
  } finally {
    // Step 4: Always restore API routes
    restoreApiRoutes()
  }
}

main().catch(err => {
  console.error('[static-build] Build failed:', err)
  restoreApiRoutes() // Ensure cleanup on error
  process.exit(1)
})


