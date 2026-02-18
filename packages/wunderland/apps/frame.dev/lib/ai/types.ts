/**
 * AI Enhancement Suite - Type Definitions
 * @module lib/ai/types
 * 
 * @description
 * Shared types for Vision AI, RAG Pipeline, and Writing Assistant features.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   AI PREFERENCES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * User preferences for AI features
 */
export interface AIPreferences {
  /** Vision AI settings */
  vision: {
    enabled: boolean
    /** Preferred provider for vision tasks */
    provider?: 'openai' | 'anthropic'
    /** Auto-analyze images on upload */
    autoAnalyze: boolean
    /** Analysis features to enable */
    analysisFeatures: {
      /** AI-generated captions/descriptions */
      aiCaption: boolean
      /** Screenshot detection and UI analysis */
      screenshotDetection: boolean
      /** EXIF metadata extraction */
      exifExtraction: boolean
      /** Object/scene detection (TensorFlow.js) */
      objectDetection: boolean
    }
  }
  /** RAG search settings */
  rag: {
    enabled: boolean
    /** Re-rank search results with AI */
    rerank: boolean
    /** Synthesize answers from results (Perplexity-style) */
    synthesize: boolean
  }
  /** Writing assistant settings */
  writingAssistant: {
    enabled: boolean
    /** Debounce delay in ms before triggering (300-1000) */
    triggerDelay: number
    /** Length of suggestions */
    suggestionLength: 'short' | 'medium' | 'long'
    /** Auto-trigger on pause (true) or only on Ctrl+Space (false) */
    autoTrigger: boolean
  }
  /** Image generation settings */
  imageGeneration: {
    enabled: boolean
    /** Default style preset */
    defaultStyle: ImageGenerationStyle
    /** Default image size */
    defaultSize: 'square' | 'landscape' | 'portrait'
    /** Show image gen button in floating toolbar */
    showInToolbar: boolean
  }
}

/**
 * Image generation style presets
 */
export type ImageGenerationStyle =
  | 'illustration'  // Book/editorial illustration style
  | 'photo'         // Realistic photography
  | 'diagram'       // Technical/explanatory diagram
  | 'sketch'        // Hand-drawn sketch look
  | 'watercolor'    // Artistic watercolor painting
  | '3d'            // Modern 3D render
  | 'pixel'         // Retro pixel art

/**
 * Image generation style metadata
 */
export interface ImageStyleInfo {
  id: ImageGenerationStyle
  name: string
  description: string
  promptPrefix: string
}

/**
 * Available image styles with metadata
 */
export const IMAGE_GENERATION_STYLES: ImageStyleInfo[] = [
  {
    id: 'illustration',
    name: 'Illustration',
    description: 'Book or editorial illustration style',
    promptPrefix: 'An elegant editorial illustration of',
  },
  {
    id: 'photo',
    name: 'Photo',
    description: 'Realistic photography',
    promptPrefix: 'A professional photograph of',
  },
  {
    id: 'diagram',
    name: 'Diagram',
    description: 'Technical or explanatory diagram',
    promptPrefix: 'A clean, modern technical diagram showing',
  },
  {
    id: 'sketch',
    name: 'Sketch',
    description: 'Hand-drawn sketch style',
    promptPrefix: 'A detailed hand-drawn sketch of',
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    description: 'Artistic watercolor painting',
    promptPrefix: 'A beautiful watercolor painting of',
  },
  {
    id: '3d',
    name: '3D Render',
    description: 'Modern 3D volumetric render',
    promptPrefix: 'A modern 3D render with volumetric lighting of',
  },
  {
    id: 'pixel',
    name: 'Pixel Art',
    description: 'Retro pixel art style',
    promptPrefix: 'Detailed pixel art in retro game style of',
  },
]

/**
 * Default AI preferences (all features off)
 */
