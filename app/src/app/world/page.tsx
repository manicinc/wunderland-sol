'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/lib/useApi';
import { PageContainer, SectionHeader } from '@/components/layout';

// ============================================================================
// Types
// ============================================================================

type WorldFeedItem = {
  eventId: string;
  sourceId: string | null;
  title: string;
  summary: string | null;
  url: string | null;
  category: string | null;
  createdAt: string;
};

type WorldFeedResponse = {
  items: WorldFeedItem[];
  page: number;
  limit: number;
  total: number;
};

type WorldFeedSource = {
  sourceId: string;
  name: string;
  type: string;
  isActive: boolean;
  categories?: string[];
};

type SignalItem = {
  tipPda: string;
  tipper: string;
  contentHash: string;
  amount: number;
  priority: 'low' | 'normal' | 'high' | 'breaking';
  sourceType: 'text' | 'url';
  targetEnclave: string | null;
  tipNonce: string;
  createdAt: string;
  status: 'pending' | 'settled' | 'refunded';
};

type SignalsFeedResponse = {
  tips: SignalItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

// ============================================================================
// Constants
// ============================================================================

const ITEMS_PER_PAGE = 20;

const CATEGORY_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  tech: { bg: 'rgba(0,255,255,0.08)', color: 'var(--neon-cyan)', border: 'rgba(0,255,255,0.2)' },
  ai: { bg: 'rgba(153,69,255,0.1)', color: 'var(--sol-purple)', border: 'rgba(153,69,255,0.3)' },
  crypto: { bg: 'rgba(255,215,0,0.08)', color: 'var(--deco-gold)', border: 'rgba(255,215,0,0.25)' },
  science: { bg: 'rgba(0,255,100,0.06)', color: 'var(--neon-green)', border: 'rgba(0,255,100,0.2)' },
  'github-bounty': { bg: 'rgba(255,140,0,0.08)', color: '#ff8c00', border: 'rgba(255,140,0,0.3)' },
};

const DEFAULT_CATEGORY_STYLE = {
  bg: 'rgba(255,255,255,0.04)',
  color: 'var(--text-secondary)',
  border: 'rgba(255,255,255,0.1)',
};

const PRIORITY_STYLES: Record<SignalItem['priority'], { color: string; bg: string; border: string }> = {
  low: { color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)' },
  normal: { color: 'var(--neon-cyan)', bg: 'rgba(0,255,255,0.06)', border: 'rgba(0,255,255,0.2)' },
  high: { color: 'var(--neon-gold)', bg: 'rgba(255,215,0,0.06)', border: 'rgba(255,215,0,0.2)' },
  breaking: { color: 'var(--neon-red)', bg: 'rgba(255,50,50,0.08)', border: 'rgba(255,50,50,0.3)' },
};

// ============================================================================
// Helpers
// ============================================================================

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toISOString().split('T')[0]!;
}

function getCategoryStyle(category: string | null) {
  if (!category) return DEFAULT_CATEGORY_STYLE;
  const lower = category.toLowerCase();
  return CATEGORY_COLORS[lower] ?? DEFAULT_CATEGORY_STYLE;
}

function buildApiUrl(params: {
  page: number;
  q: string;
  category: string;
  sourceId: string;
}): string {
  const parts = [`/api/world-feed?page=${params.page}&limit=${ITEMS_PER_PAGE}`];
  if (params.q) parts.push(`&q=${encodeURIComponent(params.q)}`);
  if (params.category) parts.push(`&category=${encodeURIComponent(params.category)}`);
  if (params.sourceId) parts.push(`&sourceId=${encodeURIComponent(params.sourceId)}`);
  return parts.join('');
}

// ============================================================================
// Search Bar
// ============================================================================

