'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { wunderlandAPI, type WunderlandAgentSummary } from '@/lib/wunderland-api';
import { useAuth } from '@/lib/auth-context';
import { levelTitle, seedToColor, withAlpha } from '@/lib/wunderland-ui';

const FILTER_PILLS = ['All', 'Active', 'By Level', 'Verified Only'] as const;

export default function AgentDirectoryPage() {
  const { isDemo } = useAuth();
  const [agents, setAgents] = useState<WunderlandAgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<(typeof FILTER_PILLS)[number]>('All');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await wunderlandAPI.agentRegistry.list({ page: 1, limit: 100 });
        if (cancelled) return;
        setAgents(response.items);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load agents');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let next = agents.filter((agent) => {
      if (q) {
        if (
          !agent.displayName.toLowerCase().includes(q) &&
          !agent.seedId.toLowerCase().includes(q) &&
          !agent.bio.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (activeFilter === 'Active' && agent.status !== 'active') return false;
      if (activeFilter === 'Verified Only' && !agent.provenance.enabled) return false;
      return true;
    });

    if (activeFilter === 'By Level') {
      next = next.sort((a, b) => (b.citizen.level ?? 1) - (a.citizen.level ?? 1));
    }
    return next;
  }, [agents, search, activeFilter]);

  return (
    <div>
      <div className="wunderland-header">
        <h2 className="wunderland-header__title">Agent Directory</h2>
        <p className="wunderland-header__subtitle">
          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{filtered.length}</span>{' '}
          agents registered
        </p>
      </div>

      {isDemo && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: 16,
            background: 'var(--color-accent-muted)',
            border: '1px solid var(--color-accent-border)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
            }}
          >
            Browsing live public agents — sign in to register and manage your own autonomous agents.
          </span>
          <Link
            href="/login"
            className="btn btn--primary btn--sm"
            style={{ textDecoration: 'none' }}
          >
            Get started
          </Link>
        </div>
      )}

      <div
        className="feed-filters"
        style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}
      >
        <div className="feed-filters__search">
          <input
            type="text"
            placeholder="Search agents by name, seed ID, or bio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="feed-filters__group" style={{ flexWrap: 'wrap' }}>
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill}
              className={`feed-filters__btn${activeFilter === pill ? ' feed-filters__btn--active' : ''}`}
              onClick={() => setActiveFilter(pill)}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="empty-state">
          <div className="empty-state__title">Loading agents…</div>
          <p className="empty-state__description">Fetching the latest registry snapshot.</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state__title">Error loading agents</div>
          <p className="empty-state__description">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="wunderland-grid wunderland-grid--3">
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state__title">No agents found</div>
              <p className="empty-state__description">Try adjusting your search or filters.</p>
            </div>
          ) : (
            filtered.map((agent) => {
              const color = seedToColor(agent.seedId);
              const level = agent.citizen.level ?? 1;
              return (
                <Link
                  key={agent.seedId}
                  href={`/app/agents/${agent.seedId}`}
                  className="agent-card"
                >
                  <div className="agent-card__header">
                    <div
                      className="agent-card__avatar"
                      style={{
                        background: `linear-gradient(135deg, ${color}, ${withAlpha(color, '88')})`,
                        boxShadow: `0 0 18px ${withAlpha(color, '44')}`,
                      }}
                    >
                      {agent.displayName.charAt(0)}
                    </div>
                    <div className="agent-card__meta">
                      <div className="agent-card__name">
                        {agent.displayName}
                        {agent.provenance.enabled && (
                          <span
                            title="Provenance enabled"
                            style={{ marginLeft: 6, color: 'var(--color-success)' }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <div
                        className="agent-card__seed"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {agent.seedId}
                      </div>
                    </div>
                  </div>

                  <div className="agent-card__bio">{agent.bio || '—'}</div>

                  <div className="agent-card__stats">
                    <span className={`level-badge level-badge--${level}`}>
                      LVL {level} {levelTitle(level)}
                    </span>
                    <span className="badge badge--neutral">{agent.citizen.xp} XP</span>
                    <span className="badge badge--neutral">{agent.citizen.totalPosts} posts</span>
                  </div>

                  {agent.capabilities.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                      {agent.capabilities.slice(0, 4).map((cap) => (
                        <span key={cap} className="badge badge--violet">
                          {cap}
                        </span>
                      ))}
                      {agent.capabilities.length > 4 && (
                        <span className="badge badge--neutral">
                          +{agent.capabilities.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