export const DEFAULT_AI_PREFERENCES: AIPreferences = {
  vision: {
    enabled: false,
    provider: 'openai',
    autoAnalyze: true,
    analysisFeatures: {
      aiCaption: true,
      screenshotDetection: true,
      exifExtraction: true,
      objectDetection: false, // Off by default (large model)
    },
  },
  rag: {
    enabled: false,
    rerank: true,
    synthesize: true,
  },
  writingAssistant: {
    enabled: false,
    triggerDelay: 500,
    suggestionLength: 'medium',
    autoTrigger: true, // Auto-trigger on pause by default
  },
  imageGeneration: {
    enabled: false,
    defaultStyle: 'illustration',
    defaultSize: 'square',
    showInToolbar: true,
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI STATUS TYPES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Status of an AI feature
 */
export type AIFeatureStatus = 
  | 'ready'       // Feature is available and ready
  | 'working'     // Currently processing
  | 'disabled'    // Explicitly disabled by user
  | 'no-api-key'  // Missing required API keys
  | 'error'       // In error state (will auto-recover)

/**
 * Status info for display
 */
export interface AIStatusInfo {
  status: AIFeatureStatus
  message?: string
  lastError?: string
  lastErrorTime?: Date
}

/* ═══════════════════════════════════════════════════════════════════════════
   VISION AI TYPES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Image source type
 */
export type ImageSourceType =
  | 'camera'      // Captured with device camera
  | 'upload'      // Uploaded from file system
  | 'screenshot'  // Screenshot image
  | 'clipboard'   // Pasted from clipboard
  | 'unknown'     // Unable to determine

/**
 * EXIF metadata extracted from image
 */
export interface ImageMetadata {
  /** Image dimensions */
  dimensions: {
    width: number
    height: number
  }
  /** File size in bytes */
  fileSize: number
  /** MIME type */
  mimeType: string
  /** EXIF data (if available) */
  exif?: {
    /** Camera make (e.g., "Apple") */
    make?: string
    /** Camera model (e.g., "iPhone 14 Pro") */
    model?: string
    /** Software used (e.g., "macOS Screenshot") */
    software?: string
    /** Creation timestamp */
    dateTime?: string
    /** GPS coordinates */
    gps?: {
      latitude: number
      longitude: number
      altitude?: number
    }
    /** Orientation (1-8) */
    orientation?: number
    /** ISO speed */
    iso?: number
    /** Exposure time */
    exposureTime?: number
    /** F-number */
    fNumber?: number
  }
}

/**
 * Detected object in image (from TensorFlow.js)
 */
export interface ObjectDetection {
  /** Object class name */
  class: string
  /** Confidence score 0-1 */
  score: number
  /** Bounding box */
  bbox: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * Screenshot detection result
 */
export interface ScreenshotDetectionResult {
  /** Whether image is likely a screenshot */
  isScreenshot: boolean
  /** Confidence score 0-1 */
  confidence: number
  /** Reasoning for detection */
  reason: string
  /** Detection factors */
  factors?: {
    hasScreenshotSoftware?: boolean
    hasCommonResolution?: boolean
    hasSharpEdges?: boolean
    hasLowColorVariance?: boolean
  }
}

/**
 * Comprehensive image analysis result
 */
export interface ImageAnalysisResult {
  /** AI-generated caption/description */
  caption?: string
  /** Caption confidence 0-1 */
  captionConfidence?: number
  /** Image source type */
  sourceType: ImageSourceType
  /** Screenshot detection result */
  screenshotDetection?: ScreenshotDetectionResult
  /** Extracted metadata */
  metadata?: ImageMetadata
  /** Detected objects */
  objects?: ObjectDetection[]
  /** Analysis timestamp */
  analyzedAt: string
  /** Analysis status */
  status: 'idle' | 'analyzing' | 'done' | 'error'
  /** Error message if status is 'error' */
  error?: string
}

/**
 * Options for image analysis
 */
export interface ImageAnalysisOptions {
  /** Enable AI caption generation */
  generateCaption?: boolean
  /** Enable screenshot detection */
  detectScreenshot?: boolean
  /** Extract EXIF metadata */
  extractExif?: boolean
  /** Detect objects (TensorFlow.js) */
  detectObjects?: boolean
  /** Custom caption prompt */
  customPrompt?: string
  /** Preferred provider for caption */
  provider?: 'openai' | 'anthropic'
  /** Abort signal */
  signal?: AbortSignal
}

/**
 * Result from vision analysis (legacy, for ImageLightbox)
 */
export interface VisionAnalysisResult {
  /** Main description of the image */
  description: string
  /** Detected type of image */
  imageType: 'diagram' | 'chart' | 'screenshot' | 'photo' | 'illustration' | 'other'
  /** Key elements identified */
  elements?: string[]
  /** Structured data if chart/diagram */
  structure?: {
    type: string
    nodes?: string[]
    relationships?: string[]
  }
  /** Confidence score 0-1 */
  confidence: number
  /** Provider used */
  provider: 'openai' | 'anthropic'
  /** Processing time in ms */
  latency: number
}

/**
 * Options for vision analysis (legacy, for ImageLightbox)
 */
export interface VisionAnalysisOptions {
  /** Custom prompt for analysis */
  prompt?: string
  /** Preferred provider */
  provider?: 'openai' | 'anthropic'
  /** Max tokens for response */
  maxTokens?: number
  /** Abort signal */
  signal?: AbortSignal
}

/* ═══════════════════════════════════════════════════════════════════════════
   RAG TYPES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * RAG search modes
 */
export type RAGMode = 'local' | 'rerank' | 'synthesize'

/**
 * Options for RAG search
 */
export interface RAGOptions {
  /** Search mode */
  mode: RAGMode
  /** Max results to process */
  maxResults?: number
  /** Include content snippets in context */
  includeSnippets?: boolean
  /** Abort signal */
  signal?: AbortSignal
}

/**
 * A source citation for synthesized answers
 */
export interface RAGCitation {
  /** Index in sources array (1-based for display) */
  index: number
  /** Path to the source strand */
  path: string
  /** Title of the source */
  title: string
  /** Relevant snippet */
  snippet: string
  /** Relevance score 0-100 */
  relevance: number
}

/**
 * Result from RAG search
 */
export interface RAGSearchResult {
  /** Search mode used */
  mode: RAGMode
  /** Re-ranked results (for rerank mode) */
  rerankedResults?: Array<{
    path: string
    title: string
    snippet: string
    originalScore: number
    aiScore: number
  }>
  /** Synthesized answer (for synthesize mode) */
  synthesizedAnswer?: {
    /** The generated answer with inline citations like [1], [2] */
    answer: string
    /** Source citations */
    citations: RAGCitation[]
  }
  /** Processing time in ms */
  latency: number
  /** Provider used */
  provider: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   WRITING ASSISTANT TYPES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Context for writing suggestions
 */
export interface WritingContext {
  /** Text before cursor (last ~500 chars) */
  textBefore: string
  /** Text after cursor (next ~100 chars) */
  textAfter?: string
  /** Current paragraph text */
  currentParagraph?: string
  /** Strand metadata for context */
  metadata?: {
    title?: string
    tags?: string[]
    weave?: string
  }
}

/**
 * A writing suggestion
 */
export interface WritingSuggestion {
  /** The suggested text to insert */
  text: string
  /** Confidence score 0-1 */
  confidence: number
  /** Type of suggestion */
  type: 'completion' | 'continuation' | 'correction'
}

/**
 * Options for writing suggestions
 */
export interface WritingSuggestionOptions {
  /** Max length of suggestion */
  maxLength?: number
  /** Suggestion style */
  style?: 'short' | 'medium' | 'long'
  /** Temperature for generation */
  temperature?: number
  /** Abort signal */
  signal?: AbortSignal
}



