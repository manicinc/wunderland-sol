/**
 * Hybrid Embedding Engine - ORT Web + Transformers.js fallback
 * @module search/embeddingEngine
 * 
 * @remarks
 * Automatically selects the best available embedding backend:
 * 1. ONNX Runtime Web (WebGPU/SIMD/threads if available)
 * 2. Transformers.js (pure Wasm fallback)
 * 3. Lexical search (no embeddings)
 * 
 * CRITICAL: All ONNX Runtime imports are DYNAMIC to prevent Rust panic in Next.js SWC.
 * Static imports of onnxruntime-web cause build failures on Linux CI runners.
 */

import { loadOrt, configureOrtEnv } from './ortClient'

// WebGPU type declarations (until @types/webgpu is stable)
declare global {
  interface Navigator {
    gpu?: {
      requestAdapter(): Promise<GPUAdapter | null>
    }
  }

  interface GPUAdapter {
    requestDevice(): Promise<unknown>
  }
}

// --- Configuration ---

// ORT is ENABLED BY DEFAULT - only disable explicitly with 'false'
const ORT_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ORT !== 'false'

const MODEL_SOURCES = [
  '/models/minilm-l6-v2/model.onnx',
  'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx',
  'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model_quantized.onnx',
] as const

const TRANSFORMERS_MODEL = 'Xenova/all-MiniLM-L6-v2'

// CDN fallback for Transformers.js when bundled import fails
const TRANSFORMERS_CDN_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0/dist/transformers.min.js'

const WASM_PATHS = [
  '/onnx-wasm/',
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/',
] as const

// --- Types ---

export type BackendStatus =
  | { type: 'ort'; provider: 'webgpu' | 'wasm-simd-threaded' | 'wasm-simd' | 'wasm'; deviceInfo: string }
  | { type: 'transformers'; provider: 'wasm' }
  | { type: 'none'; reason: string }

export type DebugLevel = 'verbose' | 'info' | 'warn' | 'error'

export interface DebugLogger {
  verbose(message: string, data?: any): void
  info(message: string, data?: any): void
  warn(message: string, data?: any): void
  error(message: string, data?: any): void
}

export interface EmbeddingConfig {
  modelDim: number
  maxSeqLength: number
  debugLevel?: DebugLevel
  onStatusChange?: (status: BackendStatus) => void
  onProgress?: (message: string, percent?: number) => void
}

// --- Debug Logger Implementation ---

class ConsoleDebugLogger implements DebugLogger {
  constructor(private level: DebugLevel = 'info') { }

  private shouldLog(level: DebugLevel): boolean {
    const levels: DebugLevel[] = ['verbose', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.level)
  }

  verbose(message: string, data?: any): void {
    if (this.shouldLog('verbose')) {
      console.log(`[EmbedEngine:VERBOSE] ${message}`, data !== undefined ? data : '')
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.info(`[EmbedEngine:INFO] ${message}`, data !== undefined ? data : '')
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(`[EmbedEngine:WARN] ${message}`, data !== undefined ? data : '')
    }
  }

  error(message: string, data?: any): void {
    if (this.shouldLog('error')) {
      console.error(`[EmbedEngine:ERROR] ${message}`, data !== undefined ? data : '')
    }
  }
}

// --- Backend Detection ---

async function detectWebGPU(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.gpu) return false
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

function detectSIMD(): boolean {
  try {
    return typeof WebAssembly !== 'undefined' && WebAssembly.validate(
      new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])
    )
  } catch {
    return false
  }
}

function detectThreads(): boolean {
  try {
    return typeof SharedArrayBuffer !== 'undefined' && typeof Atomics !== 'undefined' && crossOriginIsolated
  } catch {
    return false
  }
}

export interface SystemCapabilities {
  webgpu: boolean
  simd: boolean
  threads: boolean
  crossOriginIsolated: boolean
}

export async function detectCapabilities(): Promise<SystemCapabilities> {
  const webgpu = await detectWebGPU()
  const simd = detectSIMD()
  const threads = detectThreads()
  const isolated = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated

  return { webgpu, simd, threads, crossOriginIsolated: isolated }
}

// --- Hybrid Embedding Engine ---

