import { BaseGrader, EvalInput, GraderResult } from './base.grader';
import { LlmService } from '../llm/llm.service';

/**
 * Similarity metric types.
 */
type SimilarityMetric = 'cosine' | 'euclidean' | 'dot_product';

/**
 * Detailed similarity analysis result.
 */
interface SimilarityAnalysis {
  embeddingSimilarity: number | null;
  textSimilarity: number;
  metric: SimilarityMetric;
  method: 'embedding' | 'text_overlap' | 'hybrid';
}

/**
 * Semantic similarity grader - compares meaning between output and expected.
 *
 * Uses embedding-based similarity with multiple fallback strategies:
 * 1. Primary: Embedding cosine similarity (when embeddings available)
 * 2. Fallback: Weighted text overlap with TF-IDF-style scoring
 * 3. Hybrid: Combines both for robust scoring
 *
 * Configuration options:
 * - threshold: Minimum similarity score to pass (default: 0.8)
 * - metric: Similarity metric - 'cosine' | 'euclidean' | 'dot_product' (default: 'cosine')
 * - useHybrid: Combine embedding and text similarity (default: false)
 * - hybridWeight: Weight for embedding score in hybrid mode (default: 0.7)
 * - caseSensitive: Consider case in text comparison (default: false)
 * - stopWords: Remove common words before comparison (default: true)
 *
 * Good for cases where exact wording doesn't matter but meaning should align.
 */
