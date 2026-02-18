#!/usr/bin/env npx tsx
/**
 * Generate Vocabulary Embeddings
 * @script scripts/generate-vocabulary-embeddings.ts
 *
 * Generates pre-computed embeddings for all vocabulary terms.
 * Run at build time: `npm run generate:vocabulary` or `npx tsx scripts/generate-vocabulary-embeddings.ts`
 *
 * Features:
 * - Uses WordNet to expand each term with synonyms
 * - Generates embeddings using MiniLM-L6-v2 (384 dim)
 * - Outputs to public/data/vocabulary-embeddings.json
 *
 * Requirements:
 * - Node.js 18+
 * - @huggingface/transformers (for embeddings)
 * - natural (for WordNet)
 */

import * as fs from 'fs'
import * as path from 'path'

// Types
interface VocabularyEmbedding {
  term: string
  category: 'subject' | 'topic' | 'skill' | 'difficulty'
  subcategory: string
  embedding: number[]
  synonyms?: string[]
  hypernyms?: string[]
}

interface VocabularyEmbeddingsData {
  version: string
  generatedAt: string
  model: string
  dimensions: number
  embeddings: VocabularyEmbedding[]
  stats: {
    totalTerms: number
    subjects: number
    topics: number
    skills: number
    difficulty: number
    synonymExpansions: number
  }
}

// Default vocabulary (same as in vocabulary.ts)
const DEFAULT_VOCABULARY = {
  subjects: {
    technology: [
      'api', 'code', 'software', 'programming', 'development', 'algorithm', 'database',
      'framework', 'library', 'module', 'function', 'class', 'object', 'interface',
      'protocol', 'server', 'client', 'backend', 'frontend', 'fullstack', 'devops',
      'cloud', 'docker', 'kubernetes', 'microservices', 'architecture', 'design-pattern',
    ],
    science: [
      'research', 'study', 'experiment', 'hypothesis', 'theory', 'data', 'analysis',
      'observation', 'conclusion', 'methodology', 'peer-review', 'publication',
    ],
    philosophy: [
      'ethics', 'morality', 'existence', 'consciousness', 'epistemology', 'ontology',
      'metaphysics', 'logic', 'reasoning', 'wisdom', 'truth', 'knowledge',
    ],
    ai: [
      'artificial-intelligence', 'machine-learning', 'neural-network', 'deep-learning',
      'model', 'training', 'inference', 'nlp', 'natural-language', 'transformer',
      'gpt', 'llm', 'embedding', 'vector', 'rag', 'prompt', 'fine-tuning',
    ],
    knowledge: [
      'information', 'data', 'wisdom', 'learning', 'documentation', 'wiki', 'guide',
      'tutorial', 'reference', 'manual', 'handbook', 'glossary', 'index',
    ],
  },
  topics: {
    'getting-started': [
      'tutorial', 'guide', 'introduction', 'beginner', 'quickstart', 'setup',
      'install', 'configure', 'first-steps', 'hello-world', 'basics',
    ],
    architecture: [
      'design', 'structure', 'pattern', 'system', 'component', 'module',
      'layer', 'service', 'microservice', 'monolith', 'distributed',
    ],
    troubleshooting: [
      'error', 'issue', 'problem', 'fix', 'debug', 'solution', 'workaround',
      'bug', 'crash', 'failure', 'exception', 'stack-trace',
    ],
    performance: [
      'optimization', 'speed', 'cache', 'memory', 'cpu', 'latency', 'throughput',
      'benchmark', 'profiling', 'bottleneck', 'scalability',
    ],
    security: [
      'authentication', 'authorization', 'encryption', 'ssl', 'tls', 'jwt',
      'oauth', 'cors', 'xss', 'csrf', 'injection', 'vulnerability',
    ],
  },
  difficulty: {
    beginner: [
      'basic', 'simple', 'intro', 'fundamental', 'easy', 'starter', 'first',
      'elementary', 'novice', 'getting-started', 'tutorial',
    ],
    intermediate: [
      'moderate', 'practical', 'hands-on', 'implement', 'build', 'develop',
      'create', 'extend', 'integrate', 'configure',
    ],
    advanced: [
      'complex', 'expert', 'optimization', 'performance', 'architecture',
      'scale', 'distributed', 'advanced', 'deep-dive', 'internals',
    ],
  },
  skills: {
    'programming-languages': [
      'javascript', 'typescript', 'python', 'rust', 'go', 'java', 'csharp',
      'cpp', 'c', 'ruby', 'php', 'swift', 'kotlin', 'scala',
    ],
    frameworks: [
      'react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'express',
      'fastapi', 'django', 'flask', 'spring', 'rails',
    ],
    databases: [
      'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'sqlite', 'dynamodb',
      'cassandra', 'elasticsearch', 'prisma', 'typeorm', 'sequelize',
    ],
    devops: [
      'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'terraform', 'ansible',
      'jenkins', 'github-actions', 'gitlab-ci', 'circleci',
    ],
    testing: [
      'jest', 'vitest', 'mocha', 'pytest', 'cypress', 'playwright',
      'testing-library', 'unit-test', 'integration-test', 'e2e',
    ],
  },
}

