/**
 * RAG service stub for standalone Wunderland backend.
 * The WunderlandVectorMemoryService is the primary memory path.
 * This stub provides a no-op fallback for the ragService interface
 * matching the shape expected by orchestration.service.ts.
 */

export interface RagQueryParams {
  query: string;
  topK?: number;
  namespace?: string;
  collectionIds?: string[];
  includeMetadata?: boolean;
}

export interface RagChunk {
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface RagQueryResult {
  results: never[];
  chunks: RagChunk[];
}

export interface RagIngestParams {
  content: string;
  documentId?: string;
  collectionId?: string;
  category?: string;
  metadata?: Record<string, unknown>;
  namespace?: string;
  chunkingOptions?: {
    chunkSize?: number;
    chunkOverlap?: number;
    strategy?: string;
  };
}

export const ragService = {
  async query(_params: RagQueryParams): Promise<RagQueryResult> {
    return { results: [], chunks: [] };
  },
  async ingestDocument(_params: RagIngestParams): Promise<void> {
    // No-op in standalone mode
  },
};
