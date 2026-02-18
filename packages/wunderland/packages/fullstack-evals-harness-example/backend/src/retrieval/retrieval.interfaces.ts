/**
 * RAG Retrieval Interfaces — Stubs for future retrieval-augmented generation support.
 *
 * CURRENT STATE: The eval harness evaluates RAG *outputs* (via the context field,
 * promptfoo-backed RAGAS-style graders like context-faithfulness/context-relevance) but does NOT perform retrieval itself.
 * Context is pre-loaded in test cases.
 *
 * FUTURE: These interfaces define the contract for dynamic retrieval during experiment
 * execution. A `rag_prompt` runner type in CandidateRunnerService would use a
 * RetrievalService to fetch context at runtime before sending to the LLM.
 *
 * INTEGRATION POINT: CandidateRunnerService.run() — when candidate.runnerType === 'rag_prompt':
 *   1. RetrievalService.retrieve(testCase.input, candidate.retrievalConfig)
 *   2. Inject retrieved chunks as {{context}} in the prompt template
 *   3. Send augmented prompt to LlmService.complete()
 *   4. Grade output with promptfoo assertions like context-faithfulness + context-relevance
 */

/**
 * A single retrieved document chunk with metadata.
 */
export interface RetrievedChunk {
  /** The text content of the chunk */
  content: string;
  /** Relevance score from the retrieval system (0.0-1.0) */
  score: number;
  /** Source document identifier */
  sourceId?: string;
  /** Source document title or filename */
  sourceTitle?: string;
  /** Byte or character offset within the source document */
  offset?: number;
  /** Arbitrary metadata from the vector store */
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for how retrieval should be performed.
 * Stored on a candidate with runnerType === 'rag_prompt'.
 */
export interface RetrievalConfig {
  /** Retrieval strategy */
  method: 'semantic' | 'lexical' | 'hybrid';
  /** Number of chunks to retrieve */
  topK: number;
  /** Minimum similarity threshold (0.0-1.0) */
  similarityThreshold?: number;

  /**
   * Vector store configuration.
   * Supports external stores (Pinecone, Weaviate, Qdrant) and local (ChromaDB, SQLite-VSS).
   */
  vectorStore?: {
    provider: 'pinecone' | 'weaviate' | 'qdrant' | 'chroma' | 'sqlite-vss';
    /** Connection URL or API endpoint */
    url: string;
    /** Collection/index/namespace name */
    collection: string;
    /** API key for managed stores */
    apiKey?: string;
  };

  /** Chunking configuration for document ingestion */
  chunking?: {
    strategy: 'fixed' | 'sentence' | 'paragraph' | 'recursive';
    chunkSize: number;
    chunkOverlap: number;
  };

  /** Re-ranking configuration (optional second-pass ranking) */
  rerank?: {
    enabled: boolean;
    model?: string;
    topN?: number;
  };
}

/**
 * Result of a retrieval operation.
 */
export interface RetrievalResult {
  /** Retrieved chunks, ordered by relevance */
  chunks: RetrievedChunk[];
  /** Total time for retrieval in ms */
  latencyMs: number;
  /** The query used for retrieval (may differ from input if query rewriting is enabled) */
  query: string;
}

/**
 * Contract for retrieval service implementations.
 *
 * Implementations would be injected into CandidateRunnerService and called
 * when processing candidates with runnerType === 'rag_prompt'.
 *
 * Example flow:
 *   const result = await retrievalService.retrieve(testCase.input, candidate.retrievalConfig);
 *   const context = result.chunks.map(c => c.content).join('\n\n');
 *   // context is then interpolated into {{context}} in the prompt template
 */
export interface IRetrievalService {
  /**
   * Retrieve relevant document chunks for a query.
   */
  retrieve(query: string, config: RetrievalConfig): Promise<RetrievalResult>;

  /**
   * Ingest documents into the vector store for later retrieval.
   * Used during dataset creation to pre-index source documents.
   */
  ingest(
    documents: Array<{ id: string; content: string; metadata?: Record<string, unknown> }>,
    config: RetrievalConfig
  ): Promise<{ indexed: number; errors: string[] }>;

  /**
   * Check if the configured vector store is reachable and the collection exists.
   */
  healthCheck(config: RetrievalConfig): Promise<{ ok: boolean; error?: string }>;
}
