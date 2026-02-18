#!/usr/bin/env node
/**
 * Generate Images via OpenAI DALL-E - V7 Storybook Style
 * @module scripts/generate-images-openai
 *
 * Generates V7 storybook illustration images using DALL-E 3.
 * Uses generateSDPrompt from aesthetics.ts for prompt-specific objects.
 *
 * Usage:
 *   npx tsx scripts/generate-images-openai.ts
 *
 * Options:
 *   --input      Input prompts file (default: data/prompt-sd-prompts.json)
 *   --output     Output directory (default: public/prompts)
 *   --limit      Limit number of images (e.g., --limit=10)
 *   --quality    Image quality (standard|hd, default: standard)
 *   --force      Regenerate all images (default: skip existing)
 *   --only-new   Only generate images for prompts not in catalog (smart cache)
 *
 * Output:
 *   - Images saved to public/prompts/{id}.webp (landscape 1792x1024)
 *   - Catalog updated at public/prompts/catalog.json
 */

// Load .env.local
import { config } from 'dotenv'
config({ path: '.env.local' })

import OpenAI from 'openai'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import { generateSDPrompt } from '../lib/prompts/aesthetics.js'
import type { PromptCategory } from '../lib/codex/prompts.js'

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
  revisedPrompt?: string
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
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath)

    https
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
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
        fs.unlink(filepath, () => {})
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

  const qualityArg = args.find((a) => a.startsWith('--quality='))
  const quality = (qualityArg ? qualityArg.split('=')[1] : 'standard') as 'standard' | 'hd'

  // Smart caching: skip existing by default, --force to regenerate all
  const forceRegenerate = args.includes('--force')
  const onlyNew = args.includes('--only-new')

  console.log('='.repeat(60))
  console.log('OpenAI DALL-E Image Generator for Writing Prompts')
  console.log('='.repeat(60))

  // Check API key
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('\nError: OPENAI_API_KEY environment variable not set')
    console.error('Usage: OPENAI_API_KEY=sk-xxx node scripts/generate-images-openai.ts')
    process.exit(1)
  }

  // Initialize OpenAI
  const openai = new OpenAI({ apiKey })

  console.log(`\nModel: dall-e-3 (${quality})`)
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
  const catalogPath = path.join(outputDir, 'catalog.json')
  let catalog: ImageCatalog = {
    version: 1,
    generatedAt: new Date().toISOString(),
    model: 'dall-e-3',
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

  // Smart caching: check both catalog AND file existence
  // Default behavior: skip existing images (use --force to regenerate)
  if (!forceRegenerate) {
    const before = promptsToProcess.length
    promptsToProcess = promptsToProcess.filter((p) => {
      const imagePath = path.join(outputDir, `${p.id}.webp`)
      const inCatalog = existingIds.has(p.id)
      const fileExists = fs.existsSync(imagePath)

      // Skip only if BOTH in catalog AND file exists
      if (inCatalog && fileExists) {
        return false // skip
      }
      return true // generate
    })
    const skipped = before - promptsToProcess.length
    if (skipped > 0) {
      console.log(`Skipping ${skipped} existing images (use --force to regenerate)`)
    }
  }

  console.log(`\nGenerating ${promptsToProcess.length} images...`)
  console.log('-'.repeat(60))

  let successCount = 0
  let errorCount = 0

  // DALL-E 3 pricing: $0.040 per image (standard 1024x1024), $0.080 (hd)
  const costPerImage = quality === 'hd' ? 0.08 : 0.04

  for (let i = 0; i < promptsToProcess.length; i++) {
    const prompt = promptsToProcess[i]
    const progress = `[${i + 1}/${promptsToProcess.length}]`
    const imagePath = path.join(outputDir, `${prompt.id}.webp`)
    const relativeImagePath = `/prompts/${prompt.id}.webp`

    process.stdout.write(`${progress} ${prompt.id}: Generating...`)

    try {
      // Generate V7 storybook prompt based on text and category
      const v7Prompt = generateSDPrompt(
        prompt.text,
        prompt.category as PromptCategory
      )

      // Generate image with DALL-E 3 - V7 landscape format
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: v7Prompt,
        n: 1,
        size: '1792x1024', // Landscape 16:9 for product cards
        quality: quality,
        response_format: 'url',
      })

      const imageUrl = response.data[0]?.url
      const revisedPrompt = response.data[0]?.revised_prompt

      if (!imageUrl) {
        throw new Error('No image URL in response')
      }

      // Download image
      await downloadImage(imageUrl, imagePath)

      // Update catalog
      const entry: ImageCatalogEntry = {
        id: prompt.id,
        text: prompt.text,
        category: prompt.category,
        sdPrompt: v7Prompt,
        imagePath: relativeImagePath,
        revisedPrompt,
        generatedAt: new Date().toISOString(),
        model: 'dall-e-3',
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

      // Rate limit (DALL-E has rate limits)
      await sleep(2000)
    } catch (error) {
      errorCount++
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.log(` ✗ ${errorMsg}`)

      // Check for rate limit
      if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
        console.log('  Rate limited, waiting 60s...')
        await sleep(60000)
      } else {
        await sleep(3000)
      }
    }

    // Save catalog periodically
    if ((i + 1) % 5 === 0) {
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

  // Calculate cost
  const totalCost = successCount * costPerImage
  console.log(`\nTotal cost: $${totalCost.toFixed(2)} (${successCount} images × $${costPerImage})`)
}

main().catch(console.error)
