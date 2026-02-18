/**
 * On-Device ML Engine for FABRIC Mobile
 * Uses transformers.js for embeddings and Q&A
 */

import { pipeline, env, type Pipeline } from '@huggingface/transformers';

// Configure transformers.js for mobile
env.allowLocalModels = false;
env.useBrowserCache = true;

// Use quantized models for mobile (smaller, faster)
const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const QA_MODEL = 'Xenova/distilbert-base-uncased-distilled-squad';

interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
}

interface QAResult {
  answer: string;
  score: number;
  start: number;
  end: number;
}

let embeddingPipeline: Pipeline | null = null;
let qaPipeline: Pipeline | null = null;
let isInitializing = false;

const initPromises: { embedding?: Promise<Pipeline>; qa?: Promise<Pipeline> } = {};

/**
 * Initialize the ML engine (lazy load)
 */
export function initializeMLEngine(): void {
  // Pre-warm embedding pipeline in background
  getEmbeddingPipeline().catch(console.error);
}

/**
 * Get embedding pipeline (lazy load)
 */
async function getEmbeddingPipeline(): Promise<Pipeline> {
  if (embeddingPipeline) return embeddingPipeline;

  if (!initPromises.embedding) {
    console.log('[ML] Loading embedding model...');
    initPromises.embedding = pipeline('feature-extraction', EMBEDDING_MODEL, {
      progress_callback: (progress: any) => {
        if (progress.status === 'progress') {
          console.log(`[ML] Embedding model: ${Math.round(progress.progress)}%`);
        }
      },
    });
  }

  embeddingPipeline = await initPromises.embedding;
  console.log('[ML] Embedding model ready');
  return embeddingPipeline;
}

/**
 * Get Q&A pipeline (lazy load)
 */
async function getQAPipeline(): Promise<Pipeline> {
  if (qaPipeline) return qaPipeline;

  if (!initPromises.qa) {
    console.log('[ML] Loading Q&A model...');
    initPromises.qa = pipeline('question-answering', QA_MODEL, {
      progress_callback: (progress: any) => {
        if (progress.status === 'progress') {
          console.log(`[ML] Q&A model: ${Math.round(progress.progress)}%`);
        }
      },
    });
  }

  qaPipeline = await initPromises.qa;
  console.log('[ML] Q&A model ready');
  return qaPipeline;
}

/**
 * Generate embedding for text
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const pipe = await getEmbeddingPipeline();
  const output = await pipe(text, { pooling: 'mean', normalize: true });

  // Convert tensor to array
  const embedding = Array.from(output.data as Float32Array);

  return {
    embedding,
    dimensions: embedding.length,
  };
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  const pipe = await getEmbeddingPipeline();
  const results: EmbeddingResult[] = [];

  // Process in batches to avoid memory issues on mobile
  const batchSize = 5;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    for (const text of batch) {
      const output = await pipe(text, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data as Float32Array);
      results.push({ embedding, dimensions: embedding.length });
    }
  }

  return results;
}

/**
 * Answer a question based on context
 */
export async function answerQuestion(question: string, context: string): Promise<QAResult> {
  const pipe = await getQAPipeline();
  const result = await pipe(question, context) as any;

  return {
    answer: result.answer,
    score: result.score,
    start: result.start,
    end: result.end,
  };
}

/**
 * Compute cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Semantic search - find most similar texts
 */
export async function semanticSearch(
  queryText: string,
  documents: { id: string; text: string; embedding?: number[] }[],
  topK: number = 5
): Promise<{ id: string; score: number }[]> {
  const queryEmbedding = await generateEmbedding(queryText);

  const scores = await Promise.all(
    documents.map(async (doc) => {
      let embedding = doc.embedding;
      if (!embedding) {
        const result = await generateEmbedding(doc.text);
        embedding = result.embedding;
      }
      return {
        id: doc.id,
        score: cosineSimilarity(queryEmbedding.embedding, embedding),
      };
    })
  );

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Check if models are loaded
 */
export function getModelStatus(): { embedding: boolean; qa: boolean } {
  return {
    embedding: embeddingPipeline !== null,
    qa: qaPipeline !== null,
  };
}

/**
 * Preload all models
 */
export async function preloadModels(): Promise<void> {
  await Promise.all([
    getEmbeddingPipeline(),
    getQAPipeline(),
  ]);
}