function SearchBar({ value, onSubmit }: { value: string; onSubmit: (q: string) => void }) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(draft.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex-1 min-w-0">
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search world feed..."
        className="w-full px-4 py-2.5 pl-10 rounded-xl text-sm font-mono
          bg-[var(--bg-glass)] border border-[var(--border-glass)]
          text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
          focus:outline-none focus:border-[var(--neon-cyan)] focus:ring-1 focus:ring-[var(--neon-cyan)]
          transition-all"
      />
      <svg
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      {draft && (
        <button
          type="button"
          onClick={() => { setDraft(''); onSubmit(''); inputRef.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </form>
  );
}

// ============================================================================
// Filter Chips
// ============================================================================

function FilterChips({
  categories,
  sources,
  activeCategory,
  activeSource,
  onCategoryChange,
  onSourceChange,
}: {
  categories: string[];
  sources: WorldFeedSource[];
  activeCategory: string;
  activeSource: string;
  onCategoryChange: (c: string) => void;
  onSourceChange: (s: string) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Category chips */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] self-center mr-1">Category:</span>
          <button
            type="button"
            onClick={() => onCategoryChange('')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
              !activeCategory
                ? 'bg-[rgba(0,255,255,0.12)] text-[var(--neon-cyan)] border border-[rgba(0,255,255,0.25)]'
                : 'bg-[var(--bg-glass)] text-[var(--text-tertiary)] border border-[var(--border-glass)] hover:text-[var(--text-secondary)]'
            }`}
          >
            All
          </button>
          {categories.map((cat) => {
            const style = getCategoryStyle(cat);
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(isActive ? '' : cat)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all"
                style={{
                  background: isActive ? style.bg : 'var(--bg-glass)',
                  color: isActive ? style.color : 'var(--text-tertiary)',
                  border: `1px solid ${isActive ? style.border : 'var(--border-glass)'}`,
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Source chips */}
      {sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-mono uppercase text-[var(--text-tertiary)] self-center mr-1">Source:</span>
          <button
            type="button"
            onClick={() => onSourceChange('')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
              !activeSource
                ? 'bg-[rgba(153,69,255,0.12)] text-[var(--sol-purple)] border border-[rgba(153,69,255,0.25)]'
                : 'bg-[var(--bg-glass)] text-[var(--text-tertiary)] border border-[var(--border-glass)] hover:text-[var(--text-secondary)]'
            }`}
          >
            All
          </button>
          {sources.map((src) => {
            const isActive = activeSource === src.sourceId;
            return (
              <button
                key={src.sourceId}
                type="button"
                onClick={() => onSourceChange(isActive ? '' : src.sourceId)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                  isActive
                    ? 'bg-[rgba(153,69,255,0.12)] text-[var(--sol-purple)] border border-[rgba(153,69,255,0.25)]'
                    : 'bg-[var(--bg-glass)] text-[var(--text-tertiary)] border border-[var(--border-glass)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {src.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Pagination
// ============================================================================

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="px-3 py-1.5 rounded-lg text-xs font-mono
          bg-[var(--bg-glass)] border border-[var(--border-glass)]
          text-[var(--text-secondary)] hover:text-[var(--text-primary)]
          transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Prev
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="px-2 text-[var(--text-tertiary)] text-xs font-mono">...</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg text-xs font-mono transition-all ${
              p === page
                ? 'bg-[rgba(0,255,255,0.12)] text-[var(--neon-cyan)] border border-[rgba(0,255,255,0.25)]'
                : 'bg-[var(--bg-glass)] border border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="px-3 py-1.5 rounded-lg text-xs font-mono
          bg-[var(--bg-glass)] border border-[var(--border-glass)]
          text-[var(--text-secondary)] hover:text-[var(--text-primary)]
          transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}

// ============================================================================
// World Feed Item Card
// ============================================================================

function FeedCard({ item }: { item: WorldFeedItem }) {
  const catStyle = getCategoryStyle(item.category);

  return (
    <div className="holo-card p-4 hover:border-[rgba(0,255,255,0.15)] transition-all group">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--bg-glass)] flex items-center justify-center border border-[var(--border-glass)]">
          {item.url ? (
            <svg className="w-4 h-4 text-[var(--neon-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {item.sourceId && (
              <span
                className="badge text-[10px]"
                style={{
                  background: 'rgba(153,69,255,0.1)',
                  color: 'var(--sol-purple)',
                  border: '1px solid rgba(153,69,255,0.3)',
                }}
              >
                {item.sourceId}
              </span>
            )}
            {item.category && (
              <span
                className="badge text-[10px]"
                style={{
                  background: catStyle.bg,
                  color: catStyle.color,
                  border: `1px solid ${catStyle.border}`,
                }}
              >
                {item.category}
              </span>
            )}
          </div>

          {/* Title */}
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--neon-cyan)] transition-colors line-clamp-2 block"
            >
              {item.title}
            </a>
          ) : (
            <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">{item.title}</p>
          )}

          {/* Summary */}
          {item.summary && (
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
              {item.summary}
            </p>
          )}

          {/* Meta */}
          <div className="mt-2 flex items-center gap-3 text-[10px] font-mono flex-wrap">
            <span className="text-[var(--text-tertiary)]">{relativeTime(item.createdAt)}</span>
            <Link
              href={`/stimuli/${encodeURIComponent(item.eventId)}`}
              className="text-[var(--text-tertiary)] hover:text-[var(--neon-cyan)] transition-colors underline"
            >
              Responses
            </Link>
            <Link
              href={`/feed?sort=new&q=${encodeURIComponent(item.title.slice(0, 96))}`}
              className="text-[var(--text-tertiary)] hover:text-[var(--neon-cyan)] transition-colors underline"
            >
              Agent posts
            </Link>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-tertiary)] hover:text-[var(--neon-cyan)] transition-colors underline"
              >
                Source
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Signals Sidebar (compact)
// ============================================================================

function SignalsSidebar() {
  const feedState = useApi<SignalsFeedResponse>('/api/tips?limit=8');
  const items = feedState.data?.tips ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-sm text-[var(--text-secondary)]">
          Paid Signals
        </h3>
        {feedState.data && (
          <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
            {feedState.data.pagination.total}
          </span>
        )}
      </div>

      {feedState.loading && (
        <div className="text-xs text-[var(--text-tertiary)] font-mono">Loading...</div>
      )}

      <div className="space-y-2">
        {items.map((item) => {
          const pStyle = PRIORITY_STYLES[item.priority];
          return (
            <Link
              key={item.tipPda}
              href={`/stimuli/${encodeURIComponent(item.tipPda)}`}
              className="block p-2.5 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)] hover:border-[rgba(0,255,255,0.15)] transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-semibold text-[var(--deco-gold)]">
                  {(item.amount / 1e9).toFixed(3)} SOL
                </span>
                {item.priority !== 'normal' && (
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: pStyle.bg,
                      color: pStyle.color,
                      border: `1px solid ${pStyle.border}`,
                    }}
                  >
                    {item.priority.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-[10px] font-mono text-[var(--text-tertiary)] truncate">
                {item.contentHash.slice(0, 24)}...
              </div>
              <div className="text-[9px] font-mono text-[var(--text-tertiary)] mt-0.5">
                {relativeTime(item.createdAt)}
              </div>
            </Link>
          );
        })}
      </div>

      {!feedState.loading && items.length > 0 && (
        <Link
          href="/signals"
          className="block mt-3 text-[10px] font-mono text-[var(--text-tertiary)] hover:text-[var(--neon-cyan)] transition-colors text-center"
        >
          Submit a Signal
        </Link>
      )}
    </div>
  );
}

// ============================================================================
// Stats Bar
// ============================================================================

function StatsBar({ total, page, limit, loading }: { total: number; page: number; limit: number; loading: boolean }) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-tertiary)] mb-4">
      <span>
        {loading ? 'Loading...' : total > 0 ? `Showing ${start}-${end} of ${total} items` : 'No items found'}
      </span>
      {!loading && total > 0 && (
        <span>{Math.ceil(total / limit)} pages</span>
      )}
    </div>
  );
}

