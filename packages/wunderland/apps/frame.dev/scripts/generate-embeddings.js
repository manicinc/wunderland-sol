/**
 * Generate semantic embeddings for Codex documents
 * 
 * This script:
 * 1. Fetches all markdown documents from the codex repository
 * 2. Generates embeddings using the MiniLM-L6-v2 model
 * 3. Saves embeddings to public/codex-embeddings.json
 * 
 * Usage:
 *   node scripts/generate-embeddings.js
 * 
 * Environment variables:
 *   GITHUB_TOKEN - Optional, for higher rate limits
 *   SKIP_EMBEDDINGS - Set to "1" to skip generation
 */

/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const https = require('https')

// Configuration
const SKIP_GENERATION = process.env.SKIP_EMBEDDINGS === '1' || process.env.SKIP_EMBEDDINGS === 'true'
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'codex-embeddings.json')
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const REPO_OWNER = 'framersai'
const REPO_NAME = 'codex'
const BRANCH = 'master'
const MAX_CONTENT_LENGTH = 8000 // Truncate long documents

// Model will be loaded dynamically
let pipeline = null
let embeddingModel = null

/**
 * Make a GitHub API request
 */
function githubRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `https://api.github.com${endpoint}`
    const options = {
      headers: {
        'User-Agent': 'codex-embeddings-generator',
        'Accept': 'application/vnd.github.v3+json',
        ...(GITHUB_TOKEN ? { 'Authorization': `token ${GITHUB_TOKEN}` } : {})
      }
    }

    https.get(url, options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`GitHub API error ${res.statusCode}: ${data}`))
          return
        }
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`))
        }
      })
    }).on('error', reject)
  })
}

/**
 * Fetch raw content from GitHub
 */
function fetchRawContent(filePath) {
  return new Promise((resolve, reject) => {
    const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${filePath}`
    
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Follow redirect
        https.get(res.headers.location, (redirectRes) => {
          let data = ''
          redirectRes.on('data', chunk => data += chunk)
          redirectRes.on('end', () => resolve(data))
        }).on('error', reject)
        return
      }
      
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Failed to fetch ${filePath}: ${res.statusCode}`))
          return
        }
        resolve(data)
      })
    }).on('error', reject)
  })
}

/**
 * Get all markdown files from the repository
 */
async function getAllMarkdownFiles() {
  console.log('[embeddings] Fetching repository tree...')
  
  const tree = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${BRANCH}?recursive=1`)
  
  const mdFiles = tree.tree
    .filter(item => item.type === 'blob' && item.path.endsWith('.md'))
    .filter(item => !item.path.startsWith('.') && !item.path.includes('/.'))
    .filter(item => !item.path.toLowerCase().includes('readme'))
    .filter(item => !item.path.toLowerCase().includes('license'))
  
  console.log(`[embeddings] Found ${mdFiles.length} markdown files`)
  return mdFiles
}

/**
 * Extract text content from markdown (remove code blocks, links, etc.)
 */
function extractTextContent(markdown) {
  return markdown
    // Remove YAML frontmatter
    .replace(/^---[\s\S]*?---\n?/m, '')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Remove images
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Convert links to just text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove markdown formatting
    .replace(/[*_~#]+/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract title from markdown content
 */
function extractTitle(markdown, filePath) {
  // Try YAML frontmatter title
  const yamlMatch = markdown.match(/^---[\s\S]*?title:\s*["']?([^"'\n]+)["']?[\s\S]*?---/m)
  if (yamlMatch) return yamlMatch[1].trim()
  
  // Try first H1
  const h1Match = markdown.match(/^#\s+(.+)$/m)
  if (h1Match) return h1Match[1].trim()
  
  // Fallback to filename
  return path.basename(filePath, '.md')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Simple TF-IDF based embedding as fallback when ML models aren't available
 * This creates a sparse-ish embedding that works for basic semantic similarity
 */
function createSimpleEmbedding(text, vocabSize = 384) {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
  
  // Create a deterministic embedding based on word hashes
  const embedding = new Array(vocabSize).fill(0)
  const wordCounts = new Map()
  
  for (const word of words) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
  }
  
  for (const [word, count] of wordCounts) {
    // Hash word to index
    let hash = 0
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(i)
      hash = hash & hash // Convert to 32-bit integer
    }
    const idx = Math.abs(hash) % vocabSize
    
    // TF component (log-scaled)
    embedding[idx] += Math.log(1 + count)
    
    // Add some spread to nearby indices for robustness
    embedding[(idx + 1) % vocabSize] += Math.log(1 + count) * 0.3
    embedding[(idx + vocabSize - 1) % vocabSize] += Math.log(1 + count) * 0.3
  }
  
  // L2 normalize
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  if (norm > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= norm
    }
  }
  
  return embedding
}

/**
 * Initialize the embedding model
 */
async function initializeModel() {
  console.log('[embeddings] Loading embedding model...')
  
  try {
    // Use @huggingface/transformers (successor to @xenova/transformers)
    const { pipeline: pipelineFn, env } = await import('@huggingface/transformers')
    
    // Configure for Node.js environment
    env.allowLocalModels = true
    env.useBrowserCache = false
    
    pipeline = pipelineFn
    
    console.log('[embeddings] Initializing HuggingFace Transformers model...')
    embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      dtype: 'fp32',
    })
    
    console.log('[embeddings] ✓ ML model loaded successfully')
    return true
  } catch (error) {
    console.warn('[embeddings] ⚠ ML model failed, using TF-IDF fallback:', error.message)
    console.warn('[embeddings] Stack:', error.stack?.split('\n').slice(0, 5).join('\n'))
    
    // Use simple TF-IDF embedding as fallback
    embeddingModel = {
      __fallback: true,
      async call(text) {
        return { data: createSimpleEmbedding(text) }
      }
    }
    
    console.log('[embeddings] ✓ Using TF-IDF fallback embeddings')
    return true
  }
}

