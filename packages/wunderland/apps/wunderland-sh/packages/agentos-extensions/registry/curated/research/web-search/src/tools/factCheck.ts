/**
 * Fact Check Tool — verify statements against web sources.
 *
 * Updated to conform to AgentOS `ITool` (inputSchema + ToolExecutionContext).
 *
 * @module @framers/agentos-ext-web-search
 */

import type { ITool, JSONSchemaObject, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { ProviderResponse } from '../services/searchProvider.js';
import { SearchProviderService } from '../services/searchProvider.js';

export interface FactCheckInput {
  statement: string;
  checkSources?: boolean;
  confidence?: 'low' | 'medium' | 'high';
}

export interface FactCheckOutput {
  statement: string;
  verdict: 'TRUE' | 'FALSE' | 'UNVERIFIED' | 'PARTIALLY TRUE';
  confidence: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  explanation: string;
  sources: Array<{ title: string; url: string; snippet: string; provider: string; query: string }>;
  contradictingSources: string[];
  supportingSources: string[];
  meetsRequiredConfidence: boolean;
  timestamp: string;
}

export class FactCheckTool implements ITool<FactCheckInput, FactCheckOutput> {
  public readonly id = 'fact-check-v1';
  /** Tool call name used by the LLM / ToolExecutor. */
  public readonly name = 'fact_check';
  public readonly displayName = 'Fact Check';
  public readonly description = 'Verify a statement against web sources and return a verdict with confidence.';
  public readonly category = 'research';
  public readonly hasSideEffects = false;

  public readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    required: ['statement'],
    properties: {
      statement: {
        type: 'string',
        description: 'The statement to fact-check',
        minLength: 5,
      },
      checkSources: {
        type: 'boolean',
        description: 'Whether to include source citations',
        default: true,
      },
      confidence: {
        type: 'string',
        description: 'Required confidence level for the verdict',
        enum: ['low', 'medium', 'high'],
        default: 'medium',
      },
    },
    additionalProperties: false,
  };

  public readonly requiredCapabilities = ['capability:web_search'];

  constructor(private readonly searchService: SearchProviderService) {}

  async execute(input: FactCheckInput, _context: ToolExecutionContext): Promise<ToolExecutionResult<FactCheckOutput>> {
    try {
      const checkSources = input.checkSources !== false;
      const requiredConfidence = input.confidence || 'medium';

      const queries = this.generateFactCheckQueries(input.statement);

      const searchPromises = queries.map((query) =>
        this.searchService
          .search(query, { maxResults: 5 })
          .catch((err) => ({
            provider: 'error',
            results: [],
            metadata: { query, error: err?.message || String(err), timestamp: new Date().toISOString() },
          }))
      );

      const searchResults: ProviderResponse[] = (await Promise.all(searchPromises)) as any;

      const analysis = this.analyzeFactCheckResults(input.statement, searchResults, requiredConfidence);
      const sources = checkSources ? this.compileSources(searchResults) : [];

      return {
        success: true,
        output: {
          statement: input.statement,
          verdict: analysis.verdict,
          confidence: analysis.confidence,
          confidenceLevel: analysis.confidenceLevel,
          explanation: analysis.explanation,
          sources,
          contradictingSources: analysis.contradictingSources,
          supportingSources: analysis.supportingSources,
          meetsRequiredConfidence: analysis.meetsRequiredConfidence,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) };
    }
  }

  validateArgs(input: Record<string, any>): { isValid: boolean; errors?: any[] } {
    const errors: string[] = [];

    if (!input.statement) {
      errors.push('Statement is required');
    } else if (typeof input.statement !== 'string') {
      errors.push('Statement must be a string');
    } else if (input.statement.length < 5) {
      errors.push('Statement must be at least 5 characters long');
    }

    if (input.confidence !== undefined) {
      if (!['low', 'medium', 'high'].includes(input.confidence)) {
        errors.push('Confidence must be low, medium, or high');
      }
    }

    if (input.checkSources !== undefined && typeof input.checkSources !== 'boolean') {
      errors.push('checkSources must be a boolean');
    }

    return errors.length === 0 ? { isValid: true } : { isValid: false, errors };
  }

  // ============================================================================
  // Internals (ported from the previous implementation)
  // ============================================================================

  private generateFactCheckQueries(statement: string): string[] {
    return [
      statement,
      `"${statement}" fact check`,
      `${statement} true or false`,
      `${statement} debunked myths`,
      `is it true that ${statement}`,
    ];
  }

  private analyzeFactCheckResults(statement: string, searchResults: any[], requiredConfidence: string): any {
    let supportingCount = 0;
    let contradictingCount = 0;
    let neutralCount = 0;
    const supportingSources: string[] = [];
    const contradictingSources: string[] = [];

    const statementLower = statement.toLowerCase();
    void statementLower; // retained for future use

    const negativeIndicators = ['false', 'myth', 'debunked', 'incorrect', 'wrong', 'not true', 'fake'];
    const positiveIndicators = ['true', 'correct', 'accurate', 'confirmed', 'verified', 'fact'];

    for (const searchResult of searchResults) {
      if (!searchResult.results) continue;

      for (const result of searchResult.results) {
        const contentLower = (String(result.title || '') + ' ' + String(result.snippet || '')).toLowerCase();

        const isFactCheckSite =
          String(result.url || '').includes('snopes') ||
          String(result.url || '').includes('factcheck') ||
          String(result.url || '').includes('politifact');

        const weight = isFactCheckSite ? 2 : 1;

        const hasNegative = negativeIndicators.some((ind) => contentLower.includes(ind));
        const hasPositive = positiveIndicators.some((ind) => contentLower.includes(ind));

        if (hasNegative && !hasPositive) {
          contradictingCount += weight;
          if (result.url) contradictingSources.push(String(result.url));
        } else if (hasPositive && !hasNegative) {
          supportingCount += weight;
          if (result.url) supportingSources.push(String(result.url));
        } else {
          neutralCount += 1;
        }
      }
    }

    const total = supportingCount + contradictingCount + neutralCount;
    let confidence: number;
    let verdict: FactCheckOutput['verdict'];
    let explanation: string;

    if (total === 0) {
      verdict = 'UNVERIFIED';
      confidence = 0;
      explanation = 'No relevant sources found to verify this statement.';
    } else {
      const supportRatio = supportingCount / total;
      const contradictRatio = contradictingCount / total;

      if (supportRatio > 0.7) {
        verdict = 'TRUE';
        confidence = supportRatio * 100;
        explanation = `Strong evidence supports this statement (${supportingCount} supporting sources).`;
      } else if (contradictRatio > 0.7) {
        verdict = 'FALSE';
        confidence = contradictRatio * 100;
        explanation = `Strong evidence contradicts this statement (${contradictingCount} contradicting sources).`;
      } else if (supportRatio > 0.4 && contradictRatio > 0.4) {
        verdict = 'PARTIALLY TRUE';
        confidence = 50;
        explanation = 'Mixed evidence with both supporting and contradicting sources.';
      } else {
        verdict = 'UNVERIFIED';
        confidence = Math.max(supportRatio, contradictRatio) * 100;
        explanation = 'Insufficient clear evidence to verify this statement.';
      }
    }

    const confidenceLevel: 'low' | 'medium' | 'high' = confidence > 80 ? 'high' : confidence > 50 ? 'medium' : 'low';

    return {
      verdict,
      confidence: Math.round(confidence),
      confidenceLevel,
      explanation,
      supportingSources: supportingSources.slice(0, 5),
      contradictingSources: contradictingSources.slice(0, 5),
      meetsRequiredConfidence: this.meetsConfidenceRequirement(confidenceLevel, requiredConfidence),
    };
  }

  private meetsConfidenceRequirement(actual: string, required: string): boolean {
    const levels = { low: 1, medium: 2, high: 3 };
    return levels[actual as keyof typeof levels] >= levels[required as keyof typeof levels];
  }

  private compileSources(searchResults: any[]): Array<{ title: string; url: string; snippet: string; provider: string; query: string }> {
    const sources: Array<{ title: string; url: string; snippet: string; provider: string; query: string }> = [];
    const seenUrls = new Set<string>();

    for (const searchResult of searchResults) {
      if (!searchResult.results) continue;

      for (const result of searchResult.results) {
        if (!result.url) continue;
        if (seenUrls.has(result.url)) continue;
        seenUrls.add(result.url);

        sources.push({
          title: String(result.title || ''),
          url: String(result.url),
          snippet: String(result.snippet || ''),
          provider: String(searchResult.provider || 'unknown'),
          query: String(searchResult.metadata?.query || ''),
        });
      }
    }

    return sources.slice(0, 10);
  }
}
