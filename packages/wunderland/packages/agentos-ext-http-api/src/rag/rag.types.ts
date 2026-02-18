import type { RetrievedVectorDocument } from '@framers/agentos/rag/IVectorStore';

/**
 * Request payload for document ingestion into RAG memory.
 */
export interface RagIngestRequest {
  /** Unique identifier for the document */
  documentId?: string;
  /** Text content to ingest */
  content: string;
  /** Collection/namespace to store the document in */
  collectionId?: string;
  /** Document metadata for filtering and attribution */
  metadata?: {
    agentId?: string;
    userId?: string;
    type?: string;
    tags?: string[];
    source?: string;
    [key: string]: unknown;
  };
  /** Category of memory (conversation, knowledge, etc.) */
  category?: 'conversation_memory' | 'knowledge_base' | 'user_notes' | 'system' | 'custom';
  /** Chunking configuration */
  chunkingOptions?: {
    chunkSize?: number;
    chunkOverlap?: number;
    strategy?: 'fixed' | 'semantic' | 'sentence';
  };
}

/**
 * Response from document ingestion.
 */
export interface RagIngestResponse {
  success: boolean;
  documentId: string;
  chunksCreated: number;
  collectionId: string;
  message?: string;
}

/**
 * Request payload for querying RAG memory.
 */
export interface RagQueryRequest {
  /** The query text to find relevant context for */
  query: string;
  /**
   * Retrieval preset override for this request.
   * When omitted, uses the server default.
   */
  preset?: 'fast' | 'balanced' | 'accurate';
  /** Collection(s) to search in */
  collectionIds?: string[];
  /** Maximum number of chunks to retrieve */
  topK?: number;
  /** Minimum similarity score threshold (0-1) */
  similarityThreshold?: number;
  /** Metadata filters */
  filters?: {
    agentId?: string;
    userId?: string;
    category?: string;
    tags?: string[];
    [key: string]: unknown;
  };
  /** Include document metadata in results */
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
   * Disabled by default; enabling may incur an extra model call.
   */
  rewrite?: {
    enabled?: boolean;
    /** Max number of generated variants (in addition to the base `query`). Default: `2`. */
    maxVariants?: number;
  };
}

/**
 * A single retrieved chunk from RAG query.
 */
export interface RagRetrievedChunk {
  /** Unique chunk identifier */
  chunkId: string;
  /** Parent document identifier */
  documentId: string;
  /** The text content of the chunk */
  content: string;
  /** Similarity score (0-1) */
  score: number;
  /** Chunk metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Response from RAG query.
 */
export interface RagQueryResponse {
  success: boolean;
  query: string;
  chunks: RagRetrievedChunk[];
  totalResults: number;
  processingTimeMs: number;
}

/**
 * Document summary for listing.
 */
export interface RagDocumentSummary {
  documentId: string;
  collectionId: string;
  chunkCount: number;
  category?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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

export type RagMediaModality = 'image' | 'audio';

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

export interface RagMediaAssetIngestRequest {
  assetId?: string;
  collectionId?: string;
  mimeType: string;
  originalFileName?: string;
  payload?: Buffer;
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  category?: 'conversation_memory' | 'knowledge_base' | 'user_notes' | 'system' | 'custom';
  textRepresentation?: string;
  storePayload?: boolean;
  userId?: string;
  agentId?: string;
}

export interface RagMediaIngestionResponse {
  success: boolean;
  assetId: string;
  collectionId: string;
  modality: RagMediaModality;
  documentId: string;
  textRepresentation: string;
  chunksCreated: number;
  error?: string;
}

export interface RagMediaQueryRequest {
  query: string;
  modalities?: RagMediaModality[];
  collectionIds?: string[];
  topK?: number;
  includeMetadata?: boolean;
}

export interface RagMediaQueryByImageRequest {
  payload?: Buffer;
  mimeType?: string;
  sourceUrl?: string;
  textRepresentation?: string;
  modalities?: RagMediaModality[];
  collectionIds?: string[];
  topK?: number;
  includeMetadata?: boolean;
}

export interface RagMediaQueryByAudioRequest {
  payload?: Buffer;
  mimeType?: string;
  originalFileName?: string;
  textRepresentation?: string;
  modalities?: RagMediaModality[];
  collectionIds?: string[];
  topK?: number;
  includeMetadata?: boolean;
  userId?: string;
}

export interface RagMediaQueryResponse {
  success: boolean;
  query: string;
  assets: Array<{
    asset: RagMediaAsset;
    bestChunk: RagRetrievedChunk;
  }>;
  totalResults: number;
  processingTimeMs: number;
  error?: string;
}

/**
 * Minimal RAG service contract required by the HTTP routers.
 * Intended to be implemented by a host application.
 */
export interface AgentOSRagServiceLike {
  ingestDocument(input: RagIngestRequest): Promise<{
    success: boolean;
    documentId: string;
    collectionId: string;
    chunksCreated: number;
    error?: string;
  }>;

  query(input: RagQueryRequest): Promise<{
    success: boolean;
    query: string;
    chunks: Array<{
      chunkId: string;
      documentId: string;
      content: string;
      score: number;
      metadata?: Record<string, unknown>;
    }>;
    totalResults: number;
    processingTimeMs: number;
    error?: string;
  }>;

  // GraphRAG (optional; may throw when disabled).
  graphRagLocalSearch(query: string, options?: unknown): Promise<unknown>;
  graphRagGlobalSearch(query: string, options?: unknown): Promise<unknown>;
  graphRagStats(): Promise<unknown>;

  // Management.
  listDocuments(input: { collectionId?: string; agentId?: string; userId?: string }): Promise<
    Array<{
      documentId: string;
      collectionId: string;
      chunkCount: number;
      category?: string;
      metadata?: Record<string, unknown>;
      createdAt: number;
      updatedAt?: number;
    }>
  >;
  deleteDocument(documentId: string): Promise<boolean>;
  getStats(agentId?: string): Promise<RagMemoryStats>;
  getAdapterKind(): string;
  createCollection(collectionId: string, displayName?: string): Promise<void>;
  listCollections(): Promise<unknown>;
  deleteCollection(collectionId: string): Promise<boolean>;
  isAvailable(): boolean;
  initialize(): Promise<void>;

  // Multimodal asset operations (image/audio).
  ingestImageAsset(input: RagMediaAssetIngestRequest): Promise<RagMediaIngestionResponse>;
  ingestAudioAsset(input: RagMediaAssetIngestRequest): Promise<RagMediaIngestionResponse>;
  queryMediaAssets(input: RagMediaQueryRequest): Promise<RagMediaQueryResponse>;
  queryMediaAssetsByImage(input: RagMediaQueryByImageRequest): Promise<RagMediaQueryResponse>;
  queryMediaAssetsByAudio(input: RagMediaQueryByAudioRequest): Promise<RagMediaQueryResponse>;
  getMediaAsset(assetId: string): Promise<RagMediaAsset | null>;
  getMediaAssetContent(assetId: string): Promise<{ mimeType: string; buffer: Buffer } | null>;
  deleteMediaAsset(assetId: string): Promise<boolean>;
}

export type AgentOSRagEnabledCheck = () => boolean;

export type AgentOSRagRouterDeps = {
  isEnabled: AgentOSRagEnabledCheck;
  ragService: AgentOSRagServiceLike;
};

/**
 * Wire-format used by the router. Kept here so host apps don't need to import
 * backend-private types.
 */
export type RagRetrievedChunkWire = RetrievedVectorDocument & {
  chunkId?: string;
};