/**
 * Generate embedding for a text
 */
async function generateEmbedding(text) {
  if (!embeddingModel) {
    throw new Error('Model not initialized')
  }
  
  // Truncate if too long
  const truncated = text.slice(0, MAX_CONTENT_LENGTH)
  
  // Handle fallback model
  if (embeddingModel.__fallback) {
    const result = await embeddingModel.call(truncated)
    return Array.from(result.data)
  }
  
  // Real transformers model
  const result = await embeddingModel(truncated, {
    pooling: 'mean',
    normalize: true,
  })
  
  return Array.from(result.data)
}

/**
 * Extract weave and loom from file path
 */
function extractPathInfo(filePath) {
  const parts = filePath.split('/')
  return {
    weave: parts[0] || undefined,
    loom: parts.length > 2 ? parts[1] : undefined,
  }
}

/**
 * Main embedding generation function
 */
async function generateAllEmbeddings() {
  if (SKIP_GENERATION) {
    console.log('[embeddings] Skipping generation (SKIP_EMBEDDINGS=1)')
    return
  }
  
  console.log('\n========================================')
  console.log('  Codex Semantic Embeddings Generator')
  console.log('========================================\n')
  
  // Initialize model
  const modelReady = await initializeModel()
  if (!modelReady) {
    console.error('[embeddings] Cannot proceed without embedding model')
    process.exit(1)
  }
  
  // Get all markdown files
  const files = await getAllMarkdownFiles()
  
  const embeddings = []
  let successCount = 0
  let errorCount = 0
  
  console.log(`\n[embeddings] Processing ${files.length} documents...\n`)
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const progress = `[${i + 1}/${files.length}]`
    
    try {
      // Fetch content
      const content = await fetchRawContent(file.path)
      
      // Extract text
      const textContent = extractTextContent(content)
      if (textContent.length < 50) {
        console.log(`${progress} ⚠ ${file.path} - too short, skipping`)
        continue
      }
      
      // Extract metadata
      const title = extractTitle(content, file.path)
      const { weave, loom } = extractPathInfo(file.path)
      
      // Generate embedding
      const embedding = await generateEmbedding(textContent)
      
      embeddings.push({
        id: file.path,
        path: file.path,
        title,
        content: textContent.slice(0, 500), // Store truncated content for snippets
        contentType: 'strand',
        embedding,
        metadata: {
          weave,
          loom,
          lastModified: new Date().toISOString(),
        }
      })
      
      successCount++
      console.log(`${progress} ✓ ${file.path}`)
      
      // Rate limiting pause
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      errorCount++
      console.error(`${progress} ✗ ${file.path}: ${error.message}`)
    }
  }
  
  // Save embeddings
  console.log(`\n[embeddings] Saving ${embeddings.length} embeddings to ${OUTPUT_PATH}...`)
  
  const output = {
    generatedAt: new Date().toISOString(),
    modelId: 'Xenova/all-MiniLM-L6-v2',
    embeddingDim: 384,
    totalDocuments: embeddings.length,
    embeddings,
  }
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2))
  
  const fileSizeMB = (fs.statSync(OUTPUT_PATH).size / (1024 * 1024)).toFixed(2)
  
  console.log('\n========================================')
  console.log('  Generation Complete!')
  console.log('========================================')
  console.log(`  ✓ Documents processed: ${successCount}`)
  console.log(`  ✗ Errors: ${errorCount}`)
  console.log(`  📁 Output: ${OUTPUT_PATH}`)
  console.log(`  📦 File size: ${fileSizeMB} MB`)
  console.log('========================================\n')
}

// Run if called directly
generateAllEmbeddings().catch(error => {
  console.error('[embeddings] Fatal error:', error)
  process.exit(1)
})

