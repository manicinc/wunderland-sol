#!/usr/bin/env node
/**
 * Generate Images via Replicate Flux
 * @module scripts/generate-images-replicate
 *
 * Generates actual images using Replicate's Flux model from SD prompts.
 *
 * Usage:
 *   REPLICATE_API_TOKEN=r8_xxx node scripts/generate-images-replicate.ts
 *
 * Options:
 *   --input      Input SD prompts file (default: data/prompt-sd-prompts.json)
 *   --output     Output directory (default: public/prompts)
 *   --limit      Limit number of images (e.g., --limit=10)
 *   --model      Replicate model (schnell|dev|pro, default: schnell)
 *   --skip-existing  Skip prompts that already have images
 *
 * Output:
 *   - Images saved to public/prompts/{id}.png
 *   - Catalog updated at data/prompt-images-catalog.json
 */

import Replicate from 'replicate'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import http from 'http'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SDPrompt {
  id: string
  text: string
  category: string
  mood?: string[]
  sdPrompt: string
  aesthetic: string
  generatedAt: string
}

interface ImageCatalogEntry {
  id: string
  text: string
  category: string
  sdPrompt: string
  imagePath: string
  imageUrl: string
  generatedAt: string
  model: string
}

interface ImageCatalog {
  version: number
  generatedAt: string
  model: string
  totalImages: number
  images: ImageCatalogEntry[]
}

// ═══════════════════════════════════════════════════════════════════════════
// REPLICATE MODELS
// ═══════════════════════════════════════════════════════════════════════════

const MODELS = {
  schnell: 'black-forest-labs/flux-schnell',
  dev: 'black-forest-labs/flux-dev',
  pro: 'black-forest-labs/flux-pro',
} as const

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(filepath)

    protocol
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Handle redirects
          const redirectUrl = response.headers.location
          if (redirectUrl) {
            downloadImage(redirectUrl, filepath).then(resolve).catch(reject)
            return
          }
        }

        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
      })
      .on('error', (err) => {
        fs.unlink(filepath, () => {}) // Delete partial file
        reject(err)
      })
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  const inputArg = args.find((a) => a.startsWith('--input='))
  const inputPath = inputArg
    ? inputArg.split('=')[1]
    : path.join(__dirname, '../data/prompt-sd-prompts.json')

  const outputArg = args.find((a) => a.startsWith('--output='))
  const outputDir = outputArg ? outputArg.split('=')[1] : path.join(__dirname, '../public/prompts')

  const limitArg = args.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined

  const modelArg = args.find((a) => a.startsWith('--model='))
  const modelKey = (modelArg ? modelArg.split('=')[1] : 'schnell') as keyof typeof MODELS

  const skipExisting = args.includes('--skip-existing')

  console.log('='.repeat(60))
  console.log('Replicate Flux Image Generator for Writing Prompts')
  console.log('='.repeat(60))

  // Check API token
  const apiToken = process.env.REPLICATE_API_TOKEN
  if (!apiToken) {
    console.error('\nError: REPLICATE_API_TOKEN environment variable not set')
    console.error('Usage: REPLICATE_API_TOKEN=r8_xxx node scripts/generate-images-replicate.ts')
    process.exit(1)
  }

  // Initialize Replicate
  const replicate = new Replicate({ auth: apiToken })
  const model = MODELS[modelKey]

  console.log(`\nModel: ${model}`)
  console.log(`Input: ${inputPath}`)
  console.log(`Output: ${outputDir}`)

  // Load SD prompts
  if (!fs.existsSync(inputPath)) {
    console.error(`\nError: Input file not found: ${inputPath}`)
    console.error('Run generate-prompt-images.ts first to create SD prompts.')
    process.exit(1)
  }

  const sdPrompts: SDPrompt[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'))
  console.log(`\nLoaded ${sdPrompts.length} SD prompts`)

  // Apply limit
  let promptsToProcess = limit ? sdPrompts.slice(0, limit) : sdPrompts
  console.log(`Processing ${promptsToProcess.length} prompts`)

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Load existing catalog if any
  const catalogPath = path.join(__dirname, '../data/prompt-images-catalog.json')
  let catalog: ImageCatalog = {
    version: 1,
    generatedAt: new Date().toISOString(),
    model: modelKey,
    totalImages: 0,
    images: [],
  }

  if (fs.existsSync(catalogPath)) {
    try {
      catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'))
      console.log(`Loaded existing catalog with ${catalog.images.length} images`)
    } catch (e) {
      console.log('Starting fresh catalog')
    }
  }

  const existingIds = new Set(catalog.images.map((img) => img.id))

  // Filter out existing if requested
  if (skipExisting) {
    const before = promptsToProcess.length
    promptsToProcess = promptsToProcess.filter((p) => !existingIds.has(p.id))
    console.log(`Skipping ${before - promptsToProcess.length} existing images`)
  }

  console.log(`\nGenerating ${promptsToProcess.length} images...`)
  console.log('-'.repeat(60))

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < promptsToProcess.length; i++) {
    const prompt = promptsToProcess[i]
    const progress = `[${i + 1}/${promptsToProcess.length}]`
    const imagePath = path.join(outputDir, `${prompt.id}.png`)
    const relativeImagePath = `/prompts/${prompt.id}.png`

    process.stdout.write(`${progress} ${prompt.id}: Generating...`)

    try {
      // Generate image
      const output = await replicate.run(model as `${string}/${string}`, {
        input: {
          prompt: prompt.sdPrompt,
          aspect_ratio: '1:1',
          output_format: 'png',
          output_quality: 90,
        },
      })

      // Get image URL
      const imageUrl = Array.isArray(output) ? output[0] : output

      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('No image URL in response')
      }

      // Download image
      await downloadImage(imageUrl, imagePath)

      // Update catalog
      const entry: ImageCatalogEntry = {
        id: prompt.id,
        text: prompt.text,
        category: prompt.category,
        sdPrompt: prompt.sdPrompt,
        imagePath: relativeImagePath,
        imageUrl: imageUrl,
        generatedAt: new Date().toISOString(),
        model: modelKey,
      }

      // Replace if exists, otherwise add
      const existingIndex = catalog.images.findIndex((img) => img.id === prompt.id)
      if (existingIndex >= 0) {
        catalog.images[existingIndex] = entry
      } else {
        catalog.images.push(entry)
      }

      successCount++
      console.log(' ✓')

      // Rate limit (Replicate has limits)
      await sleep(1000)
    } catch (error) {
      errorCount++
      console.log(` ✗ ${error instanceof Error ? error.message : 'Unknown error'}`)

      // Longer delay on error
      await sleep(2000)
    }

    // Save catalog periodically
    if ((i + 1) % 10 === 0) {
      catalog.totalImages = catalog.images.length
      catalog.generatedAt = new Date().toISOString()
      fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2))
    }
  }

  // Final catalog save
  catalog.totalImages = catalog.images.length
  catalog.generatedAt = new Date().toISOString()
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2))

  console.log('\n' + '='.repeat(60))
  console.log(`Generated ${successCount} images (${errorCount} errors)`)
  console.log(`Catalog: ${catalogPath}`)
  console.log(`Images: ${outputDir}`)
  console.log('='.repeat(60))

  // Calculate cost estimate
  const costs = { schnell: 0.003, dev: 0.025, pro: 0.055 }
  const estimatedCost = successCount * costs[modelKey]
  console.log(`\nEstimated cost: $${estimatedCost.toFixed(2)}`)
}

main().catch(console.error)
