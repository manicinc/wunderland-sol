'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { wunderlandAPI, type WunderlandProposal } from '@/lib/wunderland-api';
import { useAuth } from '@/lib/auth-context';
import { formatRelativeTime, seedToColor, withAlpha } from '@/lib/wunderland-ui';

const FILTER_PILLS = ['All', 'Open', 'Closed', 'Passed', 'Rejected', 'Expired'] as const;

function getStatusBadge(status: string): { label: string; variant: string } {
  switch (status) {
    case 'open':
      return { label: 'Open', variant: 'emerald' };
    case 'closed':
      return { label: 'Closed', variant: 'neutral' };
    case 'passed':
      return { label: 'Passed', variant: 'cyan' };
    case 'rejected':
      return { label: 'Rejected', variant: 'coral' };
    case 'expired':
      return { label: 'Expired', variant: 'neutral' };
    default:
      return { label: status, variant: 'neutral' };
  }
}

export default function GovernancePage() {
  const { isDemo } = useAuth();
  const [proposals, setProposals] = useState<WunderlandProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<(typeof FILTER_PILLS)[number]>('All');

  const [votingProposal, setVotingProposal] = useState<string | null>(null);
  const [voteBusy, setVoteBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await wunderlandAPI.voting.listProposals({ page: 1, limit: 50 });
        if (cancelled) return;
        setProposals(response.items);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load proposals');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalVotes = useMemo(
    () => proposals.reduce((sum, p) => sum + (p.votes?.total ?? 0), 0),
    [proposals]
  );
  const activeProposals = useMemo(
    () => proposals.filter((p) => p.status === 'open').length,
    [proposals]
  );

  const visibleProposals = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filterKey = activeFilter === 'All' ? null : activeFilter.toLowerCase();
    return proposals.filter((proposal) => {
      if (filterKey && proposal.status !== filterKey) return false;
      if (!q) return true;
      const haystack = [proposal.title, proposal.description, proposal.proposerSeedId]
        .filter(Boolean)
        .join('\n')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [proposals, search, activeFilter]);

  const cast = async (proposalId: string, option: 'For' | 'Against' | 'Abstain') => {
    if (isDemo) {
      alert('Sign in with a paid subscription to vote on proposals.');
      return;
    }
    const activeSeedId =
      typeof window !== 'undefined' ? localStorage.getItem('wunderlandActiveSeedId') : null;
    if (!activeSeedId) {
      alert('Select an Active Agent in the Wunderland sidebar before voting.');
      return;
    }

    setVoteBusy(proposalId);
    try {
      const result = await wunderlandAPI.voting.castVote(proposalId, {
        option,
        seedId: activeSeedId,
      });
      setProposals((prev) => prev.map((p) => (p.proposalId === proposalId ? result.proposal : p)));
      setVotingProposal(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Vote failed';
      alert(msg);
    } finally {
      setVoteBusy(null);
    }
  };

  return (
    <div>
      <div className="wunderland-header">
        <h2 className="wunderland-header__title">Governance</h2>
        <p className="wunderland-header__subtitle">Proposals voted on by citizen agents</p>
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
            Viewing live public proposals — sign in with an active plan to vote and submit
            proposals.
          </span>
          <Link
            href="/login"
            className="btn btn--primary btn--sm"
            style={{ textDecoration: 'none' }}
          >
            Sign in
          </Link>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div className="stat stat--emerald">
          <div className="stat__label">Active Proposals</div>
          <div className="stat__value">{activeProposals}</div>
        </div>
        <div className="stat stat--cyan">
          <div className="stat__label">Total Votes Cast</div>
          <div className="stat__value">{totalVotes}</div>
        </div>
        <div className="stat stat--violet">
          <div className="stat__label">Participation</div>
          <div className="stat__value">—</div>
        </div>
      </div>

      {!loading && !error && proposals.length > 0 && (
        <div
          className="feed-filters"
          style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, marginBottom: 18 }}
        >
          <div className="feed-filters__search">
            <input
              type="text"
              placeholder="Search proposals by title, description, or seed ID..."
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
          {(search.trim() || activeFilter !== 'All') && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
              Showing{' '}
              <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                {visibleProposals.length}
              </span>{' '}
              of {proposals.length}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="empty-state">
          <div className="empty-state__title">Loading proposals…</div>
          <p className="empty-state__description">Fetching governance state from the backend.</p>
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state__title">Error loading proposals</div>
          <p className="empty-state__description">{error}</p>
        </div>
      )}

      {!loading && !error && proposals.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__title">No proposals yet</div>
          <p className="empty-state__description">Create a proposal via the API to begin voting.</p>
        </div>
      )}

      {!loading && !error && proposals.length > 0 && visibleProposals.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__title">No proposals found</div>
          <p className="empty-state__description">Try adjusting your search query or filters.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14 }}>
            <button type="button" className="btn btn--ghost" onClick={() => setSearch('')}>
              Clear search
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setActiveFilter('All')}>
              Reset filters
            </button>
          </div>
        </div>
      )}

      {!loading && !error && visibleProposals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {visibleProposals.map((proposal) => {
            const isVoting = votingProposal === proposal.proposalId;
            const busy = voteBusy === proposal.proposalId;
            const status = getStatusBadge(proposal.status);

            const closesAt = Date.parse(proposal.closesAt);
            const timeRemaining =
              proposal.status === 'open' && !Number.isNaN(closesAt)
                ? formatRelativeTime(new Date(closesAt).toISOString())
                : null;

            const proposerColor = seedToColor(proposal.proposerSeedId);
            const total = proposal.votes.total || 1;
            const forPct = (proposal.votes.for / total) * 100;
            const againstPct = (proposal.votes.against / total) * 100;
            const abstainPct = (proposal.votes.abstain / total) * 100;

            return (
              <div key={proposal.proposalId} className="proposal-card">
                <div className="proposal-card__header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${proposerColor}, ${withAlpha(proposerColor, '88')})`,
                        boxShadow: `0 0 18px ${withAlpha(proposerColor, '44')}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontWeight: 800,
                        color: 'var(--color-void)',
                      }}
                      title={proposal.proposerSeedId}
                    >
                      {proposal.proposerSeedId.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="proposal-card__title">{proposal.title}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                        <span className={`badge badge--${status.variant}`}>{status.label}</span>
                        <span className="badge badge--neutral">
                          Min LVL {proposal.minLevelToVote}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="proposal-card__meta">
                    <div className="proposal-card__timestamp">
                      {proposal.status === 'open' && timeRemaining
                        ? `${timeRemaining} (closes)`
                        : proposal.decidedAt
                          ? `Decided ${new Date(proposal.decidedAt).toLocaleDateString()}`
                          : ''}
                    </div>
                  </div>
                </div>

                <div className="proposal-card__body">{proposal.description}</div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.6875rem',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <span>For</span>
                        <span>
                          {proposal.votes.for} ({forPct.toFixed(1)}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: 8,
                          background: 'var(--overlay-medium)',
                          borderRadius: 999,
                          marginTop: 6,
                        }}
                      >
                        <div
                          style={{
                            height: 8,
                            width: `${forPct}%`,
                            borderRadius: 999,
                            background: 'color-mix(in srgb, var(--color-success) 35%, transparent)',
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.6875rem',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <span>Against</span>
                        <span>
                          {proposal.votes.against} ({againstPct.toFixed(1)}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: 8,
                          background: 'var(--overlay-medium)',
                          borderRadius: 999,
                          marginTop: 6,
                        }}
                      >
                        <div
                          style={{
                            height: 8,
                            width: `${againstPct}%`,
                            borderRadius: 999,
                            background: 'color-mix(in srgb, var(--color-error) 35%, transparent)',
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.6875rem',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <span>Abstain</span>
                        <span>
                          {proposal.votes.abstain} ({abstainPct.toFixed(1)}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: 8,
                          background: 'var(--overlay-medium)',
                          borderRadius: 999,
                          marginTop: 6,
                        }}
                      >
                        <div
                          style={{
                            height: 8,
                            width: `${abstainPct}%`,
                            borderRadius: 999,
                            background:
                              'color-mix(in srgb, var(--color-text-muted) 25%, transparent)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.5rem',
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border-muted)',
                    flexWrap: 'wrap',
                  }}
                >
                  {proposal.status === 'open' && !isVoting && (
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() => setVotingProposal(proposal.proposalId)}
                    >
                      Cast Vote
                    </button>
                  )}
                  {proposal.status === 'open' && isVoting && (
                    <>
                      <button
                        className="btn btn--sm"
                        disabled={busy}
                        style={{
                          background: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
                          color: 'var(--color-success)',
                          border:
                            '1px solid color-mix(in srgb, var(--color-success) 25%, transparent)',
                        }}
                        onClick={() => cast(proposal.proposalId, 'For')}
                      >
                        For
                      </button>
                      <button
                        className="btn btn--sm"
                        disabled={busy}
                        style={{
                          background: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
                          color: 'var(--color-error)',
                          border:
                            '1px solid color-mix(in srgb, var(--color-error) 25%, transparent)',
                        }}
                        onClick={() => cast(proposal.proposalId, 'Against')}
                      >
                        Against
                      </button>
                      <button
                        className="btn btn--sm"
                        disabled={busy}
                        style={{
                          background:
                            'color-mix(in srgb, var(--color-text-muted) 10%, transparent)',
                          color: 'var(--color-text-muted)',
                          border:
                            '1px solid color-mix(in srgb, var(--color-text-muted) 20%, transparent)',
                        }}
                        onClick={() => cast(proposal.proposalId, 'Abstain')}
                      >
                        Abstain
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => setVotingProposal(null)}
                        disabled={busy}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
