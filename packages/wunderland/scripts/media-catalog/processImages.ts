#!/usr/bin/env npx tsx
/**
 * Process Images Script
 * @module scripts/media-catalog/processImages
 * 
 * Processes downloaded images:
 * - Converts originals to 4K WebP (3840x2160, quality 88)
 * - Generates thumbnails (400x225, quality 80)
 * - Extracts dominant colors
 * - Backs up originals to media-backups/
 * 
 * Usage:
 *   npx tsx scripts/media-catalog/processImages.ts
 *   npx tsx scripts/media-catalog/processImages.ts --category rain
 *   npx tsx scripts/media-catalog/processImages.ts --skip-backups
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import sharp from 'sharp'

// Output dimensions
const OUTPUT_WIDTH = 3840  // 4K width
const OUTPUT_HEIGHT = 2160 // 4K height
const OUTPUT_QUALITY = 88  // WebP quality (0-100)

const THUMB_WIDTH = 400
const THUMB_HEIGHT = 225
const THUMB_QUALITY = 80

// Paths
const DOWNLOADS_DIR = path.join(process.cwd(), 'scripts/media-catalog/downloads')
const OUTPUT_DIR = path.join(process.cwd(), 'apps/frame.dev/public/media/backgrounds')
const BACKUPS_DIR = path.join(process.cwd(), 'media-backups/backgrounds')

interface ProcessResult {
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

interface ProcessOptions {
  category?: string
  skipBackups?: boolean
  force?: boolean
}

/**
 * Extract dominant color from image
 */