// WordNet helper (lazy loaded)
let wordnet: any = null
let wordnetInitialized = false

function getWordNet() {
  if (wordnetInitialized) {
    return wordnet
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const natural = require('natural')
    wordnet = new natural.WordNet()
    wordnetInitialized = true
    console.log('  WordNet initialized successfully')
  } catch (err) {
    console.warn('  WordNet not available (synonyms will be skipped):', (err as Error).message)
    wordnet = null
    wordnetInitialized = true
  }

  return wordnet
}

async function getSynonyms(word: string): Promise<string[]> {
  const wn = getWordNet()
  if (!wn) return []

  return new Promise((resolve) => {
    try {
      wn.lookup(word.toLowerCase(), (results: any[]) => {
        const synonyms = new Set<string>()
        for (const result of results || []) {
          if (result.synonyms) {
            for (const syn of result.synonyms) {
              const normalized = syn.toLowerCase().replace(/_/g, ' ')
              if (normalized !== word.toLowerCase()) {
                synonyms.add(normalized)
              }
            }
          }
        }
        resolve(Array.from(synonyms).slice(0, 5))
      })
    } catch (err) {
      resolve([])
    }
  })
}

async function getHypernyms(word: string): Promise<string[]> {
  const wn = getWordNet()
  if (!wn) return []

  return new Promise((resolve) => {
    try {
      wn.lookup(word.toLowerCase(), (results: any[]) => {
        const hypernyms = new Set<string>()

        const processResult = (result: any, depth: number) => {
          if (!result?.ptrs || depth <= 0) return

          const hypernymPtrs = result.ptrs.filter((ptr: any) => ptr.pointerSymbol === '@')
          for (const ptr of hypernymPtrs.slice(0, 2)) {
            try {
              wn.get(ptr.synsetOffset, ptr.pos, (hyperResult: any) => {
                if (hyperResult?.synonyms) {
                  for (const syn of hyperResult.synonyms) {
                    const normalized = syn.toLowerCase().replace(/_/g, ' ')
                    if (normalized !== word.toLowerCase()) {
                      hypernyms.add(normalized)
                    }
                  }
                }
              })
            } catch {
              // Ignore errors from individual lookups
            }
          }
        }

        for (const result of (results || []).slice(0, 2)) {
          processResult(result, 2)
        }

        // Give WordNet some time to process async callbacks
        setTimeout(() => {
          resolve(Array.from(hypernyms).slice(0, 3))
        }, 100)
      })
    } catch (err) {
      resolve([])
    }
  })
}

// Embedding pipeline (lazy loaded)
let pipeline: any = null
let embeddingAvailable = true

async function getEmbeddingPipeline() {
  if (!embeddingAvailable) {
    return null
  }

  if (!pipeline) {
    try {
      const transformers = await import('@huggingface/transformers')
      console.log('Loading MiniLM-L6-v2 model...')
      pipeline = await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true,
      })
      console.log('  Model loaded successfully!')
    } catch (err) {
      console.warn('  Embedding model not available (will generate placeholder embeddings):', (err as Error).message)
      embeddingAvailable = false
      return null
    }
  }
  return pipeline
}

/**
 * Generate a deterministic placeholder embedding based on term hash
 * Used when real embedding model is unavailable
 */
function generatePlaceholderEmbedding(text: string): number[] {
  const embedding = new Array(384).fill(0)

  // Generate deterministic values based on character codes
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i)
    for (let j = 0; j < 384; j++) {
      embedding[j] += Math.sin(charCode * (j + 1) * 0.01) * 0.1
    }
  }

  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude
    }
  }

  return embedding
}