export class SemanticSimilarityGrader extends BaseGrader {
  private readonly STOP_WORDS = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'for',
    'from',
    'has',
    'he',
    'in',
    'is',
    'it',
    'its',
    'of',
    'on',
    'or',
    'that',
    'the',
    'to',
    'was',
    'were',
    'will',
    'with',
    'this',
    'they',
    'but',
    'have',
    'had',
    'what',
    'when',
    'where',
    'which',
    'who',
    'would',
  ]);

  constructor(
    graderConfig: { name: string; description?: string; config?: Record<string, unknown> },
    private llmService: LlmService
  ) {
    super(graderConfig);
  }

  get type(): string {
    return 'semantic-similarity';
  }

  async evaluate(evalInput: EvalInput): Promise<GraderResult> {
    const { output, expected } = evalInput;

    if (!expected) {
      return {
        pass: false,
        score: 0,
        reason: 'No expected output provided for semantic similarity comparison',
      };
    }

    if (!output || output.trim().length === 0) {
      return {
        pass: false,
        score: 0,
        reason: 'Empty output cannot be compared',
      };
    }

    const threshold = this.getConfigValue('threshold', 0.8);
    const metric = this.getConfigValue<SimilarityMetric>('metric', 'cosine');
    const useHybrid = this.getConfigValue('useHybrid', false);
    const hybridWeight = this.getConfigValue('hybridWeight', 0.7);

    try {
      const analysis = await this.analyzeSemanticSimilarity(output, expected, metric, useHybrid);

      // Determine final score based on analysis method
      let finalScore: number;
      if (analysis.method === 'hybrid' && analysis.embeddingSimilarity !== null) {
        finalScore =
          hybridWeight * analysis.embeddingSimilarity +
          (1 - hybridWeight) * analysis.textSimilarity;
      } else if (analysis.embeddingSimilarity !== null) {
        finalScore = analysis.embeddingSimilarity;
      } else {
        finalScore = analysis.textSimilarity;
      }

      const pass = finalScore >= threshold;

      return {
        pass,
        score: finalScore,
        reason: this.buildReason(analysis, finalScore, threshold, pass),
      };
    } catch (error) {
      // Fallback to text-only comparison on error
      const textSim = this.calculateTextSimilarity(output, expected);
      const pass = textSim >= threshold;

      return {
        pass,
        score: textSim,
        reason: `Embedding failed, using text similarity: ${(textSim * 100).toFixed(1)}% (${error instanceof Error ? error.message : 'Unknown error'})`,
      };
    }
  }

  /**
   * Analyze semantic similarity using multiple methods.
   */
  private async analyzeSemanticSimilarity(
    output: string,
    expected: string,
    metric: SimilarityMetric,
    useHybrid: boolean
  ): Promise<SimilarityAnalysis> {
    // Always calculate text similarity as fallback
    const textSimilarity = this.calculateTextSimilarity(output, expected);

    // Try to get embeddings
    let embeddingSimilarity: number | null = null;
    let method: 'embedding' | 'text_overlap' | 'hybrid' = 'text_overlap';

    try {
      const [outputEmbedding, expectedEmbedding] = await Promise.all([
        this.llmService.embed(output),
        this.llmService.embed(expected),
      ]);

      embeddingSimilarity = this.calculateVectorSimilarity(
        outputEmbedding,
        expectedEmbedding,
        metric
      );

      method = useHybrid ? 'hybrid' : 'embedding';
    } catch {
      // Embeddings failed, fall back to text similarity
      method = 'text_overlap';
    }

    return {
      embeddingSimilarity,
      textSimilarity,
      metric,
      method,
    };
  }

  /**
   * Calculate vector similarity using specified metric.
   */
  private calculateVectorSimilarity(a: number[], b: number[], metric: SimilarityMetric): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    switch (metric) {
      case 'cosine':
        return this.cosineSimilarity(a, b);
      case 'euclidean':
        return this.euclideanSimilarity(a, b);
      case 'dot_product':
        return this.dotProductSimilarity(a, b);
      default:
        return this.cosineSimilarity(a, b);
    }
  }

  /**
   * Cosine similarity: measures angle between vectors.
   * Range: -1 to 1 (normalized to 0-1)
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;

    const similarity = dotProduct / (normA * normB);
    // Normalize from [-1, 1] to [0, 1]
    return (similarity + 1) / 2;
  }

  /**
   * Euclidean similarity: based on distance between vectors.
   * Converted to similarity score (0-1).
   */
  private euclideanSimilarity(a: number[], b: number[]): number {
    let sumSquares = 0;
    for (let i = 0; i < a.length; i++) {
      sumSquares += (a[i] - b[i]) ** 2;
    }
    const distance = Math.sqrt(sumSquares);
    // Convert distance to similarity (closer = higher score)
    // Using exponential decay: e^(-distance)
    return Math.exp(-distance);
  }

  /**
   * Dot product similarity (for normalized vectors).
   */
  private dotProductSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }
    // Clamp to [0, 1] range
    return Math.max(0, Math.min(1, (dotProduct + 1) / 2));
  }

  /**
   * Calculate text-based similarity using weighted token overlap.
   * Uses TF-IDF-style weighting for more meaningful comparison.
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const caseSensitive = this.getConfigValue('caseSensitive', false);
    const removeStopWords = this.getConfigValue('stopWords', true);

    // Tokenize
    let tokens1 = this.tokenize(text1, caseSensitive);
    let tokens2 = this.tokenize(text2, caseSensitive);

    // Remove stop words if configured
    if (removeStopWords) {
      tokens1 = tokens1.filter((t) => !this.STOP_WORDS.has(t.toLowerCase()));
      tokens2 = tokens2.filter((t) => !this.STOP_WORDS.has(t.toLowerCase()));
    }

    if (tokens1.length === 0 || tokens2.length === 0) {
      return 0;
    }

    // Calculate Jaccard similarity
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    const jaccard = intersection.size / union.size;

    // Calculate weighted overlap (longer matches count more)
    const weightedOverlap = this.calculateWeightedOverlap(tokens1, tokens2);

    // Combine Jaccard and weighted overlap
    return 0.5 * jaccard + 0.5 * weightedOverlap;
  }

  /**
   * Tokenize text into words.
   */
  private tokenize(text: string, caseSensitive: boolean): string[] {
    const processed = caseSensitive ? text : text.toLowerCase();
    return processed
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 0);
  }

  /**
   * Calculate weighted overlap considering term frequency.
   */
  private calculateWeightedOverlap(tokens1: string[], tokens2: string[]): number {
    // Build frequency maps
    const freq1 = new Map<string, number>();
    const freq2 = new Map<string, number>();

    for (const token of tokens1) {
      freq1.set(token, (freq1.get(token) || 0) + 1);
    }
    for (const token of tokens2) {
      freq2.set(token, (freq2.get(token) || 0) + 1);
    }

    // Calculate overlap score
    let overlapScore = 0;
    let totalWeight = 0;

    const allTokens = new Set([...freq1.keys(), ...freq2.keys()]);
    for (const token of allTokens) {
      const count1 = freq1.get(token) || 0;
      const count2 = freq2.get(token) || 0;

      // Weight by minimum frequency (matching occurrences)
      const matchWeight = Math.min(count1, count2);
      const maxWeight = Math.max(count1, count2);

      overlapScore += matchWeight;
      totalWeight += maxWeight;
    }

    return totalWeight > 0 ? overlapScore / totalWeight : 0;
  }

  /**
   * Build reason string for the result.
   */
  private buildReason(
    analysis: SimilarityAnalysis,
    finalScore: number,
    threshold: number,
    pass: boolean
  ): string {
    const scoreStr = `${(finalScore * 100).toFixed(1)}%`;
    const thresholdStr = `${(threshold * 100).toFixed(0)}%`;
    const status = pass ? 'meets' : 'below';

    const parts: string[] = [`Semantic similarity ${scoreStr} ${status} threshold ${thresholdStr}`];

    // Add method info
    if (analysis.method === 'hybrid' && analysis.embeddingSimilarity !== null) {
      parts.push(
        `(Hybrid: embedding ${(analysis.embeddingSimilarity * 100).toFixed(1)}%, text ${(analysis.textSimilarity * 100).toFixed(1)}%)`
      );
    } else if (analysis.method === 'embedding') {
      parts.push(`(Embedding ${analysis.metric})`);
    } else {
      parts.push('(Text overlap fallback)');
    }

    return parts.join(' ');
  }
}