async function extractDominantColor(imagePath: string): Promise<string> {
  try {
    const { dominant } = await sharp(imagePath)
      .resize(50, 50, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(async ({ data, info }) => {
        // Simple dominant color extraction by averaging
        let r = 0, g = 0, b = 0
        const pixels = info.width * info.height
        
        for (let i = 0; i < data.length; i += info.channels) {
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
        }
        
        return {
          dominant: {
            r: Math.round(r / pixels),
            g: Math.round(g / pixels),
            b: Math.round(b / pixels),
          }
        }
      })
    
    return rgbToHex(dominant.r, dominant.g, dominant.b)
  } catch (error) {
    console.warn(`  Failed to extract color:`, error)
    return '#333333'
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

/**
 * Process a single image
 */
async function processImage(
  inputPath: string,
  category: string,
  filename: string,
  options: ProcessOptions
): Promise<ProcessResult | null> {
  const baseName = path.parse(filename).name
  const outputFilename = `${baseName}.webp`
  const outputPath = path.join(OUTPUT_DIR, category, outputFilename)
  const thumbnailPath = path.join(OUTPUT_DIR, category, 'thumbs', outputFilename)
  const backupPath = options.skipBackups 
    ? null 
    : path.join(BACKUPS_DIR, category, filename)

  try {
    // Check if already processed
    if (!options.force) {
      try {
        await fs.access(outputPath)
        console.log(`  ⏭️  ${filename} (already processed)`)
        return null
      } catch {
        // Continue processing
      }
    }

    // Get original stats
    const originalStats = await fs.stat(inputPath)
    const originalSize = originalStats.size

    // Read image and get metadata
    const image = sharp(inputPath)
    const metadata = await image.metadata()

    // Backup original
    if (backupPath) {
      await fs.mkdir(path.dirname(backupPath), { recursive: true })
      await fs.copyFile(inputPath, backupPath)
    }

    // Extract dominant color before resizing
    const dominantColor = await extractDominantColor(inputPath)

    // Process to 4K WebP
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await sharp(inputPath)
      .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {
        fit: 'cover',
        position: 'attention', // Smart crop focusing on important areas
      })
      .webp({ quality: OUTPUT_QUALITY })
      .toFile(outputPath)

    const processedStats = await fs.stat(outputPath)

    // Generate thumbnail
    await fs.mkdir(path.dirname(thumbnailPath), { recursive: true })
    await sharp(inputPath)
      .resize(THUMB_WIDTH, THUMB_HEIGHT, {
        fit: 'cover',
        position: 'attention',
      })
      .webp({ quality: THUMB_QUALITY })
      .toFile(thumbnailPath)

    const thumbnailStats = await fs.stat(thumbnailPath)

    return {
      id: baseName,
      category,
      outputPath,
      thumbnailPath,
      backupPath,
      originalSize,
      processedSize: processedStats.size,
      thumbnailSize: thumbnailStats.size,
      dominantColor,
      width: metadata.width || OUTPUT_WIDTH,
      height: metadata.height || OUTPUT_HEIGHT,
    }
  } catch (error) {
    console.error(`  ❌ Failed to process ${filename}:`, error)
    return null
  }
}

/**
 * Process all images in a category
 */
async function processCategory(
  category: string,
  options: ProcessOptions
): Promise<ProcessResult[]> {
  const categoryDownloadsDir = path.join(DOWNLOADS_DIR, category)
  const results: ProcessResult[] = []

  try {
    const files = await fs.readdir(categoryDownloadsDir)
    const imageFiles = files.filter(f => 
      /\.(jpg|jpeg|png|webp|gif)$/i.test(f)
    )

    console.log(`\n📁 Category: ${category} (${imageFiles.length} images)`)

    for (const file of imageFiles) {
      const inputPath = path.join(categoryDownloadsDir, file)
      const result = await processImage(inputPath, category, file, options)
      
      if (result) {
        const savedKB = Math.round((result.originalSize - result.processedSize) / 1024)
        const processedKB = Math.round(result.processedSize / 1024)
        console.log(`  ✅ ${file} → ${processedKB}KB (saved ${savedKB}KB) [${result.dominantColor}]`)
        results.push(result)
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(`  ⚠️  No downloads found for category: ${category}`)
    } else {
      console.error(`  ❌ Error processing category ${category}:`, error)
    }
  }

  return results
}

/**
 * Parse command line arguments
 */
function parseArgs(): ProcessOptions {
  const args = process.argv.slice(2)
  const options: ProcessOptions = {}

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--category':
      case '-c':
        options.category = args[++i]
        break
      case '--skip-backups':
        options.skipBackups = true
        break
      case '--force':
      case '-f':
        options.force = true
        break
      case '--help':
      case '-h':
        console.log(`
Usage: npx tsx processImages.ts [options]

Options:
  --category, -c <name>   Process only specific category
  --skip-backups          Don't backup originals to media-backups/
  --force, -f             Re-process existing images
  --help, -h              Show this help
        `)
        process.exit(0)
    }
  }

  return options
}

/**
 * Save processing metadata for catalog builder
 */
async function saveProcessingResults(results: ProcessResult[]): Promise<void> {
  const metadataPath = path.join(DOWNLOADS_DIR, 'processing-metadata.json')
  
  // Load existing metadata
  let metadata: Record<string, ProcessResult> = {}
  try {
    const existing = await fs.readFile(metadataPath, 'utf-8')
    metadata = JSON.parse(existing)
  } catch {
    // Start fresh
  }

  // Merge new results
  for (const result of results) {
    metadata[result.id] = result
  }

  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')
  console.log(`\n📝 Saved processing metadata: ${metadataPath}`)
}

/**
 * Main execution
 */
async function main() {
  console.log('🔄 Image Processor')
  console.log('==================')
  console.log(`Output: 4K WebP (${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}, q${OUTPUT_QUALITY})`)
  console.log(`Thumbnails: ${THUMB_WIDTH}x${THUMB_HEIGHT}, q${THUMB_QUALITY}`)
  console.log('')

  const options = parseArgs()

  // Ensure output directories exist
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  if (!options.skipBackups) {
    await fs.mkdir(BACKUPS_DIR, { recursive: true })
  }

  // Get categories to process
  let categories: string[]
  
  if (options.category) {
    categories = [options.category]
  } else {
    try {
      const entries = await fs.readdir(DOWNLOADS_DIR, { withFileTypes: true })
      categories = entries
        .filter(e => e.isDirectory() && e.name !== 'thumbs')
        .map(e => e.name)
    } catch {
      console.error(`❌ Downloads directory not found: ${DOWNLOADS_DIR}`)
      console.error('   Run fetchBackgrounds.ts first to download images.')
      process.exit(1)
    }
  }

  if (categories.length === 0) {
    console.log('⚠️  No categories found to process.')
    console.log('   Run fetchBackgrounds.ts first to download images.')
    process.exit(0)
  }

  console.log(`Categories: ${categories.join(', ')}`)
  if (options.skipBackups) {
    console.log('⚠️  Skipping backups')
  }

  // Process each category
  const allResults: ProcessResult[] = []
  let totalOriginal = 0
  let totalProcessed = 0
  let totalThumbnails = 0

  for (const category of categories) {
    const results = await processCategory(category, options)
    allResults.push(...results)

    for (const r of results) {
      totalOriginal += r.originalSize
      totalProcessed += r.processedSize
      totalThumbnails += r.thumbnailSize
    }
  }

  // Save metadata for catalog builder
  if (allResults.length > 0) {
    await saveProcessingResults(allResults)
  }

  // Summary
  console.log('\n==================')
  console.log('✨ Processing Complete!')
  console.log(`   Images processed: ${allResults.length}`)
  console.log(`   Original size: ${formatBytes(totalOriginal)}`)
  console.log(`   4K WebP size: ${formatBytes(totalProcessed)}`)
  console.log(`   Thumbnails: ${formatBytes(totalThumbnails)}`)
  console.log(`   Space saved: ${formatBytes(totalOriginal - totalProcessed - totalThumbnails)}`)
  
  if (!options.skipBackups) {
    console.log(`   Backups saved to: ${BACKUPS_DIR}`)
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

