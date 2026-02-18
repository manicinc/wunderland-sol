#!/usr/bin/env npx tsx
/**
 * Fetch Backgrounds Script
 * @module scripts/media-catalog/fetchBackgrounds
 * 
 * Fetches stock images from multiple providers and builds a catalog.
 * 
 * Usage:
 *   npx tsx scripts/media-catalog/fetchBackgrounds.ts
 *   npx tsx scripts/media-catalog/fetchBackgrounds.ts --category rain --limit 50
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { createAllProviders } from './providers'
import { buildCatalog, saveCatalog, loadExistingCatalog } from './buildCatalog'
import type {
  ImageCategory,
  MediaProvider,
  CatalogImage,
  ProviderSearchResult,
  FetchOptions,
} from './types'
import { CATEGORY_QUERIES, PROVIDER_LICENSES } from './types'

// Load env from project root
import 'dotenv/config'

// Download to temporary directory for processing
const DOWNLOADS_DIR = path.join(process.cwd(), 'scripts/media-catalog/downloads')
const OUTPUT_DIR = path.join(process.cwd(), 'apps/frame.dev/public/media/backgrounds')
const CATALOG_PATH = path.join(OUTPUT_DIR, 'catalog.json')

// Default images per category (25 per category = ~300 total for 12 categories)
const DEFAULT_LIMIT = 25

// Rate limiting
const RATE_LIMIT_MS = 500 // 500ms between requests
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Download an image and save to disk
 */
async function downloadImage(
  url: string,
  outputPath: string,
  force = false
): Promise<boolean> {
  try {
    // Check if already exists
    try {
      await fs.access(outputPath)
      if (!force) {
        return true // Already exists
      }
    } catch {
      // File doesn't exist, continue
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true })

    // Download
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    await fs.writeFile(outputPath, buffer)
    return true
  } catch (error) {
    console.error(`  Failed to download ${url}:`, error)
    return false
  }
}

/**
 * Generate thumbnail (simple copy for now, could use sharp for resizing)
 */
async function generateThumbnail(
  sourcePath: string,
  thumbPath: string
): Promise<boolean> {
  try {
    await fs.mkdir(path.dirname(thumbPath), { recursive: true })
    // For now, just copy. In production, use sharp to resize
    await fs.copyFile(sourcePath, thumbPath)
    return true
  } catch (error) {
    console.error(`  Failed to generate thumbnail:`, error)
    return false
  }
}

/**
 * Fetch images for a single category from all providers
 */
async function fetchCategory(
  category: ImageCategory,
  providers: Map<MediaProvider, ReturnType<typeof createAllProviders> extends Map<any, infer V> ? V : never>,
  options: FetchOptions
): Promise<CatalogImage[]> {
  const { limit = DEFAULT_LIMIT, force = false } = options
  const queries = CATEGORY_QUERIES[category]
  const images: CatalogImage[] = []
  const seenIds = new Set<string>()

  console.log(`\n📁 Category: ${category}`)
  console.log(`   Queries: ${queries.join(', ')}`)

  // Download to temporary downloads directory (processed later by processImages.ts)
  const categoryDir = path.join(DOWNLOADS_DIR, category)
  await fs.mkdir(categoryDir, { recursive: true })

  const imagesPerProvider = Math.ceil(limit / providers.size)
  const imagesPerQuery = Math.ceil(imagesPerProvider / queries.length)

  for (const [providerName, provider] of providers) {
    console.log(`   Provider: ${providerName}`)
    let providerCount = 0

    for (const query of queries) {
      if (providerCount >= imagesPerProvider) break

      try {
        await sleep(RATE_LIMIT_MS)
        const results = await provider.search(query, { perPage: imagesPerQuery })

        for (const result of results) {
          if (providerCount >= imagesPerProvider) break
          
          const imageId = `${providerName}-${result.id}`
          if (seenIds.has(imageId)) continue
          seenIds.add(imageId)

          // Determine file extension for download
          const urlPath = new URL(result.url).pathname
          const ext = path.extname(urlPath) || '.jpg'
          const filename = `${imageId}${ext}`
          const imagePath = path.join(categoryDir, filename)

          // Download image (thumbnails generated later by processImages.ts)
          if (!options.catalogOnly) {
            const downloaded = await downloadImage(result.url, imagePath, force)
            if (!downloaded) continue
          }

          const license = provider.getLicense()
          
          // URLs will be updated by processImages.ts when converting to WebP
          const webpFilename = `${imageId}.webp`
          const catalogImage: CatalogImage = {
            id: imageId,
            provider: providerName,
            url: `/media/backgrounds/${category}/${webpFilename}`,
            thumbnail: `/media/backgrounds/${category}/thumbs/${webpFilename}`,
            width: result.width,
            height: result.height,
            photographer: result.photographer,
            photographerUrl: result.photographerUrl,
            sourceUrl: result.sourceUrl,
            license: license.name,
            licenseUrl: license.url,
            tags: [...result.tags, category],
            color: result.color || '#333333',
            downloadable: true,
            alt: result.alt || `${category} background`,
            originalId: result.id,
          }

          images.push(catalogImage)
          providerCount++
          process.stdout.write('.')
        }
      } catch (error) {
        console.error(`\n   Error fetching "${query}" from ${providerName}:`, error)
      }
    }
    
    console.log(` (${providerCount} images)`)
  }

  return images
}