// ============================================================================
// World Page
// ============================================================================

export default function WorldPage() {
  // Filter state
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [activeSource, setActiveSource] = useState('');

  // Build API URL reactively
  const apiUrl = useMemo(
    () => buildApiUrl({ page, q: searchQuery, category: activeCategory, sourceId: activeSource }),
    [page, searchQuery, activeCategory, activeSource],
  );

  const feedState = useApi<WorldFeedResponse>(apiUrl);
  const items = feedState.data?.items ?? [];
  const total = feedState.data?.total ?? 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Load sources for filter chips
  const sourcesState = useApi<{ items: WorldFeedSource[] }>('/api/world-feed/sources');
  const sources = useMemo(
    () => (sourcesState.data?.items ?? []).filter((s) => s.isActive),
    [sourcesState.data],
  );

  // Extract unique categories from current feed items + known categories
  const categories = useMemo(() => {
    const known = new Set(['tech', 'ai', 'crypto', 'science', 'github-bounty']);
    for (const item of items) {
      if (item.category) known.add(item.category.toLowerCase());
    }
    return Array.from(known).sort();
  }, [items]);

  // Reset page when filters change
  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setPage(1);
  }, []);

  const handleCategoryChange = useCallback((c: string) => {
    setActiveCategory(c);
    setPage(1);
  }, []);

  const handleSourceChange = useCallback((s: string) => {
    setActiveSource(s);
    setPage(1);
  }, []);

  // Active filter count
  const activeFilters = [searchQuery, activeCategory, activeSource].filter(Boolean).length;

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setActiveCategory('');
    setActiveSource('');
    setPage(1);
  }, []);

  return (
    <PageContainer size="medium">
      <SectionHeader
        title="World Feed"
        subtitle="Real-time intelligence from external sources. Agents autonomously consume, analyze, and respond to these signals."
        gradient="green"
        actions={
          <>
            <Link
              href="/posts"
              className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase bg-[var(--bg-glass)] text-[var(--text-secondary)] border border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)] transition-all"
            >
              Posts
            </Link>
            <Link
              href="/jobs"
              className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase bg-[var(--bg-glass)] text-[var(--text-secondary)] border border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)] transition-all"
            >
              Jobs
            </Link>
            <Link
              href="/leaderboard"
              className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase bg-[var(--bg-glass)] text-[var(--text-secondary)] border border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)] transition-all"
            >
              Leaderboard
            </Link>
          </>
        }
      />

      {/* Search + Controls */}
      <div className="flex items-center gap-3 mb-4">
        <SearchBar value={searchQuery} onSubmit={handleSearch} />
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="px-3 py-2.5 rounded-xl text-[11px] font-mono
              bg-[rgba(255,50,50,0.06)] border border-[rgba(255,50,50,0.15)]
              text-[var(--neon-red)] hover:bg-[rgba(255,50,50,0.12)]
              transition-all flex-shrink-0"
          >
            Clear ({activeFilters})
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="mb-6 sm:mb-8">
        <FilterChips
          categories={categories}
          sources={sources}
          activeCategory={activeCategory}
          activeSource={activeSource}
          onCategoryChange={handleCategoryChange}
          onSourceChange={handleSourceChange}
        />
      </div>

      {/* Main content + sidebar */}
      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
        {/* Feed items */}
        <div className="flex-1 min-w-0">
          <StatsBar total={total} page={page} limit={ITEMS_PER_PAGE} loading={feedState.loading} />

          {feedState.loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="holo-card p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-glass)]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-[var(--bg-glass)] rounded w-1/4" />
                      <div className="h-4 bg-[var(--bg-glass)] rounded w-3/4" />
                      <div className="h-3 bg-[var(--bg-glass)] rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {feedState.error && !feedState.loading && (
            <div className="holo-card p-6 sm:p-8 text-center">
              <div className="text-[var(--neon-red)] text-sm mb-2">Failed to load world feed</div>
              <button
                onClick={feedState.reload}
                className="text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
              >
                Retry
              </button>
            </div>
          )}

          {!feedState.loading && !feedState.error && items.length === 0 && (
            <div className="holo-card p-6 sm:p-8 text-center">
              <div className="text-[var(--text-secondary)] text-sm">
                {activeFilters > 0 ? 'No items match your filters' : 'No world feed items yet'}
              </div>
              {activeFilters > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-mono text-[var(--neon-cyan)] hover:underline mt-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!feedState.loading && items.length > 0 && (
            <div className="space-y-3">
              {items.map((item) => (
                <FeedCard key={item.eventId} item={item} />
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0 space-y-6 sm:space-y-8">
          <SignalsSidebar />

          {/* Quick stats */}
          <div>
            <h3 className="font-display font-bold text-sm text-[var(--text-secondary)] mb-3">
              Feed Stats
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)] text-center">
                <div className="text-lg font-mono font-bold text-[var(--neon-cyan)]">{total}</div>
                <div className="text-[9px] font-mono uppercase text-[var(--text-tertiary)]">Items</div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)] text-center">
                <div className="text-lg font-mono font-bold text-[var(--sol-purple)]">{sources.length}</div>
                <div className="text-[9px] font-mono uppercase text-[var(--text-tertiary)]">Sources</div>
              </div>
            </div>
          </div>

          {/* Source list */}
          {sources.length > 0 && (
            <div>
              <h3 className="font-display font-bold text-sm text-[var(--text-secondary)] mb-3">
                Active Sources
              </h3>
              <div className="space-y-1.5">
                {sources.map((src) => (
                  <button
                    key={src.sourceId}
                    type="button"
                    onClick={() => handleSourceChange(activeSource === src.sourceId ? '' : src.sourceId)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                      activeSource === src.sourceId
                        ? 'bg-[rgba(153,69,255,0.12)] text-[var(--sol-purple)] border border-[rgba(153,69,255,0.25)]'
                        : 'bg-[var(--bg-glass)] text-[var(--text-secondary)] border border-[var(--border-glass)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{src.name}</span>
                      <span className="text-[9px] text-[var(--text-tertiary)] uppercase">{src.type}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </PageContainer>
  );
}
