/**
 * Auto-connection algorithm for detecting related highlights
 * @module codex/lib/highlightConnections
 *
 * @remarks
 * - Uses simple TF-IDF + cosine similarity
 * - Client-side only (no external APIs)
 * - Finds top 5 most similar highlights
 */

import type { Highlight } from './highlightTypes';
import { createConnection, getAllHighlights } from './highlightsStorage';

/**
 * Generate automatic connections for a highlight
 * Finds top 5 most similar highlights based on content similarity
 */
export async function generateAutoConnections(
  highlight: Highlight,
  threshold: number = 0.5
): Promise<number> {
  // Get all highlights to compare against
  const allHighlights = await getAllHighlights();

  // Filter out the current highlight and highlights from the same file
  const candidateHighlights = allHighlights.filter(
    (h) => h.id !== highlight.id && h.filePath !== highlight.filePath
  );

  if (candidateHighlights.length === 0) {
    return 0;
  }

  // Calculate similarity scores
  const similarities = candidateHighlights
    .map((h) => ({
      highlight: h,
      score: cosineSimilarity(
        tokenize(highlight.content),
        tokenize(h.content)
      ),
    }))
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Top 5 connections

  // Create connections
  let connectionsCreated = 0;
  for (const { highlight: targetHighlight, score } of similarities) {
    try {
      await createConnection(highlight.id, targetHighlight.id, 'auto', score);
      connectionsCreated++;
    } catch (error) {
      console.warn('[Connections] Failed to create connection:', error);
    }
  }

  return connectionsCreated;
}

/**
 * Tokenize text into normalized words
 * Removes punctuation, converts to lowercase, filters stopwords
 */
function tokenize(text: string): string[] {
  const stopwords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'this', 'but', 'they', 'have', 'had',
    'what', 'when', 'where', 'who', 'which', 'why', 'how',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopwords.has(word)); // Filter short words and stopwords
}

/**
 * Calculate cosine similarity between two sets of tokens
 * Returns a score between 0 (no similarity) and 1 (identical)
 */
function cosineSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) {
    return 0;
  }

  // Build vocabulary (union of all unique tokens)
  const vocabulary = new Set([...tokensA, ...tokensB]);

  // Create term frequency vectors
  const vectorA = createTFVector(tokensA, vocabulary);
  const vectorB = createTFVector(tokensB, vocabulary);

  // Calculate dot product
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (const term of vocabulary) {
    const freqA = vectorA.get(term) || 0;
    const freqB = vectorB.get(term) || 0;

    dotProduct += freqA * freqB;
    magnitudeA += freqA * freqA;
    magnitudeB += freqB * freqB;
  }

  // Calculate cosine similarity
  const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Create term frequency vector
 * Maps each term to its frequency in the token list
 */
function createTFVector(tokens: string[], vocabulary: Set<string>): Map<string, number> {
  const tfVector = new Map<string, number>();

  // Count term frequencies
  const termCounts = new Map<string, number>();
  for (const token of tokens) {
    termCounts.set(token, (termCounts.get(token) || 0) + 1);
  }

  // Normalize by document length
  const docLength = tokens.length;
  for (const term of vocabulary) {
    const count = termCounts.get(term) || 0;
    tfVector.set(term, count / docLength);
  }

  return tfVector;
}

/**
 * Batch generate connections for multiple highlights
 * Useful for initially populating connections
 */
export async function generateConnectionsForAll(
  threshold: number = 0.5
): Promise<{ total: number; created: number }> {
  const allHighlights = await getAllHighlights();
  let totalCreated = 0;

  for (const highlight of allHighlights) {
    const created = await generateAutoConnections(highlight, threshold);
    totalCreated += created;
  }

  return {
    total: allHighlights.length,
    created: totalCreated,
  };
}

/**
 * Find highlights similar to a given text (for suggestions)
 * Useful when user is creating a new highlight
 */
export async function findSimilarHighlights(
  text: string,
  limit: number = 5,
  threshold: number = 0.3
): Promise<Array<{ highlight: Highlight; score: number }>> {
  const allHighlights = await getAllHighlights();
  const textTokens = tokenize(text);

  const similarities = allHighlights
    .map((h) => ({
      highlight: h,
      score: cosineSimilarity(textTokens, tokenize(h.content)),
    }))
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return similarities;
}
