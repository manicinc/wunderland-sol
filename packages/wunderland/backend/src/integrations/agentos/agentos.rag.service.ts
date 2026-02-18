/**
 * @file agentos.rag.service.ts
 * @description RAG (Retrieval Augmented Generation) service for AgentOS backend.
 * Uses `@framers/sql-storage-adapter` for cross-platform persistent storage with
 * intelligent fallback (better-sqlite3 → IndexedDB → sql.js).
 *
 * @module AgentOSRagService
 * @version 2.0.0 - Refactored to use sql-storage-adapter properly
 *
 * @remarks
 * This service provides document ingestion, retrieval, and memory management
 * using SQL storage with automatic platform detection and fallback.
 *
 * Architecture:
 * ```
 * Backend API Routes
 *         ↓
 *    ragService (this file)
 *         ↓
 *   sql-storage-adapter
 *         ↓
 *   SQLite / PostgreSQL / IndexedDB
 * ```
 */

import {
  resolveStorageAdapter,
  type StorageAdapter,
  type StorageResolutionOptions,
} from '@framers/sql-storage-adapter';
import { createHash } from 'node:crypto';
import { AIModelProviderManager } from '@framers/agentos/core/llm/providers/AIModelProviderManager';
import type { ProviderConfigEntry } from '@framers/agentos/core/llm/providers/AIModelProviderManager';
import type { ChatMessage } from '@framers/agentos/core/llm/providers/IProvider';
import {
  EmbeddingManager,
  HnswlibVectorStore,
  QdrantVectorStore,
  SqlVectorStore,
} from '@framers/agentos/rag';
import type {
  IVectorStore,
  HnswlibVectorStoreConfig,
  QdrantVectorStoreConfig,
  SqlVectorStoreConfig,
} from '@framers/agentos/rag';
import type { EmbeddingManagerConfig } from '@framers/agentos/config/EmbeddingManagerConfiguration';
import type { QueryOptions } from '@framers/agentos/rag/IVectorStore';
import type { RetrievedVectorDocument } from '@framers/agentos/rag/IVectorStore';
import {
  CohereReranker,
  LocalCrossEncoderReranker,
  RerankerService,
} from '@framers/agentos/rag/reranking';
import type { RerankerInput } from '@framers/agentos/rag/reranking';
import type {
  GraphRAGSearchOptions,
  GlobalSearchResult,
  IGraphRAGEngine,
  LocalSearchResult,
} from '@framers/agentos/rag/graphrag';
import { audioService } from '../../core/audio/audio.service.js';
import type { ISttOptions } from '../../core/audio/stt.interfaces.js';

type RagRetrievalPreset = 'fast' | 'balanced' | 'accurate';
type RagVectorProvider = 'sql' | 'qdrant' | 'hnswlib';

const firstNonEmptyEnv = (...names: string[]): string | undefined => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
};

const coerceOllamaBaseURL = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `http://${trimmed}`;
};

const parsePositiveIntEnv = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const coerceRagPreset = (value: string | undefined): RagRetrievalPreset | undefined => {
  const preset = value?.trim().toLowerCase();
  if (preset === 'fast' || preset === 'balanced' || preset === 'accurate') return preset;
  return undefined;
};

const coerceRagVectorProvider = (value: string | undefined): RagVectorProvider | undefined => {
  const provider = value?.trim().toLowerCase();
  if (provider === 'sql' || provider === 'qdrant' || provider === 'hnswlib' || provider === 'hnsw')
    return provider === 'hnsw' ? 'hnswlib' : provider;
  return undefined;
};

const parseBooleanEnv = (value: string | undefined): boolean | undefined => {
  if (!value) return undefined;
  const lowered = value.trim().toLowerCase();
  if (lowered === 'true' || lowered === '1' || lowered === 'yes' || lowered === 'y') return true;
  if (lowered === 'false' || lowered === '0' || lowered === 'no' || lowered === 'n') return false;
  return undefined;
};

const parseJsonSafe = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const isMetadataScalar = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

