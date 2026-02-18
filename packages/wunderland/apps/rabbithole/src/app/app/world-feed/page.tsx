'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  WunderlandAPIError,
  wunderlandAPI,
  type WunderlandWorldFeedItem,
  type WunderlandWorldFeedSource,
} from '@/lib/wunderland-api';
import { formatRelativeTime } from '@/lib/wunderland-ui';

function getSourceBadgeVariant(type: string): string {
  switch (type.toLowerCase()) {
    case 'rss':
      return 'cyan';
    case 'api':
      return 'violet';
    case 'webhook':
      return 'gold';
    default:
      return 'neutral';
  }
}

function getCategoryVariant(category: string): string {
  const key = category.trim().toLowerCase();
  if (key.includes('policy')) return 'gold';
  if (key.includes('security')) return 'coral';
  if (key.includes('research')) return 'violet';
  if (key.includes('infra')) return 'emerald';
  if (key === 'ai' || key.includes('agent')) return 'cyan';
  return 'neutral';
}

function iconFromName(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return 'WF';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const letters = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return letters || cleaned.slice(0, 2).toUpperCase();
}

export default function WorldFeedPage() {
  const [hasToken, setHasToken] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [items, setItems] = useState<WunderlandWorldFeedItem[]>([]);
  const [sources, setSources] = useState<WunderlandWorldFeedSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [createSourceError, setCreateSourceError] = useState('');
  const [creatingSource, setCreatingSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceType, setNewSourceType] = useState<'rss' | 'api' | 'webhook'>('rss');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceCategories, setNewSourceCategories] = useState('');

  const [injectError, setInjectError] = useState('');
  const [injecting, setInjecting] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventSummary, setEventSummary] = useState('');
  const [eventUrl, setEventUrl] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventSourceId, setEventSourceId] = useState<string>('');

  const sourcesById = useMemo(() => {
    const map = new Map<string, WunderlandWorldFeedSource>();
    for (const src of sources) map.set(src.sourceId, src);
    return map;
  }, [sources]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.category) set.add(item.category);
    }
    for (const src of sources) {
      for (const cat of src.categories ?? []) set.add(cat);
    }
    const list = Array.from(set)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    return ['All', ...list];
  }, [items, sources]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = `${item.title ?? ''}\n${item.summary ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHasToken(Boolean(localStorage.getItem('vcaAuthToken')));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSources() {
      try {
        const res = await wunderlandAPI.worldFeed.listSources();
        if (cancelled) return;
        setSources(res.items);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load sources');
      }
    }

    void loadSources();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      setLoading(true);
      setError('');
      try {
        const res = await wunderlandAPI.worldFeed.list({
          page: 1,
          limit: 20,
          category: activeCategory !== 'All' ? activeCategory : undefined,
          sourceId: activeSourceId ?? undefined,
        });
        if (cancelled) return;
        setItems(res.items);
        setPage(1);
        setHasMore(res.items.length < res.total);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof WunderlandAPIError) setError(err.message);
        else setError(err instanceof Error ? err.message : 'Failed to load world feed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadFeed();
    return () => {
      cancelled = true;
    };
  }, [activeCategory, activeSourceId]);

  const refreshSources = async () => {
    try {
      const res = await wunderlandAPI.worldFeed.listSources();
      setSources(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources');
    }
  };

  const refreshFeed = async () => {
    try {
      const res = await wunderlandAPI.worldFeed.list({
        page: 1,
        limit: 20,
        category: activeCategory !== 'All' ? activeCategory : undefined,
        sourceId: activeSourceId ?? undefined,
      });
      setItems(res.items);
      setPage(1);
      setHasMore(res.items.length < res.total);
    } catch (err) {
      if (err instanceof WunderlandAPIError) setError(err.message);
      else setError(err instanceof Error ? err.message : 'Failed to load world feed');
    }
  };

  const handleCreateSource = async (e: FormEvent) => {
    e.preventDefault();
    setCreateSourceError('');
    setCreatingSource(true);

    const name = newSourceName.trim();
    if (!name) {
      setCreateSourceError('Source name is required.');
      setCreatingSource(false);
      return;
    }

    const categories = newSourceCategories
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    try {
      await wunderlandAPI.worldFeed.createSource({
        name,
        type: newSourceType,
        url: newSourceUrl.trim() || undefined,
        categories: categories.length > 0 ? categories : undefined,
      });
      setNewSourceName('');
      setNewSourceUrl('');
      setNewSourceCategories('');
      await refreshSources();
    } catch (err) {
      if (err instanceof WunderlandAPIError) {
        if (err.status === 401) setCreateSourceError('Sign in required.');
        else setCreateSourceError(err.message || 'Failed to create source');
      } else {
        setCreateSourceError(err instanceof Error ? err.message : 'Failed to create source');
      }
    } finally {
      setCreatingSource(false);
    }
  };

  const handleInjectEvent = async (e: FormEvent) => {
    e.preventDefault();
    setInjectError('');

    const title = eventTitle.trim();
    if (!title) {
      setInjectError('Title is required.');
      return;
    }

    setInjecting(true);
    try {
      await wunderlandAPI.worldFeed.createItem({
        title,
        summary: eventSummary.trim() || undefined,
        url: eventUrl.trim() || undefined,
        category: eventCategory.trim() || undefined,
        sourceId: eventSourceId || undefined,
      });

      setEventTitle('');
      setEventSummary('');
      setEventUrl('');
      setEventCategory('');
      setEventSourceId('');

      await refreshFeed();
    } catch (err) {
      if (err instanceof WunderlandAPIError) {
        if (err.status === 401) setInjectError('Sign in required.');
        else setInjectError(err.message || 'Failed to inject event');
      } else {
        setInjectError(err instanceof Error ? err.message : 'Failed to inject event');
      }
    } finally {
      setInjecting(false);
    }
  };

  const loadMore = async () => {
    const nextPage = page + 1;
    try {
      const res = await wunderlandAPI.worldFeed.list({
        page: nextPage,
        limit: 20,
        category: activeCategory !== 'All' ? activeCategory : undefined,
        sourceId: activeSourceId ?? undefined,
      });
      setItems((prev) => [...prev, ...res.items]);
      setPage(nextPage);
      setHasMore(nextPage * res.limit < res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more items');
    }
  };

  return (
    <div>
      <div className="wunderland-header">
        <h2 className="wunderland-header__title">World Feed</h2>
        <p className="wunderland-header__subtitle">External events that agents can respond to</p>
      </div>

      {/* Filters */}
      <div className="feed-filters">
        <div className="feed-filters__group">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`feed-filters__btn${activeCategory === cat ? ' feed-filters__btn--active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="feed-filters__separator" />
        <div className="feed-filters__search">
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
        {/* Feed Items */}
        <div>
          {loading ? (
            <div className="empty-state">
              <div className="empty-state__title">Loading world feed…</div>
              <div className="empty-state__description">Fetching external events and sources.</div>
            </div>
          ) : error ? (
            <div className="empty-state">
              <div className="empty-state__title">World feed unavailable</div>
              <div className="empty-state__description">{error}</div>
            </div>
          ) : visibleItems.length > 0 ? (
            visibleItems.map((item) => {
              const src = item.sourceId ? sourcesById.get(item.sourceId) : undefined;
              const srcName = src?.name || (item.sourceId ? `Source ${item.sourceId}` : 'External');
              const srcIcon = iconFromName(srcName);
              const category = item.category ?? '';

              return (
                <div key={item.eventId} className="stimulus-card stimulus-card--update">
                  <div className="stimulus-card__header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '8px',
                          background: 'linear-gradient(145deg, rgba(8,8,16,0.8), rgba(8,8,16,1))',
                          border: '1px solid rgba(255,255,255,0.04)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color: 'var(--color-accent)',
                          flexShrink: 0,
                        }}
                      >
                        {srcIcon}
                      </div>
                      <div>
                        <div className="stimulus-card__type">{srcName}</div>
                      </div>
                    </div>
                    <span className="stimulus-card__timestamp">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>

                  <div className="stimulus-card__title">
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer">
                        {item.title}
                      </a>
                    ) : (
                      <span>{item.title}</span>
                    )}
                  </div>

                  <div className="stimulus-card__body">{item.summary || '—'}</div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginTop: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      {category ? (
                        <span className={`badge badge--${getCategoryVariant(category)}`}>
                          {category}
                        </span>
                      ) : (
                        <span className="badge badge--neutral">Uncategorized</span>
                      )}
                    </div>
                    {item.url && (
                      <a
                        className="stimulus-card__source"
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        View original source
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div className="empty-state__title">No events found</div>
              <div className="empty-state__description">
                No events match the selected filters. Add a source or widen the category filter.
              </div>
            </div>
          )}

          {!loading && !error && visibleItems.length > 0 && hasMore && (
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
              <button className="btn btn--secondary" onClick={loadMore}>
                Load more
              </button>
            </div>
          )}
        </div>

        {/* Sources Sidebar */}
        <div>
          <div
            className="panel panel--holographic"
            style={{ padding: '1rem', marginBottom: '1rem' }}
          >
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Admin Actions</div>
            {!hasToken ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                Sign in with a global/admin session token to add sources or inject events.
                <div style={{ marginTop: 10 }}>
                  <a href="/login?next=/app/world-feed" className="btn btn--primary btn--sm">
                    Sign In
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <form
                  onSubmit={handleCreateSource}
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.6875rem',
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                    }}
                  >
                    Add Source
                  </div>
                  <input
                    className="register-form__input"
                    placeholder="Name"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      className="register-form__input"
                      value={newSourceType}
                      onChange={(e) => setNewSourceType(e.target.value as any)}
                      style={{ flex: 1 }}
                    >
                      <option value="rss">rss</option>
                      <option value="api">api</option>
                      <option value="webhook">webhook</option>
                    </select>
                    <input
                      className="register-form__input"
                      placeholder="URL (optional)"
                      value={newSourceUrl}
                      onChange={(e) => setNewSourceUrl(e.target.value)}
                      style={{ flex: 2 }}
                    />
                  </div>
                  <input
                    className="register-form__input"
                    placeholder="Categories (comma-separated)"
                    value={newSourceCategories}
                    onChange={(e) => setNewSourceCategories(e.target.value)}
                  />
                  {createSourceError && (
                    <div className="badge badge--coral" style={{ justifyContent: 'center' }}>
                      {createSourceError}
                    </div>
                  )}
                  <button
                    className="btn btn--secondary btn--sm"
                    type="submit"
                    disabled={creatingSource}
                  >
                    {creatingSource ? 'Creating…' : 'Create Source'}
                  </button>
                </form>

                <form
                  onSubmit={handleInjectEvent}
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.6875rem',
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                    }}
                  >
                    Inject Event
                  </div>
                  <input
                    className="register-form__input"
                    placeholder="Title"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                  />
                  <textarea
                    className="register-form__textarea"
                    placeholder="Summary (optional)"
                    value={eventSummary}
                    onChange={(e) => setEventSummary(e.target.value)}
                    rows={3}
                  />
                  <input
                    className="register-form__input"
                    placeholder="URL (optional)"
                    value={eventUrl}
                    onChange={(e) => setEventUrl(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="register-form__input"
                      placeholder="Category (optional)"
                      value={eventCategory}
                      onChange={(e) => setEventCategory(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <select
                      className="register-form__input"
                      value={eventSourceId}
                      onChange={(e) => setEventSourceId(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">Source (optional)</option>
                      {sources.map((s) => (
                        <option key={s.sourceId} value={s.sourceId}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {injectError && (
                    <div className="badge badge--coral" style={{ justifyContent: 'center' }}>
                      {injectError}
                    </div>
                  )}
                  <button className="btn btn--primary btn--sm" type="submit" disabled={injecting}>
                    {injecting ? 'Injecting…' : 'Inject Event'}
                  </button>
                </form>
              </div>
            )}
          </div>

          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6875rem',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: '1rem',
            }}
          >
            Sources
          </div>

          <div
            className="source-card"
            style={{
              marginBottom: '0.75rem',
              cursor: 'pointer',
              border:
                activeSourceId === null
                  ? '1px solid rgba(0,245,255,0.25)'
                  : '1px solid rgba(255,255,255,0.04)',
            }}
            onClick={() => setActiveSourceId(null)}
          >
            <div className="source-card__header">
              <div className="source-card__icon">
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                  }}
                >
                  WF
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="source-card__name">All sources</div>
                <div className="source-card__url">No source filter</div>
              </div>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--color-success)',
                  boxShadow: '0 0 8px rgba(16,255,176,0.5)',
                  flexShrink: 0,
                }}
              />
            </div>
            <div className="source-card__meta">
              <span className="badge badge--neutral">Filter</span>
              <span style={{ color: 'var(--color-success)' }}>Active</span>
            </div>
          </div>

          {sources.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 12 }}>
              <div className="empty-state__title">No sources configured</div>
              <div className="empty-state__description">
                Add sources via the backend API to start ingesting events.
              </div>
            </div>
          ) : (
            sources.map((source) => {
              const lastSync = source.lastPolledAt
                ? formatRelativeTime(source.lastPolledAt)
                : 'never';
              const detailLine =
                source.type === 'webhook'
                  ? `Webhook: /api/wunderland/world-feed/webhook/${source.sourceId} · Last sync: ${lastSync}`
                  : `${source.url ?? 'No URL'} · Last sync: ${lastSync}`;
              return (
                <div
                  key={source.sourceId}
                  className="source-card"
                  style={{
                    marginBottom: '0.75rem',
                    cursor: 'pointer',
                    border:
                      activeSourceId === source.sourceId
                        ? '1px solid rgba(0,245,255,0.25)'
                        : '1px solid rgba(255,255,255,0.04)',
                  }}
                  onClick={() => setActiveSourceId(source.sourceId)}
                >
                  <div className="source-card__header">
                    <div className="source-card__icon">
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                        }}
                      >
                        {iconFromName(source.name)}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="source-card__name">{source.name}</div>
                      <div className="source-card__url">{detailLine}</div>
                    </div>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: source.isActive
                          ? 'var(--color-success)'
                          : 'var(--color-text-dim)',
                        boxShadow: source.isActive ? '0 0 8px rgba(16,255,176,0.5)' : 'none',
                        flexShrink: 0,
                      }}
                    />
                  </div>
                  <div className="source-card__meta">
                    <span className={`badge badge--${getSourceBadgeVariant(source.type)}`}>
                      {source.type}
                    </span>
                    <span
                      style={{
                        color: source.isActive ? 'var(--color-success)' : 'var(--color-text-dim)',
                      }}
                    >
                      {source.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
