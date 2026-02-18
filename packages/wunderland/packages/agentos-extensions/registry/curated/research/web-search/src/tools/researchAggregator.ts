/**
 * Research Aggregator Tool — runs multiple searches on a topic and aggregates results.
 *
 * Updated to conform to AgentOS `ITool` (inputSchema + ToolExecutionContext).
 *
 * @module @framers/agentos-ext-web-search
 */

import type { ITool, JSONSchemaObject, ToolExecutionContext, ToolExecutionResult } from '@framers/agentos';
import type { ProviderResponse } from '../services/searchProvider.js';
import { SearchProviderService } from '../services/searchProvider.js';

export interface ResearchAggregatorInput {
  topic: string;
  sources?: number;
  depth?: 'quick' | 'moderate' | 'comprehensive';
}

export interface ResearchAggregatorOutput {
  topic: string;
  sources: number;
  depth: 'quick' | 'moderate' | 'comprehensive';
  queries: string[];
  aggregatedResults: any;
  timestamp: string;
}

export class ResearchAggregatorTool implements ITool<ResearchAggregatorInput, ResearchAggregatorOutput> {
  public readonly id = 'research-aggregator-v1';
  /** Tool call name used by the LLM / ToolExecutor. */
  public readonly name = 'research_aggregate';
  public readonly displayName = 'Research Aggregator';
  public readonly description = 'Aggregate research from multiple web searches on a topic (deduplicated + categorized).';
  public readonly category = 'research';
  public readonly hasSideEffects = false;

  public readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    required: ['topic'],
    properties: {
      topic: {
        type: 'string',
        description: 'The research topic to aggregate information about',
      },
      sources: {
        type: 'integer',
        description: 'Number of different search angles to explore',
        default: 3,
        minimum: 1,
        maximum: 10,
      },
      depth: {
        type: 'string',
        description: 'Research depth level',
        enum: ['quick', 'moderate', 'comprehensive'],
        default: 'moderate',
      },
    },
    additionalProperties: false,
  };

  public readonly requiredCapabilities = ['capability:web_search'];

  constructor(private readonly searchService: SearchProviderService) {}

  async execute(
    input: ResearchAggregatorInput,
    _context: ToolExecutionContext,
  ): Promise<ToolExecutionResult<ResearchAggregatorOutput>> {
    try {
      const sources = input.sources || 3;
      const depth = input.depth || 'moderate';

      const queries = this.generateSearchQueries(input.topic, sources, depth);

      const perQueryMaxResults = depth === 'quick' ? 5 : depth === 'moderate' ? 10 : 15;

      const searchPromises = queries.map((query) =>
        this.searchService
          .search(query, { maxResults: perQueryMaxResults })
          .catch((err) => ({
            provider: 'error',
            results: [],
            metadata: { query, error: err?.message || String(err), timestamp: new Date().toISOString() },
          }))
      );

      const searchResults: ProviderResponse[] = (await Promise.all(searchPromises)) as any;

      const aggregatedResults = this.aggregateResults(searchResults, input.topic);

      return {
        success: true,
        output: {
          topic: input.topic,
          sources,
          depth,
          queries,
          aggregatedResults,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) };
    }
  }

  validateArgs(input: Record<string, any>): { isValid: boolean; errors?: any[] } {
    const errors: string[] = [];

    if (!input.topic) {
      errors.push('Topic is required');
    } else if (typeof input.topic !== 'string') {
      errors.push('Topic must be a string');
    }

    if (input.sources !== undefined) {
      if (typeof input.sources !== 'number' || input.sources < 1 || input.sources > 10) {
        errors.push('Sources must be a number between 1 and 10');
      }
    }

    if (input.depth !== undefined) {
      if (!['quick', 'moderate', 'comprehensive'].includes(input.depth)) {
        errors.push('Depth must be quick, moderate, or comprehensive');
      }
    }

    return errors.length === 0 ? { isValid: true } : { isValid: false, errors };
  }

  // ============================================================================
  // Internals (ported from the previous implementation)
  // ============================================================================

  private generateSearchQueries(topic: string, count: number, depth: string): string[] {
    const queries: string[] = [topic];

    const modifiers = {
      quick: ['overview', 'summary'],
      moderate: ['overview', 'recent developments', 'key concepts', 'applications'],
      comprehensive: [
        'overview',
        'recent research',
        'state of the art',
        'challenges',
        'future directions',
        'industry applications',
        'academic papers',
        'expert opinions',
      ],
    };

    const selectedModifiers = modifiers[depth as keyof typeof modifiers];

    for (let i = 1; i < Math.min(count, selectedModifiers.length + 1); i++) {
      if (selectedModifiers[i - 1]) {
        queries.push(`${topic} ${selectedModifiers[i - 1]}`);
      }
    }

    return queries;
  }

  private aggregateResults(searchResults: any[], topic: string): any {
    const seenUrls = new Set<string>();
    const categories = {
      overview: [] as any[],
      research: [] as any[],
      applications: [] as any[],
      resources: [] as any[],
    };

    for (const searchResult of searchResults) {
      if (!searchResult.results) continue;

      for (const result of searchResult.results) {
        if (seenUrls.has(result.url)) continue;
        seenUrls.add(result.url);

        const lowerTitle = String(result.title || '').toLowerCase();

        if (lowerTitle.includes('overview') || lowerTitle.includes('introduction') || lowerTitle.includes('what is')) {
          categories.overview.push(result);
        } else if (
          lowerTitle.includes('research') ||
          lowerTitle.includes('study') ||
          lowerTitle.includes('paper') ||
          lowerTitle.includes('journal')
        ) {
          categories.research.push(result);
        } else if (
          lowerTitle.includes('application') ||
          lowerTitle.includes('use case') ||
          lowerTitle.includes('implementation')
        ) {
          categories.applications.push(result);
        } else {
          categories.resources.push(result);
        }
      }
    }

    const scoredCategories = Object.entries(categories).reduce((acc, [key, items]) => {
      acc[key] = items
        .map((item: any) => ({
          ...item,
          relevanceScore: this.calculateRelevance(item, topic),
        }))
        .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
      return acc;
    }, {} as any);

    return {
      categories: scoredCategories,
      totalResults: seenUrls.size,
      topResults: this.getTopResults(scoredCategories, 10),
    };
  }

  private calculateRelevance(result: any, topic: string): number {
    let score = 50;

    const topicWords = topic.toLowerCase().split(/\s+/);
    const titleWords = String(result.title || '').toLowerCase();
    const snippetWords = String(result.snippet || '').toLowerCase();

    for (const word of topicWords) {
      if (titleWords.includes(word)) score += 15;
      if (snippetWords.includes(word)) score += 5;
    }

    if (titleWords.includes('official')) score += 10;
    if (titleWords.includes('guide')) score += 5;
    if (titleWords.includes('tutorial')) score += 5;

    return Math.min(100, score);
  }

  private getTopResults(categories: any, count: number): any[] {
    const allResults: any[] = [];

    for (const items of Object.values(categories)) {
      allResults.push(...(items as any[]));
    }

    return allResults.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, count);
  }
}
