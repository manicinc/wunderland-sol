/**
 * Download the MiniLM semantic search model + tokenizer from Hugging Face.
 * Files are stored under public/models/minilm-l6-v2 and ignored by git.
 */

/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const https = require('https')

const SKIP_DOWNLOAD = process.env.SKIP_SEMANTIC_MODEL === '1' || process.env.SKIP_SEMANTIC_MODEL === 'true'
const MODEL_DIR = path.join(__dirname, '..', 'public', 'models', 'minilm-l6-v2')
const BASE_URL = 'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main'

const FILES = [
  { 
    name: 'model.onnx', 
    urls: [
      `${BASE_URL}/onnx/model.onnx`,
      `${BASE_URL}/onnx/model_quantized.onnx`,
      `${BASE_URL}/model.onnx`,
    ],
    optional: true,  // Model is large, can fallback to transformers.js
  },
  { 
    name: 'tokenizer.json', 
    urls: [`${BASE_URL}/tokenizer.json`],
    optional: false,
  },
  { 
    name: 'config.json', 
    urls: [`${BASE_URL}/config.json`],
    optional: false,
  },
]

/**
 * Download helper with basic progress logging.
 */
function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination)

    https
      .get(url, (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`Failed to download ${url} (${response.statusCode})`))
          return
        }
        response.pipe(file)
        file.on('finish', () => {
          file.close(resolve)
        })
      })
      .on('error', (err) => {
        fs.unlink(destination, () => reject(err))
      })
  })
}

async function ensureModels() {
  if (SKIP_DOWNLOAD) {
    console.log('[semantic-model] Skipping download (SKIP_SEMANTIC_MODEL=1 or true)')
    return
  }

  if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true })
    console.log(`[semantic-model] Created directory: ${MODEL_DIR}`)
  }

  let successCount = 0
  let failCount = 0

  for (const file of FILES) {
    const targetPath = path.join(MODEL_DIR, file.name)
    if (fs.existsSync(targetPath)) {
      const stats = fs.statSync(targetPath)
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
      console.log(`[semantic-model] ✓ ${file.name} already present (${sizeMB} MB)`)
      successCount++
      continue
    }

    let downloaded = false
    for (const url of file.urls) {
      try {
        console.log(`[semantic-model] ↓ Downloading ${file.name} from ${url.split('/').pop()}...`)
        await downloadFile(url, targetPath)
        const stats = fs.statSync(targetPath)
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
        console.log(`[semantic-model] ✓ Saved ${file.name} (${sizeMB} MB)`)
        successCount++
        downloaded = true
        break
      } catch (error) {
        console.warn(`[semantic-model] ✗ Failed: ${error.message}`)
      }
    }

    if (!downloaded) {
      if (file.optional) {
        console.warn(`[semantic-model] ⚠ ${file.name} unavailable (optional, will use fallback)`)
      } else {
        console.error(`[semantic-model] ✗ ${file.name} could not be downloaded (required!)`)
        failCount++
      }
    }
  }

  console.log(`\n[semantic-model] Summary: ${successCount} files ready, ${failCount} critical failures`)
  if (failCount > 0) {
    console.warn('[semantic-model] ⚠ Semantic Q&A may fall back to Transformers.js or lexical search.')
  } else if (successCount === FILES.length) {
    console.log('[semantic-model] ✅ All semantic search files ready!')
  }
}

ensureModels()

