/**
 * Catch-all route for Quarry Codex URLs - Hybrid SPA Mode
 * @module app/quarry/[...path]/page
 * 
 * @remarks
 * Uses a hybrid SPA approach:
 * - Pre-renders only entry points (~20 pages) for SEO
 * - All other paths handled via client-side navigation
 * - Infinite scale, fast builds
 * 
 * This enables SEO-friendly URLs for main entry points while
 * supporting unlimited deep links via the SPA.
 */

import { Metadata } from 'next'
import { generateCodexMetadata } from '@/lib/seo'
import CodexPathClient from './CodexPathClient'

/**
 * Enable dynamic params - for static export this allows the SPA shell
 * to be served for any path, even if not pre-rendered.
 */
export const dynamicParams = true

interface PageProps {
  params: Promise<{ path: string[] }>
}

interface StrandIndexEntry {
  path: string
  metadata?: {
    title?: string
    summary?: string
    tags?: string[]
    featured?: boolean
    seo?: {
      index?: boolean
      follow?: boolean
      canonicalUrl?: string
      metaDescription?: string
      ogImage?: string
      sitemapPriority?: number
    }
    noindex?: boolean
  }
}

/**
 * Fetch strand metadata from the codex index (for SEO on pre-rendered pages)
 */
async function fetchStrandMetadata(filePath: string): Promise<StrandIndexEntry | null> {
  try {
    const indexUrl = process.env.NEXT_PUBLIC_CODEX_INDEX_URL || 
      'https://raw.githubusercontent.com/framersai/quarry/master/codex-index.json'
    
    const response = await fetch(indexUrl, { 
      next: { revalidate: 3600 }
    })
    
    if (!response.ok) return null
    
    const index: StrandIndexEntry[] = await response.json()
    
    const entry = index.find(e => 
      e.path === filePath || 
      e.path === `${filePath}.md` ||
      e.path === filePath.replace(/\.md$/, '')
    )
    
    return entry || null
  } catch {
    return null
  }
}

/**
 * Generate metadata for pre-rendered pages
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { path } = await params
  const fullPath = path.join('/')
  const fileName = path[path.length - 1]
  const potentialFilePath = fullPath.endsWith('.md') ? fullPath : `${fullPath}.md`
  
  const strandData = await fetchStrandMetadata(potentialFilePath)
  
  const title = strandData?.metadata?.title || fileName
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase()) || 'Codex'
  
  const description = strandData?.metadata?.summary || 
    strandData?.metadata?.seo?.metaDescription ||
    `View ${fullPath} in the Quarry Codex knowledge repository.`
  
  const type = fullPath.includes('/looms/') ? 'loom' 
    : fullPath.startsWith('weaves/') && path.length === 2 ? 'weave'
    : 'strand'
  
  return generateCodexMetadata({
    title,
    description,
    path: fullPath,
    tags: strandData?.metadata?.tags,
    type,
    seo: strandData?.metadata?.seo,
    noindex: strandData?.metadata?.noindex,
  })
}

/**
 * Generate static params - MINIMAL set for SEO entry points only
 * 
 * Hybrid SPA Strategy:
 * - Pre-render ~20 key entry points for SEO and fast initial load
 * - All other paths served via client-side SPA routing
 * - Scales to unlimited pages without build time explosion
 */
export async function generateStaticParams(): Promise<{ path: string[] }[]> {
  // Only pre-render essential entry points for SEO
  // Deep links are handled by the SPA client-side
  return [
    // Root directories
    { path: ['weaves'] },
    { path: ['docs'] },
    { path: ['wiki'] },
    
    // Main weaves (top-level categories)
    { path: ['weaves', 'inbox'] },
    { path: ['weaves', 'wiki'] },
    { path: ['weaves', 'notes'] },
    { path: ['weaves', 'research'] },
    { path: ['weaves', 'projects'] },
    { path: ['weaves', 'ideas'] },
    { path: ['weaves', 'knowledge'] },
    { path: ['weaves', 'frame'] },
    
    // Key wiki looms (commonly linked)
    { path: ['weaves', 'wiki', 'tutorials'] },
    { path: ['weaves', 'wiki', 'reference'] },
    { path: ['weaves', 'wiki', 'concepts'] },
    { path: ['weaves', 'wiki', 'architecture'] },
    { path: ['weaves', 'wiki', 'how-to'] },
    
    // Popular tutorials (high-traffic SEO pages)
    { path: ['weaves', 'wiki', 'tutorials', 'markdown-features'] },
    { path: ['weaves', 'wiki', 'tutorials', 'getting-started'] },
    { path: ['weaves', 'wiki', 'tutorials', 'executable-code'] },
    { path: ['weaves', 'wiki', 'tutorials', 'media-guide'] },
    
    // Frame documentation
    { path: ['weaves', 'frame', 'looms'] },
    { path: ['weaves', 'frame', 'strands'] },
  ]
}

/**
 * Parse path segments into directory and file paths
 */
function parseCodexPath(pathSegments: string[]): { 
  directoryPath: string
  filePath: string | null 
} {
  if (!pathSegments || pathSegments.length === 0) {
    return { directoryPath: '', filePath: null }
  }

  const fullPath = pathSegments.join('/')
  const lastSegment = pathSegments[pathSegments.length - 1]
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(lastSegment)
  
  if (hasExtension) {
    const dirSegments = pathSegments.slice(0, -1)
    return {
      directoryPath: dirSegments.join('/'),
      filePath: fullPath,
    }
  }
  
  return {
    directoryPath: fullPath,
    filePath: `${fullPath}.md`,
  }
}

/**
 * Server component that renders the client SPA shell
 * The client component handles dynamic path parsing for non-pre-rendered routes
 */
export default async function CodexPathPage({ params }: PageProps) {
  const { path } = await params
  const { directoryPath, filePath } = parseCodexPath(path)
  
  return (
    <CodexPathClient
      initialPath={directoryPath}
      initialFile={filePath}
      pathSegments={path}
    />
  )
}
