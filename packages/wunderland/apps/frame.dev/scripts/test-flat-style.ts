#!/usr/bin/env node
/**
 * Test Flat Illustration Style
 * @module scripts/test-flat-style
 *
 * Generates 10 test images with the new unified flat illustration style.
 * Run this to preview the new aesthetic before regenerating all images.
 *
 * Usage:
 *   npx tsx scripts/test-flat-style.ts
 */

// Load .env.local
import { config } from 'dotenv'
config({ path: '.env.local' })

import OpenAI from 'openai'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ═══════════════════════════════════════════════════════════════════════════
// V7: STORYBOOK ILLUSTRATION STYLE - CLEAR RECOGNIZABLE OBJECTS
// ═══════════════════════════════════════════════════════════════════════════

// V7 Strategy: Children's book / storybook illustration style
// - Specific recognizable objects (not abstract)
// - Clean, charming, friendly aesthetic
// - Simple lines, flat pastel colors
// - White background for clarity

// Base style - storybook illustration
const STORYBOOK_STYLE = `children's book illustration, digital art smooth, \
simple clean lines, flat pastel colors, white background, \
centered composition, charming friendly aesthetic, single recognizable object`

// Strict exclusions
const NEVER = `no text, no letters, no words, no people, no faces, no hands, \
no abstract shapes, no complex scenes, no photography, no 3D rendering, \
no realistic textures, no busy backgrounds`

// Test prompts v7 - Storybook style with recognizable objects, LANDSCAPE 16:9
const TEST_PROMPTS = [
  {
    id: 'test-v7-reflection',
    text: 'What lesson took you the longest to learn?',
    category: 'reflection',
    prompt: `${STORYBOOK_STYLE}, a cute lavender hand mirror with ornate frame, soft purple tones, gentle and thoughtful mood, ${NEVER}`,
  },
  {
    id: 'test-v7-creative',
    text: 'Invent a word for a feeling.',
    category: 'creative',
    prompt: `${STORYBOOK_STYLE}, a coral colored paintbrush with a playful blob of paint, warm peach and orange tones, creative and joyful mood, ${NEVER}`,
  },
  {
    id: 'test-v7-exploration',
    text: 'Research a new topic.',
    category: 'exploration',
    prompt: `${STORYBOOK_STYLE}, vintage brass binoculars with teal accents, golden and teal tones, curious adventure mood, ${NEVER}`,
  },
  {
    id: 'test-v7-philosophical',
    text: 'Describe an abstract concept.',
    category: 'philosophical',
    prompt: `${STORYBOOK_STYLE}, a mystical crystal ball on a small stand, deep indigo and soft gold tones, contemplative wonder mood, ${NEVER}`,
  },
  {
    id: 'test-v7-learning',
    text: 'Find connections between topics.',
    category: 'learning',
    prompt: `${STORYBOOK_STYLE}, a charming stack of three books with a small bookmark, emerald green and gold tones, knowledge and discovery mood, ${NEVER}`,
  },
  {
    id: 'test-v7-creative2',
    text: 'Write a letter to your future self.',
    category: 'creative',
    prompt: `${STORYBOOK_STYLE}, a cute paper airplane in flight, soft peach and cream tones, hopeful dreamy mood, ${NEVER}`,
  },
  {
    id: 'test-v7-practical',
    text: 'Create a step-by-step guide.',
    category: 'practical',
    prompt: `${STORYBOOK_STYLE}, a friendly spiral notebook with lined pages, warm amber and sage tones, organized productive mood, ${NEVER}`,
  },
  {
    id: 'test-v7-personal',
    text: 'Write about a tradition.',
    category: 'personal',
    prompt: `${STORYBOOK_STYLE}, a cozy armchair with a small cushion, warm rose and cream tones, comfortable intimate mood, ${NEVER}`,
  },
  {
    id: 'test-v7-technical',
    text: 'Document your workspace.',
    category: 'technical',
    prompt: `${STORYBOOK_STYLE}, a cute retro desktop computer with rounded edges, cool teal and white tones, focused modern mood, ${NEVER}`,
  },
  {
    id: 'test-v7-exploration2',
    text: 'Investigate a mystery.',
    category: 'exploration',
    prompt: `${STORYBOOK_STYLE}, a rolled treasure map with a wax seal, warm gold and brown tones, exciting discovery mood, ${NEVER}`,
  },
]

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
  console.log('='.repeat(60))
  console.log('🎨 Testing Unified Flat Illustration Style')
  console.log('='.repeat(60))

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('\n❌ OPENAI_API_KEY environment variable not set')
    console.error('Usage: OPENAI_API_KEY=sk-xxx npx tsx scripts/test-flat-style.ts')
    process.exit(1)
  }

  const openai = new OpenAI({ apiKey })
  const outputDir = path.join(__dirname, '../public/prompts/test-v7')

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  console.log(`\n📁 Output directory: ${outputDir}`)
  console.log(`📝 Generating ${TEST_PROMPTS.length} test images...\n`)
  console.log('-'.repeat(60))

  let successCount = 0
  let errorCount = 0
  const results: Array<{ id: string; category: string; path: string; success: boolean }> = []

  for (let i = 0; i < TEST_PROMPTS.length; i++) {
    const testPrompt = TEST_PROMPTS[i]
    const progress = `[${i + 1}/${TEST_PROMPTS.length}]`
    const imagePath = path.join(outputDir, `${testPrompt.id}.webp`)

    process.stdout.write(`${progress} ${testPrompt.category}: "${testPrompt.text.slice(0, 40)}..."`)

    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: testPrompt.prompt,
        n: 1,
        size: '1792x1024', // Landscape 16:9
        quality: 'standard',
        response_format: 'url',
      })

      const imageUrl = response.data[0]?.url
      if (!imageUrl) throw new Error('No image URL')

      await downloadImage(imageUrl, imagePath)

      successCount++
      results.push({ id: testPrompt.id, category: testPrompt.category, path: imagePath, success: true })
      console.log(' ✅')

      // Rate limit
      await sleep(3000)
    } catch (error) {
      errorCount++
      const msg = error instanceof Error ? error.message : 'Unknown error'
      results.push({ id: testPrompt.id, category: testPrompt.category, path: '', success: false })
      console.log(` ❌ ${msg}`)

      if (msg.includes('rate limit') || msg.includes('429')) {
        console.log('  ⏳ Rate limited, waiting 60s...')
        await sleep(60000)
      } else {
        await sleep(3000)
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log(`✅ Generated: ${successCount} | ❌ Failed: ${errorCount}`)
  console.log(`\n📁 View images at: ${outputDir}`)
  console.log('='.repeat(60))

  // Save results
  const resultsPath = path.join(outputDir, 'results.json')
  fs.writeFileSync(resultsPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    style: 'unified-flat-illustration',
    results,
  }, null, 2))

  console.log(`\n📝 Results saved to: ${resultsPath}`)

  // Cost estimate
  const cost = successCount * 0.04
  console.log(`💰 Estimated cost: $${cost.toFixed(2)}`)
}

main().catch(console.error)
