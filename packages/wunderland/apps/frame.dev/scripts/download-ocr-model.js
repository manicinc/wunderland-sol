/**
 * Download the TrOCR handwriting recognition model from Hugging Face.
 * Files are stored under public/models/trocr-handwritten and ignored by git.
 */

/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const https = require('https')

const SKIP_DOWNLOAD = process.env.SKIP_OCR_MODEL === '1' || process.env.SKIP_OCR_MODEL === 'true'
const MODEL_DIR = path.join(__dirname, '..', 'public', 'models', 'trocr-handwritten')
const BASE_URL = 'https://huggingface.co/Xenova/trocr-small-handwritten/resolve/main'

const FILES = [
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
  {
    name: 'generation_config.json',
    urls: [`${BASE_URL}/generation_config.json`],
    optional: true,
  },
  {
    name: 'preprocessor_config.json',
    urls: [`${BASE_URL}/preprocessor_config.json`],
    optional: true,
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

        const totalSize = parseInt(response.headers['content-length'] || '0', 10)
        let downloaded = 0

        response.on('data', (chunk) => {
          downloaded += chunk.length
          if (totalSize > 0) {
            const percent = Math.round((downloaded / totalSize) * 100)
            process.stdout.write(`\r  ${percent}% (${(downloaded / 1024 / 1024).toFixed(1)} MB)`)
          }
        })

        file.on('finish', () => {
          file.close(() => {
            console.log('') // New line after progress
            resolve()
          })
        })
      })
      .on('error', (err) => {
        fs.unlink(destination, () => {})
        reject(err)
      })
  })
}

/**
 * Try downloading from multiple URLs with fallback
 */
async function downloadWithFallback(fileConfig) {
  const destination = path.join(MODEL_DIR, fileConfig.name)

  // Skip if file already exists
  if (fs.existsSync(destination)) {
    console.log(`  ✓ ${fileConfig.name} (cached)`)
    return true
  }

  for (const url of fileConfig.urls) {
    try {
      console.log(`  Downloading ${fileConfig.name}...`)
      await downloadFile(url, destination)
      console.log(`  ✓ ${fileConfig.name}`)
      return true
    } catch (error) {
      console.warn(`  ✗ Failed to download from ${url}:`, error.message)
      // Try next URL
    }
  }

  // All URLs failed
  if (fileConfig.optional) {
    console.log(`  ⚠ ${fileConfig.name} (optional, skipped)`)
    return true
  } else {
    console.error(`  ✗ ${fileConfig.name} (required, failed)`)
    return false
  }
}

async function main() {
  if (SKIP_DOWNLOAD) {
    console.log('[OCR Model] Skipping download (SKIP_OCR_MODEL=1)')
    return
  }

  console.log('[OCR Model] Downloading TrOCR handwriting model...')

  // Create model directory
  if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true })
  }

  // Download all files
  const results = await Promise.all(FILES.map(downloadWithFallback))

  // Check if any required files failed
  const hasFailures = results.some((success) => !success)

  if (hasFailures) {
    console.error('[OCR Model] ✗ Download failed - some required files are missing')
    console.log('[OCR Model] The OCR feature will fall back to cloud-only mode')
    console.log('[OCR Model] Set SKIP_OCR_MODEL=1 to skip this download')
  } else {
    console.log('[OCR Model] ✓ Download complete')
    console.log('[OCR Model] Model will be loaded from Hugging Face CDN on first use')
  }
}

main().catch((error) => {
  console.error('[OCR Model] Error:', error.message)
  process.exit(0) // Don't fail the build - OCR is optional
})
