# OCR Module - Handwriting Transcription System

Hybrid local/cloud OCR system for transcribing handwritten notes on the infinite canvas.

## Overview

This module provides intelligent handwriting transcription with:
- **Local-first processing** using TrOCR-small model (Transformers.js)
- **Cloud fallback** with GPT-4 Vision / Claude for difficult handwriting
- **Automatic detection** of handwriting in uploaded images
- **Confidence-based mode switching** (≥85% auto-accept, 60-84% suggest cloud, <60% require cloud)
- **Result caching** with 7-day expiry (localStorage + memory)
- **Error handling** with retry logic and user-friendly messages

## Architecture

```
Input Image
    ↓
Image Validation (size, format)
    ↓
Preprocessing (resize, grayscale, contrast)
    ↓
Cache Check (SHA-256 hash)
    ↓
OCR Engine
    ├─ Local: TrOCR-small (50MB, 90-95% accuracy)
    └─ Cloud: GPT-4V/Claude (higher accuracy, slower)
    ↓
Confidence Scoring
    ↓
Result Caching
    ↓
OCRResult
```

## Quick Start

### Basic Usage

```typescript
import { getOCREngine } from '@/lib/ocr'

// Get singleton instance
const ocrEngine = getOCREngine()

// Transcribe handwriting
const result = await ocrEngine.transcribe(imageBlob, 'local')

console.log(result.text)         // "Hello world"
console.log(result.confidence)   // 0.87
console.log(result.mode)         // "local"
console.log(result.processingTime) // 2400 (ms)
```

### With Options

```typescript
import { getOCREngine } from '@/lib/ocr'

const ocrEngine = getOCREngine({
  maxImageSize: 1024,      // Max dimension in pixels
  enableCaching: true,     // Cache results
  cacheExpiry: 604800000,  // 7 days in ms
  timeout: 30000,          // 30 second timeout
  debug: false,            // Debug logging
})

// Transcribe with preprocessing options
const result = await ocrEngine.transcribe(
  imageBlob,
  'cloud',
  { targetSize: 768, grayscale: true },
  { provider: 'openai' }
)
```

## API Reference

### OCREngine

Main orchestrator for OCR operations.

#### Methods

##### `transcribe(imageBlob, mode?, preprocessOptions?, cloudOptions?): Promise<OCRResult>`

Transcribe handwritten text from an image.

**Parameters:**
- `imageBlob: Blob` - Image containing handwritten text (PNG, JPEG, WebP)
- `mode?: OCRMode` - Processing mode: `'local'` (default) or `'cloud'`
- `preprocessOptions?: PreprocessOptions` - Image preprocessing options
- `cloudOptions?: CloudOCROptions` - Cloud OCR provider options

**Returns:** `Promise<OCRResult>`
- `text: string` - Transcribed text
- `confidence: number` - Confidence score (0-1)
- `mode: OCRMode` - Mode used ('local' or 'cloud')
- `processingTime: number` - Time taken in milliseconds
- `error?: string` - User-friendly error message if failed

**Example:**
```typescript
const result = await ocrEngine.transcribe(blob, 'local')
if (result.error) {
  console.error('Transcription failed:', result.error)
} else if (result.confidence < 0.85) {
  console.log('Low confidence, suggesting cloud mode')
}
```

##### `getModelInfo(): TrOCRModelInfo`

Get information about the loaded TrOCR model.

**Returns:**
- `modelId: string` - Model identifier
- `loaded: boolean` - Whether model is loaded
- `loadedAt?: Date` - When model was loaded
- `error?: string` - Load error if any

##### `clearCache(): void`

Clear all cached OCR results from memory and localStorage.

### Utility Functions

#### `preprocessForOCR(blob, options?): Promise<Blob>`

Preprocess image for optimal OCR accuracy.

**Transformations:**
1. Resize to target size (default 768px max dimension)
2. Convert to grayscale
3. Enhance contrast (threshold at 128)
4. Export as JPEG 95% quality

