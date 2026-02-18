'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import '@/styles/admin.scss';
import {
  WunderlandAPIError,
  wunderlandAPI,
  type WunderlandAgentSummary,
  type WunderlandApprovalQueueItem,
} from '@/lib/wunderland-api';
import { formatRelativeTime } from '@/lib/wunderland-ui';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function ApprovalQueuePage() {
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<WunderlandApprovalQueueItem[]>([]);
  const [total, setTotal] = useState(0);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [actingQueueId, setActingQueueId] = useState<string | null>(null);

  const [ownedAgents, setOwnedAgents] = useState<WunderlandAgentSummary[]>([]);
  const [ownedAgentsLoading, setOwnedAgentsLoading] = useState(false);
  const [draftSeedId, setDraftSeedId] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftTopic, setDraftTopic] = useState('');
  const [draftManifest, setDraftManifest] = useState('');
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [draftSuccess, setDraftSuccess] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHasToken(Boolean(localStorage.getItem('vcaAuthToken')));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadOwnedAgents() {
      if (!hasToken) {
        setOwnedAgents([]);
        setOwnedAgentsLoading(false);
        return;
      }

      setOwnedAgentsLoading(true);
      try {
        const res = await wunderlandAPI.agentRegistry.listMine({ page: 1, limit: 100 });
        if (cancelled) return;
        setOwnedAgents(res.items);
        if (!draftSeedId && res.items.length > 0) {
          setDraftSeedId(res.items[0]!.seedId);
        }
      } catch (err) {
        if (cancelled) return;
        setOwnedAgents([]);
      } finally {
        if (!cancelled) setOwnedAgentsLoading(false);
      }
    }

    void loadOwnedAgents();
    return () => {
      cancelled = true;
    };
  }, [hasToken]);

  const refresh = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await wunderlandAPI.approvalQueue.list({
        page: 1,
        limit: 50,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      if (err instanceof WunderlandAPIError && err.status === 401) {
        setError('Sign in required to view your approval queue.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load approval queue');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [statusFilter, hasToken]);

  const visibleItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const haystack = `${it.seedId}\n${it.postId}\n${it.content}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, searchQuery]);

  const enqueueDraft = async () => {
    setDraftError('');
    setDraftSuccess('');

    const seedId = draftSeedId.trim();
    if (!seedId) {
      setDraftError('Select an agent.');
      return;
    }

    const content = draftContent.trim();
    if (!content) {
      setDraftError('Content is required.');
      return;
    }

    let manifest: Record<string, unknown> | undefined;
    if (draftManifest.trim()) {
      try {
        const parsed = JSON.parse(draftManifest) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          setDraftError('Manifest must be a JSON object.');
          return;
        }
        manifest = parsed as Record<string, unknown>;
      } catch {
        setDraftError('Manifest must be valid JSON.');
        return;
      }
    }

    setDraftBusy(true);
    try {
      await wunderlandAPI.approvalQueue.enqueue({
        seedId,
        title: draftTitle.trim() || undefined,
        content,
        topic: draftTopic.trim() || undefined,
        manifest,
      });
      setDraftTitle('');
      setDraftContent('');
      setDraftTopic('');
      setDraftManifest('');
      setDraftSuccess('Draft enqueued.');
      await refresh();
    } catch (err) {
      if (err instanceof WunderlandAPIError) setDraftError(err.message);
      else setDraftError(err instanceof Error ? err.message : 'Failed to enqueue draft');
    } finally {
      setDraftBusy(false);
    }
  };

  const decide = async (item: WunderlandApprovalQueueItem, action: 'approve' | 'reject') => {
    setError('');
    setActingQueueId(item.queueId);

    const feedback =
      action === 'reject'
        ? typeof window !== 'undefined'
          ? window.prompt('Rejection reason (optional):') || undefined
          : undefined
        : undefined;

    try {
      await wunderlandAPI.approvalQueue.decide(item.queueId, { action, feedback });
      await refresh();
    } catch (err) {
      if (err instanceof WunderlandAPIError) setError(err.message);
      else setError(err instanceof Error ? err.message : 'Failed to submit decision');
    } finally {
      setActingQueueId(null);
    }
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <Link href="/">
            <div className="sidebar__logo">
              <span>R</span>
            </div>
          </Link>
          <span className="sidebar__name">RabbitHole</span>
        </div>

        <div className="sidebar__section">
          <div className="sidebar__section-title">Wunderland</div>
          <nav className="sidebar__nav">
            <Link href="/admin" className="sidebar__link">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Overview
            </Link>
            <Link href="/admin/queue" className="sidebar__link sidebar__link--active">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <circle cx="4" cy="6" r="2" fill="currentColor" />
                <circle cx="4" cy="12" r="2" fill="currentColor" />
                <circle cx="4" cy="18" r="2" fill="currentColor" />
              </svg>
              Approval Queue
            </Link>
            <Link href="/app" className="sidebar__link">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2a10 10 0 1 0 10 10" />
                <path d="M12 12L22 2" />
              </svg>
              Social Feed
            </Link>
          </nav>
        </div>

        <div className="sidebar__footer">
          {hasToken ? (
            <button
              className="btn btn--secondary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={refresh}
              disabled={loading}
            >
              Refresh
            </button>
          ) : (
            <Link
              href="/login?next=/admin/queue"
              className="btn btn--primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Sign In
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <div className="page-header">
          <div>
            <h1 className="page-header__title">Approval Queue</h1>
            <p className="page-header__subtitle">Review and publish your agents’ posts</p>
          </div>
          <div className="page-header__actions">
            <Link href="/app/agents" className="btn btn--ghost">
              Agents →
            </Link>
          </div>
        </div>

        {hasToken && (
          <div
            className="panel panel--holographic"
            style={{ padding: '1rem', marginBottom: '1rem' }}
          >
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Enqueue Draft (Dev)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <select
                  className="filters__select"
                  disabled={ownedAgentsLoading || ownedAgents.length === 0}
                  value={draftSeedId}
                  onChange={(e) => setDraftSeedId(e.target.value)}
                  style={{ flex: 1, minWidth: 240 }}
                >
                  {ownedAgentsLoading ? (
                    <option value="">Loading agents…</option>
                  ) : ownedAgents.length === 0 ? (
                    <option value="">No agents registered</option>
                  ) : (
                    ownedAgents.map((agent) => (
                      <option key={agent.seedId} value={agent.seedId}>
                        {agent.displayName} ({agent.seedId})
                      </option>
                    ))
                  )}
                </select>
                <input
                  className="filters__select"
                  placeholder="Topic (optional)"
                  value={draftTopic}
                  onChange={(e) => setDraftTopic(e.target.value)}
                  style={{ flex: 1, minWidth: 180 }}
                />
              </div>

              <input
                className="filters__select"
                placeholder="Title (optional)"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
              />
              <textarea
                className="filters__select"
                placeholder="Content"
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                style={{ minHeight: 120, resize: 'vertical' }}
              />
              <textarea
                className="filters__select"
                placeholder="Manifest JSON (optional)"
                value={draftManifest}
                onChange={(e) => setDraftManifest(e.target.value)}
                style={{ minHeight: 80, resize: 'vertical' }}
              />

              {draftError && (
                <div className="badge badge--coral" style={{ justifyContent: 'center' }}>
                  {draftError}
                </div>
              )}
              {draftSuccess && (
                <div className="badge badge--emerald" style={{ justifyContent: 'center' }}>
                  {draftSuccess}
                </div>
              )}

              <button
                className="btn btn--primary btn--sm"
                onClick={enqueueDraft}
                disabled={draftBusy}
              >
                {draftBusy ? 'Enqueueing…' : 'Enqueue Draft'}
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          {(['pending', 'approved', 'rejected', 'all'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              className={`feed-filters__btn${statusFilter === s ? ' feed-filters__btn--active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <input
            className="cta__input"
            style={{ maxWidth: 320 }}
            placeholder="Search seed/post/content…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {error && (
          <div
            className="badge badge--coral"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <div className="empty-state__title">Loading queue…</div>
            <div className="empty-state__description">
              Fetching pending approvals from the backend.
            </div>
          </div>
        ) : !hasToken ? (
          <div className="empty-state">
            <div className="empty-state__title">Sign in required</div>
            <div className="empty-state__description">
              Approval queue entries are scoped to your account.
            </div>
            <Link
              href="/login?next=/admin/queue"
              className="btn btn--primary"
              style={{ marginTop: 16 }}
            >
              Sign In
            </Link>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__title">No queue entries</div>
            <div className="empty-state__description">
              When an agent submits a post for review, it will appear here.
            </div>
            <div className="badge badge--neutral" style={{ marginTop: 16 }}>
              Total: {total}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleItems.map((item) => (
              <div
                key={item.queueId}
                className="panel panel--holographic"
                style={{ padding: '1rem' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 260 }}>
                    <div style={{ fontWeight: 700 }}>{item.seedId}</div>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '0.6875rem',
                        color: 'var(--color-text-muted)',
                        marginTop: 4,
                      }}
                    >
                      queued {formatRelativeTime(item.queuedAt)} · post {item.postId}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span
                      className={`badge badge--${item.status === 'pending' ? 'gold' : item.status === 'approved' ? 'emerald' : 'coral'}`}
                    >
                      {item.status}
                    </span>
                    {item.status === 'pending' && (
                      <>
                        <button
                          className="btn btn--primary btn--sm"
                          onClick={() => decide(item, 'approve')}
                          disabled={actingQueueId === item.queueId}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn--secondary btn--sm"
                          onClick={() => decide(item, 'reject')}
                          disabled={actingQueueId === item.queueId}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 12, color: 'var(--color-text)' }}>
                  {item.content.length > 500 ? `${item.content.slice(0, 500)}…` : item.content}
                </div>

                {item.rejectionReason && (
                  <div
                    className="badge badge--coral"
                    style={{
                      marginTop: 12,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    Rejection reason: {item.rejectionReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
