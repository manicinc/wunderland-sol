#!/usr/bin/env npx tsx
/**
 * Export Prompts Catalog
 * @module scripts/export-prompts-catalog
 *
 * Exports all prompts from source files to a JSON catalog for other scripts.
 *
 * Usage:
 *   npx tsx scripts/export-prompts-catalog.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { WRITING_PROMPTS } from '../lib/codex/prompts.js'
import { NONFICTION_PROMPTS } from '../lib/prompts/nonfictionPrompts.js'
import { WRITERS_DIGEST_PROMPTS } from '../lib/prompts/writersDigestPrompts.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface PromptCatalogEntry {
  id: string
  text: string
  category: string
  mood?: string[]
  difficulty?: string
  estimatedTime?: string
  mode?: string
  tags?: string[]
  source?: string
}

function main() {
  console.log('='.repeat(60))
  console.log('Exporting Prompts Catalog')
  console.log('='.repeat(60))

  // Combine all prompts
  const allPrompts: PromptCatalogEntry[] = []

  // Add base prompts
  for (const prompt of WRITING_PROMPTS) {
    allPrompts.push({
      id: prompt.id,
      text: prompt.text,
      category: prompt.category,
      mood: prompt.mood,
      difficulty: prompt.difficulty,
      estimatedTime: prompt.estimatedTime,
      mode: prompt.mode,
      tags: prompt.tags,
      source: 'codex',
    })
  }
  console.log(`Added ${WRITING_PROMPTS.length} base prompts`)

  // Add nonfiction prompts
  for (const prompt of NONFICTION_PROMPTS) {
    allPrompts.push({
      id: prompt.id,
      text: prompt.text,
      category: prompt.category,
      mood: prompt.mood,
      difficulty: prompt.difficulty,
      estimatedTime: prompt.estimatedTime,
      mode: prompt.mode,
      tags: prompt.tags,
      source: 'nonfiction',
    })
  }
  console.log(`Added ${NONFICTION_PROMPTS.length} nonfiction prompts`)

  // Add Writers Digest prompts
  for (const prompt of WRITERS_DIGEST_PROMPTS) {
    allPrompts.push({
      id: prompt.id,
      text: prompt.text,
      category: prompt.category,
      mood: prompt.mood,
      difficulty: prompt.difficulty,
      mode: prompt.mode,
      source: 'writers-digest',
    })
  }
  console.log(`Added ${WRITERS_DIGEST_PROMPTS.length} Writers Digest prompts`)

  // Write catalog
  const outputPath = path.join(__dirname, '../data/prompts-catalog.json')
  const catalog = {
    version: 2,
    generatedAt: new Date().toISOString(),
    totalPrompts: allPrompts.length,
    prompts: allPrompts,
  }

  // Ensure data directory exists
  const dataDir = path.dirname(outputPath)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2))

  console.log('\n' + '='.repeat(60))
  console.log(`Exported ${allPrompts.length} prompts to ${outputPath}`)
  console.log('='.repeat(60))

  // Print category breakdown
  const categories: Record<string, number> = {}
  for (const p of allPrompts) {
    categories[p.category] = (categories[p.category] || 0) + 1
  }
  console.log('\nCategory breakdown:')
  for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`)
  }
}

main()
