#!/usr/bin/env npx tsx
/**
 * Build Catalog Script
 * @module scripts/media-catalog/buildCatalog
 * 
 * Builds or updates the media catalog JSON from processed images.
 * Reads processing metadata from processImages.ts for file sizes and colors.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import type {
  MediaCatalog,
  ImageCategory,
  CatalogImage,
  CategoryData,
  SoundscapeCategory,
} from './types'
import { SOUNDSCAPE_TO_CATEGORIES, PROVIDER_LICENSES } from './types'

// Paths
const DOWNLOADS_DIR = path.join(process.cwd(), 'scripts/media-catalog/downloads')
const PROCESSING_METADATA_PATH = path.join(DOWNLOADS_DIR, 'processing-metadata.json')

interface ProcessingMetadata {
  [id: string]: {
    id: string
    category: string
    outputPath: string
    thumbnailPath: string
    backupPath: string | null
    originalSize: number
    processedSize: number
    thumbnailSize: number
    dominantColor: string
    width: number
    height: number
  }
}

/**
 * Load processing metadata from processImages.ts
 */
async function loadProcessingMetadata(): Promise<ProcessingMetadata> {
  try {
    const data = await fs.readFile(PROCESSING_METADATA_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    console.warn('⚠️  No processing metadata found. File sizes and colors will be defaults.')
    return {}
  }
}

/**
 * Load existing catalog if it exists
 */
export async function loadExistingCatalog(catalogPath: string): Promise<MediaCatalog | null> {
  try {
    const data = await fs.readFile(catalogPath, 'utf-8')
    return JSON.parse(data) as MediaCatalog
  } catch {
    return null
  }
}

/**
 * Build catalog from image data
 */
export function buildCatalog(
  imagesByCategory: Map<ImageCategory, CatalogImage[]>
): MediaCatalog {
  const categories: Record<string, CategoryData> = {}
  let totalImages = 0

  for (const [category, images] of imagesByCategory) {
    categories[category] = {
      images,
      count: images.length,
      lastUpdated: new Date().toISOString(),
    }
    totalImages += images.length
  }

  // Build soundscape mapping
  const soundscapeMapping: Record<SoundscapeCategory, ImageCategory[]> = {
    rain: SOUNDSCAPE_TO_CATEGORIES.rain,
    ocean: SOUNDSCAPE_TO_CATEGORIES.ocean,
    forest: SOUNDSCAPE_TO_CATEGORIES.forest,
    cafe: SOUNDSCAPE_TO_CATEGORIES.cafe,
    fireplace: SOUNDSCAPE_TO_CATEGORIES.fireplace,
    lofi: SOUNDSCAPE_TO_CATEGORIES.lofi,
    'white-noise': SOUNDSCAPE_TO_CATEGORIES['white-noise'],
  }

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    totalImages,
    categories: categories as Record<ImageCategory, CategoryData>,
    soundscapeMapping,
    providers: {
      pexels: {
        name: 'Pexels',
        ...PROVIDER_LICENSES.pexels,
      },
      pixabay: {
        name: 'Pixabay',
        ...PROVIDER_LICENSES.pixabay,
      },
      unsplash: {
        name: 'Unsplash',
        ...PROVIDER_LICENSES.unsplash,
      },
      giphy: {
        name: 'Giphy',
        ...PROVIDER_LICENSES.giphy,
      },
    },
  }
}

/**
 * Save catalog to disk
 */
export async function saveCatalog(
  catalog: MediaCatalog,
  outputPath: string
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, JSON.stringify(catalog, null, 2), 'utf-8')
}

/**
 * Scan directory for images and build catalog entries
 * Enriches with processing metadata (file sizes, colors) if available
 */
export async function scanDirectory(
  baseDir: string
): Promise<Map<ImageCategory, CatalogImage[]>> {
  const result = new Map<ImageCategory, CatalogImage[]>()
  const processingMetadata = await loadProcessingMetadata()
  
  try {
    const entries = await fs.readdir(baseDir, { withFileTypes: true })
    
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'thumbs') continue
      
      const category = entry.name as ImageCategory
      const categoryDir = path.join(baseDir, category)
      const images: CatalogImage[] = []
      
      const files = await fs.readdir(categoryDir)
      
      for (const file of files) {
        if (file === 'thumbs' || !isImageFile(file)) continue
        
        const [provider, ...idParts] = file.replace(/\.[^.]+$/, '').split('-')
        const originalId = idParts.join('-')
        const imageId = `${provider}-${originalId}`
        
        // Check for processing metadata
        const metadata = processingMetadata[imageId]
        
        // Get actual file size if no metadata
        let fileSize = metadata?.processedSize
        let thumbnailSize = metadata?.thumbnailSize
        
        if (!fileSize) {
          try {
            const stats = await fs.stat(path.join(categoryDir, file))
            fileSize = stats.size
          } catch {
            fileSize = undefined
          }
        }
        
        if (!thumbnailSize) {
          try {
            const thumbPath = path.join(categoryDir, 'thumbs', file)
            const stats = await fs.stat(thumbPath)
            thumbnailSize = stats.size
          } catch {
            thumbnailSize = undefined
          }
        }
        
        images.push({
          id: imageId,
          provider: provider as any,
          url: `/media/backgrounds/${category}/${file}`,
          thumbnail: `/media/backgrounds/${category}/thumbs/${file}`,
          width: metadata?.width || 3840, // 4K default
          height: metadata?.height || 2160,
          photographer: 'Unknown', // TODO: Preserve from fetch metadata
          photographerUrl: '',
          sourceUrl: '',
          license: PROVIDER_LICENSES[provider as keyof typeof PROVIDER_LICENSES]?.name || 'Unknown',
          licenseUrl: PROVIDER_LICENSES[provider as keyof typeof PROVIDER_LICENSES]?.url || '',
          tags: [category],
          color: metadata?.dominantColor || '#333333',
          downloadable: true,
          alt: `${category} background`,
          originalId,
          fileSize,
          thumbnailSize,
          backupPath: metadata?.backupPath || undefined,
        })
      }
      
      if (images.length > 0) {
        result.set(category, images)
      }
    }
  } catch (error) {
    console.error('Error scanning directory:', error)
  }
  
  return result
}

function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
}

/**
 * Main execution when run directly
 */
async function main() {
  const baseDir = path.join(process.cwd(), 'apps/frame.dev/public/media/backgrounds')
  const catalogPath = path.join(baseDir, 'catalog.json')
  
  console.log('📚 Building catalog from existing files...')
  console.log(`   Directory: ${baseDir}`)
  
  const imagesByCategory = await scanDirectory(baseDir)
  const catalog = buildCatalog(imagesByCategory)
  await saveCatalog(catalog, catalogPath)
  
  console.log(`\n✅ Catalog built!`)
  console.log(`   Total images: ${catalog.totalImages}`)
  console.log(`   Categories: ${Object.keys(catalog.categories).length}`)
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