**Parameters:**
- `blob: Blob` - Input image
- `options?: PreprocessOptions`
  - `targetSize?: number` - Max width/height (default 768)
  - `quality?: number` - JPEG quality 0-1 (default 0.95)
  - `grayscale?: boolean` - Convert to grayscale (default true)
  - `contrastThreshold?: number` - Contrast threshold 0-255 (default 128)

**Example:**
```typescript
import { preprocessForOCR } from '@/lib/ocr'

const preprocessed = await preprocessForOCR(rawImage, {
  targetSize: 1024,
  grayscale: true,
  contrastThreshold: 140,
})
```

#### `hashImage(blob): Promise<string>`

Generate SHA-256 hash of image for caching.

#### `isLikelyHandwriting(blob): Promise<boolean>`

Detect if image contains handwriting using heuristic analysis.

**Heuristics:**
- White/light background (>60% pixels bright)
- Dark strokes (1-40% pixels dark)
- Low color variance (grayscale, <30 variance)

**Example:**
```typescript
import { isLikelyHandwriting } from '@/lib/ocr'

if (await isLikelyHandwriting(uploadedImage)) {
  // Show handwriting upload modal
} else {
  // Create regular attachment
}
```

#### `detectHandwriting(blob): Promise<{ isHandwriting: boolean, confidence: number, reason: string }>`

Detailed handwriting detection with confidence and reasoning.

#### `validateImageBlob(blob): void`

Validate image blob before processing. Throws `OCRError` if invalid.

**Checks:**
- Blob not empty
- File size ≤ 10MB
- MIME type: PNG, JPEG, WebP

### Error Handling

#### OCRError

Custom error class with error codes and user-friendly messages.

**Error Codes:**
- `INVALID_IMAGE` - Invalid format or corrupted
- `IMAGE_TOO_LARGE` - File size exceeds 10MB
- `IMAGE_LOAD_FAILED` - Failed to load image
- `MODEL_LOAD_FAILED` - TrOCR model failed to load
- `MODEL_NOT_AVAILABLE` - Model not loaded
- `MODEL_INFERENCE_FAILED` - OCR processing failed
- `CLOUD_NOT_AVAILABLE` - API keys not configured
- `CLOUD_API_ERROR` - Cloud service error
- `CLOUD_RATE_LIMIT` - Too many requests
- `NETWORK_ERROR` - Network connection failed
- `TIMEOUT` - Operation timed out
- `PREPROCESSING_FAILED` - Image preprocessing failed

**Example:**
```typescript
import { OCRError, OCRErrorCode } from '@/lib/ocr'

try {
  const result = await ocrEngine.transcribe(blob)
} catch (error) {
  if (error instanceof OCRError) {
    console.error('OCR failed:', error.getUserMessage())
    console.log('Error code:', error.code)
    console.log('Retryable:', error.retryable)
    console.log('Suggested action:', error.suggestedAction)
  }
}
```

## Performance

### Bundle Impact

- **Code**: ~25KB gzipped (+1.1% of total bundle)
- **Model**: 50MB (lazy-loaded from CDN, not in bundle)
- **Runtime memory**: ~300MB when model loaded
- **Auto-cleanup**: Model unloads after 5min inactivity

### Processing Times

| Mode | Device | Time |
|------|--------|------|
| Local (WebGPU) | Desktop | 2-5s |
| Local (WASM) | Mobile | 5-8s |
| Cloud | Any | 1-3s (network dependent) |

### Optimization

- **Lazy loading**: Model loaded only when needed
- **Caching**: SHA-256-based with 7-day expiry
- **Image downscaling**: Max 1024px reduces processing time
- **Web Worker**: Background processing (optional, not yet implemented)

## Caching Strategy

### Cache Keys

```
ocr-cache-{imageHash}-{mode}
```

Where:
- `imageHash` = SHA-256 hash of image blob (first 64 chars)
- `mode` = 'local' or 'cloud'

### Cache Storage

