import { Module } from '@nestjs/common';

/**
 * RetrievalModule — Stub for future RAG retrieval integration.
 *
 * When implemented, this module will:
 * 1. Provide a RetrievalService implementing IRetrievalService
 * 2. Support vector store connections (Pinecone, Weaviate, Qdrant, ChromaDB, SQLite-VSS)
 * 3. Handle document ingestion, chunking, and embedding
 * 4. Be imported by CandidatesModule for `rag_prompt` runner type support
 *
 * See retrieval.interfaces.ts for the full interface contract.
 */
@Module({
  providers: [],
  exports: [],
})
export class RetrievalModule {}