async function generateEmbedding(text: string): Promise<number[]> {
  const embed = await getEmbeddingPipeline()

  if (!embed) {
    // Use placeholder embedding when model unavailable
    return generatePlaceholderEmbedding(text)
  }

  try {
    const result = await embed(text, { pooling: 'mean', normalize: true })
    return Array.from(result.data as Float32Array)
  } catch (err) {
    console.warn(`  Failed to embed "${text}", using placeholder`)
    return generatePlaceholderEmbedding(text)
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('Generating Vocabulary Embeddings')
  console.log('='.repeat(60))

  const embeddings: VocabularyEmbedding[] = []
  let synonymExpansions = 0
  let subjectCount = 0
  let topicCount = 0
  let skillCount = 0
  let difficultyCount = 0

  // Process subjects
  console.log('\nProcessing subjects...')
  for (const [subcategory, terms] of Object.entries(DEFAULT_VOCABULARY.subjects)) {
    console.log(`  ${subcategory}: ${terms.length} terms`)
    for (const term of terms) {
      const synonyms = await getSynonyms(term)
      const hypernyms = await getHypernyms(term)
      const embedding = await generateEmbedding(term.replace(/-/g, ' '))

      embeddings.push({
        term,
        category: 'subject',
        subcategory,
        embedding,
        synonyms: synonyms.length > 0 ? synonyms : undefined,
        hypernyms: hypernyms.length > 0 ? hypernyms : undefined,
      })

      synonymExpansions += synonyms.length
      subjectCount++
    }
  }

  // Process topics
  console.log('\nProcessing topics...')
  for (const [subcategory, terms] of Object.entries(DEFAULT_VOCABULARY.topics)) {
    console.log(`  ${subcategory}: ${terms.length} terms`)
    for (const term of terms) {
      const synonyms = await getSynonyms(term)
      const hypernyms = await getHypernyms(term)
      const embedding = await generateEmbedding(term.replace(/-/g, ' '))

      embeddings.push({
        term,
        category: 'topic',
        subcategory,
        embedding,
        synonyms: synonyms.length > 0 ? synonyms : undefined,
        hypernyms: hypernyms.length > 0 ? hypernyms : undefined,
      })

      synonymExpansions += synonyms.length
      topicCount++
    }
  }

  // Process difficulty
  console.log('\nProcessing difficulty levels...')
  for (const [subcategory, terms] of Object.entries(DEFAULT_VOCABULARY.difficulty)) {
    console.log(`  ${subcategory}: ${terms.length} terms`)
    for (const term of terms) {
      const synonyms = await getSynonyms(term)
      const embedding = await generateEmbedding(term.replace(/-/g, ' '))

      embeddings.push({
        term,
        category: 'difficulty',
        subcategory,
        embedding,
        synonyms: synonyms.length > 0 ? synonyms : undefined,
      })

      synonymExpansions += synonyms.length
      difficultyCount++
    }
  }

  // Process skills
  console.log('\nProcessing skills...')
  for (const [subcategory, terms] of Object.entries(DEFAULT_VOCABULARY.skills)) {
    console.log(`  ${subcategory}: ${terms.length} terms`)
    for (const term of terms) {
      const embedding = await generateEmbedding(term.replace(/-/g, ' '))

      embeddings.push({
        term,
        category: 'skill',
        subcategory,
        embedding,
        // Skills are proper nouns, skip synonym expansion
      })

      skillCount++
    }
  }

  // Create output data
  const outputData: VocabularyEmbeddingsData = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    model: 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
    embeddings,
    stats: {
      totalTerms: embeddings.length,
      subjects: subjectCount,
      topics: topicCount,
      skills: skillCount,
      difficulty: difficultyCount,
      synonymExpansions,
    },
  }

  // Ensure output directory exists
  const outputDir = path.join(process.cwd(), 'public', 'data')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Write output file
  const outputPath = path.join(outputDir, 'vocabulary-embeddings.json')
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2))

  console.log('\n' + '='.repeat(60))
  console.log('Generation Complete!')
  console.log('='.repeat(60))
  console.log(`Total terms: ${outputData.stats.totalTerms}`)
  console.log(`  Subjects: ${outputData.stats.subjects}`)
  console.log(`  Topics: ${outputData.stats.topics}`)
  console.log(`  Skills: ${outputData.stats.skills}`)
  console.log(`  Difficulty: ${outputData.stats.difficulty}`)
  console.log(`Synonym expansions: ${outputData.stats.synonymExpansions}`)
  console.log(`Output: ${outputPath}`)
  console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`)
}

main().catch(console.error)
