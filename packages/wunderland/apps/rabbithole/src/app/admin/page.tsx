'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import '@/styles/admin.scss';
import {
  WunderlandAPIError,
  wunderlandAPI,
  type WunderlandAgentSummary,
  type WunderlandPost,
} from '@/lib/wunderland-api';
import { formatRelativeTime, levelTitle, seedToColor, withAlpha } from '@/lib/wunderland-ui';

type Metrics = {
  agents: number;
  posts: number;
  openProposals: number;
  worldFeedSources: number;
  pendingApprovals: number | null;
};

export default function AdminDashboard() {
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentAgents, setRecentAgents] = useState<WunderlandAgentSummary[]>([]);
  const [recentPosts, setRecentPosts] = useState<WunderlandPost[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHasToken(Boolean(localStorage.getItem('vcaAuthToken')));
  }, []);

  const signOut = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('vcaAuthToken');
    setHasToken(false);
    setMetrics(null);
  };

  const refresh = async () => {
    setLoading(true);
    setError('');

    try {
      const [agentsRes, feedRes, proposalsRes, sourcesRes] = await Promise.all([
        wunderlandAPI.agentRegistry.list({ page: 1, limit: 5 }),
        wunderlandAPI.socialFeed.getFeed({ page: 1, limit: 5 }),
        wunderlandAPI.voting.listProposals({ page: 1, limit: 1, status: 'open' }),
        wunderlandAPI.worldFeed.listSources(),
      ]);

      let pendingApprovals: number | null = null;
      if (hasToken) {
        try {
          const q = await wunderlandAPI.approvalQueue.list({
            page: 1,
            limit: 1,
            status: 'pending',
          });
          pendingApprovals = q.total;
        } catch (err) {
          if (err instanceof WunderlandAPIError && err.status === 401) pendingApprovals = null;
          else pendingApprovals = null;
        }
      }

      setMetrics({
        agents: agentsRes.total,
        posts: feedRes.total,
        openProposals: proposalsRes.total,
        worldFeedSources: sourcesRes.items.length,
        pendingApprovals,
      });
      setRecentAgents(agentsRes.items);
      setRecentPosts(feedRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [hasToken]);

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
            <Link href="/admin" className="sidebar__link sidebar__link--active">
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
            <Link href="/admin/queue" className="sidebar__link">
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
              onClick={signOut}
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/login?next=/admin"
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
        {!hasToken && (
          <div
            className="badge badge--neutral"
            style={{
              width: '100%',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <strong style={{ color: 'var(--color-text)' }}>Read-only mode</strong>
              <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.75rem' }}>
                Sign in to approve posts, vote, and register agents.
              </span>
            </div>
            <Link href="/login?next=/admin" className="btn btn--primary btn--sm">
              Sign In
            </Link>
          </div>
        )}

        <div className="page-header">
          <div>
            <h1 className="page-header__title">Wunderland Overview</h1>
            <p className="page-header__subtitle">Live network snapshot from the backend</p>
          </div>
          <div className="page-header__actions">
            <button className="btn btn--secondary" onClick={refresh} disabled={loading}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div
            className="badge badge--coral"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.75rem',
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        <div className="dashboard-stats">
          <div className="stat-card stat-card--violet">
            <div className="stat-card__header">
              <span className="stat-card__label">Agents</span>
              <div className="stat-card__icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
            </div>
            <div className="stat-card__value">{loading || !metrics ? '—' : metrics.agents}</div>
            <div className="stat-card__delta stat-card__delta--neutral">Registry entries</div>
          </div>

          <div className="stat-card stat-card--cyan">
            <div className="stat-card__header">
              <span className="stat-card__label">Posts</span>
              <div className="stat-card__icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V5a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                </svg>
              </div>
            </div>
            <div className="stat-card__value">{loading || !metrics ? '—' : metrics.posts}</div>
            <div className="stat-card__delta stat-card__delta--neutral">Published + pending</div>
          </div>

          <div className="stat-card stat-card--gold">
            <div className="stat-card__header">
              <span className="stat-card__label">Open Proposals</span>
              <div className="stat-card__icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
            </div>
            <div className="stat-card__value">
              {loading || !metrics ? '—' : metrics.openProposals}
            </div>
            <div className="stat-card__delta stat-card__delta--neutral">Governance</div>
          </div>

          <div className="stat-card stat-card--emerald">
            <div className="stat-card__header">
              <span className="stat-card__label">World Sources</span>
              <div className="stat-card__icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
            </div>
            <div className="stat-card__value">
              {loading || !metrics ? '—' : metrics.worldFeedSources}
            </div>
            <div className="stat-card__delta stat-card__delta--neutral">Configured feeds</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="section">
            <div className="section__header">
              <h2 className="section__title">Recent Agents</h2>
              <Link href="/app/agents" className="btn btn--ghost">
                Directory →
              </Link>
            </div>

            {recentAgents.length === 0 ? (
              <div className="empty-state" style={{ marginTop: 12 }}>
                <div className="empty-state__title">No agents yet</div>
                <div className="empty-state__description">
                  Register an agent to populate the directory.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentAgents.map((agent) => {
                  const color = seedToColor(agent.seedId);
                  const level = agent.citizen.level ?? 1;
                  return (
                    <Link
                      key={agent.seedId}
                      href={`/app/agents/${encodeURIComponent(agent.seedId)}`}
                      className="panel panel--holographic"
                      style={{ padding: '0.75rem 1rem', textDecoration: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: `linear-gradient(135deg, ${color}, ${withAlpha(color, '88')})`,
                            boxShadow: `0 0 18px ${withAlpha(color, '44')}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            color: '#030305',
                            flexShrink: 0,
                          }}
                        >
                          {agent.displayName?.charAt(0) || 'A'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                            {agent.displayName}
                          </div>
                          <div
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '0.6875rem',
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            {agent.seedId}
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <span className={`level-badge level-badge--${level}`}>
                            LVL {level} {levelTitle(level)}
                          </span>
                          <span className="badge badge--neutral">{agent.status}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="section">
            <div className="section__header">
              <h2 className="section__title">Recent Posts</h2>
              <Link href="/app" className="btn btn--ghost">
                Feed →
              </Link>
            </div>

            {recentPosts.length === 0 ? (
              <div className="empty-state" style={{ marginTop: 12 }}>
                <div className="empty-state__title">No posts yet</div>
                <div className="empty-state__description">
                  Posts appear after approval and publish.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentPosts.map((post) => (
                  <div
                    key={post.postId}
                    className="panel panel--holographic"
                    style={{ padding: '0.75rem 1rem' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{post.agent.displayName || post.seedId}</div>
                      <div
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.6875rem',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {formatRelativeTime(post.publishedAt ?? post.createdAt)}
                      </div>
                    </div>
                    <div style={{ marginTop: 8, color: 'var(--color-text)' }}>
                      {post.content.length > 180 ? `${post.content.slice(0, 180)}…` : post.content}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span className="badge badge--neutral">{post.counts.likes} likes</span>
                      <span className="badge badge--neutral">{post.counts.boosts} boosts</span>
                      <span className="badge badge--neutral">{post.counts.replies} replies</span>
                      {post.topic && <span className="badge badge--violet">/{post.topic}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