/**
 * Parse command line arguments
 */
function parseArgs(): FetchOptions {
  const args = process.argv.slice(2)
  const options: FetchOptions = {}

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--category':
      case '-c':
        options.category = args[++i] as ImageCategory
        break
      case '--limit':
      case '-l':
        options.limit = parseInt(args[++i], 10)
        break
      case '--catalog-only':
        options.catalogOnly = true
        break
      case '--force':
      case '-f':
        options.force = true
        break
      case '--providers':
      case '-p':
        options.providers = args[++i].split(',') as MediaProvider[]
        break
      case '--help':
      case '-h':
        console.log(`
Usage: npx tsx fetchBackgrounds.ts [options]

Options:
  --category, -c <name>    Fetch only specific category
  --limit, -l <number>     Images per category (default: ${DEFAULT_LIMIT})
  --catalog-only           Don't download images, only update catalog
  --force, -f              Re-download existing images
  --providers, -p <list>   Comma-separated list of providers
  --help, -h               Show this help

Note: Images are downloaded to scripts/media-catalog/downloads/
      Run processImages.ts afterwards to convert to 4K WebP.
        `)
        process.exit(0)
    }
  }

  return options
}

/**
 * Main execution
 */
async function main() {
  console.log('🎨 Media Catalog Fetcher')
  console.log('========================\n')

  const options = parseArgs()

  // Create downloads directory (raw downloads before processing)
  await fs.mkdir(DOWNLOADS_DIR, { recursive: true })

  // Initialize providers
  const providers = createAllProviders()
  
  if (providers.size === 0) {
    console.error('❌ No API keys configured. Please set environment variables:')
    console.error('   PEXELS_API_KEY, PIXABAY_API_KEY, UNSPLASH_ACCESS_KEY, GIPHY_API_KEY')
    process.exit(1)
  }

  console.log(`✓ Providers configured: ${Array.from(providers.keys()).join(', ')}`)
  console.log(`✓ Downloads directory: ${DOWNLOADS_DIR}`)
  
  if (options.catalogOnly) {
    console.log('✓ Catalog-only mode (no downloads)')
  }

  // Determine categories to fetch
  const categories = options.category
    ? [options.category]
    : (Object.keys(CATEGORY_QUERIES) as ImageCategory[])

  console.log(`✓ Categories: ${categories.join(', ')}`)
  console.log(`✓ Limit per category: ${options.limit || DEFAULT_LIMIT}`)

  // Load existing catalog to preserve data
  const existingCatalog = await loadExistingCatalog(CATALOG_PATH)
  const allImages: Map<ImageCategory, CatalogImage[]> = new Map()

  // Initialize with existing data
  if (existingCatalog) {
    for (const [cat, data] of Object.entries(existingCatalog.categories)) {
      if (!categories.includes(cat as ImageCategory)) {
        allImages.set(cat as ImageCategory, data.images)
      }
    }
  }

  // Fetch each category
  for (const category of categories) {
    const images = await fetchCategory(category, providers, options)
    allImages.set(category, images)
  }

  // Build and save catalog
  console.log('\n📚 Building catalog...')
  const catalog = buildCatalog(allImages)
  await saveCatalog(catalog, CATALOG_PATH)

  console.log(`\n✅ Complete!`)
  console.log(`   Total images: ${catalog.totalImages}`)
  console.log(`   Catalog saved: ${CATALOG_PATH}`)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

