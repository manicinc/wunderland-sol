/**
 * Unified search hook for files, highlights, and bookmarks
 * @module codex/hooks/useUnifiedSearch
 *
 * @remarks
 * - Switches between three search modes: files, highlights, bookmarks
 * - Debounces search input (300ms default)
 * - Returns unified SearchResult[] interface
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SearchOptions, GitHubFile } from '../lib/types';
import type { SearchResult } from '../lib/highlightTypes';
import * as storage from '../lib/highlightsStorage';
import { filterFiles } from '../lib/utils';

interface UseUnifiedSearchOptions {
  /** All files in the repository (for files mode) */
  allFiles?: GitHubFile[];
  /** Debounce delay in ms */
  debounceMs?: number;
}

interface UseUnifiedSearchResult {
  /** Search results (unified across all modes) */
  results: SearchResult[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Current search mode */
  mode: SearchOptions['mode'];
  /** Perform search with new options */
  search: (options: SearchOptions) => void;
}

/**
 * Unified search across files, highlights, and bookmarks
 *
 * @example
 * ```tsx
 * function SearchView({ allFiles }: { allFiles: GitHubFile[] }) {
 *   const { results, loading, search } = useUnifiedSearch({ allFiles });
 *
 *   const handleSearch = (query: string, mode: SearchMode) => {
 *     search({
 *       query,
 *       mode,
 *       searchNames: true,
 *       searchContent: false,
 *       caseSensitive: false,
 *     });
 *   };
 *
 *   return <ResultsList results={results} loading={loading} />;
 * }
 * ```
 */
export function useUnifiedSearch(options: UseUnifiedSearchOptions = {}): UseUnifiedSearchResult {
  const { allFiles = [], debounceMs = 300 } = options;

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    query: '',
    mode: 'files',
    searchNames: true,
    searchContent: false,
    caseSensitive: false,
  });
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchOptions.query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchOptions.query, debounceMs]);

  // Perform search when debounced query or options change
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let searchResults: SearchResult[] = [];

        switch (searchOptions.mode) {
          case 'highlights': {
            const highlights = await storage.searchHighlights(debouncedQuery, 50);
            searchResults = highlights.map((h) => ({
              type: 'highlight' as const,
              id: h.id,
              title: h.content.substring(0, 100) + (h.content.length > 100 ? '...' : ''),
              path: h.filePath,
              snippet: h.userNotes || undefined,
              data: h,
            }));
            break;
          }

          case 'bookmarks': {
            const bookmarks = await storage.searchBookmarks(debouncedQuery, 50);
            searchResults = bookmarks.map((b) => ({
              type: 'bookmark' as const,
              id: b.id,
              title: b.title,
              path: b.path,
              snippet: b.notes || undefined,
              data: b,
            }));
            break;
          }

          case 'files':
          default: {
            const filteredFiles = filterFiles(allFiles, searchOptions);
            searchResults = filteredFiles.map((f) => ({
              type: 'file' as const,
              id: f.path,
              title: f.name,
              path: f.path,
              data: f,
            }));
            break;
          }
        }

        setResults(searchResults);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed';
        setError(message);
        console.error('[useUnifiedSearch] Search failed:', err);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, searchOptions, allFiles]);

  const search = useCallback((newOptions: SearchOptions) => {
    setSearchOptions(newOptions);
  }, []);

  return {
    results,
    loading,
    error,
    mode: searchOptions.mode,
    search,
  };
}