export class HybridEmbeddingEngine {
  private backend: BackendStatus = { type: 'none', reason: 'not initialized' }
  private session: any | null = null
  private transformersPipeline: any = null
  private tokenizer: any = null
  private logger: DebugLogger
  private config: EmbeddingConfig
  private initializationAttempted = false

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = {
      modelDim: 384,
      maxSeqLength: 512,
      debugLevel: config.debugLevel || 'info',
      ...config,
    }
    this.logger = new ConsoleDebugLogger(this.config.debugLevel)
  }

  /**
   * Initialize the embedding engine with automatic backend selection
   */
  async initialize(): Promise<BackendStatus> {
    // Prevent repeated initialization attempts that could cause loops
    if (this.initializationAttempted) {
      this.logger.warn('Initialize already attempted, returning current status')
      return this.backend
    }
    this.initializationAttempted = true

    this.logger.info('🚀 Initializing Hybrid Embedding Engine...')
    this.config.onProgress?.('Detecting browser capabilities...', 5)

    // Detect capabilities
    const caps = await detectCapabilities()
    this.logger.verbose('Browser capabilities:', caps)

    // Try ORT Web first (if enabled)
    if (ORT_ENABLED) {
      this.logger.info('📦 ORT Web enabled, attempting initialization...')
      const ortResult = await this.tryInitializeORT(caps)
      if (ortResult) {
        this.backend = ortResult
        this.config.onStatusChange?.(this.backend)
        this.config.onProgress?.('ORT Web ready!', 100)
        if (ortResult.type === 'ort') {
          this.logger.info(`✅ ORT Web initialized with ${ortResult.provider}`, { deviceInfo: ortResult.deviceInfo })
        }
        return this.backend
      }
    } else {
      this.logger.info('⚙️ ORT Web disabled (NEXT_PUBLIC_ENABLE_ORT !== "true")')
    }

    // Fallback to Transformers.js
    this.logger.info('📦 Falling back to Transformers.js...')
    this.config.onProgress?.('Loading Transformers.js model...', 50)
    const transformersResult = await this.tryInitializeTransformers()
    if (transformersResult) {
      this.backend = transformersResult
      this.config.onStatusChange?.(this.backend)
      this.config.onProgress?.('Transformers.js ready!', 100)
      this.logger.info('✅ Transformers.js initialized')
      return this.backend
    }

    // No backend available
    this.backend = { type: 'none', reason: 'All backends failed to initialize' }
    this.config.onStatusChange?.(this.backend)
    this.config.onProgress?.('Embedding unavailable, using lexical search', 100)
    this.logger.error('❌ No embedding backend available')
    return this.backend
  }

  /**
   * Attempt to initialize ONNX Runtime Web
   */
  private async tryInitializeORT(caps: Awaited<ReturnType<typeof detectCapabilities>>): Promise<BackendStatus | null> {
    try {
      this.logger.verbose('Importing onnxruntime-web...')
      const ort = await loadOrt()
      // Note: WASM paths set after execution provider detection

      // Determine best execution provider
      const providers: Array<'webgpu' | 'wasm'> = []
      let selectedProvider: 'webgpu' | 'wasm-simd-threaded' | 'wasm-simd' | 'wasm' = 'wasm'
      let deviceInfo = 'CPU (Wasm)'

      if (caps.webgpu) {
        providers.push('webgpu')
        selectedProvider = 'webgpu'
        deviceInfo = 'GPU (WebGPU)'
        this.logger.verbose('✓ WebGPU available')
      }

      providers.push('wasm')

      // Configure WASM paths - use CDN since ORT is loaded from CDN
      // Local /onnx-wasm/ often missing in static deployments
      const wasmPath = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/'
      try {
        ort.env.wasm.wasmPaths = wasmPath
        this.logger.verbose(`Set WASM path to: ${wasmPath}`)

        // Configure for non-isolated environment (GitHub Pages)
        if (!caps.crossOriginIsolated) {
          ort.env.wasm.numThreads = 1
          ort.env.wasm.proxy = false
          this.logger.verbose('Configured for non-isolated environment (single thread)')
        }

        // Reduce log verbosity
        if (ort.env) {
          ort.env.logLevel = 'warning'
        }
      } catch (err) {
        this.logger.warn(`Failed to set WASM path: ${wasmPath}`, err)
        throw new Error('Failed to configure WASM paths')
      }

      // Determine WASM variant
      if (selectedProvider === 'wasm') {
        if (caps.threads && caps.simd) {
          selectedProvider = 'wasm-simd-threaded'
          deviceInfo = 'CPU (SIMD + Threads)'
          this.logger.verbose('✓ SIMD + Threads available')
        } else if (caps.simd) {
          selectedProvider = 'wasm-simd'
          deviceInfo = 'CPU (SIMD only)'
          this.logger.verbose('✓ SIMD available, threads disabled')
        } else {
          this.logger.verbose('⚠ Basic WASM only (no SIMD/threads)')
        }
      }

      // Try to load model
      this.logger.verbose('Loading ONNX model...')
      let lastError: any = null

      for (const modelPath of MODEL_SOURCES) {
        try {
          this.logger.verbose(`Trying model: ${modelPath}`)
          this.session = await ort.InferenceSession.create(modelPath, {
            executionProviders: providers as any,
            graphOptimizationLevel: 'all',
            enableCpuMemArena: true,
            enableMemPattern: true,
          })
          this.logger.info(`✓ Loaded model from: ${modelPath}`)
          lastError = null
          break
        } catch (err: any) {
          this.logger.warn(`✗ Failed to load model from ${modelPath}:`, err.message)
          lastError = err
        }
      }

      if (!this.session) {
        throw new Error(`Failed to load ONNX model from any source. Last error: ${lastError?.message || 'unknown'}`)
      }

      // Load tokenizer (simplified, use @xenova/transformers tokenizer in production)
      await this.loadTokenizer()

      return {
        type: 'ort',
        provider: selectedProvider,
        deviceInfo,
      }
    } catch (err: any) {
      this.logger.error('ORT initialization failed:', err.message)
      return null
    }
  }

  /**
   * Load Transformers.js from CDN as a fallback
   * This works when the bundled import fails in static export
   */
  private async loadTransformersFromCDN(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Check if already loaded via global
      if (typeof window !== 'undefined' && (window as any).transformers) {
        this.logger.verbose('Transformers.js already loaded from global')
        resolve((window as any).transformers)
        return
      }

      this.logger.info('📦 Loading Transformers.js from CDN...')

      const script = document.createElement('script')
      script.src = TRANSFORMERS_CDN_URL
      script.type = 'module'
      script.async = true

      script.onload = () => {
        // Transformers.js exposes itself on window
        setTimeout(() => {
          if ((window as any).transformers) {
            this.logger.verbose('✓ Transformers.js loaded from CDN')
            resolve((window as any).transformers)
          } else {
            reject(new Error('Transformers.js CDN script loaded but global not found'))
          }
        }, 100)
      }

      script.onerror = () => {
        reject(new Error('Failed to load Transformers.js from CDN'))
      }

      document.head.appendChild(script)
    })
  }

  /**
   * Attempt to initialize Transformers.js
   * Tries multiple import strategies:
   * 1. Dynamic import (works if bundled correctly)
   * 2. Static import via CDN fallback
   */
  private async tryInitializeTransformers(): Promise<BackendStatus | null> {
    try {
      this.logger.info('🔄 Attempting Transformers.js initialization...')

      let transformersModule: any = null

      // Strategy 1: Try dynamic import (works if webpack bundled it)
      this.logger.verbose('Strategy 1: Trying dynamic import...')
      try {
        const dynamicImport = new Function('specifier', 'return import(specifier)')
        transformersModule = await dynamicImport('@huggingface/transformers')
        this.logger.verbose('✓ Dynamic import succeeded')
      } catch (importErr: any) {
        this.logger.verbose('Dynamic import failed:', importErr.message)

        // Strategy 2: Try importing from CDN
        this.logger.verbose('Strategy 2: Trying CDN import...')
        try {
          // Use ESM import from CDN
          const cdnUrl = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0/+esm'
          const dynamicCdnImport = new Function('url', 'return import(url)')
          transformersModule = await dynamicCdnImport(cdnUrl)
          this.logger.verbose('✓ CDN ESM import succeeded')
        } catch (cdnErr: any) {
          this.logger.verbose('CDN ESM import failed:', cdnErr.message)

          // Strategy 3: Load via script tag (UMD fallback)
          this.logger.verbose('Strategy 3: Trying script tag fallback...')
          try {
            transformersModule = await this.loadTransformersFromCDN()
          } catch (scriptErr: any) {
            this.logger.error('All Transformers.js import strategies failed')
            this.logger.info('Install with: pnpm add @huggingface/transformers')
            return null
          }
        }
      }

      const { pipeline } = transformersModule
      if (!pipeline) {
        this.logger.error('pipeline function not found in @huggingface/transformers')
        return null
      }

      this.logger.info(`📦 Loading Transformers.js model: ${TRANSFORMERS_MODEL}`)
      this.logger.verbose('This may take 30-60 seconds on first load...')

      this.transformersPipeline = await pipeline('feature-extraction', TRANSFORMERS_MODEL, {
        quantized: true,
      })

      this.logger.info('✅ Transformers.js pipeline created successfully')

      return {
        type: 'transformers',
        provider: 'wasm',
      }
    } catch (err: any) {
      this.logger.error('❌ Transformers.js initialization failed:', err.message)
      this.logger.verbose('Full error:', err)
      return null
    }
  }

  /**
   * Load tokenizer (simplified word-based for now)
   */
  private async loadTokenizer(): Promise<void> {
    // In production, load a proper BERT tokenizer
    // For now, use a minimal stub
    this.tokenizer = {
      encode: (text: string) => {
        const words = text.toLowerCase().split(/\s+/)
        return [101, ...words.map(() => 100), 102] // [CLS] + tokens + [SEP]
      },
    }
    this.logger.verbose('Tokenizer loaded (minimal stub)')
  }

  /**
   * Embed text into a vector
   */
  async embedText(text: string): Promise<Float32Array | null> {
    if (this.backend.type === 'none') {
      this.logger.warn('embedText called but no backend available')
      return null
    }

    try {
      if (this.backend.type === 'ort' && this.session) {
        return await this.embedWithORT(text)
      } else if (this.backend.type === 'transformers' && this.transformersPipeline) {
        return await this.embedWithTransformers(text)
      }
    } catch (err: any) {
      this.logger.error('Embedding failed:', err.message)
    }

    return null
  }

  /**
   * Embed text using ORT
   */
  private async embedWithORT(text: string): Promise<Float32Array> {
    if (!this.session || !this.tokenizer) {
      throw new Error('ORT session or tokenizer not initialized')
    }

    // Tokenize
    const tokens = this.tokenizer.encode(text)
    const inputIds = new Int32Array(tokens)
    const attentionMask = new Int32Array(tokens.map(() => 1))

    // Import ort for Tensor
    const ort = await loadOrt()

    // Create tensors
    const inputIdsTensor = new ort.Tensor('int32', inputIds, [1, inputIds.length])
    const attentionMaskTensor = new ort.Tensor('int32', attentionMask, [1, attentionMask.length])

    // Run inference
    const outputs = await this.session.run({
      input_ids: inputIdsTensor,
      attention_mask: attentionMaskTensor,
    })

    // Extract embeddings (mean pooling over sequence)
    const lastHiddenState = outputs.last_hidden_state || outputs[Object.keys(outputs)[0]]
    const embeddings = lastHiddenState.data as Float32Array
    const seqLen = inputIds.length
    const hiddenSize = this.config.modelDim

    const pooled = new Float32Array(hiddenSize)
    for (let i = 0; i < hiddenSize; i++) {
      let sum = 0
      for (let j = 0; j < seqLen; j++) {
        sum += embeddings[j * hiddenSize + i]
      }
      pooled[i] = sum / seqLen
    }

    return pooled
  }

  /**
   * Embed text using Transformers.js
   */
  private async embedWithTransformers(text: string): Promise<Float32Array> {
    if (!this.transformersPipeline) {
      throw new Error('Transformers pipeline not initialized')
    }

    const result = await this.transformersPipeline(text, {
      pooling: 'mean',
      normalize: true,
    })

    return new Float32Array(result.data)
  }

  /**
   * Get current backend status
   */
  getStatus(): BackendStatus {
    return this.backend
  }

  /**
   * Get human-readable status description
   */
  getStatusDescription(): string {
    if (this.backend.type === 'ort') {
      return `ONNX Runtime (${this.backend.deviceInfo})`
    } else if (this.backend.type === 'transformers') {
      return 'Transformers.js (CPU)'
    } else {
      return `Unavailable: ${this.backend.reason}`
    }
  }

  /**
   * Check if embeddings are available
   */
  isReady(): boolean {
    return this.backend.type !== 'none'
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: Float32Array | number[], b: Float32Array | number[]): number {
    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }
}