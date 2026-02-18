/**
 * @file Type definitions for search extension
 */

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source?: string;
  publishedDate?: string;
  thumbnail?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  provider: string;
  totalResults?: number;
  searchTime?: number;
}

export interface ResearchResult {
  topic: string;
  searchCount: number;
  aggregatedResults: {
    query: string;
    results: SearchResult[];
  }[];
  provider: string;
}

export interface FactCheckResult {
  claim: string;
  context?: string;
  verificationResults: {
    query: string;
    results: SearchResult[];
  }[];
  sourcesChecked: number;
  provider: string;
}