const sanitizeGraphRagMetadata = (
  metadata: Record<string, unknown> | undefined
): Record<string, any> | undefined => {
  if (!metadata) return undefined;
  const out: Record<string, any> = {};
  for (const [key, raw] of Object.entries(metadata)) {
    if (raw === null || raw === undefined) continue;
    if (isMetadataScalar(raw)) {
      out[key] = raw;
      continue;
    }
    if (Array.isArray(raw)) {
      const items: Array<string | number | boolean> = [];
      for (const item of raw) {
        if (item === null || item === undefined) continue;
        if (isMetadataScalar(item)) items.push(item);
        else items.push(JSON.stringify(item));
      }
      out[key] = items;
      continue;
    }
    out[key] = JSON.stringify(raw);
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

// ============================================================================
// Types
// ============================================================================

/**
 * Document to ingest into RAG memory.
 */
export interface RagDocumentInput {
  /** Unique identifier (auto-generated if not provided) */
  documentId?: string;
  /** Text content to ingest */
  content: string;
  /** Collection to store in */
  collectionId?: string;
  /** Memory category */
  category?: 'conversation_memory' | 'knowledge_base' | 'user_notes' | 'system' | 'custom';
  /** Document metadata */
  metadata?: {
    agentId?: string;
    userId?: string;
    type?: string;
    tags?: string[];
    source?: string;
    title?: string;
    [key: string]: unknown;
  };
  /** Chunking options */
  chunkingOptions?: {
    chunkSize?: number;
    chunkOverlap?: number;
    strategy?: 'fixed' | 'semantic' | 'sentence';
  };
}

/**
 * Result of document ingestion.
 */
export interface RagIngestionResult {
  success: boolean;
  documentId: string;
  collectionId: string;
  chunksCreated: number;
  error?: string;
}

/**
 * Query options for RAG retrieval.
 */
export interface RagQueryOptions {
  /** Query text */
  query: string;
  /**
   * Retrieval preset override for this request.
   *
   * - `fast`: vector-only when available; no hybrid; no rerank
   * - `balanced`: hybrid when available (vector + lexical), otherwise vector-only
   * - `accurate`: `balanced` + cross-encoder reranking (when configured)
   *
   * When omitted, uses `AGENTOS_RAG_PRESET` (default: `balanced`).
   */
  preset?: RagRetrievalPreset;
  /** Collections to search */
  collectionIds?: string[];
  /** Maximum chunks to return */
  topK?: number;
  /** Minimum similarity threshold */
  similarityThreshold?: number;
  /** Metadata filters */
  filters?: {
    agentId?: string;
    userId?: string;
    category?: string;
    tags?: string[];
    [key: string]: unknown;
  };
  /** Include metadata in results */
  includeMetadata?: boolean;
  /**
   * Optional post-retrieval strategy.
   *
   * - `similarity` (default): return chunks ordered by similarity score.
   * - `mmr`: apply Maximal Marginal Relevance (MMR) to diversify results.
   */
  strategy?: 'similarity' | 'mmr';
  /** Strategy-specific parameters. */
  strategyParams?: {
    /** MMR lambda in [0,1]. Higher favors relevance over diversity. Default: `0.7`. */
    mmrLambda?: number;
    /** Candidate pool multiplier for MMR. Default: `5`. */
    mmrCandidateMultiplier?: number;
  };
  /**
   * Optional additional query variants to run retrieval against.
   *
   * The backend will run retrieval for the base `query` plus these variants,
   * then merge and de-duplicate results.
   */
  queryVariants?: string[];
  /**
   * Optional LLM-powered query rewriting to generate additional query variants.
   *
   * This is disabled by default and may incur an extra model call when enabled.
   */
  rewrite?: {
    enabled?: boolean;
    /** Max number of generated variants (in addition to the base `query`). Default: `2`. */
    maxVariants?: number;
  };
}

/**
 * A retrieved chunk from RAG memory.
 */
export interface RagRetrievedChunk {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/**
 * Result of RAG query.
 */
export interface RagQueryResult {
  success: boolean;
  query: string;
  chunks: RagRetrievedChunk[];
  totalResults: number;
  processingTimeMs: number;
}

/**
 * RAG memory statistics.
 */
export interface RagMemoryStats {
  totalDocuments: number;
  totalChunks: number;
  collections: Array<{
    collectionId: string;
    documentCount: number;
    chunkCount: number;
  }>;
  storageUsedBytes?: number;
  lastIngestionAt?: string;
}

/**
 * Collection info.
 */
export interface RagCollection {
  collectionId: string;
  displayName: string;
  documentCount: number;
  chunkCount: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Supported multimodal asset types for RAG indexing.
 */
export type RagMediaModality = 'image' | 'audio';

/**
 * Input payload for ingesting a multimodal asset (image/audio) into RAG.
 *
 * The default implementation indexes assets by deriving a **text representation**
 * (image caption / OCR text / audio transcript) and storing that text as a normal
 * RAG document. The raw bytes are optionally persisted for later retrieval.
 */
export interface RagMediaAssetInput {
  /** Stable identifier for the asset (auto-generated if omitted). */
  assetId?: string;
  /** Collection/namespace to store the derived RAG document into. */
  collectionId?: string;
  /** Asset modality. */
  modality: RagMediaModality;
  /** MIME type of the asset (e.g., image/png, audio/webm). */
  mimeType: string;
  /** Original file name (best-effort metadata). */
  originalFileName?: string;
  /** Raw bytes for the asset. Optional when `sourceUrl` is supplied and `storePayload=false`. */
  payload?: Buffer;
  /** Optional pointer (URL) to the asset when not storing payload bytes. */
  sourceUrl?: string;
  /** Optional metadata stored alongside the derived RAG document chunks. */
  metadata?: Record<string, unknown>;
  /** Optional tag list stored in derived document metadata. */
  tags?: string[];
  /** Optional category to store the derived document under. Default: `custom`. */
  category?: 'conversation_memory' | 'knowledge_base' | 'user_notes' | 'system' | 'custom';
  /**
   * Optional precomputed text representation (caption/transcript).
   * When provided, the service skips captioning/transcription.
   */
  textRepresentation?: string;
  /** If true, stores the raw payload bytes (base64) in the RAG database. Default: env-driven. */
  storePayload?: boolean;
  /** User ID for attribution/cost tracking (optional). */
  userId?: string;
  /** Agent ID for attribution (optional). */
  agentId?: string;
}

/**
 * Stored multimodal asset record.
 */
export interface RagMediaAsset {
  assetId: string;
  collectionId: string;
  modality: RagMediaModality;
  mimeType: string;
  originalFileName?: string | null;
  sourceUrl?: string | null;
  contentHashHex?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Result of a multimodal ingestion request.
 */
export interface RagMediaIngestionResult {
  success: boolean;
  assetId: string;
  collectionId: string;
  modality: RagMediaModality;
  /** The derived RAG documentId (currently equal to `assetId`). */
  documentId: string;
  /** Derived text representation used for indexing. */
  textRepresentation: string;
  chunksCreated: number;
  error?: string;
}

/**
 * Multimodal query options.
 */
export interface RagMediaQueryOptions {
  /** Text query. */
  query: string;
  /** Restrict to specific modalities. Default: both `image` and `audio`. */
  modalities?: RagMediaModality[];
  /** Collection(s) to search. When omitted, defaults to modality-specific collections. */
  collectionIds?: string[];
  /** Maximum number of assets to return. */
  topK?: number;
  /** Include chunk metadata in results. */
  includeMetadata?: boolean;
}

/**
 * Multimodal query response (grouped by asset).
 */
export interface RagMediaQueryResult {
  success: boolean;
  query: string;
  assets: Array<{
    asset: RagMediaAsset;
    /** Best matching chunk for this asset. */
    bestChunk: RagRetrievedChunk;
  }>;
  totalResults: number;
  processingTimeMs: number;
  /** Optional error message when `success=false`. */
  error?: string;
}

/**
 * Document summary.
 */
export interface RagDocumentSummary {
  documentId: string;
  collectionId: string;
  category: string;
  chunkCount: number;
  metadata: Record<string, unknown>;
  createdAt: number;
}

// ============================================================================
// Database Row Types
// ============================================================================

interface CollectionRow {
  collection_id: string;
  display_name: string;
  document_count: number;
  chunk_count: number;
  created_at: number;
  updated_at: number;
}

interface DocumentRow {
  document_id: string;
  collection_id: string;
  category: string;
  content: string;
  metadata_json: string | null;
  created_at: number;
  updated_at: number;
}

interface ChunkRow {
  chunk_id: string;
  document_id: string;
  collection_id: string;
  content: string;
  chunk_index: number;
  metadata_json: string | null;
  created_at: number;
}

interface MediaAssetRow {
  asset_id: string;
  collection_id: string;
  modality: string;
  mime_type: string;
  original_filename: string | null;
  payload_base64: string | null;
  source_url: string | null;
  content_hash_hex: string | null;
  metadata_json: string | null;
  created_at: number;
  updated_at: number;
}

// ============================================================================
// SQL RAG Store Implementation
// ============================================================================

/**
 * SQL-backed RAG store using sql-storage-adapter.
 * Provides persistent storage with automatic platform fallback.
 */
class SqlRagStore {
  private adapter: StorageAdapter | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private tablePrefix = 'rag_';

  // Optional vector index (TypeScript-only via AgentOS SqlVectorStore).
  private vectorStore: IVectorStore | null = null;
  private vectorStoreInitialized = false;
  private vectorStoreInitPromise: Promise<void> | null = null;
  private vectorTablePrefix = 'rag_vec_';
  private vectorProvider: RagVectorProvider = 'sql';

  // Optional embedding + reranking subsystem (lazy; requires provider access).
  private providerManagerInitPromise: Promise<void> | null = null;
  private embeddingInitPromise: Promise<void> | null = null;
  private embeddingStatus: 'uninitialized' | 'enabled' | 'disabled' = 'uninitialized';
  private embeddingDisabledReason?: string;
  private providerManager?: AIModelProviderManager;
  private embeddingManager?: EmbeddingManager;
  private embeddingModel?: { providerId: string; modelId: string; dimension: number };
  private rerankerService?: RerankerService;
  private rerankWarningLogged = false;

  // Optional GraphRAG subsystem (disabled by default; enabled via env).
  private graphRagInitPromise: Promise<void> | null = null;
  private graphRagStatus: 'uninitialized' | 'enabled' | 'disabled' = 'uninitialized';
  private graphRagDisabledReason?: string;
  private graphRagEngine?: IGraphRAGEngine;
  private graphRagWarningLogged = false;

  // Optional multimodal (image) embedding subsystem (Transformers.js; install-on-demand).
  private mediaImageEmbedInitPromise: Promise<void> | null = null;
  private mediaImageEmbedStatus: 'uninitialized' | 'enabled' | 'disabled' = 'uninitialized';
  private mediaImageEmbedDisabledReason?: string;
  private mediaImageFeatureExtractor?: any;
  private mediaImageFeatureExtractorModelId?: string;
  private mediaImageEmbeddingDimension?: number;
  private mediaImageEmbedWarningLogged = false;

  // Optional multimodal (audio) embedding subsystem (Transformers.js; install-on-demand).
  private mediaAudioEmbedInitPromise: Promise<void> | null = null;
  private mediaAudioEmbedStatus: 'uninitialized' | 'enabled' | 'disabled' = 'uninitialized';
  private mediaAudioEmbedDisabledReason?: string;
  private mediaAudioProcessor?: any;
  private mediaAudioModel?: any;
  private mediaAudioEmbedModelId?: string;
  private mediaAudioEmbeddingDimension?: number;
  private mediaAudioEmbedSampleRate?: number;
  private mediaAudioEmbedWarningLogged = false;

  /**
   * Initialize the storage adapter and create schema.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      // Resolve storage adapter with intelligent fallback
      const envFilePath = process.env.RAG_DATABASE_PATH;
      const options: StorageResolutionOptions = {
        // Treat an explicitly-set empty string as "in-memory/no persistence" for sql.js.
        filePath: envFilePath !== undefined ? envFilePath : './data/rag_store.db',
        priority: process.env.RAG_STORAGE_PRIORITY
          ? (process.env.RAG_STORAGE_PRIORITY.split(',') as any[])
          : undefined,
        postgres: process.env.RAG_DATABASE_URL
          ? { connectionString: process.env.RAG_DATABASE_URL }
          : undefined,
      };

      console.log('[RAG Service] Resolving storage adapter...', {
        filePath: options.filePath,
        hasPostgres: !!options.postgres,
      });

      this.adapter = await resolveStorageAdapter(options);

      // Create schema
      await this.createSchema();

      // Initialize the optional vector index schema (no embeddings required yet).
      try {
        await this.ensureVectorStoreInitialized(this.adapter);
      } catch (vectorError: any) {
        console.warn(
          `[RAG Service] Vector index initialization failed (continuing with keyword-only RAG): ${
            vectorError?.message ?? vectorError
          }`
        );
      }

      this.initialized = true;
      console.log(`[RAG Service] Initialized with adapter: ${this.adapter.kind}`);
    } catch (error) {
      console.error('[RAG Service] Initialization failed:', error);
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Create database schema for RAG storage.
   */
  private async createSchema(): Promise<void> {
    if (!this.adapter) throw new Error('Adapter not initialized');

    // Collections table
    await this.adapter.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tablePrefix}collections (
        collection_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        document_count INTEGER NOT NULL DEFAULT 0,
        chunk_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Documents table
    await this.adapter.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tablePrefix}documents (
        document_id TEXT PRIMARY KEY,
        collection_id TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'knowledge_base',
        content TEXT NOT NULL,
        metadata_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (collection_id) REFERENCES ${this.tablePrefix}collections(collection_id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}docs_collection 
        ON ${this.tablePrefix}documents(collection_id);
      
      CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}docs_category 
        ON ${this.tablePrefix}documents(category);
    `);

    // Chunks table - stores chunked content for retrieval
    await this.adapter.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tablePrefix}chunks (
        chunk_id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        collection_id TEXT NOT NULL,
        content TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        metadata_json TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (document_id) REFERENCES ${this.tablePrefix}documents(document_id) ON DELETE CASCADE,
        FOREIGN KEY (collection_id) REFERENCES ${this.tablePrefix}collections(collection_id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}chunks_document 
        ON ${this.tablePrefix}chunks(document_id);
      
      CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}chunks_collection 
        ON ${this.tablePrefix}chunks(collection_id);
    `);

    // Multimodal assets table (image/audio). The derived caption/transcript is indexed as a normal RAG document.
    await this.adapter.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tablePrefix}media_assets (
        asset_id TEXT PRIMARY KEY,
        collection_id TEXT NOT NULL,
        modality TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        original_filename TEXT,
        payload_base64 TEXT,
        source_url TEXT,
        content_hash_hex TEXT,
        metadata_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (collection_id) REFERENCES ${this.tablePrefix}collections(collection_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}media_assets_collection
        ON ${this.tablePrefix}media_assets(collection_id);

      CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}media_assets_modality
        ON ${this.tablePrefix}media_assets(modality);

      CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}media_assets_hash
        ON ${this.tablePrefix}media_assets(content_hash_hex);
    `);

    // Try to create FTS5 index for full-text search (SQLite only)
    try {
      await this.adapter.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS ${this.tablePrefix}chunks_fts 
        USING fts5(
          chunk_id,
          content,
          content='${this.tablePrefix}chunks',
          content_rowid='rowid'
        );
      `);

      // External content FTS tables require triggers to stay in sync.
      // If these fail (non-SQLite adapters), we fall back to keyword matching.
      await this.adapter.exec(`
        CREATE TRIGGER IF NOT EXISTS ${this.tablePrefix}chunks_ai AFTER INSERT ON ${this.tablePrefix}chunks BEGIN
          INSERT INTO ${this.tablePrefix}chunks_fts(rowid, chunk_id, content)
          VALUES (new.rowid, new.chunk_id, new.content);
        END;
        CREATE TRIGGER IF NOT EXISTS ${this.tablePrefix}chunks_ad AFTER DELETE ON ${this.tablePrefix}chunks BEGIN
          INSERT INTO ${this.tablePrefix}chunks_fts(${this.tablePrefix}chunks_fts, rowid, chunk_id, content)
          VALUES ('delete', old.rowid, old.chunk_id, old.content);
        END;
        CREATE TRIGGER IF NOT EXISTS ${this.tablePrefix}chunks_au AFTER UPDATE ON ${this.tablePrefix}chunks BEGIN
          INSERT INTO ${this.tablePrefix}chunks_fts(${this.tablePrefix}chunks_fts, rowid, chunk_id, content)
          VALUES ('delete', old.rowid, old.chunk_id, old.content);
          INSERT INTO ${this.tablePrefix}chunks_fts(rowid, chunk_id, content)
          VALUES (new.rowid, new.chunk_id, new.content);
        END;
      `);

      // If the index is empty but we already have chunks, rebuild once.
      try {
        const chunkCount = await this.adapter.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM ${this.tablePrefix}chunks`
        );
        const ftsCount = await this.adapter.get<{ count: number }>(
          `SELECT COUNT(*) as count FROM ${this.tablePrefix}chunks_fts`
        );
        if ((chunkCount?.count ?? 0) > 0 && (ftsCount?.count ?? 0) === 0) {
          await this.adapter.exec(
            `INSERT INTO ${this.tablePrefix}chunks_fts(${this.tablePrefix}chunks_fts) VALUES('rebuild');`
          );
        }
      } catch {
        // Ignore; worst case keyword fallback still works.
      }

      console.log('[RAG Service] FTS5 full-text search enabled');
    } catch {
      console.log('[RAG Service] FTS5 not available, using keyword matching');
    }
  }

  private resolveVectorTablePrefix(): string {
    return (
      firstNonEmptyEnv('AGENTOS_RAG_VECTOR_TABLE_PREFIX', 'RAG_VECTOR_TABLE_PREFIX')?.trim() ||
      'rag_vec_'
    );
  }

  private resolveVectorProvider(): RagVectorProvider {
    return (
      coerceRagVectorProvider(
        firstNonEmptyEnv('AGENTOS_RAG_VECTOR_PROVIDER', 'RAG_VECTOR_PROVIDER')
      ) || 'sql'
    );
  }

  private async ensureVectorStoreInitialized(adapter: StorageAdapter): Promise<void> {
    if (this.vectorStoreInitialized) return;
    if (this.vectorStoreInitPromise) return this.vectorStoreInitPromise;

    this.vectorStoreInitPromise = (async () => {
      this.vectorProvider = this.resolveVectorProvider();

      if (this.vectorProvider === 'qdrant') {
        const url = firstNonEmptyEnv('AGENTOS_RAG_QDRANT_URL', 'QDRANT_URL');
        if (!url) {
          throw new Error(
            'Qdrant vector provider selected but no URL configured. Set `AGENTOS_RAG_QDRANT_URL` (or `QDRANT_URL`).'
          );
        }

        const timeoutMs =
          parsePositiveIntEnv(
            firstNonEmptyEnv('AGENTOS_RAG_QDRANT_TIMEOUT_MS', 'QDRANT_TIMEOUT_MS')
          ) ?? 15_000;
        const enableBm25 =
          parseBooleanEnv(firstNonEmptyEnv('AGENTOS_RAG_QDRANT_ENABLE_BM25')) ?? true;

        const store = new QdrantVectorStore();
        const config: QdrantVectorStoreConfig = {
          id: 'agentos-rag-vector-qdrant',
          type: 'qdrant',
          url,
          apiKey: firstNonEmptyEnv('AGENTOS_RAG_QDRANT_API_KEY', 'QDRANT_API_KEY'),
          timeoutMs,
          enableBm25,
        };

        await store.initialize(config);
        this.vectorStore = store;
        this.vectorStoreInitialized = true;
        console.log(`[RAG Service] Vector index ready (provider='qdrant' url='${url}').`);
        return;
      }

      if (this.vectorProvider === 'hnswlib') {
        const envPersistDirectory =
          process.env.AGENTOS_RAG_HNSWLIB_PERSIST_DIR ?? process.env.RAG_HNSWLIB_PERSIST_DIR;
        const persistDirectory =
          envPersistDirectory !== undefined
            ? envPersistDirectory.trim() || undefined
            : './db_data/agentos_rag_hnswlib';

        const preset = this.getRetrievalPreset();
        const presetDefaults =
          preset === 'fast'
            ? { efConstruction: 100, efSearch: 64 }
            : preset === 'accurate'
              ? { efConstruction: 400, efSearch: 200 }
              : { efConstruction: 200, efSearch: 100 };

        const store = new HnswlibVectorStore();
        const config: HnswlibVectorStoreConfig = {
          id: 'agentos-rag-vector-hnswlib',
          type: 'hnswlib',
          persistDirectory,
          similarityMetric: 'cosine',
          hnswM: parsePositiveIntEnv(firstNonEmptyEnv('AGENTOS_RAG_HNSWLIB_M')) ?? undefined,
          hnswEfConstruction:
            parsePositiveIntEnv(firstNonEmptyEnv('AGENTOS_RAG_HNSWLIB_EF_CONSTRUCTION')) ??
            presetDefaults.efConstruction,
          hnswEfSearch:
            parsePositiveIntEnv(firstNonEmptyEnv('AGENTOS_RAG_HNSWLIB_EF_SEARCH')) ??
            presetDefaults.efSearch,
        };

        await store.initialize(config);
        this.vectorStore = store;
        this.vectorStoreInitialized = true;
        console.log(
          `[RAG Service] Vector index ready (provider='hnswlib' persistDirectory='${
            persistDirectory ?? 'memory'
          }').`
        );
        return;
      }

      // Default: SQL vector store (local)
      this.vectorTablePrefix = this.resolveVectorTablePrefix();
      const store = new SqlVectorStore();
      const config: SqlVectorStoreConfig = {
        id: 'agentos-rag-vector-sql',
        type: 'sql',
        adapter,
        tablePrefix: this.vectorTablePrefix,
        enableFullTextSearch: true,
      };

      await store.initialize(config);
      this.vectorStore = store;
      this.vectorStoreInitialized = true;
      console.log(
        `[RAG Service] Vector index ready (provider='sql' tablePrefix='${this.vectorTablePrefix}').`
      );
    })().finally(() => {
      this.vectorStoreInitPromise = null;
    });

    return this.vectorStoreInitPromise;
  }

  /**
   * Ensure adapter is initialized.
   */
  private async ensureInitialized(): Promise<StorageAdapter> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.adapter) {
      throw new Error('RAG storage adapter not initialized');
    }
    return this.adapter;
  }

  /**
   * Check if service is available.
   */
  isAvailable(): boolean {
    return this.initialized && this.adapter !== null;
  }

  /**
   * Get adapter kind for diagnostics.
   */
  getAdapterKind(): string {
    return this.adapter?.kind ?? 'not-initialized';
  }

  // ==========================================================================
  // Collection Operations
  // ==========================================================================

  /**
   * Create a collection if it doesn't exist.
   */
  async createCollection(collectionId: string, displayName?: string): Promise<void> {
    const adapter = await this.ensureInitialized();
    const now = Date.now();

    const existing = await adapter.get<CollectionRow>(
      `SELECT collection_id FROM ${this.tablePrefix}collections WHERE collection_id = ?`,
      [collectionId]
    );

    if (!existing) {
      await adapter.run(
        `INSERT INTO ${this.tablePrefix}collections 
         (collection_id, display_name, document_count, chunk_count, created_at, updated_at)
         VALUES (?, ?, 0, 0, ?, ?)`,
        [collectionId, displayName || collectionId, now, now]
      );
      console.log(`[RAG Service] Collection '${collectionId}' created`);
    }
  }

  /**
   * List all collections.
   */
  async listCollections(): Promise<RagCollection[]> {
    const adapter = await this.ensureInitialized();

    const rows = await adapter.all<CollectionRow>(
      `SELECT * FROM ${this.tablePrefix}collections ORDER BY updated_at DESC`
    );

    return rows.map((row) => ({
      collectionId: row.collection_id,
      displayName: row.display_name,
      documentCount: row.document_count,
      chunkCount: row.chunk_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Delete a collection and all its documents.
   */
  async deleteCollection(collectionId: string): Promise<boolean> {
    const adapter = await this.ensureInitialized();

    // Delete chunks first
    await adapter.run(`DELETE FROM ${this.tablePrefix}chunks WHERE collection_id = ?`, [
      collectionId,
    ]);

    // Delete documents
    await adapter.run(`DELETE FROM ${this.tablePrefix}documents WHERE collection_id = ?`, [
      collectionId,
    ]);

    // Delete collection
    const result = await adapter.run(
      `DELETE FROM ${this.tablePrefix}collections WHERE collection_id = ?`,
      [collectionId]
    );

    // Best-effort cleanup in the vector index (does not require embeddings).
    try {
      await this.ensureVectorStoreInitialized(adapter);
      await this.vectorStore?.deleteCollection?.(collectionId);
    } catch {
      // Ignore; legacy store remains the source of truth.
    }

    return result.changes > 0;
  }

  private getRetrievalPreset(): RagRetrievalPreset {
    return coerceRagPreset(firstNonEmptyEnv('AGENTOS_RAG_PRESET', 'RAG_PRESET')) ?? 'balanced';
  }

  private getHybridAlpha(): number {
    const raw = Number(firstNonEmptyEnv('AGENTOS_RAG_HYBRID_ALPHA', 'RAG_HYBRID_ALPHA'));
    return Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0.7;
  }

  private buildEmbeddingProviderConfigs(): ProviderConfigEntry[] {
    const providers: ProviderConfigEntry[] = [];

    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
    const explicitProvider = firstNonEmptyEnv('AGENTOS_RAG_EMBED_PROVIDER', 'RAG_EMBED_PROVIDER')
      ?.trim()
      .toLowerCase();

    const ollamaEnabled =
      parseBooleanEnv(
        firstNonEmptyEnv('AGENTOS_RAG_OLLAMA_ENABLED', 'RAG_OLLAMA_ENABLED', 'OLLAMA_ENABLED')
      ) ?? false;
    const ollamaConfiguredBaseURL =
      coerceOllamaBaseURL(process.env.OLLAMA_BASE_URL) ??
      coerceOllamaBaseURL(process.env.OLLAMA_HOST);
    const shouldIncludeOllama = explicitProvider === 'ollama' || ollamaEnabled;

    if (shouldIncludeOllama) {
      const requestTimeout =
        parsePositiveIntEnv(
          firstNonEmptyEnv('AGENTOS_RAG_OLLAMA_REQUEST_TIMEOUT_MS', 'RAG_OLLAMA_REQUEST_TIMEOUT_MS')
        ) ??
        parsePositiveIntEnv(process.env.OLLAMA_REQUEST_TIMEOUT_MS) ??
        5_000;
      providers.push({
        providerId: 'ollama',
        enabled: true,
        isDefault: explicitProvider === 'ollama' || (!openaiKey && !openrouterKey),
        config: {
          baseURL: ollamaConfiguredBaseURL ?? 'http://localhost:11434',
          requestTimeout,
        },
      });
    }

    if (openaiKey) {
      providers.push({
        providerId: 'openai',
        enabled: true,
        isDefault: explicitProvider === 'openai' || (!explicitProvider && !shouldIncludeOllama),
        config: { apiKey: openaiKey },
      });
    }

    if (openrouterKey) {
      providers.push({
        providerId: 'openrouter',
        enabled: true,
        isDefault:
          explicitProvider === 'openrouter' ||
          (!explicitProvider && !shouldIncludeOllama && !openaiKey),
        config: { apiKey: openrouterKey },
      });
    }

    return providers;
  }

  private buildEmbeddingCandidates(
    providerManager: AIModelProviderManager
  ): Array<{ providerId: string; modelId: string }> {
    const explicitProvider = firstNonEmptyEnv(
      'AGENTOS_RAG_EMBED_PROVIDER',
      'RAG_EMBED_PROVIDER'
    )?.trim();
    const explicitModel = firstNonEmptyEnv('AGENTOS_RAG_EMBED_MODEL', 'RAG_EMBED_MODEL')?.trim();

    const candidates: Array<{ providerId: string; modelId: string }> = [];

    if (explicitProvider) {
      const providerId = explicitProvider.trim().toLowerCase();
      if (explicitModel) {
        candidates.push({ providerId, modelId: explicitModel });
        return candidates;
      }
      if (providerId === 'ollama') {
        candidates.push({
          providerId,
          modelId:
            firstNonEmptyEnv('OLLAMA_EMBED_MODEL', 'OLLAMA_EMBEDDING_MODEL') || 'nomic-embed-text',
        });
        return candidates;
      }
      if (providerId === 'openai') {
        candidates.push({ providerId, modelId: 'text-embedding-3-small' });
        return candidates;
      }
      if (providerId === 'openrouter') {
        candidates.push({ providerId, modelId: 'openai/text-embedding-3-small' });
        return candidates;
      }

      candidates.push({ providerId, modelId: explicitModel || 'unknown' });
      return candidates;
    }

    if (providerManager.getProvider('ollama')) {
      candidates.push({
        providerId: 'ollama',
        modelId:
          firstNonEmptyEnv('OLLAMA_EMBED_MODEL', 'OLLAMA_EMBEDDING_MODEL') || 'nomic-embed-text',
      });
    }
    if (providerManager.getProvider('openai')) {
      candidates.push({ providerId: 'openai', modelId: 'text-embedding-3-small' });
    }
    if (providerManager.getProvider('openrouter')) {
      candidates.push({ providerId: 'openrouter', modelId: 'openai/text-embedding-3-small' });
    }

    return candidates;
  }

  private async probeEmbeddingModel(
    providerManager: AIModelProviderManager
  ): Promise<{ providerId: string; modelId: string; dimension: number }> {
    const candidates = this.buildEmbeddingCandidates(providerManager);
    const probeText = 'dimension probe';

    const errors: string[] = [];
    for (const candidate of candidates) {
      const provider = providerManager.getProvider(candidate.providerId);
      if (!provider) {
        errors.push(`${candidate.providerId}: provider not initialized`);
        continue;
      }
      if (typeof provider.generateEmbeddings !== 'function') {
        errors.push(`${candidate.providerId}: embeddings not supported`);
        continue;
      }

      try {
        const resp = await provider.generateEmbeddings(candidate.modelId, [probeText], {});
        const embedding = resp?.data?.[0]?.embedding;
        if (!Array.isArray(embedding) || embedding.length === 0) {
          errors.push(`${candidate.providerId}/${candidate.modelId}: empty embedding`);
          continue;
        }
        return {
          providerId: candidate.providerId,
          modelId: candidate.modelId,
          dimension: embedding.length,
        };
      } catch (err: any) {
        errors.push(`${candidate.providerId}/${candidate.modelId}: ${err?.message ?? String(err)}`);
      }
    }

    throw new Error(
      `No embedding provider/model is available for AgentOS RAG. Configure Ollama or set OPENAI_API_KEY/OPENROUTER_API_KEY. Errors: ${errors.join(
        '; '
      )}`
    );
  }

  /**
   * Initializes the provider manager (OpenAI/OpenRouter/Ollama) without enabling embeddings.
   *
   * This is used for multimodal ingestion (e.g. image captioning) and other LLM-only workflows
   * that should continue to work even when vector embeddings are unavailable.
   */
  private async ensureProviderManagerInitialized(): Promise<AIModelProviderManager> {
    if (this.providerManager?.isInitialized) return this.providerManager;
    if (this.providerManagerInitPromise) {
      await this.providerManagerInitPromise;
      return this.providerManager ?? new AIModelProviderManager();
    }

    const providerManager = this.providerManager ?? new AIModelProviderManager();
    this.providerManager = providerManager;

    this.providerManagerInitPromise = (async () => {
      await providerManager.initialize({ providers: this.buildEmbeddingProviderConfigs() });
    })().finally(() => {
      this.providerManagerInitPromise = null;
    });

    await this.providerManagerInitPromise;
    return providerManager;
  }

  private async ensureEmbeddingsInitialized(adapter: StorageAdapter): Promise<void> {
    if (this.embeddingStatus === 'enabled') return;
    if (this.embeddingStatus === 'disabled') {
      throw new Error(this.embeddingDisabledReason ?? 'AgentOS RAG embeddings are disabled.');
    }
    if (this.embeddingInitPromise) return this.embeddingInitPromise;

    this.embeddingInitPromise = (async () => {
      // Vector store is purely local; embeddings may require network access.
      await this.ensureVectorStoreInitialized(adapter);

      const providerManager = await this.ensureProviderManagerInitialized();
      const embed = await this.probeEmbeddingModel(providerManager);
      const embeddingConfig: EmbeddingManagerConfig = {
        embeddingModels: [
          {
            providerId: embed.providerId,
            modelId: embed.modelId,
            dimension: embed.dimension,
            isDefault: true,
          },
        ],
        defaultModelId: embed.modelId,
        enableCache: true,
        cacheMaxSize: 50_000,
        cacheTTLSeconds: 60 * 60,
      };

      const embeddingManager = new EmbeddingManager();
      await embeddingManager.initialize(embeddingConfig, providerManager);

      this.embeddingManager = embeddingManager;
      this.embeddingModel = embed;

      // Optional reranker service (Cohere if available; otherwise local).
      const cohereKey = process.env.COHERE_API_KEY?.trim();
      const providers = [
        { providerId: 'local', defaultModelId: 'cross-encoder/ms-marco-MiniLM-L-6-v2' },
      ] as any[];
      if (cohereKey) {
        providers.push({ providerId: 'cohere', apiKey: cohereKey, defaultModelId: 'rerank-v3.5' });
      }
      const reranker = new RerankerService({
        config: {
          providers,
          defaultProviderId: cohereKey ? 'cohere' : 'local',
        },
      });
      reranker.registerProvider(
        new LocalCrossEncoderReranker({
          providerId: 'local',
          defaultModelId: 'cross-encoder/ms-marco-MiniLM-L-6-v2',
        })
      );
      if (cohereKey) {
        reranker.registerProvider(
          new CohereReranker({
            providerId: 'cohere',
            apiKey: cohereKey,
            defaultModelId: 'rerank-v3.5',
          })
        );
      }
      this.rerankerService = reranker;

      this.embeddingStatus = 'enabled';
      console.log(
        `[RAG Service] Vector retrieval enabled (provider='${embed.providerId}' model='${embed.modelId}' dim=${embed.dimension}).`
      );
    })()
      .catch((err: any) => {
        this.embeddingStatus = 'disabled';
        this.embeddingDisabledReason = err?.message
          ? String(err.message)
          : 'Embedding subsystem initialization failed.';
        console.warn(`[RAG Service] Vector retrieval disabled: ${this.embeddingDisabledReason}`);
        throw err;
      })
      .finally(() => {
        this.embeddingInitPromise = null;
      });

    return this.embeddingInitPromise;
  }

  private isGraphRagEnabled(): boolean {
    return (
      parseBooleanEnv(firstNonEmptyEnv('AGENTOS_GRAPHRAG_ENABLED', 'GRAPHRAG_ENABLED')) ?? false
    );
  }

  private normalizeGraphRagKey(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase();
  }

  private parseCsvAllowList(value: string | undefined): Set<string> | null {
    const raw = value?.trim();
    if (!raw) return null;
    const items = raw
      .split(',')
      .map((v) => this.normalizeGraphRagKey(v))
      .filter(Boolean);
    return items.length > 0 ? new Set(items) : null;
  }

  private resolveGraphRagCategoryAllowList(): Set<string> | null {
    return this.parseCsvAllowList(firstNonEmptyEnv('AGENTOS_GRAPHRAG_CATEGORIES'));
  }

  private resolveGraphRagCollectionAllowList(): Set<string> | null {
    return this.parseCsvAllowList(firstNonEmptyEnv('AGENTOS_GRAPHRAG_COLLECTIONS'));
  }

  private resolveGraphRagCollectionDenyList(): Set<string> {
    return (
      this.parseCsvAllowList(firstNonEmptyEnv('AGENTOS_GRAPHRAG_EXCLUDE_COLLECTIONS')) ?? new Set()
    );
  }

  private isGraphRagIndexMediaAssetsEnabled(): boolean {
    return (
      parseBooleanEnv(
        firstNonEmptyEnv('AGENTOS_GRAPHRAG_INDEX_MEDIA_ASSETS', 'GRAPHRAG_INDEX_MEDIA_ASSETS')
      ) ?? false
    );
  }

  private resolveGraphRagMaxDocChars(): number | null {
    const parsed = parsePositiveIntEnv(
      firstNonEmptyEnv('AGENTOS_GRAPHRAG_MAX_DOC_CHARS', 'GRAPHRAG_MAX_DOC_CHARS')
    );
    return typeof parsed === 'number' ? parsed : null;
  }

  private shouldIngestGraphRagDocument(input: {
    category: string;
    collectionId: string;
    isMediaAsset: boolean;
    content: string;
  }): boolean {
    if (!this.isGraphRagEnabled()) return false;

    const normalizedCategory = this.normalizeGraphRagKey(input.category);
    if (!normalizedCategory) return false;

    // Default: keep GraphRAG focused on longer-lived knowledge docs (avoid indexing rolling memory by accident).
    const categoryAllow = this.resolveGraphRagCategoryAllowList();
    if (!categoryAllow) {
      if (normalizedCategory !== 'knowledge_base') return false;
    } else if (!categoryAllow.has(normalizedCategory)) {
      return false;
    }

    const normalizedCollection = this.normalizeGraphRagKey(input.collectionId);
    if (!normalizedCollection) return false;

    const deny = this.resolveGraphRagCollectionDenyList();
    if (deny.has(normalizedCollection)) return false;

    const allow = this.resolveGraphRagCollectionAllowList();
    if (allow && !allow.has(normalizedCollection)) return false;

    if (input.isMediaAsset && !this.isGraphRagIndexMediaAssetsEnabled()) return false;

    const maxChars = this.resolveGraphRagMaxDocChars();
    if (maxChars && String(input.content ?? '').length > maxChars) return false;

    return true;
  }

  private buildGraphRagLlmProvider():
    | {
        generateText: (
          prompt: string,
          options?: { maxTokens?: number; temperature?: number }
        ) => Promise<string>;
      }
    | undefined {
    const enabled =
      parseBooleanEnv(firstNonEmptyEnv('AGENTOS_GRAPHRAG_LLM_ENABLED', 'GRAPHRAG_LLM_ENABLED')) ??
      false;
    if (!enabled) return undefined;
    if (!this.providerManager) {
      console.warn(
        '[RAG Service] GraphRAG LLM is enabled but provider manager is not initialized; continuing without GraphRAG summaries.'
      );
      return undefined;
    }

    const explicitProviderId = firstNonEmptyEnv(
      'AGENTOS_GRAPHRAG_LLM_PROVIDER',
      'GRAPHRAG_LLM_PROVIDER'
    )
      ?.trim()
      .toLowerCase();
    const providerId =
      explicitProviderId ||
      (this.providerManager.getProvider('openrouter')
        ? 'openrouter'
        : this.providerManager.getProvider('openai')
          ? 'openai'
          : this.providerManager.getProvider('ollama')
            ? 'ollama'
            : '');

    if (!providerId) {
      console.warn(
        '[RAG Service] GraphRAG LLM is enabled but no provider is available; continuing without GraphRAG summaries.'
      );
      return undefined;
    }

    const provider = this.providerManager.getProvider(providerId);
    if (!provider) {
      console.warn(
        `[RAG Service] GraphRAG LLM provider '${providerId}' is not initialized; continuing without GraphRAG summaries.`
      );
      return undefined;
    }

    const explicitModelId = firstNonEmptyEnv(
      'AGENTOS_GRAPHRAG_LLM_MODEL',
      'GRAPHRAG_LLM_MODEL'
    )?.trim();
    const modelId =
      explicitModelId ||
      (providerId === 'openrouter'
        ? process.env.MODEL_PREF_OPENROUTER_DEFAULT?.trim() || 'openai/gpt-4o-mini'
        : providerId === 'openai'
          ? process.env.AGENTOS_DEFAULT_MODEL_ID?.trim() || 'gpt-4o-mini'
          : process.env.OLLAMA_MODEL?.trim() || 'llama3');

    return {
      generateText: async (
        prompt: string,
        options?: { maxTokens?: number; temperature?: number }
      ) => {
        const response = await provider.generateCompletion(
          modelId,
          [{ role: 'user', content: prompt }],
          {
            maxTokens: options?.maxTokens,
            temperature: options?.temperature,
          }
        );

        const choice = response?.choices?.[0];
        const content = choice?.message?.content;
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
          return content
            .map((part: any) =>
              part?.type === 'text' && typeof part?.text === 'string' ? part.text : ''
            )
            .join('');
        }
        if (typeof choice?.text === 'string') return choice.text;
        return '';
      },
    };
  }

  private async ensureGraphRagInitialized(adapter: StorageAdapter): Promise<void> {
    if (!this.isGraphRagEnabled()) return;
    if (this.graphRagStatus === 'enabled') return;
    if (this.graphRagStatus === 'disabled') return;
    if (this.graphRagInitPromise) return this.graphRagInitPromise;

    this.graphRagInitPromise = (async () => {
      // GraphRAG can run in a degraded "text-only" mode when embeddings are unavailable.
      // Try to initialize vector/embedding subsystems, but never fail GraphRAG solely because
      // an embedding provider is not configured.
      try {
        await this.ensureVectorStoreInitialized(adapter);
      } catch {
        // Ignore; GraphRAG can still run without a vector store (text matching fallback).
      }

      let canUseEmbeddings = false;
      try {
        await this.ensureEmbeddingsInitialized(adapter);
        canUseEmbeddings = Boolean(
          this.vectorStore && this.embeddingManager && this.embeddingModel
        );
      } catch (embedError: any) {
        canUseEmbeddings = false;
        const message = embedError?.message ?? String(embedError);
        console.warn(
          `[RAG Service] GraphRAG running without embeddings (text-only fallback). Configure embeddings for best results. ${message}`
        );
      }

      const rawEngineId =
        firstNonEmptyEnv('AGENTOS_GRAPHRAG_ENGINE_ID', 'GRAPHRAG_ENGINE_ID')?.trim() ||
        'agentos-graphrag';
      const engineId =
        rawEngineId
          .toLowerCase()
          .replace(/[^a-z0-9_-]+/g, '_')
          .slice(0, 60) || 'agentos-graphrag';

      const tablePrefix =
        firstNonEmptyEnv('AGENTOS_GRAPHRAG_TABLE_PREFIX', 'GRAPHRAG_TABLE_PREFIX')?.trim() ||
        'rag_graphrag_';
      const entityCollectionName =
        firstNonEmptyEnv(
          'AGENTOS_GRAPHRAG_ENTITY_COLLECTION',
          'GRAPHRAG_ENTITY_COLLECTION'
        )?.trim() || `${engineId}_entities`;
      const communityCollectionName =
        firstNonEmptyEnv(
          'AGENTOS_GRAPHRAG_COMMUNITY_COLLECTION',
          'GRAPHRAG_COMMUNITY_COLLECTION'
        )?.trim() || `${engineId}_communities`;
      const generateEntityEmbeddingsRequested =
        parseBooleanEnv(
          firstNonEmptyEnv('AGENTOS_GRAPHRAG_ENTITY_EMBEDDINGS', 'GRAPHRAG_ENTITY_EMBEDDINGS')
        ) ?? true;
      const generateEntityEmbeddings = Boolean(
        generateEntityEmbeddingsRequested && canUseEmbeddings
      );

      // Dynamic import keeps GraphRAG optional (peer deps like graphology can be missing in some deployments).
      const { GraphRAGEngine } = await import('@framers/agentos/rag/graphrag');

      // Optional: LLM summaries. Best-effort only.
      const llmEnabled =
        parseBooleanEnv(firstNonEmptyEnv('AGENTOS_GRAPHRAG_LLM_ENABLED', 'GRAPHRAG_LLM_ENABLED')) ??
        false;
      if (llmEnabled) {
        try {
          await this.ensureProviderManagerInitialized();
        } catch (llmInitError: any) {
          console.warn(
            `[RAG Service] GraphRAG LLM provider initialization failed; continuing without summaries. ${
              llmInitError?.message ?? llmInitError
            }`
          );
        }
      }
      const llmProvider = this.buildGraphRagLlmProvider();
      const engine = new GraphRAGEngine({
        vectorStore: canUseEmbeddings ? (this.vectorStore ?? undefined) : undefined,
        embeddingManager: canUseEmbeddings ? (this.embeddingManager ?? undefined) : undefined,
        llmProvider,
        persistenceAdapter: adapter as any,
      });

      const initConfig: any = {
        engineId,
        tablePrefix,
        generateEntityEmbeddings,
        entityCollectionName,
        communityCollectionName,
      };
      if (canUseEmbeddings && this.embeddingModel) {
        initConfig.embeddingModelId = this.embeddingModel.modelId;
        initConfig.embeddingDimension = this.embeddingModel.dimension;
      }

      await engine.initialize(initConfig);

      this.graphRagEngine = engine;
      this.graphRagStatus = 'enabled';
      console.log(`[RAG Service] GraphRAG enabled (engineId='${engineId}').`);
    })()
      .catch((err: any) => {
        this.graphRagStatus = 'disabled';
        this.graphRagDisabledReason = err?.message
          ? String(err.message)
          : 'GraphRAG initialization failed.';
        if (!this.graphRagWarningLogged) {
          this.graphRagWarningLogged = true;
          console.warn(`[RAG Service] GraphRAG disabled: ${this.graphRagDisabledReason}`);
        }
      })
      .finally(() => {
        this.graphRagInitPromise = null;
      });

    return this.graphRagInitPromise;
  }

  private async requireGraphRagEngine(adapter: StorageAdapter): Promise<IGraphRAGEngine> {
    if (!this.isGraphRagEnabled()) {
      throw new Error(
        'GraphRAG is not enabled. Set `AGENTOS_GRAPHRAG_ENABLED=true` (and optionally `AGENTOS_GRAPHRAG_LLM_ENABLED=true`).'
      );
    }

    await this.ensureGraphRagInitialized(adapter);
    if (this.graphRagEngine) return this.graphRagEngine;

    throw new Error(
      this.graphRagDisabledReason ?? 'GraphRAG is not available (initialization failed).'
    );
  }

  private async ensureVectorCollection(collectionId: string): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Vector store is not initialized.');
    }
    if (!this.embeddingModel) {
      throw new Error('Embedding model is not initialized.');
    }

    if (this.vectorStore.collectionExists && this.vectorStore.createCollection) {
      const exists = await this.vectorStore.collectionExists(collectionId);
      if (!exists) {
        await this.vectorStore.createCollection(collectionId, this.embeddingModel.dimension, {
          similarityMetric: 'cosine',
        });
      }
    }
  }

  private async upsertVectorChunks(input: {
    adapter: StorageAdapter;
    collectionId: string;
    documentId: string;
    documentCategory: string;
    chunks: Array<{ chunkId: string; content: string; chunkIndex: number }>;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    if (input.chunks.length === 0) return;

    await this.ensureEmbeddingsInitialized(input.adapter);
    if (!this.embeddingManager || !this.embeddingModel || !this.vectorStore) {
      throw new Error('Vector subsystem not initialized.');
    }

    await this.ensureVectorCollection(input.collectionId);

    const chunkDocs = input.chunks
      .map((chunk) => ({
        id: chunk.chunkId,
        content: chunk.content,
        metadata: {
          ...(input.metadata ?? {}),
          __ragDocumentId: input.documentId,
          __ragCollectionId: input.collectionId,
          __ragDocumentCategory: input.documentCategory,
          __ragChunkIndex: chunk.chunkIndex,
        },
      }))
      .filter((doc) => doc.content.trim().length > 0);

    if (chunkDocs.length === 0) return;

    const embedResp = await this.embeddingManager.generateEmbeddings({
      texts: chunkDocs.map((c) => c.content),
      modelId: this.embeddingModel.modelId,
    });

    if (!Array.isArray(embedResp.embeddings) || embedResp.embeddings.length !== chunkDocs.length) {
      throw new Error(
        `Embedding batch size mismatch. Expected ${chunkDocs.length}, got ${embedResp.embeddings?.length ?? 0}.`
      );
    }

    await this.vectorStore.upsert(
      input.collectionId,
      chunkDocs.map((doc, idx) => ({
        id: doc.id,
        embedding: embedResp.embeddings[idx]!,
        textContent: doc.content,
        metadata: doc.metadata as any,
      })),
      { overwrite: true }
    );
  }

  // ==========================================================================
  // Document Operations
  // ==========================================================================

  private async upsertDocumentWithChunks(
    trx: StorageAdapter,
    input: {
      documentId: string;
      collectionId: string;
      category: string;
      content: string;
      metadataJson: string | null;
      now: number;
      chunks: string[];
    }
  ): Promise<void> {
    // Insert/replace document row.
    await trx.run(
      `INSERT OR REPLACE INTO ${this.tablePrefix}documents 
       (document_id, collection_id, category, content, metadata_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.documentId,
        input.collectionId,
        input.category,
        input.content,
        input.metadataJson,
        input.now,
        input.now,
      ]
    );

    // Delete existing chunks for this document (update semantics).
    await trx.run(`DELETE FROM ${this.tablePrefix}chunks WHERE document_id = ?`, [
      input.documentId,
    ]);

    // Insert chunks.
    for (let i = 0; i < input.chunks.length; i++) {
      const chunkId = `${input.documentId}_chunk_${i}`;
      await trx.run(
        `INSERT INTO ${this.tablePrefix}chunks 
         (chunk_id, document_id, collection_id, content, chunk_index, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          chunkId,
          input.documentId,
          input.collectionId,
          input.chunks[i],
          i,
          input.metadataJson,
          input.now,
        ]
      );
    }

    // Update collection counts.
    await this.updateCollectionCounts(trx, input.collectionId);
  }

  /**
   * Ingest a document into RAG storage.
   */
  async ingestDocument(input: RagDocumentInput): Promise<RagIngestionResult> {
    const adapter = await this.ensureInitialized();
    const now = Date.now();

    const documentId = input.documentId || `doc_${now}_${Math.random().toString(36).slice(2, 10)}`;
    const collectionId = input.collectionId || 'default';
    const category = input.category || 'knowledge_base';

    try {
      const previousDoc = await adapter.get<Pick<DocumentRow, 'collection_id' | 'category'>>(
        `SELECT collection_id, category FROM ${this.tablePrefix}documents WHERE document_id = ?`,
        [documentId]
      );

      const previousCollectionId = previousDoc?.collection_id;
      const previousCategory = previousDoc?.category;

      const previousChunkRows = await adapter.all<Pick<ChunkRow, 'chunk_id'>>(
        `SELECT chunk_id FROM ${this.tablePrefix}chunks WHERE document_id = ?`,
        [documentId]
      );
      const previousChunkIds = previousChunkRows.map((r) => r.chunk_id).filter(Boolean);

      // Ensure collection exists
      await this.createCollection(collectionId);

      // Chunk the content
      const chunkSize = input.chunkingOptions?.chunkSize || 512;
      const chunkOverlap = input.chunkingOptions?.chunkOverlap || 50;
      const chunks = this.chunkContent(input.content, chunkSize, chunkOverlap);
      const nextChunkIds = chunks.map(
        (_content, chunkIndex) => `${documentId}_chunk_${chunkIndex}`
      );
      const nextChunkIdSet = new Set(nextChunkIds);

      // Use transaction for atomicity
      await adapter.transaction(async (trx) => {
        await this.upsertDocumentWithChunks(trx, {
          documentId,
          collectionId,
          category,
          content: input.content,
          metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
          now,
          chunks,
        });
      });

      // Best-effort: keep the vector index in sync (does not affect canonical SQL writes).
      try {
        await this.upsertVectorChunks({
          adapter,
          collectionId,
          documentId,
          documentCategory: category,
          chunks: chunks.map((content, chunkIndex) => ({
            chunkId: `${documentId}_chunk_${chunkIndex}`,
            content,
            chunkIndex,
          })),
          metadata: (input.metadata ?? null) as any,
        });
      } catch (vectorError: any) {
        console.warn(
          `[RAG Service] Vector indexing failed for document '${documentId}' (continuing): ${
            vectorError?.message ?? vectorError
          }`
        );
      }

      // Best-effort: clean up stale vector chunks (update semantics) without forcing embeddings init.
      try {
        await this.ensureVectorStoreInitialized(adapter);

        if (previousCollectionId && previousCollectionId !== collectionId) {
          // Document moved collections: remove all previous vectors from the old collection.
          if (previousChunkIds.length > 0) {
            await this.vectorStore?.delete(previousCollectionId, previousChunkIds);
          }
        } else {
          const staleChunkIds = previousChunkIds.filter((id) => !nextChunkIdSet.has(id));
          if (staleChunkIds.length > 0) {
            await this.vectorStore?.delete(collectionId, staleChunkIds);
          }
        }
      } catch {
        // Ignore; canonical SQL writes already happened.
      }

      // Optional: GraphRAG sync (disabled by default; best-effort).
      const shouldIndexGraphNow = this.shouldIngestGraphRagDocument({
        category,
        collectionId,
        isMediaAsset: false,
        content: input.content,
      });
      const shouldIndexGraphBefore =
        previousCategory && previousCollectionId
          ? this.shouldIngestGraphRagDocument({
              category: previousCategory,
              collectionId: previousCollectionId,
              isMediaAsset: false,
              content: '',
            })
          : false;

      if (shouldIndexGraphNow) {
        try {
          await this.ensureGraphRagInitialized(adapter);
          await this.graphRagEngine?.ingestDocuments([
            {
              id: documentId,
              content: input.content,
              metadata: sanitizeGraphRagMetadata(input.metadata),
            },
          ]);
        } catch (graphError: any) {
          console.warn(
            `[RAG Service] GraphRAG indexing failed for document '${documentId}' (continuing): ${
              graphError?.message ?? graphError
            }`
          );
        }
      } else if (shouldIndexGraphBefore) {
        try {
          await this.ensureGraphRagInitialized(adapter);
          await this.graphRagEngine?.removeDocuments([documentId]);
        } catch (graphError: any) {
          console.warn(
            `[RAG Service] GraphRAG cleanup failed for document '${documentId}' (continuing): ${
              graphError?.message ?? graphError
            }`
          );
        }
      }

      console.log(`[RAG Service] Document '${documentId}' ingested with ${chunks.length} chunks`);

      return {
        success: true,
        documentId,
        collectionId,
        chunksCreated: chunks.length,
      };
    } catch (error: any) {
      console.error('[RAG Service] Ingestion failed:', error);
      return {
        success: false,
        documentId,
        collectionId,
        chunksCreated: 0,
        error: error.message,
      };
    }
  }

  // ==========================================================================
  // Multimodal Asset Operations
  // ==========================================================================

  private resolveMediaStorePayloadDefault(): boolean {
    return (
      parseBooleanEnv(
        firstNonEmptyEnv(
          'AGENTOS_RAG_MEDIA_STORE_PAYLOAD',
          'RAG_MEDIA_STORE_PAYLOAD',
          'AGENTOS_MULTIMODAL_STORE_PAYLOAD'
        )
      ) ?? false
    );
  }

  private resolveMediaCollectionId(modality: RagMediaModality, provided?: string): string {
    const explicit = provided?.trim();
    if (explicit) return explicit;

    if (modality === 'image') {
      return (
        firstNonEmptyEnv(
          'AGENTOS_RAG_MEDIA_IMAGE_COLLECTION_ID',
          'AGENTOS_RAG_MEDIA_IMAGE_COLLECTION',
          'AGENTOS_MULTIMODAL_IMAGE_COLLECTION_ID'
        )?.trim() || 'media_images'
      );
    }

    return (
      firstNonEmptyEnv(
        'AGENTOS_RAG_MEDIA_AUDIO_COLLECTION_ID',
        'AGENTOS_RAG_MEDIA_AUDIO_COLLECTION',
        'AGENTOS_MULTIMODAL_AUDIO_COLLECTION_ID'
      )?.trim() || 'media_audio'
    );
  }

  private isMediaImageEmbeddingsEnabled(): boolean {
    return (
      parseBooleanEnv(
        firstNonEmptyEnv(
          'AGENTOS_RAG_MEDIA_IMAGE_EMBEDDINGS_ENABLED',
          'AGENTOS_MULTIMODAL_IMAGE_EMBEDDINGS_ENABLED'
        )
      ) ?? false
    );
  }

  private resolveMediaImageEmbeddingModelId(): string {
    return (
      firstNonEmptyEnv(
        'AGENTOS_RAG_MEDIA_IMAGE_EMBED_MODEL',
        'AGENTOS_MULTIMODAL_IMAGE_EMBED_MODEL'
      )?.trim() || 'Xenova/clip-vit-base-patch32'
    );
  }

  private resolveMediaImageEmbeddingCollectionId(baseCollectionId: string): string {
    const suffixRaw =
      firstNonEmptyEnv(
        'AGENTOS_RAG_MEDIA_IMAGE_EMBED_COLLECTION_SUFFIX',
        'AGENTOS_MULTIMODAL_IMAGE_EMBED_COLLECTION_SUFFIX'
      )?.trim() || '_img';

    const suffix = suffixRaw.replace(/[^a-z0-9_-]+/gi, '_') || '_img';
    const base = (baseCollectionId || '').trim() || 'media_images';
    const sanitizedBase =
      base
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .slice(0, 60) || 'media_images';

    return sanitizedBase.endsWith(suffix) ? sanitizedBase : `${sanitizedBase}${suffix}`;
  }

  private isMediaAudioEmbeddingsEnabled(): boolean {
    return (
      parseBooleanEnv(
        firstNonEmptyEnv(
          'AGENTOS_RAG_MEDIA_AUDIO_EMBEDDINGS_ENABLED',
          'AGENTOS_MULTIMODAL_AUDIO_EMBEDDINGS_ENABLED'
        )
      ) ?? false
    );
  }

  private resolveMediaAudioEmbeddingModelId(): string {
    return (
      firstNonEmptyEnv(
        'AGENTOS_RAG_MEDIA_AUDIO_EMBED_MODEL',
        'AGENTOS_MULTIMODAL_AUDIO_EMBED_MODEL'
      )?.trim() || 'Xenova/clap-htsat-unfused'
    );
  }

  private resolveMediaAudioEmbeddingCollectionId(baseCollectionId: string): string {
    const suffixRaw =
      firstNonEmptyEnv(
        'AGENTOS_RAG_MEDIA_AUDIO_EMBED_COLLECTION_SUFFIX',
        'AGENTOS_MULTIMODAL_AUDIO_EMBED_COLLECTION_SUFFIX'
      )?.trim() || '_aud';

    const suffix = suffixRaw.replace(/[^a-z0-9_-]+/gi, '_') || '_aud';
    const base = (baseCollectionId || '').trim() || 'media_audio';
    const sanitizedBase =
      base
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .slice(0, 60) || 'media_audio';

    return sanitizedBase.endsWith(suffix) ? sanitizedBase : `${sanitizedBase}${suffix}`;
  }

  private l2NormalizeVector(values: number[]): number[] {
    let sumSquares = 0;
    for (const v of values) {
      const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
      sumSquares += n * n;
    }
    const norm = Math.sqrt(sumSquares);
    if (!(norm > 0)) return values.map(() => 0);
    return values.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v / norm : 0));
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return 0;
    if (a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      const av = typeof a[i] === 'number' && Number.isFinite(a[i]) ? a[i] : 0;
      const bv = typeof b[i] === 'number' && Number.isFinite(b[i]) ? b[i] : 0;
      dot += av * bv;
      normA += av * av;
      normB += bv * bv;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  private applyMMR<T extends { score: number; embedding?: number[] }>(input: {
    candidates: T[];
    topK: number;
    lambda: number;
    candidateMultiplier: number;
  }): T[] {
    const topK = Math.max(1, Math.floor(input.topK || 0));
    if (topK <= 1) return input.candidates.slice(0, topK);
    if (input.candidates.length <= 1) return input.candidates.slice(0, topK);

    const lambdaRaw = input.lambda;
    const lambda = Number.isFinite(lambdaRaw) ? Math.max(0, Math.min(1, lambdaRaw)) : 0.7;
    const multRaw = input.candidateMultiplier;
    const mult = Number.isFinite(multRaw) ? Math.max(1, Math.min(50, Math.floor(multRaw))) : 5;

    // Expect candidates sorted by relevance (score desc). Trim pool size to bound O(n^2).
    const poolSize = Math.min(input.candidates.length, Math.max(topK * mult, topK));
    const remaining = input.candidates.slice(0, poolSize);
    const selected: T[] = [];

    // Start from the most relevant candidate.
    selected.push(remaining.shift()!);

    while (selected.length < topK && remaining.length > 0) {
      let bestIdx = 0;
      let bestScore = Number.NEGATIVE_INFINITY;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const relevance =
          typeof candidate.score === 'number' && Number.isFinite(candidate.score)
            ? candidate.score
            : 0;

        let maxSim = 0;
        if (candidate.embedding && candidate.embedding.length > 0) {
          for (const already of selected) {
            if (!already.embedding || already.embedding.length === 0) continue;
            maxSim = Math.max(
              maxSim,
              this.cosineSimilarity(candidate.embedding, already.embedding)
            );
          }
        }

        const mmrScore = lambda * relevance - (1 - lambda) * maxSim;
        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIdx = i;
        }
      }

      selected.push(remaining.splice(bestIdx, 1)[0]);
    }

    return selected;
  }

  private async ensureMediaImageEmbedderInitialized(): Promise<void> {
    if (!this.isMediaImageEmbeddingsEnabled()) return;
    if (this.mediaImageEmbedStatus === 'enabled') return;
    if (this.mediaImageEmbedStatus === 'disabled') {
      throw new Error(
        this.mediaImageEmbedDisabledReason ??
          'Media image embeddings are disabled (previous initialization failed).'
      );
    }
    if (this.mediaImageEmbedInitPromise) return this.mediaImageEmbedInitPromise;

    this.mediaImageEmbedInitPromise = (async () => {
      const modelId = this.resolveMediaImageEmbeddingModelId();
      try {
        // Dynamic import to keep this optional; prefer Transformers.js v3+.
        const { pipeline, env } = await (async () => {
          try {
            return await import('@huggingface/transformers');
          } catch {
            return await import('@xenova/transformers');
          }
        })();

        const cacheDir =
          firstNonEmptyEnv(
            'AGENTOS_RAG_MEDIA_IMAGE_EMBED_CACHE_DIR',
            'AGENTOS_MULTIMODAL_IMAGE_EMBED_CACHE_DIR'
          )?.trim() || undefined;
        if (cacheDir) {
          env.cacheDir = cacheDir;
        }

        this.mediaImageFeatureExtractor = await pipeline('image-feature-extraction', modelId, {
          quantized: true,
        });
        this.mediaImageFeatureExtractorModelId = modelId;

        this.mediaImageEmbedStatus = 'enabled';
      } catch (error: any) {
        this.mediaImageEmbedStatus = 'disabled';
        this.mediaImageEmbedDisabledReason = error?.message
          ? String(error.message)
          : 'Media image embedder initialization failed.';
        throw error;
      } finally {
        this.mediaImageEmbedInitPromise = null;
      }
    })().catch((err: any) => {
      if (!this.mediaImageEmbedWarningLogged) {
        this.mediaImageEmbedWarningLogged = true;
        const message = err?.message ?? String(err);
        console.warn(`[RAG Service] Media image embeddings disabled: ${message}`);
        if (typeof message === 'string' && message.includes('Cannot find module')) {
          console.warn(
            `[RAG Service] Local image embeddings require installing Transformers.js (optional): '@huggingface/transformers' (preferred) or '@xenova/transformers'.`
          );
        }
      }
    });

    return this.mediaImageEmbedInitPromise;
  }

  private resolveMediaAudioEmbeddingSampleRate(processor: any): number {
    // Try common shapes for feature extractor sampling rate.
    const candidates = [
      processor?.feature_extractor?.sampling_rate,
      processor?.featureExtractor?.sampling_rate,
      processor?.processor?.feature_extractor?.sampling_rate,
      processor?.processor?.featureExtractor?.sampling_rate,
      processor?.config?.sampling_rate,
      processor?.config?.samplingRate,
    ];
    for (const value of candidates) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return Math.round(value);
      }
    }

    // CLAP models commonly use 48kHz; prefer that when unknown.
    return 48_000;
  }

  private async ensureMediaAudioEmbedderInitialized(): Promise<void> {
    if (!this.isMediaAudioEmbeddingsEnabled()) return;
    if (this.mediaAudioEmbedStatus === 'enabled') return;
    if (this.mediaAudioEmbedStatus === 'disabled') {
      throw new Error(
        this.mediaAudioEmbedDisabledReason ??
          'Media audio embeddings are disabled (previous initialization failed).'
      );
    }
    if (this.mediaAudioEmbedInitPromise) return this.mediaAudioEmbedInitPromise;

    this.mediaAudioEmbedInitPromise = (async () => {
      const modelId = this.resolveMediaAudioEmbeddingModelId();
      try {
        const mod: any = await (async () => {
          try {
            return await import('@huggingface/transformers');
          } catch {
            return await import('@xenova/transformers');
          }
        })();

        const cacheDir =
          firstNonEmptyEnv(
            'AGENTOS_RAG_MEDIA_AUDIO_EMBED_CACHE_DIR',
            'AGENTOS_MULTIMODAL_AUDIO_EMBED_CACHE_DIR'
          )?.trim() || undefined;
        if (cacheDir && mod?.env) {
          mod.env.cacheDir = cacheDir;
        }

        const AutoProcessor = mod?.AutoProcessor;
        const ClapAudioModelWithProjection = mod?.ClapAudioModelWithProjection;
        if (!AutoProcessor || !ClapAudioModelWithProjection) {
          throw new Error(
            'Transformers.js is installed but CLAP audio exports are missing. Install a recent version of @huggingface/transformers (preferred) or @xenova/transformers.'
          );
        }

        this.mediaAudioProcessor = await AutoProcessor.from_pretrained(modelId);
        this.mediaAudioModel = await ClapAudioModelWithProjection.from_pretrained(modelId);
        this.mediaAudioEmbedModelId = modelId;
        this.mediaAudioEmbedSampleRate = this.resolveMediaAudioEmbeddingSampleRate(
          this.mediaAudioProcessor
        );

        this.mediaAudioEmbedStatus = 'enabled';
      } catch (error: any) {
        this.mediaAudioEmbedStatus = 'disabled';
        this.mediaAudioEmbedDisabledReason = error?.message
          ? String(error.message)
          : 'Media audio embedder initialization failed.';
        throw error;
      } finally {
        this.mediaAudioEmbedInitPromise = null;
      }
    })().catch((err: any) => {
      if (!this.mediaAudioEmbedWarningLogged) {
        this.mediaAudioEmbedWarningLogged = true;
        const message = err?.message ?? String(err);
        console.warn(`[RAG Service] Media audio embeddings disabled: ${message}`);
        if (typeof message === 'string' && message.includes('Cannot find module')) {
          console.warn(
            `[RAG Service] Local audio embeddings require installing Transformers.js (optional): '@huggingface/transformers' (preferred) or '@xenova/transformers'.`
          );
        }
      }
    });

    return this.mediaAudioEmbedInitPromise;
  }

  private async decodeWavToMonoFloat32(input: {
    payload: Buffer;
    targetSampleRate: number;
  }): Promise<Float32Array> {
    // Server-side audio decoding is not built into Node. We support WAV decoding
    // via the lightweight `wavefile` package (install-on-demand).
    let wavefileMod: any;
    try {
      wavefileMod = await import('wavefile');
    } catch (error: any) {
      throw new Error(
        `Audio embeddings require WAV decoding support. Install 'wavefile' (optional). ${error?.message ?? error}`
      );
    }

    const WaveFile =
      wavefileMod?.WaveFile ??
      wavefileMod?.default?.WaveFile ??
      wavefileMod?.default?.default?.WaveFile ??
      wavefileMod?.default;
    if (!WaveFile) {
      throw new Error(
        "Audio embeddings require the 'wavefile' package (WaveFile export not found)."
      );
    }

    const wav = new WaveFile(input.payload);

    try {
      wav.toBitDepth('32f');
    } catch {
      // Ignore; some WAVs may already be float.
    }

    try {
      if (input.targetSampleRate) {
        wav.toSampleRate(input.targetSampleRate);
      }
    } catch {
      // Ignore; if resampling fails we still try to proceed.
    }

    let samples: any = wav.getSamples();
    if (Array.isArray(samples)) {
      if (samples.length === 1) {
        samples = samples[0];
      } else if (samples.length > 1) {
        const channel0 = samples[0] as Float32Array;
        const out = new Float32Array(channel0.length);
        for (let i = 0; i < out.length; i++) {
          let sum = 0;
          for (const ch of samples) {
            sum += Number((ch as Float32Array)[i] ?? 0);
          }
          out[i] = sum / samples.length;
        }
        samples = out;
      }
    }

    if (samples instanceof Float32Array) return samples;
    if (samples && typeof samples.length === 'number') {
      return Float32Array.from(samples as any);
    }
    throw new Error('WAV decoder returned an invalid samples buffer.');
  }

  private async embedAudioForRetrieval(input: {
    payload: Buffer;
    mimeType: string;
  }): Promise<{ embedding: number[]; modelId: string; dimension: number }> {
    await this.ensureMediaAudioEmbedderInitialized();
    if (
      this.mediaAudioEmbedStatus !== 'enabled' ||
      !this.mediaAudioProcessor ||
      !this.mediaAudioModel
    ) {
      throw new Error(
        this.mediaAudioEmbedDisabledReason ?? 'Media audio embeddings are not available.'
      );
    }

    // Keep server-side decoding minimal (no ffmpeg). WAV-only for now.
    if (
      !String(input.mimeType || '')
        .toLowerCase()
        .includes('wav')
    ) {
      throw new Error(
        `Audio embeddings currently require WAV payloads in Node (got mimeType='${input.mimeType}').`
      );
    }

    const sampleRate = this.mediaAudioEmbedSampleRate ?? 48_000;
    const waveform = await this.decodeWavToMonoFloat32({
      payload: input.payload,
      targetSampleRate: sampleRate,
    });

    const audioInputs = await this.mediaAudioProcessor(waveform);
    const output = await this.mediaAudioModel(audioInputs);
    const tensor = output?.audio_embeds ?? output?.audioEmbeds ?? output?.embeddings ?? output;
    const data = (tensor as any)?.data ?? (tensor as any);

    let values: number[] = [];
    if (data && typeof data.length === 'number') {
      values = Array.from(data as any).map((v) => Number(v));
    } else if (typeof (tensor as any)?.tolist === 'function') {
      const list = (tensor as any).tolist();
      values = Array.isArray(list) ? (list.flat(Infinity) as any[]).map((v) => Number(v)) : [];
    }

    const normalized = this.l2NormalizeVector(values);
    const dimension = normalized.length;
    if (dimension === 0) {
      throw new Error('CLAP audio model returned an empty embedding.');
    }

    this.mediaAudioEmbeddingDimension = this.mediaAudioEmbeddingDimension ?? dimension;

    return {
      embedding: normalized,
      modelId: this.mediaAudioEmbedModelId || this.resolveMediaAudioEmbeddingModelId(),
      dimension,
    };
  }

  private async embedImageForRetrieval(input: {
    payload: Buffer;
    mimeType: string;
  }): Promise<{ embedding: number[]; modelId: string; dimension: number }> {
    await this.ensureMediaImageEmbedderInitialized();
    if (this.mediaImageEmbedStatus !== 'enabled' || !this.mediaImageFeatureExtractor) {
      throw new Error(
        this.mediaImageEmbedDisabledReason ?? 'Media image embeddings are not available.'
      );
    }

    // Transformers.js expects a Blob input. Use an ArrayBuffer-backed view to satisfy
    // TS' BlobPart typing (Node Buffers are typed as ArrayBufferLike).
    const bytes = new Uint8Array(input.payload);
    const blob = new Blob([bytes.buffer], {
      type: input.mimeType || 'image/*',
    }) as any;

    const output = await this.mediaImageFeatureExtractor(blob);
    const tensor = Array.isArray(output) ? output[0] : output;
    const data = (tensor as any)?.data ?? (tensor as any);

    let values: number[] = [];
    if (data && typeof data.length === 'number') {
      values = Array.from(data as any).map((v) => Number(v));
    } else if (typeof (tensor as any)?.tolist === 'function') {
      const list = (tensor as any).tolist();
      values = Array.isArray(list) ? (list.flat(Infinity) as any[]).map((v) => Number(v)) : [];
    }

    const normalized = this.l2NormalizeVector(values);
    const dimension = normalized.length;
    if (dimension === 0) {
      throw new Error('Image feature extractor returned an empty embedding.');
    }

    this.mediaImageEmbeddingDimension = this.mediaImageEmbeddingDimension ?? dimension;

    return {
      embedding: normalized,
      modelId: this.mediaImageFeatureExtractorModelId || this.resolveMediaImageEmbeddingModelId(),
      dimension,
    };
  }

  private async ensureMediaImageEmbeddingCollection(
    adapter: StorageAdapter,
    baseCollectionId: string,
    dimension: number
  ): Promise<string> {
    await this.ensureVectorStoreInitialized(adapter);
    if (!this.vectorStore) {
      throw new Error('Vector store is not initialized.');
    }

    const collectionId = this.resolveMediaImageEmbeddingCollectionId(baseCollectionId);
    if (this.vectorStore.collectionExists && this.vectorStore.createCollection) {
      const exists = await this.vectorStore.collectionExists(collectionId);
      if (!exists) {
        await this.vectorStore.createCollection(collectionId, dimension, {
          similarityMetric: 'cosine',
        });
      }
    }

    return collectionId;
  }

  private async ensureMediaAudioEmbeddingCollection(
    adapter: StorageAdapter,
    baseCollectionId: string,
    dimension: number
  ): Promise<string> {
    await this.ensureVectorStoreInitialized(adapter);
    if (!this.vectorStore) {
      throw new Error('Vector store is not initialized.');
    }

    const collectionId = this.resolveMediaAudioEmbeddingCollectionId(baseCollectionId);
    if (this.vectorStore.collectionExists && this.vectorStore.createCollection) {
      const exists = await this.vectorStore.collectionExists(collectionId);
      if (!exists) {
        await this.vectorStore.createCollection(collectionId, dimension, {
          similarityMetric: 'cosine',
        });
      }
    }

    return collectionId;
  }

  private async upsertMediaImageEmbeddingVector(input: {
    adapter: StorageAdapter;
    assetId: string;
    baseCollectionId: string;
    previousBaseCollectionId?: string | null;
    payload?: Buffer;
    mimeType: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    if (!this.isMediaImageEmbeddingsEnabled()) return;
    if (!input.payload || input.payload.length === 0) return;

    const embedded = await this.embedImageForRetrieval({
      payload: input.payload,
      mimeType: input.mimeType,
    });

    const collectionId = await this.ensureMediaImageEmbeddingCollection(
      input.adapter,
      input.baseCollectionId,
      embedded.dimension
    );

    if (!this.vectorStore) return;

    await this.vectorStore.upsert(collectionId, [
      {
        id: input.assetId,
        embedding: embedded.embedding,
        metadata: {
          ...(input.metadata ?? {}),
          __ragMediaAssetId: input.assetId,
          __ragMediaEmbeddingModelId: embedded.modelId,
          __ragMediaEmbeddingKind: 'image',
        } as any,
      } as any,
    ]);

    // Best-effort: if the asset moved collections, delete from the previous embedding collection.
    const prev = input.previousBaseCollectionId?.trim();
    if (prev && prev !== input.baseCollectionId) {
      try {
        const prevCollectionId = this.resolveMediaImageEmbeddingCollectionId(prev);
        await this.vectorStore.delete(prevCollectionId, [input.assetId]);
      } catch {
        // Ignore.
      }
    }
  }

  private async upsertMediaAudioEmbeddingVector(input: {
    adapter: StorageAdapter;
    assetId: string;
    baseCollectionId: string;
    previousBaseCollectionId?: string | null;
    payload?: Buffer;
    mimeType: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    if (!this.isMediaAudioEmbeddingsEnabled()) return;
    if (!input.payload || input.payload.length === 0) return;

    const embedded = await this.embedAudioForRetrieval({
      payload: input.payload,
      mimeType: input.mimeType,
    });

    const collectionId = await this.ensureMediaAudioEmbeddingCollection(
      input.adapter,
      input.baseCollectionId,
      embedded.dimension
    );

    if (!this.vectorStore) return;

    await this.vectorStore.upsert(collectionId, [
      {
        id: input.assetId,
        embedding: embedded.embedding,
        metadata: {
          ...(input.metadata ?? {}),
          __ragMediaAssetId: input.assetId,
          __ragMediaEmbeddingModelId: embedded.modelId,
          __ragMediaEmbeddingKind: 'audio',
        } as any,
      } as any,
    ]);

    // Best-effort: if the asset moved collections, delete from the previous embedding collection.
    const prev = input.previousBaseCollectionId?.trim();
    if (prev && prev !== input.baseCollectionId) {
      try {
        const prevCollectionId = this.resolveMediaAudioEmbeddingCollectionId(prev);
        await this.vectorStore.delete(prevCollectionId, [input.assetId]);
      } catch {
        // Ignore.
      }
    }
  }

  private async deleteMediaImageEmbeddingVector(input: {
    adapter: StorageAdapter;
    assetId: string;
    baseCollectionId: string;
  }): Promise<void> {
    if (!this.isMediaImageEmbeddingsEnabled()) return;
    try {
      await this.ensureVectorStoreInitialized(input.adapter);
      if (!this.vectorStore) return;
      const collectionId = this.resolveMediaImageEmbeddingCollectionId(input.baseCollectionId);
      await this.vectorStore.delete(collectionId, [input.assetId]);
    } catch {
      // Ignore; canonical SQL deletes already happened.
    }
  }

  private async deleteMediaAudioEmbeddingVector(input: {
    adapter: StorageAdapter;
    assetId: string;
    baseCollectionId: string;
  }): Promise<void> {
    if (!this.isMediaAudioEmbeddingsEnabled()) return;
    try {
      await this.ensureVectorStoreInitialized(input.adapter);
      if (!this.vectorStore) return;
      const collectionId = this.resolveMediaAudioEmbeddingCollectionId(input.baseCollectionId);
      await this.vectorStore.delete(collectionId, [input.assetId]);
    } catch {
      // Ignore; canonical SQL deletes already happened.
    }
  }

  private resolveImageCaptionProviderPreference(): {
    preferredProviderId: string;
    preferredModelId: string;
  } {
    const providerId =
      firstNonEmptyEnv(
        'AGENTOS_RAG_MEDIA_IMAGE_LLM_PROVIDER',
        'AGENTOS_MULTIMODAL_IMAGE_LLM_PROVIDER'
      )?.trim() || 'openai';
    const modelId =
      firstNonEmptyEnv(
        'AGENTOS_RAG_MEDIA_IMAGE_LLM_MODEL',
        'AGENTOS_MULTIMODAL_IMAGE_LLM_MODEL'
      )?.trim() || 'gpt-4o-mini';
    return { preferredProviderId: providerId, preferredModelId: modelId };
  }

  private resolveImageCaptionSystemPrompt(): string {
    return (
      firstNonEmptyEnv('AGENTOS_RAG_MEDIA_IMAGE_SYSTEM_PROMPT')?.trim() ||
      [
        'You are an indexing assistant.',
        'Create a search-optimized description of the image for retrieval.',
        'Return ONLY valid JSON with these fields:',
        '{ "caption": string, "visibleText": string, "entities": string[], "tags": string[] }',
        'Rules:',
        '- caption: concise, 1-2 sentences',
        '- visibleText: verbatim text you can read in the image (or empty string)',
        '- entities: key people/places/objects (strings)',
        '- tags: short lowercase tags (snake_case), 3-12 items',
      ].join('\n')
    );
  }

  private normalizeTags(tags: string[] | undefined): string[] | undefined {
    if (!tags || tags.length === 0) return undefined;
    const normalized = Array.from(
      new Set(
        tags
          .map((t) =>
            String(t ?? '')
              .trim()
              .toLowerCase()
          )
          .filter((t) => t.length > 0)
      )
    );
    return normalized.length > 0 ? normalized : undefined;
  }

  private extractFirstJsonObject(text: string): any | null {
    const raw = String(text ?? '').trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    const slice = raw.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {
      return null;
    }
  }

  private extractTextFromCompletion(response: any): string {
    const content = response?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
        .filter(Boolean)
        .join('');
    }
    if (typeof response?.choices?.[0]?.text === 'string') return response.choices[0].text;
    return '';
  }

  private async deriveImageTextRepresentation(input: {
    mimeType: string;
    payload?: Buffer;
    sourceUrl?: string;
  }): Promise<{ textRepresentation: string; tags?: string[] }> {
    const providerManager = await this.ensureProviderManagerInitialized();
    const { preferredProviderId, preferredModelId } = this.resolveImageCaptionProviderPreference();

    const provider =
      providerManager.getProvider(preferredProviderId) ??
      providerManager.getProvider('openai') ??
      providerManager.getProvider('openrouter') ??
      providerManager.getDefaultProvider();
    if (!provider) {
      throw new Error(
        'No LLM provider is configured for image captioning. Set OPENAI_API_KEY or OPENROUTER_API_KEY (or configure Ollama).'
      );
    }

    const imageUrl =
      input.payload && input.payload.length > 0
        ? `data:${input.mimeType};base64,${input.payload.toString('base64')}`
        : input.sourceUrl?.trim();
    if (!imageUrl) {
      throw new Error('Image ingestion requires `payload` bytes or a `sourceUrl`.');
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: this.resolveImageCaptionSystemPrompt() },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Describe this image for retrieval indexing.',
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl, detail: 'low' },
          },
        ],
      },
    ];

    const resp = await provider.generateCompletion(preferredModelId, messages, {
      temperature: 0.2,
      maxTokens: 450,
    } as any);

    const raw = this.extractTextFromCompletion(resp).trim();
    const parsed = this.extractFirstJsonObject(raw);

    const caption =
      typeof parsed?.caption === 'string' ? parsed.caption.trim() : raw.split('\n')[0]?.trim();
    const visibleText = typeof parsed?.visibleText === 'string' ? parsed.visibleText.trim() : '';
    const entities = Array.isArray(parsed?.entities)
      ? parsed.entities.map((v: any) => String(v ?? '').trim()).filter(Boolean)
      : [];
    const modelTags = Array.isArray(parsed?.tags)
      ? parsed.tags.map((v: any) => String(v ?? '').trim()).filter(Boolean)
      : [];

    const lines: string[] = ['[Image]'];
    if (caption) lines.push(`Caption: ${caption}`);
    if (visibleText) lines.push(`Visible text: ${visibleText}`);
    if (entities.length > 0) lines.push(`Entities: ${entities.join(', ')}`);
    const normalizedModelTags = this.normalizeTags(modelTags);
    if (normalizedModelTags && normalizedModelTags.length > 0) {
      lines.push(`Tags: ${normalizedModelTags.join(', ')}`);
    }

    const textRepresentation = lines.join('\n').trim();
    if (!textRepresentation) {
      throw new Error('Image captioning produced an empty response.');
    }

    return { textRepresentation, tags: normalizedModelTags };
  }

  private async deriveAudioTextRepresentation(input: {
    payload: Buffer;
    originalFileName: string;
    mimeType: string;
    userId: string;
  }): Promise<string> {
    const options: ISttOptions = {
      model: process.env.WHISPER_MODEL_DEFAULT || 'whisper-1',
      responseFormat: 'verbose_json',
      providerSpecificOptions: {
        mimeType: input.mimeType,
      },
    } as any;

    const result = await audioService.transcribeAudio(
      input.payload,
      input.originalFileName,
      options,
      input.userId
    );

    const transcript = String(result?.text ?? '').trim();
    if (!transcript) {
      throw new Error('Audio transcription produced an empty transcript.');
    }

    const lines: string[] = ['[Audio]', `Transcript: ${transcript}`];
    if (typeof result?.language === 'string' && result.language.trim()) {
      lines.push(`Language: ${result.language.trim()}`);
    }
    if (typeof result?.durationSeconds === 'number' && Number.isFinite(result.durationSeconds)) {
      lines.push(`DurationSeconds: ${result.durationSeconds.toFixed(2)}`);
    }
    return lines.join('\n').trim();
  }

  /**
   * Derive a text representation for an image (caption/OCR/entities/tags) without ingesting it.
   *
   * Used by query-by-image endpoints that convert a binary query into text, then run normal
   * text-based retrieval over the indexed multimodal assets.
   */
  async describeImageForRetrieval(input: {
    mimeType: string;
    payload?: Buffer;
    sourceUrl?: string;
  }): Promise<{ textRepresentation: string; tags?: string[] }> {
    return this.deriveImageTextRepresentation(input);
  }

  /**
   * Derive a text representation for an audio clip (transcript) without ingesting it.
   *
   * Used by query-by-audio endpoints that transcribe a binary query into text, then run normal
   * text-based retrieval over the indexed multimodal assets.
   */
  async transcribeAudioForRetrieval(input: {
    payload: Buffer;
    originalFileName: string;
    mimeType: string;
    userId?: string;
  }): Promise<string> {
    return this.deriveAudioTextRepresentation({
      payload: input.payload,
      originalFileName: input.originalFileName,
      mimeType: input.mimeType,
      userId: input.userId || 'system',
    });
  }

  /**
   * Query indexed media assets using a binary image query.
   *
   * Default behavior:
   * 1) Caption the query image into a retrieval-optimized text representation.
   * 2) Run text-based multimodal retrieval over existing indexed assets.
   *
   * To avoid any captioning API calls, pass `textRepresentation` explicitly.
   */
  async queryMediaAssetsByImage(options: {
    payload?: Buffer;
    mimeType?: string;
    sourceUrl?: string;
    textRepresentation?: string;
    modalities?: RagMediaModality[];
    collectionIds?: string[];
    topK?: number;
    includeMetadata?: boolean;
  }): Promise<RagMediaQueryResult> {
    const start = Date.now();
    try {
      const wantsImageEmbeddingQuery =
        this.isMediaImageEmbeddingsEnabled() &&
        !String(options.textRepresentation ?? '').trim() &&
        !!options.payload &&
        options.payload.length > 0;

      // Prefer CLIP-style image embeddings when enabled and the caller provides bytes.
      // This avoids any captioning/model calls and supports true image-to-image retrieval.
      if (wantsImageEmbeddingQuery) {
        const adapter = await this.ensureInitialized();
        const baseCollectionIds =
          options.collectionIds && options.collectionIds.length > 0
            ? options.collectionIds
            : [this.resolveMediaCollectionId('image')];

        try {
          return await this.queryMediaAssetsByImageEmbeddingInternal({
            adapter,
            payload: options.payload!,
            mimeType: options.mimeType || 'image/*',
            baseCollectionIds,
            topK: options.topK ?? 5,
            includeMetadata: options.includeMetadata,
          });
        } catch (embedError: any) {
          // Fall back to the captioning path when the optional image embedder isn't available.
          const message = embedError?.message ?? String(embedError);
          console.warn(
            `[RAG Service] Image embedding query failed; falling back to caption-based retrieval. ${message}`
          );
        }
      }

      const queryText = (options.textRepresentation ?? '').trim()
        ? (options.textRepresentation ?? '').trim()
        : (
            await this.describeImageForRetrieval({
              mimeType: options.mimeType || 'image/*',
              payload: options.payload,
              sourceUrl: options.sourceUrl,
            })
          ).textRepresentation;

      if (!queryText || !queryText.trim()) {
        return {
          success: false,
          query: '',
          assets: [],
          totalResults: 0,
          processingTimeMs: Date.now() - start,
          error: 'Unable to derive image query textRepresentation (empty).',
        };
      }

      const result = await this.queryMediaAssets({
        query: queryText,
        modalities: options.modalities ?? ['image'],
        collectionIds: options.collectionIds,
        topK: options.topK,
        includeMetadata: options.includeMetadata,
      });

      return result;
    } catch (error: any) {
      const message = error?.message ?? String(error);
      return {
        success: false,
        query: '',
        assets: [],
        totalResults: 0,
        processingTimeMs: Date.now() - start,
        error: message,
      };
    }
  }

  private async queryMediaAssetsByImageEmbeddingInternal(input: {
    adapter: StorageAdapter;
    payload: Buffer;
    mimeType: string;
    baseCollectionIds: string[];
    topK: number;
    includeMetadata?: boolean;
  }): Promise<RagMediaQueryResult> {
    const start = Date.now();

    await this.ensureVectorStoreInitialized(input.adapter);
    if (!this.vectorStore) {
      throw new Error('Vector store is not initialized.');
    }

    const embedded = await this.embedImageForRetrieval({
      payload: input.payload,
      mimeType: input.mimeType,
    });

    const topK = Math.max(1, input.topK);
    const perCollectionTopK = Math.min(80, Math.max(topK * 6, topK));
    const baseCollectionIds = Array.from(
      new Set((input.baseCollectionIds ?? []).map((c) => String(c ?? '').trim()).filter(Boolean))
    );

    type Candidate = { assetId: string; score: number; baseCollectionId: string };
    const candidates: Candidate[] = [];

    for (const baseCollectionId of baseCollectionIds) {
      const embeddingCollectionId = this.resolveMediaImageEmbeddingCollectionId(baseCollectionId);
      try {
        if (this.vectorStore.collectionExists) {
          const exists = await this.vectorStore.collectionExists(embeddingCollectionId);
          if (!exists) continue;
        }

        const result = await this.vectorStore.query(embeddingCollectionId, embedded.embedding, {
          topK: perCollectionTopK,
          includeMetadata: true,
          includeTextContent: false,
        });

        for (const doc of result.documents ?? []) {
          const score = typeof doc.similarityScore === 'number' ? doc.similarityScore : 0;
          if (!(score > 0)) continue;
          candidates.push({ assetId: doc.id, score, baseCollectionId });
        }
      } catch {
        // Ignore per-collection failures; other collections may still work.
      }
    }

    const bestByAssetId = new Map<string, Candidate>();
    for (const candidate of candidates) {
      const existing = bestByAssetId.get(candidate.assetId);
      if (!existing || candidate.score > existing.score) {
        bestByAssetId.set(candidate.assetId, candidate);
      }
    }

    const ranked = Array.from(bestByAssetId.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    if (ranked.length === 0) {
      return {
        success: true,
        query: `[ImageEmbedding] model=${embedded.modelId}`,
        assets: [],
        totalResults: 0,
        processingTimeMs: Date.now() - start,
      };
    }

    const assetIds = ranked.map((c) => c.assetId);
    const placeholders = assetIds.map(() => '?').join(', ');
    const assetRows = await input.adapter.all<MediaAssetRow>(
      `SELECT * FROM ${this.tablePrefix}media_assets WHERE asset_id IN (${placeholders})`,
      assetIds
    );
    const assetById = new Map(assetRows.map((r) => [r.asset_id, r]));

    const assets: RagMediaQueryResult['assets'] = [];

    for (const entry of ranked) {
      const row = assetById.get(entry.assetId);
      if (!row) continue;
      if (String(row.modality) !== 'image') continue;

      // Enforce collection scoping: the asset must belong to one of the requested base collections.
      if (baseCollectionIds.length > 0 && !baseCollectionIds.includes(row.collection_id)) {
        continue;
      }

      const chunkRow = await input.adapter.get<
        Pick<ChunkRow, 'chunk_id' | 'document_id' | 'content' | 'metadata_json'>
      >(
        `SELECT chunk_id, document_id, content, metadata_json
         FROM ${this.tablePrefix}chunks
         WHERE document_id = ?
         ORDER BY chunk_index ASC
         LIMIT 1`,
        [row.asset_id]
      );

      const chunkMetadata = chunkRow?.metadata_json
        ? parseJsonSafe<Record<string, unknown>>(chunkRow.metadata_json, {})
        : {};

      const bestChunk: RagRetrievedChunk = {
        chunkId: chunkRow?.chunk_id ?? `${row.asset_id}_chunk_0`,
        documentId: row.asset_id,
        content: chunkRow?.content ?? '',
        score: entry.score,
        metadata: input.includeMetadata
          ? {
              ...(chunkMetadata ?? {}),
              _retrievalMethod: 'image_embedding',
              _imageEmbeddingModelId: embedded.modelId,
            }
          : undefined,
      };

      assets.push({
        asset: this.rowToMediaAsset(row),
        bestChunk,
      });
    }

    return {
      success: true,
      query: `[ImageEmbedding] model=${embedded.modelId}`,
      assets,
      totalResults: assets.length,
      processingTimeMs: Date.now() - start,
    };
  }

  private async queryMediaAssetsByAudioEmbeddingInternal(input: {
    adapter: StorageAdapter;
    payload: Buffer;
    mimeType: string;
    baseCollectionIds: string[];
    topK: number;
    includeMetadata?: boolean;
  }): Promise<RagMediaQueryResult> {
    const start = Date.now();

    await this.ensureVectorStoreInitialized(input.adapter);
    if (!this.vectorStore) {
      throw new Error('Vector store is not initialized.');
    }

    const embedded = await this.embedAudioForRetrieval({
      payload: input.payload,
      mimeType: input.mimeType,
    });

    const topK = Math.max(1, input.topK);
    const perCollectionTopK = Math.min(80, Math.max(topK * 6, topK));
    const baseCollectionIds = Array.from(
      new Set((input.baseCollectionIds ?? []).map((c) => String(c ?? '').trim()).filter(Boolean))
    );

    type Candidate = { assetId: string; score: number; baseCollectionId: string };
    const candidates: Candidate[] = [];

    for (const baseCollectionId of baseCollectionIds) {
      const embeddingCollectionId = this.resolveMediaAudioEmbeddingCollectionId(baseCollectionId);
      try {
        if (this.vectorStore.collectionExists) {
          const exists = await this.vectorStore.collectionExists(embeddingCollectionId);
          if (!exists) continue;
        }

        const result = await this.vectorStore.query(embeddingCollectionId, embedded.embedding, {
          topK: perCollectionTopK,
          includeMetadata: true,
          includeTextContent: false,
        });

        for (const doc of result.documents ?? []) {
          const score = typeof doc.similarityScore === 'number' ? doc.similarityScore : 0;
          if (!(score > 0)) continue;
          candidates.push({ assetId: doc.id, score, baseCollectionId });
        }
      } catch {
        // Ignore per-collection failures; other collections may still work.
      }
    }

    const bestByAssetId = new Map<string, Candidate>();
    for (const candidate of candidates) {
      const existing = bestByAssetId.get(candidate.assetId);
      if (!existing || candidate.score > existing.score) {
        bestByAssetId.set(candidate.assetId, candidate);
      }
    }

    const ranked = Array.from(bestByAssetId.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    if (ranked.length === 0) {
      return {
        success: true,
        query: `[AudioEmbedding] model=${embedded.modelId}`,
        assets: [],
        totalResults: 0,
        processingTimeMs: Date.now() - start,
      };
    }

    const assetIds = ranked.map((c) => c.assetId);
    const placeholders = assetIds.map(() => '?').join(', ');
    const assetRows = await input.adapter.all<MediaAssetRow>(
      `SELECT * FROM ${this.tablePrefix}media_assets WHERE asset_id IN (${placeholders})`,
      assetIds
    );
    const assetById = new Map(assetRows.map((r) => [r.asset_id, r]));

    const assets: RagMediaQueryResult['assets'] = [];

    for (const entry of ranked) {
      const row = assetById.get(entry.assetId);
      if (!row) continue;
      if (String(row.modality) !== 'audio') continue;

      if (baseCollectionIds.length > 0 && !baseCollectionIds.includes(row.collection_id)) {
        continue;
      }

      const chunkRow = await input.adapter.get<
        Pick<ChunkRow, 'chunk_id' | 'document_id' | 'content' | 'metadata_json'>
      >(
        `SELECT chunk_id, document_id, content, metadata_json
         FROM ${this.tablePrefix}chunks
         WHERE document_id = ?
         ORDER BY chunk_index ASC
         LIMIT 1`,
        [row.asset_id]
      );

      const chunkMetadata = chunkRow?.metadata_json
        ? parseJsonSafe<Record<string, unknown>>(chunkRow.metadata_json, {})
        : {};

      const bestChunk: RagRetrievedChunk = {
        chunkId: chunkRow?.chunk_id ?? `${row.asset_id}_chunk_0`,
        documentId: row.asset_id,
        content: chunkRow?.content ?? '',
        score: entry.score,
        metadata: input.includeMetadata
          ? {
              ...(chunkMetadata ?? {}),
              _retrievalMethod: 'audio_embedding',
              _audioEmbeddingModelId: embedded.modelId,
            }
          : undefined,
      };

      assets.push({
        asset: this.rowToMediaAsset(row),
        bestChunk,
      });
    }

    return {
      success: true,
      query: `[AudioEmbedding] model=${embedded.modelId}`,
      assets,
      totalResults: assets.length,
      processingTimeMs: Date.now() - start,
    };
  }

  /**
   * Query indexed media assets using a binary audio query.
   *
   * Default behavior:
   * 1) Transcribe the query audio into a retrieval-optimized text representation.
   * 2) Run text-based multimodal retrieval over existing indexed assets.
   *
   * To avoid any transcription API calls, pass `textRepresentation` explicitly.
   */
  async queryMediaAssetsByAudio(options: {
    payload?: Buffer;
    mimeType?: string;
    originalFileName?: string;
    textRepresentation?: string;
    modalities?: RagMediaModality[];
    collectionIds?: string[];
    topK?: number;
    includeMetadata?: boolean;
    userId?: string;
  }): Promise<RagMediaQueryResult> {
    const start = Date.now();
    try {
      const wantsAudioEmbeddingQuery =
        this.isMediaAudioEmbeddingsEnabled() &&
        !String(options.textRepresentation ?? '').trim() &&
        !!options.payload &&
        options.payload.length > 0;

      // Prefer CLAP-style audio embeddings when enabled and the caller provides bytes.
      // This avoids transcription calls and supports true audio-to-audio retrieval.
      if (wantsAudioEmbeddingQuery) {
        const adapter = await this.ensureInitialized();
        const baseCollectionIds =
          options.collectionIds && options.collectionIds.length > 0
            ? options.collectionIds
            : [this.resolveMediaCollectionId('audio')];

        try {
          return await this.queryMediaAssetsByAudioEmbeddingInternal({
            adapter,
            payload: options.payload!,
            mimeType: options.mimeType || 'audio/*',
            baseCollectionIds,
            topK: options.topK ?? 5,
            includeMetadata: options.includeMetadata,
          });
        } catch (embedError: any) {
          const message = embedError?.message ?? String(embedError);
          console.warn(
            `[RAG Service] Audio embedding query failed; falling back to transcript-based retrieval. ${message}`
          );
        }
      }

      const queryText = (options.textRepresentation ?? '').trim()
        ? (options.textRepresentation ?? '').trim()
        : await this.transcribeAudioForRetrieval({
            payload: options.payload ?? Buffer.alloc(0),
            originalFileName: options.originalFileName || `query-audio-${Date.now()}.bin`,
            mimeType: options.mimeType || 'audio/*',
            userId: options.userId,
          });

      if (!queryText || !queryText.trim()) {
        return {
          success: false,
          query: '',
          assets: [],
          totalResults: 0,
          processingTimeMs: Date.now() - start,
          error: 'Unable to derive audio query textRepresentation (empty).',
        };
      }

      const result = await this.queryMediaAssets({
        query: queryText,
        modalities: options.modalities ?? ['audio'],
        collectionIds: options.collectionIds,
        topK: options.topK,
        includeMetadata: options.includeMetadata,
      });

      return result;
    } catch (error: any) {
      const message = error?.message ?? String(error);
      return {
        success: false,
        query: '',
        assets: [],
        totalResults: 0,
        processingTimeMs: Date.now() - start,
        error: message,
      };
    }
  }

  private rowToMediaAsset(row: MediaAssetRow): RagMediaAsset {
    return {
      assetId: row.asset_id,
      collectionId: row.collection_id,
      modality: row.modality as RagMediaModality,
      mimeType: row.mime_type,
      originalFileName: row.original_filename,
      sourceUrl: row.source_url,
      contentHashHex: row.content_hash_hex,
      metadata: row.metadata_json ? (JSON.parse(row.metadata_json) as any) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Ingest an image into RAG by deriving a text representation (caption + visible text).
   */
  async ingestImageAsset(
    input: Omit<RagMediaAssetInput, 'modality'>
  ): Promise<RagMediaIngestionResult> {
    return this.ingestMediaAsset({ ...input, modality: 'image' });
  }

  /**
   * Ingest an audio file into RAG by deriving a text representation (transcript).
   */
  async ingestAudioAsset(
    input: Omit<RagMediaAssetInput, 'modality'>
  ): Promise<RagMediaIngestionResult> {
    return this.ingestMediaAsset({ ...input, modality: 'audio' });
  }

  /**
   * Ingest a multimodal asset into RAG by deriving a text representation and indexing it as a normal document.
   *
   * The derived documentId is currently the same as `assetId`, making query grouping deterministic.
   */
  async ingestMediaAsset(input: RagMediaAssetInput): Promise<RagMediaIngestionResult> {
    const adapter = await this.ensureInitialized();
    const now = Date.now();

    const assetId = input.assetId || `asset_${now}_${Math.random().toString(36).slice(2, 10)}`;
    const modality = input.modality;
    const collectionId = this.resolveMediaCollectionId(modality, input.collectionId);
    const category = input.category || 'knowledge_base';

    const storePayload = input.storePayload ?? this.resolveMediaStorePayloadDefault();
    const payload = input.payload;
    const payloadBase64 = storePayload && payload ? payload.toString('base64') : null;
    const sourceUrl = input.sourceUrl?.trim() || null;
    const contentHashHex = payload
      ? createHash('sha256').update(payload).digest('hex')
      : sourceUrl
        ? null
        : null;

    const userId = input.userId || 'system';
    const agentId = input.agentId;

    try {
      const previousDoc = await adapter.get<Pick<DocumentRow, 'collection_id' | 'category'>>(
        `SELECT collection_id, category FROM ${this.tablePrefix}documents WHERE document_id = ?`,
        [assetId]
      );
      const previousCollectionId = previousDoc?.collection_id;
      const previousCategory = previousDoc?.category;

      const previousChunkRows = await adapter.all<Pick<ChunkRow, 'chunk_id'>>(
        `SELECT chunk_id FROM ${this.tablePrefix}chunks WHERE document_id = ?`,
        [assetId]
      );
      const previousChunkIds = previousChunkRows.map((r) => r.chunk_id).filter(Boolean);

      await this.createCollection(collectionId);

      let derivedTags: string[] | undefined;
      let textRepresentation = input.textRepresentation?.trim();
      if (!textRepresentation) {
        if (modality === 'image') {
          const derived = await this.deriveImageTextRepresentation({
            mimeType: input.mimeType,
            payload,
            sourceUrl: sourceUrl ?? undefined,
          });
          textRepresentation = derived.textRepresentation;
          derivedTags = derived.tags;
        } else {
          if (!payload || payload.length === 0) {
            throw new Error('Audio ingestion requires `payload` bytes.');
          }
          textRepresentation = await this.deriveAudioTextRepresentation({
            payload,
            originalFileName:
              input.originalFileName ||
              `audio-${Date.now()}.${input.mimeType.split('/')[1] || 'bin'}`,
            mimeType: input.mimeType,
            userId,
          });
        }
      }

      if (!textRepresentation) {
        throw new Error('Derived text representation is empty.');
      }

      const mergedTags = this.normalizeTags([...(input.tags ?? []), ...(derivedTags ?? [])]);
      const baseMetadata = {
        ...(input.metadata ?? {}),
        kind: 'rag_media_asset',
        assetId,
        modality,
        mimeType: input.mimeType,
        originalFileName: input.originalFileName,
        sourceUrl: sourceUrl ?? undefined,
        contentHashHex: contentHashHex ?? undefined,
      } as Record<string, unknown>;

      const docMetadata: RagDocumentInput['metadata'] = {
        ...(baseMetadata as any),
        ...(agentId ? { agentId } : {}),
        ...(input.metadata?.agentId ? { agentId: input.metadata.agentId as any } : {}),
        ...(input.metadata?.userId ? { userId: input.metadata.userId as any } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
        type: 'media_asset',
        tags: mergedTags,
      };

      const chunkSize = 700;
      const chunkOverlap = 60;
      const chunks = this.chunkContent(textRepresentation, chunkSize, chunkOverlap);
      const nextChunkIdSet = new Set(
        chunks.map((_content, chunkIndex) => `${assetId}_chunk_${chunkIndex}`)
      );

      // Atomic write: media asset row + derived document/chunks.
      await adapter.transaction(async (trx) => {
        await trx.run(
          `INSERT OR REPLACE INTO ${this.tablePrefix}media_assets
           (asset_id, collection_id, modality, mime_type, original_filename, payload_base64, source_url, content_hash_hex, metadata_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            assetId,
            collectionId,
            modality,
            input.mimeType,
            input.originalFileName ?? null,
            payloadBase64,
            sourceUrl,
            contentHashHex,
            JSON.stringify({
              ...(input.metadata ?? {}),
              ...(mergedTags ? { tags: mergedTags } : {}),
              ...(agentId ? { agentId } : {}),
              ...(input.userId ? { userId: input.userId } : {}),
            }),
            now,
            now,
          ]
        );

        await this.upsertDocumentWithChunks(trx, {
          documentId: assetId,
          collectionId,
          category,
          content: textRepresentation,
          metadataJson: docMetadata ? JSON.stringify(docMetadata) : null,
          now,
          chunks,
        });
      });

      // Best-effort: keep the vector index in sync.
      try {
        await this.upsertVectorChunks({
          adapter,
          collectionId,
          documentId: assetId,
          documentCategory: category,
          chunks: chunks.map((content, chunkIndex) => ({
            chunkId: `${assetId}_chunk_${chunkIndex}`,
            content,
            chunkIndex,
          })),
          metadata: (docMetadata ?? null) as any,
        });
      } catch (vectorError: any) {
        console.warn(
          `[RAG Service] Vector indexing failed for media asset '${assetId}' (continuing): ${
            vectorError?.message ?? vectorError
          }`
        );
      }

      // Best-effort: clean up stale vector chunks (update semantics) without forcing embeddings init.
      try {
        await this.ensureVectorStoreInitialized(adapter);

        if (previousCollectionId && previousCollectionId !== collectionId) {
          if (previousChunkIds.length > 0) {
            await this.vectorStore?.delete(previousCollectionId, previousChunkIds);
          }
        } else {
          const staleChunkIds = previousChunkIds.filter((id) => !nextChunkIdSet.has(id));
          if (staleChunkIds.length > 0) {
            await this.vectorStore?.delete(collectionId, staleChunkIds);
          }
        }
      } catch {
        // Ignore; canonical SQL writes already happened.
      }

      // Best-effort: index raw image embeddings (CLIP-style) for image-to-image retrieval.
      if (modality === 'image') {
        try {
          await this.upsertMediaImageEmbeddingVector({
            adapter,
            assetId,
            baseCollectionId: collectionId,
            previousBaseCollectionId: previousCollectionId ?? null,
            payload,
            mimeType: input.mimeType,
            metadata: (docMetadata ?? null) as any,
          });
        } catch (embedError: any) {
          console.warn(
            `[RAG Service] Image embedding indexing failed for media asset '${assetId}' (continuing): ${
              embedError?.message ?? embedError
            }`
          );
        }
      }

      // Best-effort: index raw audio embeddings (CLAP-style) for audio-to-audio retrieval.
      if (modality === 'audio') {
        try {
          await this.upsertMediaAudioEmbeddingVector({
            adapter,
            assetId,
            baseCollectionId: collectionId,
            previousBaseCollectionId: previousCollectionId ?? null,
            payload,
            mimeType: input.mimeType,
            metadata: (docMetadata ?? null) as any,
          });
        } catch (embedError: any) {
          console.warn(
            `[RAG Service] Audio embedding indexing failed for media asset '${assetId}' (continuing): ${
              embedError?.message ?? embedError
            }`
          );
        }
      }

      // Optional: GraphRAG sync (best-effort).
      const shouldIndexGraphNow = this.shouldIngestGraphRagDocument({
        category,
        collectionId,
        isMediaAsset: true,
        content: textRepresentation,
      });
      const shouldIndexGraphBefore =
        previousCategory && previousCollectionId
          ? this.shouldIngestGraphRagDocument({
              category: previousCategory,
              collectionId: previousCollectionId,
              isMediaAsset: true,
              content: '',
            })
          : false;

      if (shouldIndexGraphNow) {
        try {
          await this.ensureGraphRagInitialized(adapter);
          await this.graphRagEngine?.ingestDocuments([
            {
              id: assetId,
              content: textRepresentation,
              metadata: sanitizeGraphRagMetadata(docMetadata as any),
            },
          ]);
        } catch (graphError: any) {
          console.warn(
            `[RAG Service] GraphRAG indexing failed for media asset '${assetId}' (continuing): ${
              graphError?.message ?? graphError
            }`
          );
        }
      } else if (shouldIndexGraphBefore) {
        try {
          await this.ensureGraphRagInitialized(adapter);
          await this.graphRagEngine?.removeDocuments([assetId]);
        } catch (graphError: any) {
          console.warn(
            `[RAG Service] GraphRAG cleanup failed for media asset '${assetId}' (continuing): ${
              graphError?.message ?? graphError
            }`
          );
        }
      }

      return {
        success: true,
        assetId,
        collectionId,
        modality,
        documentId: assetId,
        textRepresentation,
        chunksCreated: chunks.length,
      };
    } catch (error: any) {
      const message = error?.message ?? String(error);
      console.error('[RAG Service] Media ingestion failed:', message);
      return {
        success: false,
        assetId,
        collectionId,
        modality,
        documentId: assetId,
        textRepresentation: input.textRepresentation ?? '',
        chunksCreated: 0,
        error: message,
      };
    }
  }

  /**
   * Fetch stored multimodal asset metadata.
   */
  async getMediaAsset(assetId: string): Promise<RagMediaAsset | null> {
    const adapter = await this.ensureInitialized();
    const row = await adapter.get<MediaAssetRow>(
      `SELECT * FROM ${this.tablePrefix}media_assets WHERE asset_id = ?`,
      [assetId]
    );
    return row ? this.rowToMediaAsset(row) : null;
  }

  /**
   * Fetch stored multimodal asset raw bytes (if `storePayload` was enabled at ingest time).
   */
  async getMediaAssetContent(
    assetId: string
  ): Promise<{ mimeType: string; buffer: Buffer } | null> {
    const adapter = await this.ensureInitialized();
    const row = await adapter.get<Pick<MediaAssetRow, 'mime_type' | 'payload_base64'>>(
      `SELECT mime_type, payload_base64 FROM ${this.tablePrefix}media_assets WHERE asset_id = ?`,
      [assetId]
    );
    const payloadBase64 = row?.payload_base64;
    if (!row || !payloadBase64) return null;
    return { mimeType: row.mime_type, buffer: Buffer.from(payloadBase64, 'base64') };
  }

  /**
   * Delete a multimodal asset and its derived RAG document.
   */
  async deleteMediaAsset(assetId: string): Promise<boolean> {
    const adapter = await this.ensureInitialized();

    // Prefer deleting the derived document first so we can still inspect the asset row for
    // best-effort cleanup (image-embedding vectors, GraphRAG, etc.).
    const deleted = await this.deleteDocument(assetId);
    if (deleted) return true;

    // Fallback: if the derived document is missing, still clean up the asset row.
    const row = await adapter.get<Pick<MediaAssetRow, 'collection_id' | 'modality'>>(
      `SELECT collection_id, modality FROM ${this.tablePrefix}media_assets WHERE asset_id = ?`,
      [assetId]
    );
    if (row?.modality === 'image') {
      await this.deleteMediaImageEmbeddingVector({
        adapter,
        assetId,
        baseCollectionId: row.collection_id,
      });
    } else if (row?.modality === 'audio') {
      await this.deleteMediaAudioEmbeddingVector({
        adapter,
        assetId,
        baseCollectionId: row.collection_id,
      });
    }
    const result = await adapter.run(
      `DELETE FROM ${this.tablePrefix}media_assets WHERE asset_id = ?`,
      [assetId]
    );
    return result.changes > 0;
  }

  /**
   * Query multimodal assets by searching their derived text representations.
   */
  async queryMediaAssets(options: RagMediaQueryOptions): Promise<RagMediaQueryResult> {
    const adapter = await this.ensureInitialized();
    const start = Date.now();

    const defaultModalities: RagMediaModality[] = ['image', 'audio'];
    const modalities: RagMediaModality[] =
      options.modalities && options.modalities.length > 0 ? options.modalities : defaultModalities;
    const requestedCollections =
      options.collectionIds && options.collectionIds.length > 0
        ? options.collectionIds
        : modalities.map((m) => this.resolveMediaCollectionId(m));
    const collectionIds = Array.from(
      new Set(requestedCollections.map((c) => c.trim()).filter(Boolean))
    );

    const assetTopK = options.topK ?? 5;
    const chunkTopK = Math.min(200, Math.max(assetTopK * 10, assetTopK));

    const queryResult = await this.query({
      query: options.query,
      collectionIds,
      topK: chunkTopK,
      includeMetadata: true,
    });

    const bestByAsset = new Map<string, RagRetrievedChunk>();
    for (const chunk of queryResult.chunks) {
      const assetId = chunk.documentId;
      const existing = bestByAsset.get(assetId);
      if (!existing || chunk.score > existing.score) {
        bestByAsset.set(assetId, chunk);
      }
    }

    const rankedAssets = Array.from(bestByAsset.entries())
      .map(([assetId, bestChunk]) => ({ assetId, bestChunk }))
      .sort((a, b) => b.bestChunk.score - a.bestChunk.score)
      .slice(0, assetTopK);

    if (rankedAssets.length === 0) {
      return {
        success: true,
        query: options.query,
        assets: [],
        totalResults: 0,
        processingTimeMs: Date.now() - start,
      };
    }

    const assetIds = rankedAssets.map((a) => a.assetId);
    const placeholders = assetIds.map(() => '?').join(', ');
    const rows = await adapter.all<MediaAssetRow>(
      `SELECT * FROM ${this.tablePrefix}media_assets WHERE asset_id IN (${placeholders})`,
      assetIds
    );
    const byId = new Map(rows.map((r) => [r.asset_id, this.rowToMediaAsset(r)]));

    const assets = rankedAssets
      .map((entry) => {
        const asset = byId.get(entry.assetId);
        if (!asset) return null;
        return {
          asset,
          bestChunk: {
            ...entry.bestChunk,
            metadata: options.includeMetadata ? entry.bestChunk.metadata : undefined,
          },
        };
      })
      .filter(Boolean) as RagMediaQueryResult['assets'];

    return {
      success: true,
      query: options.query,
      assets,
      totalResults: assets.length,
      processingTimeMs: Date.now() - start,
    };
  }

  /**
   * Update collection document and chunk counts.
   */
  private async updateCollectionCounts(
    adapter: StorageAdapter,
    collectionId: string
  ): Promise<void> {
    const docCount = await adapter.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tablePrefix}documents WHERE collection_id = ?`,
      [collectionId]
    );

    const chunkCount = await adapter.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tablePrefix}chunks WHERE collection_id = ?`,
      [collectionId]
    );

    await adapter.run(
      `UPDATE ${this.tablePrefix}collections 
       SET document_count = ?, chunk_count = ?, updated_at = ?
       WHERE collection_id = ?`,
      [docCount?.count ?? 0, chunkCount?.count ?? 0, Date.now(), collectionId]
    );
  }

  /**
   * Query for relevant chunks.
   */
  private async queryKeywordInternal(
    adapter: StorageAdapter,
    options: RagQueryOptions
  ): Promise<{ chunks: RagRetrievedChunk[]; totalResults: number }> {
    const topK = options.topK || 5;

    const tokenize = (text: string): string[] =>
      String(text || '')
        .toLowerCase()
        .split(/[^a-z0-9_]+/g)
        .filter((t) => t.length > 2);

    // Tokenize query for lexical retrieval (BM25).
    const queryTerms = tokenize(options.query);
    const queryTermSet = new Set(queryTerms);

    if (queryTerms.length === 0) {
      return { chunks: [], totalResults: 0 };
    }

    const threshold =
      typeof options.similarityThreshold === 'number'
        ? Math.max(0, Math.min(1, options.similarityThreshold))
        : null;

    const categoryFilter = options.filters?.category;
    const collectionIds =
      options.collectionIds && options.collectionIds.length > 0 ? options.collectionIds : undefined;

    // Try FTS5 first (SQLite). Falls back to full scan when unavailable.
    type KeywordRow = ChunkRow & { bm25_rank?: number };
    let rows: KeywordRow[] = [];
    let usedFts = false;
    const candidateLimit = Math.min(2_000, Math.max(200, topK * 80));

    try {
      const sanitizedTerms = queryTerms
        .map((t) => t.replace(/[^a-z0-9_]+/g, '').trim())
        .filter(Boolean);
      const ftsQuery = sanitizedTerms.map((t) => `"${t.replace(/"/g, '""')}"`).join(' OR ');
      if (!ftsQuery) {
        return { chunks: [], totalResults: 0 };
      }

      let sql = `
        SELECT c.*, bm25(fts) AS bm25_rank
        FROM ${this.tablePrefix}chunks_fts fts
        JOIN ${this.tablePrefix}chunks c ON c.rowid = fts.rowid
      `;
      const params: any[] = [ftsQuery];

      if (categoryFilter) {
        sql += ` JOIN ${this.tablePrefix}documents d ON d.document_id = c.document_id`;
      }

      sql += ` WHERE fts MATCH ?`;

      if (categoryFilter) {
        sql += ` AND d.category = ?`;
        params.push(categoryFilter);
      }

      if (collectionIds) {
        const placeholders = collectionIds.map(() => '?').join(',');
        sql += ` AND c.collection_id IN (${placeholders})`;
        params.push(...collectionIds);
      }

      sql += ` ORDER BY bm25(fts) ASC LIMIT ?`;
      params.push(candidateLimit);

      rows = await adapter.all<KeywordRow>(sql, params);
      usedFts = true;
    } catch {
      // Fall back to scanning chunks (slower, but portable).
    }

    // Fallback query: full scan with optional collection filter.
    if (!usedFts) {
      let sql = `SELECT * FROM ${this.tablePrefix}chunks WHERE 1=1`;
      const params: any[] = [];

      if (collectionIds) {
        const placeholders = collectionIds.map(() => '?').join(',');
        sql += ` AND collection_id IN (${placeholders})`;
        params.push(...collectionIds);
      }

      rows = await adapter.all<ChunkRow>(sql, params);
    }

    // If filtering by document category and we couldn't push it down, prefetch categories once.
    let categoryByDocumentId: Map<string, string> | null = null;
    if (categoryFilter && !usedFts) {
      const docIds = Array.from(new Set(rows.map((r) => r.document_id).filter(Boolean)));
      if (docIds.length > 0) {
        const placeholders = docIds.map(() => '?').join(',');
        const docs = await adapter.all<{ document_id: string; category: string }>(
          `SELECT document_id, category FROM ${this.tablePrefix}documents WHERE document_id IN (${placeholders})`,
          docIds
        );
        categoryByDocumentId = new Map(docs.map((d) => [d.document_id, d.category]));
      } else {
        categoryByDocumentId = new Map();
      }
    }

    // Score and filter chunks (BM25).
    const scoredChunks: Array<RagRetrievedChunk & { _score: number }> = [];

    if (usedFts) {
      for (const row of rows) {
        const metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {};

        // Apply metadata filters (legacy semantics)
        if (options.filters) {
          if (options.filters.agentId && metadata.agentId !== options.filters.agentId) continue;
          if (options.filters.userId && metadata.userId !== options.filters.userId) continue;
          if (categoryFilter && categoryByDocumentId) {
            const docCategory = categoryByDocumentId.get(row.document_id);
            if (docCategory !== categoryFilter) continue;
          }
          if (options.filters.tags && options.filters.tags.length > 0) {
            const docTags = Array.isArray(metadata.tags) ? metadata.tags : [];
            if (!options.filters.tags.some((tag) => docTags.includes(tag))) continue;
          }
        }

        const rank =
          typeof row.bm25_rank === 'number' && Number.isFinite(row.bm25_rank) ? row.bm25_rank : 0;
        const score = 1 / (1 + Math.max(0, rank));

        if (threshold !== null) {
          if (score < threshold) continue;
        } else if (!(score > 0)) {
          continue;
        }

        scoredChunks.push({
          chunkId: row.chunk_id,
          documentId: row.document_id,
          content: row.content,
          score,
          _score: score,
          metadata: options.includeMetadata ? metadata : undefined,
        });
      }
    } else {
      type Candidate = {
        row: ChunkRow;
        metadata: any;
        dl: number;
        tf: Map<string, number>;
      };

      const candidates: Candidate[] = [];
      const df = new Map<string, number>();
      let totalDocLength = 0;
      let N = 0;

      for (const row of rows) {
        const metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {};

        // Apply metadata filters (legacy semantics)
        if (options.filters) {
          if (options.filters.agentId && metadata.agentId !== options.filters.agentId) continue;
          if (options.filters.userId && metadata.userId !== options.filters.userId) continue;
          if (categoryFilter && categoryByDocumentId) {
            const docCategory = categoryByDocumentId.get(row.document_id);
            if (docCategory !== categoryFilter) continue;
          }
          if (options.filters.tags && options.filters.tags.length > 0) {
            const docTags = Array.isArray(metadata.tags) ? metadata.tags : [];
            if (!options.filters.tags.some((tag) => docTags.includes(tag))) continue;
          }
        }

        const tokens = tokenize(row.content);
        const dl = tokens.length;
        if (dl === 0) continue;

        // Quick reject: if the raw content doesn't contain any query terms, skip token accounting.
        const contentLower = row.content.toLowerCase();
        let hasAnyMatch = false;
        for (const term of queryTermSet) {
          if (contentLower.includes(term)) {
            hasAnyMatch = true;
            break;
          }
        }
        if (!hasAnyMatch) {
          // Still counts toward corpus size and avgdl for IDF normalization.
          totalDocLength += dl;
          N += 1;
          continue;
        }

        totalDocLength += dl;
        N += 1;

        const tf = new Map<string, number>();
        const present = new Set<string>();
        for (const token of tokens) {
          if (!queryTermSet.has(token)) continue;
          tf.set(token, (tf.get(token) ?? 0) + 1);
          present.add(token);
        }
        for (const term of present) {
          df.set(term, (df.get(term) ?? 0) + 1);
        }

        candidates.push({ row, metadata, dl, tf });
      }

      if (N === 0 || candidates.length === 0) {
        return { chunks: [], totalResults: 0 };
      }

      const avgdl = totalDocLength / Math.max(1, N);
      const k1 = 1.2;
      const b = 0.75;

      const idf = new Map<string, number>();
      for (const term of queryTermSet) {
        const termDf = df.get(term) ?? 0;
        idf.set(term, Math.log(1 + (N - termDf + 0.5) / (termDf + 0.5)));
      }

      let maxScore = 0;
      const rawScores = new Map<string, number>();

      for (const candidate of candidates) {
        let score = 0;
        for (const term of queryTermSet) {
          const f = candidate.tf.get(term) ?? 0;
          if (f === 0) continue;
          const termIdf = idf.get(term) ?? 0;
          const denom = f + k1 * (1 - b + b * (candidate.dl / Math.max(1e-9, avgdl)));
          score += termIdf * ((f * (k1 + 1)) / denom);
        }
        rawScores.set(candidate.row.chunk_id, score);
        if (score > maxScore) maxScore = score;
      }

      if (!(maxScore > 0)) {
        return { chunks: [], totalResults: 0 };
      }

      for (const candidate of candidates) {
        const raw = rawScores.get(candidate.row.chunk_id) ?? 0;
        const score = raw / maxScore;

        if (threshold !== null) {
          if (score < threshold) continue;
        } else if (!(raw > 0)) {
          continue;
        }

        scoredChunks.push({
          chunkId: candidate.row.chunk_id,
          documentId: candidate.row.document_id,
          content: candidate.row.content,
          score,
          _score: score,
          metadata: options.includeMetadata ? candidate.metadata : undefined,
        });
      }
    }

    scoredChunks.sort((a, b) => b._score - a._score);
    const results = scoredChunks.slice(0, topK).map(({ _score, ...chunk }) => chunk);

    return {
      chunks: results,
      totalResults: scoredChunks.length,
    };
  }

  private async queryVectorInternal(
    adapter: StorageAdapter,
    options: RagQueryOptions
  ): Promise<{ chunks: RagRetrievedChunk[]; totalResults: number } | null> {
    // Vector store tables are local; embeddings may require network access.
    try {
      await this.ensureVectorStoreInitialized(adapter);
      await this.ensureEmbeddingsInitialized(adapter);
    } catch {
      return null;
    }

    if (!this.embeddingManager || !this.embeddingModel || !this.vectorStore) {
      return null;
    }

    const queryText = options.query.trim();
    if (!queryText) {
      return { chunks: [], totalResults: 0 };
    }

    const queryEmbeddingResp = await this.embeddingManager.generateEmbeddings({
      texts: queryText,
      modelId: this.embeddingModel.modelId,
    });
    const queryEmbedding = queryEmbeddingResp.embeddings?.[0];
    if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      return null;
    }

    const preset = coerceRagPreset(options.preset) ?? this.getRetrievalPreset();
    const hybridAlpha = this.getHybridAlpha();
    const shouldRerank = preset === 'accurate';

    const strategy = options.strategy === 'mmr' ? 'mmr' : 'similarity';
    const mmrEnabled = strategy === 'mmr';
    const mmrLambdaRaw = options.strategyParams?.mmrLambda;
    const mmrLambda = Number.isFinite(mmrLambdaRaw)
      ? Math.max(0, Math.min(1, Number(mmrLambdaRaw)))
      : 0.7;
    const mmrCandidateMultiplierRaw = options.strategyParams?.mmrCandidateMultiplier;
    const mmrCandidateMultiplier = Number.isFinite(mmrCandidateMultiplierRaw)
      ? Math.max(1, Math.min(50, Math.floor(Number(mmrCandidateMultiplierRaw))))
      : 5;

    const topK = options.topK || 5;
    const threshold =
      typeof options.similarityThreshold === 'number' ? options.similarityThreshold : 0;
    const maxPerCollection = mmrEnabled
      ? Math.min(200, Math.max(topK * mmrCandidateMultiplier, topK))
      : Math.min(50, Math.max(topK * 4, topK));
    const collectionIds =
      options.collectionIds && options.collectionIds.length > 0
        ? options.collectionIds
        : ['default'];

    const vectorFilter: NonNullable<QueryOptions['filter']> = {};
    if (options.filters?.agentId) vectorFilter.agentId = options.filters.agentId;
    if (options.filters?.userId) vectorFilter.userId = options.filters.userId;
    const hasVectorFilter = Object.keys(vectorFilter).length > 0;

    type Candidate = {
      chunkId: string;
      documentId: string;
      content: string;
      score: number;
      metadata: any;
      embedding?: number[];
    };

    const candidates: Candidate[] = [];

    for (const collectionId of collectionIds) {
      try {
        await this.ensureVectorCollection(collectionId);
      } catch {
        continue;
      }

      try {
        if (preset === 'fast') {
          const result = await this.vectorStore.query(collectionId, queryEmbedding, {
            topK: maxPerCollection,
            includeEmbedding: mmrEnabled,
            includeTextContent: true,
            includeMetadata: true,
            filter: hasVectorFilter ? (vectorFilter as any) : undefined,
            minSimilarityScore: threshold,
          });
          for (const doc of result.documents) {
            const metadata = (doc.metadata ?? {}) as any;
            candidates.push({
              chunkId: doc.id,
              documentId:
                typeof metadata.__ragDocumentId === 'string' ? metadata.__ragDocumentId : doc.id,
              content: typeof doc.textContent === 'string' ? doc.textContent : '',
              score: typeof doc.similarityScore === 'number' ? doc.similarityScore : 0,
              metadata,
              embedding:
                mmrEnabled && doc.embedding && doc.embedding.length > 0 ? doc.embedding : undefined,
            });
          }
        } else if (typeof (this.vectorStore as any).hybridSearch === 'function') {
          const result = await (this.vectorStore as any).hybridSearch(
            collectionId,
            queryEmbedding,
            queryText,
            {
              topK: maxPerCollection,
              includeEmbedding: mmrEnabled,
              includeTextContent: true,
              includeMetadata: true,
              filter: hasVectorFilter ? (vectorFilter as any) : undefined,
              alpha: hybridAlpha,
              fusion: 'weighted',
              lexicalTopK: maxPerCollection * 3,
            }
          );

          for (const doc of (result.documents ?? []) as RetrievedVectorDocument[]) {
            const metadata = (doc.metadata ?? {}) as any;
            candidates.push({
              chunkId: doc.id,
              documentId:
                typeof metadata.__ragDocumentId === 'string' ? metadata.__ragDocumentId : doc.id,
              content: typeof doc.textContent === 'string' ? doc.textContent : '',
              score: typeof doc.similarityScore === 'number' ? doc.similarityScore : 0,
              metadata,
              embedding:
                mmrEnabled && doc.embedding && doc.embedding.length > 0 ? doc.embedding : undefined,
            });
          }
        } else {
          const result = await this.vectorStore.query(collectionId, queryEmbedding, {
            topK: maxPerCollection,
            includeEmbedding: mmrEnabled,
            includeTextContent: true,
            includeMetadata: true,
            filter: hasVectorFilter ? (vectorFilter as any) : undefined,
          });
          for (const doc of result.documents) {
            const metadata = (doc.metadata ?? {}) as any;
            candidates.push({
              chunkId: doc.id,
              documentId:
                typeof metadata.__ragDocumentId === 'string' ? metadata.__ragDocumentId : doc.id,
              content: typeof doc.textContent === 'string' ? doc.textContent : '',
              score: typeof doc.similarityScore === 'number' ? doc.similarityScore : 0,
              metadata,
              embedding:
                mmrEnabled && doc.embedding && doc.embedding.length > 0 ? doc.embedding : undefined,
            });
          }
        }
      } catch {
        // Ignore per-collection vector failures; keyword fallback may still cover the request.
      }
    }

    // Deduplicate by chunkId, keeping the best score.
    const bestById = new Map<string, Candidate>();
    for (const item of candidates) {
      const existing = bestById.get(item.chunkId);
      if (!existing || item.score > existing.score) {
        bestById.set(item.chunkId, item);
      }
    }

    let ranked = Array.from(bestById.values()).filter((item) => item.score >= threshold);
    ranked.sort((a, b) => b.score - a.score);

    // Hydrate the canonical chunk content/metadata from SQL (vector index is best-effort).
    if (ranked.length > 0) {
      const chunkIds = ranked.map((c) => c.chunkId);
      const chunkRowById = new Map<
        string,
        Pick<ChunkRow, 'chunk_id' | 'document_id' | 'content' | 'metadata_json'> &
          Pick<DocumentRow, 'category'>
      >();

      // Avoid SQLite parameter limits by chunking IN clauses.
      const pageSize = 250;
      for (let i = 0; i < chunkIds.length; i += pageSize) {
        const page = chunkIds.slice(i, i + pageSize);
        const placeholders = page.map(() => '?').join(',');
        const rows = await adapter.all<
          Pick<ChunkRow, 'chunk_id' | 'document_id' | 'content' | 'metadata_json'> &
            Pick<DocumentRow, 'category'>
        >(
          `SELECT c.chunk_id, c.document_id, c.content, c.metadata_json, d.category
           FROM ${this.tablePrefix}chunks c
           JOIN ${this.tablePrefix}documents d ON d.document_id = c.document_id
           WHERE c.chunk_id IN (${placeholders})`,
          page
        );
        for (const row of rows) {
          chunkRowById.set(row.chunk_id, row);
        }
      }

      const hydrated: Candidate[] = [];
      for (const candidate of ranked) {
        const row = chunkRowById.get(candidate.chunkId);
        if (!row) continue;

        const metadata = parseJsonSafe<Record<string, unknown>>(row.metadata_json, {});

        // Apply filters using canonical SQL metadata/category.
        if (options.filters?.agentId && metadata.agentId !== options.filters.agentId) continue;
        if (options.filters?.userId && metadata.userId !== options.filters.userId) continue;
        if (options.filters?.category && row.category !== options.filters.category) continue;
        if (options.filters?.tags && options.filters.tags.length > 0) {
          const docTags = Array.isArray((metadata as any).tags) ? (metadata as any).tags : [];
          if (!options.filters.tags.some((tag) => docTags.includes(tag))) continue;
        }

        hydrated.push({
          ...candidate,
          documentId: row.document_id,
          content: row.content,
          metadata,
        });
      }

      ranked = hydrated;
    }

    // Rerank (optional; accuracy over latency).
    if (shouldRerank && this.rerankerService && ranked.length > 0) {
      const useCohere = Boolean(process.env.COHERE_API_KEY?.trim());
      const providerId = useCohere ? 'cohere' : 'local';
      const modelId = useCohere ? 'rerank-v3.5' : 'cross-encoder/ms-marco-MiniLM-L-6-v2';
      const maxDocuments = 40;
      const timeoutMs = 20_000;

      try {
        const rerankInput: RerankerInput = {
          query: queryText,
          documents: ranked.slice(0, maxDocuments).map((c) => ({
            id: c.chunkId,
            content: c.content,
            originalScore: c.score,
            metadata: c.metadata,
          })),
        };
        const output = await this.rerankerService.rerank(rerankInput, {
          providerId,
          modelId,
          topN: topK,
          maxDocuments,
          timeoutMs,
        });

        const byId = new Map(ranked.map((c) => [c.chunkId, c]));
        const reranked: Candidate[] = [];
        for (const res of output.results) {
          const original = byId.get(res.id);
          if (!original) continue;
          reranked.push({
            ...original,
            score: res.relevanceScore,
            metadata: {
              ...(original.metadata ?? {}),
              _rerankerOriginalScore: original.score,
              _rerankerProviderId: providerId,
            },
          });
        }

        // Fill remaining slots with original ranking if reranker returned fewer results.
        const included = new Set(reranked.map((r) => r.chunkId));
        for (const original of ranked) {
          if (reranked.length >= topK) break;
          if (included.has(original.chunkId)) continue;
          reranked.push(original);
        }

        ranked = reranked;
      } catch (rerankError: any) {
        if (!this.rerankWarningLogged) {
          this.rerankWarningLogged = true;
          const message = rerankError?.message ?? String(rerankError);
          console.warn(
            `[RAG Service] Reranking failed; returning results without reranking. ${message}`
          );
          if (
            typeof message === 'string' &&
            (message.includes('@huggingface/transformers') ||
              message.includes('@xenova/transformers'))
          ) {
            console.warn(
              `[RAG Service] Local reranking requires installing Transformers.js (optional): '@huggingface/transformers' (preferred) or '@xenova/transformers'.`
            );
          }
        }
      }
    }

    const totalRanked = ranked.length;

    // MMR diversification (optional)
    if (mmrEnabled && ranked.length > 0) {
      ranked.sort((a, b) => b.score - a.score);
      ranked = this.applyMMR({
        candidates: ranked,
        topK,
        lambda: mmrLambda,
        candidateMultiplier: mmrCandidateMultiplier,
      });
    }

    const results = ranked.slice(0, topK).map((candidate) => ({
      chunkId: candidate.chunkId,
      documentId: candidate.documentId,
      content: candidate.content,
      score: candidate.score,
      metadata: options.includeMetadata ? candidate.metadata : undefined,
    }));

    return {
      chunks: results,
      totalResults: totalRanked,
    };
  }

  private normalizeQueryKey(text: string): string {
    return String(text || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  private sanitizeQueryVariants(
    variants: unknown,
    baseQuery: string,
    maxVariants: number
  ): string[] {
    const limit = Math.max(0, Math.min(8, Math.floor(maxVariants)));
    if (limit === 0) return [];
    const baseKey = this.normalizeQueryKey(baseQuery);

    const out: string[] = [];
    const seen = new Set<string>([baseKey]);

    const items = Array.isArray(variants) ? variants : [];
    for (const raw of items) {
      if (out.length >= limit) break;
      if (typeof raw !== 'string') continue;
      const text = raw.trim();
      if (!text) continue;
      const key = this.normalizeQueryKey(text);
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(text.slice(0, 512));
    }

    return out;
  }

  private extractCompletionText(response: any): string {
    const choice = response?.choices?.[0];
    const content = choice?.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map((part: any) =>
          part?.type === 'text' && typeof part?.text === 'string' ? part.text : ''
        )
        .join('');
    }
    if (typeof choice?.text === 'string') return choice.text;
    return '';
  }

  private parseQueryVariantOutput(text: string): string[] {
    const raw = String(text || '').trim();
    if (!raw) return [];

    // Preferred: JSON array of strings.
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((v) => typeof v === 'string')
          .map((v) => v.trim())
          .filter(Boolean);
      }
    } catch {
      // Fall back.
    }

    // Try extracting a JSON array substring.
    const firstBracket = raw.indexOf('[');
    const lastBracket = raw.lastIndexOf(']');
    if (firstBracket >= 0 && lastBracket > firstBracket) {
      const slice = raw.slice(firstBracket, lastBracket + 1);
      try {
        const parsed = JSON.parse(slice);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((v) => typeof v === 'string')
            .map((v) => v.trim())
            .filter(Boolean);
        }
      } catch {
        // Ignore.
      }
    }

    // Last resort: parse lines/bullets.
    return raw
      .split(/\r?\n+/g)
      .map((line) => line.replace(/^\s*[-*\\d.)]+\\s*/g, '').trim())
      .filter(Boolean);
  }

  private async generateQueryVariantsWithLlm(
    baseQuery: string,
    maxVariants: number
  ): Promise<string[]> {
    const max = Math.max(0, Math.min(8, Math.floor(maxVariants)));
    if (max === 0) return [];

    try {
      const providerManager = await this.ensureProviderManagerInitialized();
      const providerId = providerManager.getProvider('openrouter')
        ? 'openrouter'
        : providerManager.getProvider('openai')
          ? 'openai'
          : providerManager.getProvider('ollama')
            ? 'ollama'
            : '';
      if (!providerId) return [];

      const provider = providerManager.getProvider(providerId);
      if (!provider) return [];

      const modelId =
        providerId === 'openrouter'
          ? process.env.MODEL_PREF_OPENROUTER_DEFAULT?.trim() || 'openai/gpt-4o-mini'
          : providerId === 'openai'
            ? process.env.AGENTOS_DEFAULT_MODEL_ID?.trim() || 'gpt-4o-mini'
            : process.env.OLLAMA_MODEL?.trim() || 'llama3';

      const prompt = `You rewrite user queries for retrieval.
Generate ${max} alternative search queries that preserve the same intent but vary phrasing, synonyms, and acronyms.
Return ONLY a JSON array of strings (no extra text).

Query: ${JSON.stringify(baseQuery)}`;

      const response = await provider.generateCompletion(
        modelId,
        [{ role: 'user', content: prompt }],
        { maxTokens: 200, temperature: 0.2 }
      );
      const text = this.extractCompletionText(response);
      const parsed = this.parseQueryVariantOutput(text);
      return this.sanitizeQueryVariants(parsed, baseQuery, max);
    } catch {
      return [];
    }
  }

  private async resolveQueryVariants(options: RagQueryOptions): Promise<string[]> {
    const baseQuery = String(options.query || '').trim();
    if (!baseQuery) return [''];

    const explicit = this.sanitizeQueryVariants(options.queryVariants, baseQuery, 8);
    if (explicit.length > 0) return [baseQuery, ...explicit];

    const rewriteEnabled = options.rewrite?.enabled === true;
    if (!rewriteEnabled) return [baseQuery];

    const maxVariantsRaw = options.rewrite?.maxVariants;
    const maxVariants = Number.isFinite(maxVariantsRaw)
      ? Math.max(1, Math.min(8, Math.floor(Number(maxVariantsRaw))))
      : 2;

    const generated = await this.generateQueryVariantsWithLlm(baseQuery, maxVariants);
    return [baseQuery, ...generated];
  }

  async query(options: RagQueryOptions): Promise<RagQueryResult> {
    const adapter = await this.ensureInitialized();
    const startTime = Date.now();
    const topK = options.topK || 5;

    const queries = await this.resolveQueryVariants(options);
    const [baseQuery, ...variants] = queries;

    let vector: { chunks: RagRetrievedChunk[]; totalResults: number } | null = null;
    if (variants.length === 0) {
      vector = await this.queryVectorInternal(adapter, options);
    } else {
      const mergedById = new Map<string, RagRetrievedChunk>();
      const first = await this.queryVectorInternal(adapter, { ...options, query: baseQuery });

      // If embeddings are unavailable, skip extra vector attempts (all will be null anyway).
      const canUseVector = Boolean(first);
      if (first) {
        for (const chunk of first.chunks) mergedById.set(chunk.chunkId, chunk);
      }

      if (canUseVector) {
        for (const q of variants) {
          const result = await this.queryVectorInternal(adapter, { ...options, query: q });
          if (!result) continue;
          for (const chunk of result.chunks) {
            const existing = mergedById.get(chunk.chunkId);
            if (!existing || chunk.score > existing.score) mergedById.set(chunk.chunkId, chunk);
          }
        }
      }

      const merged = Array.from(mergedById.values());
      merged.sort((a, b) => b.score - a.score);
      vector = canUseVector ? { chunks: merged, totalResults: merged.length } : null;
    }

    const keywordNeeded = !vector || vector.chunks.length < topK;
    const keyword = keywordNeeded
      ? variants.length === 0
        ? await this.queryKeywordInternal(adapter, options)
        : await (async () => {
            const mergedById = new Map<string, RagRetrievedChunk>();
            for (const q of queries) {
              const result = await this.queryKeywordInternal(adapter, { ...options, query: q });
              for (const chunk of result.chunks) {
                const existing = mergedById.get(chunk.chunkId);
                if (!existing || chunk.score > existing.score) mergedById.set(chunk.chunkId, chunk);
              }
            }
            const merged = Array.from(mergedById.values());
            merged.sort((a, b) => b.score - a.score);
            return { chunks: merged, totalResults: merged.length };
          })()
      : null;

    const mergedById = new Map<string, RagRetrievedChunk>();
    for (const chunk of vector?.chunks ?? []) {
      mergedById.set(chunk.chunkId, chunk);
    }
    if (keyword) {
      for (const chunk of keyword.chunks) {
        const existing = mergedById.get(chunk.chunkId);
        if (!existing || chunk.score > existing.score) {
          mergedById.set(chunk.chunkId, chunk);
        }
      }
    }

    const merged = Array.from(mergedById.values());
    merged.sort((a, b) => b.score - a.score);

    return {
      success: true,
      query: options.query,
      chunks: merged.slice(0, topK),
      totalResults: merged.length,
      processingTimeMs: Date.now() - startTime,
    };
  }

  async graphRagLocalSearch(
    query: string,
    options?: GraphRAGSearchOptions
  ): Promise<LocalSearchResult> {
    const adapter = await this.ensureInitialized();
    const engine = await this.requireGraphRagEngine(adapter);
    const trimmed = String(query || '').trim();
    if (!trimmed) throw new Error('GraphRAG localSearch requires a non-empty query.');
    return engine.localSearch(trimmed, options);
  }

  async graphRagGlobalSearch(
    query: string,
    options?: GraphRAGSearchOptions
  ): Promise<GlobalSearchResult> {
    const adapter = await this.ensureInitialized();
    const engine = await this.requireGraphRagEngine(adapter);
    const trimmed = String(query || '').trim();
    if (!trimmed) throw new Error('GraphRAG globalSearch requires a non-empty query.');
    return engine.globalSearch(trimmed, options);
  }

  async graphRagStats(): Promise<Awaited<ReturnType<IGraphRAGEngine['getStats']>>> {
    const adapter = await this.ensureInitialized();
    const engine = await this.requireGraphRagEngine(adapter);
    return engine.getStats();
  }

  /**
   * Delete a document and its chunks.
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    const adapter = await this.ensureInitialized();

    // Get collection ID for count update
    const doc = await adapter.get<Pick<DocumentRow, 'collection_id' | 'category'>>(
      `SELECT collection_id, category FROM ${this.tablePrefix}documents WHERE document_id = ?`,
      [documentId]
    );

    if (!doc) return false;

    // Best-effort: detect whether this document is a derived multimodal asset.
    // Capture modality + base collection before deletes for downstream cleanup.
    let mediaAsset: Pick<MediaAssetRow, 'collection_id' | 'modality'> | null = null;
    try {
      mediaAsset = await adapter.get<Pick<MediaAssetRow, 'collection_id' | 'modality'>>(
        `SELECT collection_id, modality FROM ${this.tablePrefix}media_assets WHERE asset_id = ?`,
        [documentId]
      );
    } catch {
      mediaAsset = null;
    }

    // Capture chunk IDs for vector index cleanup before deleting.
    const chunkRows = await adapter.all<{ chunk_id: string }>(
      `SELECT chunk_id FROM ${this.tablePrefix}chunks WHERE document_id = ?`,
      [documentId]
    );
    const chunkIds = chunkRows.map((r) => r.chunk_id).filter(Boolean);

    // Delete chunks
    await adapter.run(`DELETE FROM ${this.tablePrefix}chunks WHERE document_id = ?`, [documentId]);

    // Delete document
    const result = await adapter.run(
      `DELETE FROM ${this.tablePrefix}documents WHERE document_id = ?`,
      [documentId]
    );

    // Best-effort: if this document is a derived multimodal asset, remove the asset row as well.
    try {
      await adapter.run(`DELETE FROM ${this.tablePrefix}media_assets WHERE asset_id = ?`, [
        documentId,
      ]);
    } catch {
      // Ignore; older schemas may not have the table.
    }

    // Update collection counts
    await this.updateCollectionCounts(adapter, doc.collection_id);

    // Best-effort: clean up vector index without forcing embeddings init.
    try {
      await this.ensureVectorStoreInitialized(adapter);
      if (chunkIds.length > 0) {
        await this.vectorStore?.delete(doc.collection_id, chunkIds);
      }
    } catch {
      // Ignore; canonical SQL deletes already happened.
    }

    // Best-effort: if this was an image asset, remove the raw image embedding vector as well.
    if (mediaAsset?.modality === 'image') {
      await this.deleteMediaImageEmbeddingVector({
        adapter,
        assetId: documentId,
        baseCollectionId: mediaAsset.collection_id || doc.collection_id,
      });
    } else if (mediaAsset?.modality === 'audio') {
      await this.deleteMediaAudioEmbeddingVector({
        adapter,
        assetId: documentId,
        baseCollectionId: mediaAsset.collection_id || doc.collection_id,
      });
    }

    // Best-effort: keep GraphRAG in sync when enabled.
    if (this.isGraphRagEnabled()) {
      try {
        await this.ensureGraphRagInitialized(adapter);
        await this.graphRagEngine?.removeDocuments([documentId]);
      } catch (graphError: any) {
        console.warn(
          `[RAG Service] GraphRAG cleanup failed for deleted document '${documentId}' (continuing): ${
            graphError?.message ?? graphError
          }`
        );
      }
    }

    return result.changes > 0;
  }

  /**
   * List documents with optional filters.
   */
  async listDocuments(filters?: {
    collectionId?: string;
    agentId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<RagDocumentSummary[]> {
    const adapter = await this.ensureInitialized();

    let sql = `
      SELECT d.*, 
             (SELECT COUNT(*) FROM ${this.tablePrefix}chunks c WHERE c.document_id = d.document_id) as chunk_count
      FROM ${this.tablePrefix}documents d
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.collectionId) {
      sql += ` AND d.collection_id = ?`;
      params.push(filters.collectionId);
    }

    sql += ` ORDER BY d.updated_at DESC`;

    if (filters?.limit) {
      sql += ` LIMIT ?`;
      params.push(filters.limit);
    }

    if (filters?.offset) {
      sql += ` OFFSET ?`;
      params.push(filters.offset);
    }

    const rows = await adapter.all<DocumentRow & { chunk_count: number }>(sql, params);

    // Apply metadata filters in application code
    return rows
      .map((row) => {
        const metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {};
        return {
          documentId: row.document_id,
          collectionId: row.collection_id,
          category: row.category,
          chunkCount: row.chunk_count,
          metadata,
          createdAt: row.created_at,
        };
      })
      .filter((doc) => {
        if (filters?.agentId && doc.metadata.agentId !== filters.agentId) return false;
        if (filters?.userId && doc.metadata.userId !== filters.userId) return false;
        return true;
      });
  }

  /**
   * Get statistics.
   */
  async getStats(agentId?: string): Promise<RagMemoryStats> {
    const adapter = await this.ensureInitialized();

    // Get collection stats
    const collections = await adapter.all<CollectionRow>(
      `SELECT * FROM ${this.tablePrefix}collections`
    );

    let totalDocs = 0;
    let totalChunks = 0;

    const collectionStats = collections.map((c) => {
      totalDocs += c.document_count;
      totalChunks += c.chunk_count;
      return {
        collectionId: c.collection_id,
        documentCount: c.document_count,
        chunkCount: c.chunk_count,
      };
    });

    // If filtering by agent, recompute
    if (agentId) {
      const agentDocs = await adapter.all<{
        collection_id: string;
        doc_count: number;
        chunk_count: number;
      }>(
        `SELECT d.collection_id, 
                COUNT(DISTINCT d.document_id) as doc_count,
                (SELECT COUNT(*) FROM ${this.tablePrefix}chunks c WHERE c.document_id = d.document_id) as chunk_count
         FROM ${this.tablePrefix}documents d
         WHERE json_extract(d.metadata_json, '$.agentId') = ?
         GROUP BY d.collection_id`,
        [agentId]
      );

      totalDocs = agentDocs.reduce((sum, d) => sum + d.doc_count, 0);
      totalChunks = agentDocs.reduce((sum, d) => sum + d.chunk_count, 0);
    }

    return {
      totalDocuments: totalDocs,
      totalChunks,
      collections: collectionStats,
    };
  }

  /**
   * Chunk content into smaller pieces.
   */
  private chunkContent(content: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];

    // Split by paragraphs first
    const paragraphs = content.split(/\n\n+/);

    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      if (currentChunk.length + trimmed.length <= chunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
      } else {
        // Save current chunk if not empty
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        // If paragraph is larger than chunk size, split by sentences
        if (trimmed.length > chunkSize) {
          const sentences = trimmed.split(/(?<=[.!?])\s+/);
          currentChunk = '';

          for (const sentence of sentences) {
            if (currentChunk.length + sentence.length <= chunkSize) {
              currentChunk += (currentChunk ? ' ' : '') + sentence;
            } else {
              if (currentChunk) chunks.push(currentChunk);

              // If single sentence is too long, split by words
              if (sentence.length > chunkSize) {
                const words = sentence.split(/\s+/);
                currentChunk = '';
                for (const word of words) {
                  if (currentChunk.length + word.length <= chunkSize) {
                    currentChunk += (currentChunk ? ' ' : '') + word;
                  } else {
                    if (currentChunk) chunks.push(currentChunk);
                    currentChunk = word;
                  }
                }
              } else {
                currentChunk = sentence;
              }
            }
          }
        } else {
          currentChunk = trimmed;
        }
      }
    }

    // Don't forget the last chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [content];
  }

  /**
   * Shutdown and cleanup.
   */
  async shutdown(): Promise<void> {
    try {
      await this.graphRagEngine?.shutdown();
    } catch {
      // Ignore.
    }
    try {
      await this.embeddingManager?.shutdown();
    } catch {
      // Ignore.
    }
    try {
      await this.vectorStore?.shutdown();
    } catch {
      // Ignore.
    }

    this.providerManager = undefined;
    this.providerManagerInitPromise = null;
    this.embeddingManager = undefined;
    this.embeddingModel = undefined;
    this.rerankerService = undefined;
    this.embeddingStatus = 'uninitialized';
    this.embeddingDisabledReason = undefined;
    this.embeddingInitPromise = null;

    this.vectorStore = null;
    this.vectorStoreInitialized = false;
    this.vectorStoreInitPromise = null;

    this.graphRagEngine = undefined;
    this.graphRagStatus = 'uninitialized';
    this.graphRagDisabledReason = undefined;
    this.graphRagInitPromise = null;
    this.graphRagWarningLogged = false;

    if (this.adapter) {
      await this.adapter.close();
      this.adapter = null;
    }
    this.initialized = false;
    this.initPromise = null;
    console.log('[RAG Service] Shut down');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

const ragStore = new SqlRagStore();

// ============================================================================
// Public API
// ============================================================================

/**
 * RAG Service - Main interface for RAG operations.
 *
 * Uses `@framers/sql-storage-adapter` for cross-platform persistent storage
 * with intelligent fallback (better-sqlite3 → IndexedDB → sql.js).
 *
 * @example
 * ```typescript
 * // Initialize happens automatically on first use
 *
 * // Ingest a document
 * const result = await ragService.ingestDocument({
 *   content: 'Important information...',
 *   collectionId: 'agent-123',
 *   metadata: { agentId: '123', userId: 'user-456' }
 * });
 *
 * // Query for relevant context
 * const context = await ragService.query({
 *   query: 'What is the important information?',
 *   topK: 5
 * });
 * ```
 */
export const ragService = {
  /**
   * Initialize the RAG service.
   * Called automatically on first use, but can be called explicitly for eager init.
   */
  async initialize(): Promise<void> {
    return ragStore.initialize();
  },

  /**
   * Check if RAG services are available.
   */
  isAvailable(): boolean {
    return ragStore.isAvailable();
  },

  /**
   * Get the storage adapter kind (for diagnostics).
   */
  getAdapterKind(): string {
    return ragStore.getAdapterKind();
  },

  /**
   * Ingest a document into RAG memory.
   */
  async ingestDocument(input: RagDocumentInput): Promise<RagIngestionResult> {
    return ragStore.ingestDocument(input);
  },

  /**
   * Query RAG memory for relevant context.
   */
  async query(options: RagQueryOptions): Promise<RagQueryResult> {
    return ragStore.query(options);
  },

  /**
   * Ingest an image into multimodal RAG (stores metadata + derived caption document).
   */
  async ingestImageAsset(
    input: Omit<RagMediaAssetInput, 'modality'>
  ): Promise<RagMediaIngestionResult> {
    return ragStore.ingestImageAsset(input);
  },

  /**
   * Ingest an audio file into multimodal RAG (stores metadata + derived transcript document).
   */
  async ingestAudioAsset(
    input: Omit<RagMediaAssetInput, 'modality'>
  ): Promise<RagMediaIngestionResult> {
    return ragStore.ingestAudioAsset(input);
  },

  /**
   * Ingest a multimodal asset into RAG by deriving a text representation.
   */
  async ingestMediaAsset(input: RagMediaAssetInput): Promise<RagMediaIngestionResult> {
    return ragStore.ingestMediaAsset(input);
  },

  /**
   * Query multimodal assets by searching their derived text representations.
   */
  async queryMediaAssets(options: RagMediaQueryOptions): Promise<RagMediaQueryResult> {
    return ragStore.queryMediaAssets(options);
  },

  /**
   * Derive a text representation for an image without ingesting it.
   * Useful for query-by-image flows that run text retrieval.
   */
  async describeImageForRetrieval(input: {
    mimeType: string;
    payload?: Buffer;
    sourceUrl?: string;
  }): Promise<{ textRepresentation: string; tags?: string[] }> {
    return ragStore.describeImageForRetrieval(input);
  },

  /**
   * Derive a text representation for an audio clip without ingesting it.
   * Useful for query-by-audio flows that run text retrieval.
   */
  async transcribeAudioForRetrieval(input: {
    payload: Buffer;
    originalFileName: string;
    mimeType: string;
    userId?: string;
  }): Promise<string> {
    return ragStore.transcribeAudioForRetrieval(input);
  },

  /**
   * Query indexed media assets using a binary image query (caption then retrieve).
   */
  async queryMediaAssetsByImage(options: {
    payload?: Buffer;
    mimeType?: string;
    sourceUrl?: string;
    textRepresentation?: string;
    modalities?: RagMediaModality[];
    collectionIds?: string[];
    topK?: number;
    includeMetadata?: boolean;
  }): Promise<RagMediaQueryResult> {
    return ragStore.queryMediaAssetsByImage(options);
  },

  /**
   * Query indexed media assets using a binary audio query (transcribe then retrieve).
   */
  async queryMediaAssetsByAudio(options: {
    payload?: Buffer;
    mimeType?: string;
    originalFileName?: string;
    textRepresentation?: string;
    modalities?: RagMediaModality[];
    collectionIds?: string[];
    topK?: number;
    includeMetadata?: boolean;
    userId?: string;
  }): Promise<RagMediaQueryResult> {
    return ragStore.queryMediaAssetsByAudio(options);
  },

  /**
   * Get multimodal asset metadata by `assetId`.
   */
  async getMediaAsset(assetId: string): Promise<RagMediaAsset | null> {
    return ragStore.getMediaAsset(assetId);
  },

  /**
   * Get multimodal asset raw bytes (only available when `storePayload=true` at ingest time).
   */
  async getMediaAssetContent(
    assetId: string
  ): Promise<{ mimeType: string; buffer: Buffer } | null> {
    return ragStore.getMediaAssetContent(assetId);
  },

  /**
   * Delete a multimodal asset and its derived RAG document.
   */
  async deleteMediaAsset(assetId: string): Promise<boolean> {
    return ragStore.deleteMediaAsset(assetId);
  },

  /**
   * GraphRAG local search (entity + relationship context).
   * Disabled by default. Enable with `AGENTOS_GRAPHRAG_ENABLED=true`.
   */
  async graphRagLocalSearch(
    query: string,
    options?: GraphRAGSearchOptions
  ): Promise<LocalSearchResult> {
    return ragStore.graphRagLocalSearch(query, options);
  },

  /**
   * GraphRAG global search (community summaries).
   * Disabled by default. Enable with `AGENTOS_GRAPHRAG_ENABLED=true`.
   */
  async graphRagGlobalSearch(
    query: string,
    options?: GraphRAGSearchOptions
  ): Promise<GlobalSearchResult> {
    return ragStore.graphRagGlobalSearch(query, options);
  },

  /**
   * GraphRAG statistics.
   */
  async graphRagStats(): Promise<Awaited<ReturnType<IGraphRAGEngine['getStats']>>> {
    return ragStore.graphRagStats();
  },

  /**
   * Delete a document from RAG memory.
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    return ragStore.deleteDocument(documentId);
  },

  /**
   * Get RAG memory statistics.
   */
  async getStats(agentId?: string): Promise<RagMemoryStats> {
    return ragStore.getStats(agentId);
  },

  /**
   * List documents in RAG memory.
   */
  async listDocuments(filters?: {
    collectionId?: string;
    agentId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<RagDocumentSummary[]> {
    return ragStore.listDocuments(filters);
  },

  /**
   * Create a collection.
   */
  async createCollection(collectionId: string, displayName?: string): Promise<void> {
    return ragStore.createCollection(collectionId, displayName);
  },

  /**
   * List all collections.
   */
  async listCollections(): Promise<RagCollection[]> {
    return ragStore.listCollections();
  },

  /**
   * Delete a collection.
   */
  async deleteCollection(collectionId: string): Promise<boolean> {
    return ragStore.deleteCollection(collectionId);
  },

  /**
   * Ingest knowledge document for an agent.
   * Convenience method that sets appropriate collection and metadata.
   */
  async ingestAgentKnowledge(
    agentId: string,
    userId: string,
    knowledgeId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<RagIngestionResult> {
    return this.ingestDocument({
      documentId: `knowledge_${knowledgeId}`,
      content,
      collectionId: `agent-${agentId}`,
      category: 'knowledge_base',
      metadata: {
        ...metadata,
        agentId,
        userId,
        knowledgeId,
        source: 'user_upload',
      },
    });
  },

  /**
   * Delete knowledge document from RAG for an agent.
   */
  async deleteAgentKnowledge(knowledgeId: string): Promise<boolean> {
    return this.deleteDocument(`knowledge_${knowledgeId}`);
  },

  /**
   * Shutdown the RAG service.
   */
  async shutdown(): Promise<void> {
    return ragStore.shutdown();
  },
};

export default ragService;