- **Memory**: `Map<string, OCRCacheEntry>` for current session
- **localStorage**: Persistent across sessions
- **Expiry**: 7 days (configurable)
- **Max size**: No hard limit, relies on browser quotas

### Cache Invalidation

Automatic:
- Age > 7 days
- localStorage cleared
- Different OCR mode used

Manual:
```typescript
ocrEngine.clearCache()
```

## Troubleshooting

### Model fails to load

**Symptoms:** "Model load failed" error

**Causes:**
- Network connection issues
- Hugging Face CDN unavailable
- Browser doesn't support WebAssembly

**Solutions:**
1. Check internet connection
2. Try clearing browser cache
3. Use cloud mode instead:
   ```typescript
   const result = await ocrEngine.transcribe(blob, 'cloud')
   ```

### Low confidence results

**Symptoms:** Confidence < 60%

**Causes:**
- Cursive or illegible handwriting
- Low contrast image
- Small text size
- Image artifacts

**Solutions:**
1. Use cloud mode for better accuracy:
   ```typescript
   const result = await ocrEngine.transcribe(blob, 'cloud')
   ```
2. Improve image quality:
   - Better lighting
   - Higher resolution
   - Clearer handwriting
3. Manual transcription

### Timeout errors

**Symptoms:** "Request timed out" error after 30s

**Causes:**
- Large image size
- Slow network (cloud mode)
- Underpowered device

**Solutions:**
1. Reduce image size before upload
2. Increase timeout:
   ```typescript
   const ocrEngine = getOCREngine({ timeout: 60000 }) // 60s
   ```
3. Use smaller target size:
   ```typescript
   const result = await ocrEngine.transcribe(
     blob,
     'local',
     { targetSize: 512 }
   )
   ```

### Cloud mode not available

**Symptoms:** "Cloud OCR is not available" error

**Cause:** API keys not configured

**Solution:**
Configure OpenAI or Anthropic API keys in environment:
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Advanced Usage

### Custom Preprocessing

```typescript
import { preprocessForOCR, getOCREngine } from '@/lib/ocr'

// Heavy preprocessing for difficult images
const preprocessed = await preprocessForOCR(blob, {
  targetSize: 1024,
  grayscale: true,
  contrastThreshold: 160, // Higher threshold for faded ink
  quality: 1.0,           // Maximum quality
})

const result = await getOCREngine().transcribe(preprocessed, 'local')
```

### Hybrid Workflow

```typescript
// Try local first, fall back to cloud if low confidence
let result = await ocrEngine.transcribe(blob, 'local')

if (result.confidence < 0.85) {
  console.log('Local confidence low, trying cloud...')
  result = await ocrEngine.transcribe(blob, 'cloud')
}

console.log(`Final result (${result.mode}):`, result.text)
```

### Batch Processing

```typescript
const results = await Promise.all(
  imageBlobs.map(blob =>
    ocrEngine.transcribe(blob, 'local')
  )
)

const successful = results.filter(r => !r.error)
console.log(`Processed ${successful.length}/${results.length} images`)
```

## Testing

### Unit Tests

```bash
npm test lib/ocr
```

### Integration Tests

```bash
npm test -- --grep "OCR integration"
```

### Manual Testing

1. Open canvas: `/canvas`
2. Right-click → "Upload Image"
3. Select handwritten note image
4. Confirm handwriting detection
5. Click "Transcribe"
6. Verify transcription appears

## Contributing

### Adding New Features

1. Update types in `lib/ocr/types.ts`
2. Implement feature in appropriate module
3. Export from `lib/ocr/index.ts`
4. Add tests in `__tests__/ocr/`
5. Update this README
6. Update user documentation

### Code Style

- TypeScript strict mode
- JSDoc comments for public APIs
- Error handling with OCRError
- Async/await over promises
- Descriptive variable names

## License

Same as parent project.

## Support

For issues and questions:
- GitHub Issues: [anthropics/frame.dev](https://github.com/anthropics/frame.dev/issues)
- Documentation: [docs/ocr.md](../../docs/ocr.md)
