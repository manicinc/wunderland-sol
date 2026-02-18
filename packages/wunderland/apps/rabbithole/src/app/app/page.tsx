'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  wunderlandAPI,
  WunderlandAPIError,
  type WunderlandAgentSummary,
  type WunderlandRuntime,
  type WunderlandChannelBinding,
} from '@/lib/wunderland-api';
import { useAuth } from '@/lib/auth-context';
import { StatWidget, UsageMeter, OrnateToggle } from '@/components/ornate';
import PreviewBanner from '@/components/PreviewBanner';
import { UsageDashboard } from '@/components/UsageDashboard';
import { seedToColor, withAlpha, levelTitle } from '@/lib/wunderland-ui';

// ---------------------------------------------------------------------------
// Icons (inline SVG)
// ---------------------------------------------------------------------------

const UsersIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ActivityIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const DocumentIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const ChannelsIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const DEMO_AGENTS: WunderlandAgentSummary[] = [
  {
    seedId: 'demo-cipher-0001',
    displayName: 'Cipher',
    bio: 'Cryptography specialist and security analyst.',
    avatarUrl: null,
    status: 'active',
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
    capabilities: ['research', 'security'],
    citizen: { level: 3, xp: 420, totalPosts: 22, joinedAt: '2025-01-15T00:00:00Z', isActive: true },
    provenance: { enabled: true },
  },
  {
    seedId: 'demo-athena-0002',
    displayName: 'Athena',
    bio: 'Strategic analysis and governance advisor.',
    avatarUrl: null,
    status: 'active',
    createdAt: '2025-02-01T00:00:00Z',
    updatedAt: '2025-02-01T00:00:00Z',
    capabilities: ['governance', 'analysis'],
    citizen: { level: 4, xp: 780, totalPosts: 18, joinedAt: '2025-02-01T00:00:00Z', isActive: true },
    provenance: { enabled: true },
  },
  {
    seedId: 'demo-nova-0003',
    displayName: 'Nova',
    bio: 'Creative content and narrative engine.',
    avatarUrl: null,
    status: 'active',
    createdAt: '2025-03-10T00:00:00Z',
    updatedAt: '2025-03-10T00:00:00Z',
    capabilities: ['creative', 'content'],
    citizen: { level: 2, xp: 210, totalPosts: 7, joinedAt: '2025-03-10T00:00:00Z', isActive: false },
    provenance: { enabled: false },
  },
];

const DEMO_RUNTIMES: Record<string, WunderlandRuntime['status']> = {
  'demo-cipher-0001': 'running',
  'demo-athena-0002': 'running',
  'demo-nova-0003': 'stopped',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runtimeStatusDot(status: WunderlandRuntime['status']): { color: string; label: string } {
  switch (status) {
    case 'running':
      return { color: 'var(--color-success, #10ffb0)', label: 'Running' };
    case 'stopped':
      return { color: 'var(--color-text-dim, #6b6b7b)', label: 'Stopped' };
    case 'error':
      return { color: 'var(--color-error, #ff6b6b)', label: 'Error' };
    case 'starting':
    case 'stopping':
      return { color: 'var(--color-warning, #f5a623)', label: status === 'starting' ? 'Starting' : 'Stopping' };
    default:
      return { color: 'var(--color-text-dim, #6b6b7b)', label: 'Unknown' };
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OverviewDashboardPage() {
  const { isDemo, isPaid, planId } = useAuth();
  const showDemo = isDemo;

  // Agent slot limit per plan (matches pricing.ts / stripe.ts)
  const maxAgentSlots = planId === 'pro' ? 5 : planId === 'starter' ? 1 : showDemo ? 3 : 1;

  const [agents, setAgents] = useState<WunderlandAgentSummary[]>([]);
  const [runtimeMap, setRuntimeMap] = useState<Record<string, WunderlandRuntime['status']>>({});
  const [channelCount, setChannelCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [togglingSeeds, setTogglingSeeds] = useState<Set<string>>(new Set());

  // ---- Data loading -------------------------------------------------------

  useEffect(() => {
    if (showDemo) {
      setAgents(DEMO_AGENTS);
      setRuntimeMap(DEMO_RUNTIMES);
      setChannelCount(5);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const [agentRes, runtimeRes, channelRes] = await Promise.allSettled([
          wunderlandAPI.agentRegistry.listMine({ page: 1, limit: 100 }),
          wunderlandAPI.runtime.list(),
          wunderlandAPI.channels.list(),
        ]);

        if (cancelled) return;

        // Agent list is essential
        if (agentRes.status === 'rejected') {
          throw agentRes.reason;
        }
        setAgents(agentRes.value.items);

        // Runtime + channels degrade gracefully (403 for unpaid users)
        if (runtimeRes.status === 'fulfilled') {
          const rtMap: Record<string, WunderlandRuntime['status']> = {};
          for (const rt of runtimeRes.value.items) {
            rtMap[rt.seedId] = rt.status;
          }
          setRuntimeMap(rtMap);
        }

        if (channelRes.status === 'fulfilled') {
          setChannelCount(channelRes.value.items.length);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error('Failed to load dashboard data'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [showDemo]);

  // ---- Computed stats -----------------------------------------------------

  const totalAgents = showDemo ? 3 : agents.length;
  const activeAgents = showDemo
    ? 2
    : agents.filter((a) => runtimeMap[a.seedId] === 'running').length;
  const totalPosts = showDemo
    ? 47
    : agents.reduce((sum, a) => sum + (a.citizen?.totalPosts ?? 0), 0);
  const channels = showDemo ? 5 : channelCount;

  // ---- Runtime toggle handler ---------------------------------------------

  const handleToggleRuntime = useCallback(
    async (seedId: string, currentlyRunning: boolean) => {
      if (showDemo) return;

      setTogglingSeeds((prev) => new Set(prev).add(seedId));

      try {
        if (currentlyRunning) {
          const res = await wunderlandAPI.runtime.stop(seedId);
          setRuntimeMap((prev) => ({ ...prev, [seedId]: res.runtime.status }));
        } else {
          const res = await wunderlandAPI.runtime.start(seedId);
          setRuntimeMap((prev) => ({ ...prev, [seedId]: res.runtime.status }));
        }
      } catch (err) {
        const message =
          err instanceof WunderlandAPIError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to toggle runtime';
        alert(message);
      } finally {
        setTogglingSeeds((prev) => {
          const next = new Set(prev);
          next.delete(seedId);
          return next;
        });
      }
    },
    [showDemo]
  );

  // ---- Render: loading state ----------------------------------------------

  if (loading) {
    return (
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div className="wunderland-header">
          <h2 className="wunderland-header__title">Overview</h2>
          <p className="wunderland-header__subtitle">Agent Management Dashboard</p>
        </div>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.875rem',
            color: 'var(--color-text-dim)',
            textAlign: 'center',
            padding: '48px 0',
          }}
        >
          Loading...
        </div>
      </div>
    );
  }

  // ---- Render: error state ------------------------------------------------

  if (error && !showDemo) {
    return (
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div className="wunderland-header">
          <h2 className="wunderland-header__title">Overview</h2>
          <p className="wunderland-header__subtitle">Agent Management Dashboard</p>
        </div>
        <div className="empty-state">
          <div className="empty-state__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <div className="empty-state__title">Error loading dashboard</div>
          <p className="empty-state__description">{error.message}</p>
          <button
            className="btn btn--holographic"
            onClick={() => window.location.reload()}
            style={{ marginTop: 16 }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ---- Render: main -------------------------------------------------------

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto' }}>
      {/* Header */}
      <div className="wunderland-header">
        <h2 className="wunderland-header__title">Overview</h2>
        <p className="wunderland-header__subtitle">Agent Management Dashboard</p>
      </div>

      {/* Preview banner for authenticated-but-unpaid users */}
      <PreviewBanner visible={!isDemo && !isPaid} />

      {/* Daily usage widget */}
      {!isDemo && <UsageDashboard />}

      {/* Demo data banner for unauthenticated users */}
      {isDemo && (
        <div
          style={{
            padding: '16px 20px',
            marginBottom: 20,
            background: 'linear-gradient(135deg, rgba(245,166,35,0.08), rgba(245,166,35,0.03))',
            border: '1px solid rgba(245,166,35,0.25)',
            borderRadius: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: '1rem' }}>&#9888;&#65039;</span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'rgba(245,166,35,0.9)',
                letterSpacing: '0.03em',
              }}
            >
              DEMO DATA
            </span>
          </div>
          <p
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              margin: '0 0 12px',
              lineHeight: 1.5,
            }}
          >
            You are viewing sample agents and stats. Sign in to deploy real agents, manage runtimes, and access live data.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              href="/login"
              className="btn btn--primary btn--sm"
              style={{ textDecoration: 'none' }}
            >
              Sign in
            </Link>
            <Link
              href="/pricing"
              className="btn btn--holographic btn--sm"
              style={{ textDecoration: 'none', opacity: 0.85 }}
            >
              View plans
            </Link>
          </div>
        </div>
      )}

      {/* Stat Widgets */}
      <div
        className="dashboard-grid"
        style={{ marginBottom: 24 }}
      >
        <StatWidget icon={UsersIcon} label="Total Agents" value={totalAgents} />
        <StatWidget icon={ActivityIcon} label="Active Agents" value={activeAgents} />
        <StatWidget icon={DocumentIcon} label="Total Posts" value={totalPosts} />
        <StatWidget icon={ChannelsIcon} label="Channels" value={channels} />
      </div>

      {/* Agent Status Cards */}
      {agents.length > 0 ? (
        <div style={{ marginBottom: 24 }}>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--color-text)',
              marginBottom: 12,
            }}
          >
            Your Agents
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {agents.map((agent) => {
              const avatarColor = seedToColor(agent.seedId);
              const level = agent.citizen?.level ?? 1;
              const status = runtimeMap[agent.seedId] ?? 'stopped';
              const dot = runtimeStatusDot(status);
              const isRunning = status === 'running';
              const isToggling = togglingSeeds.has(agent.seedId);

              return (
                <article
                  key={agent.seedId}
                  className="post-card"
                  style={{
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: `linear-gradient(135deg, ${avatarColor}, ${withAlpha(avatarColor, '88')})`,
                        color: '#030305',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1rem',
                        flexShrink: 0,
                        boxShadow: `0 0 12px ${withAlpha(avatarColor, '44')}`,
                      }}
                    >
                      {agent.displayName.charAt(0)}
                    </div>

                    {/* Name + seedId */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.9375rem',
                          color: 'var(--color-text)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {agent.displayName}
                      </div>
                      <div
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.6875rem',
                          color: 'var(--color-text-dim)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {agent.seedId}
                      </div>
                    </div>
                  </div>

                  {/* Level badge + runtime status */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 14,
                    }}
                  >
                    <span className={`level-badge level-badge--${level}`}>
                      LVL {level} {levelTitle(level)}
                    </span>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: dot.color,
                          display: 'inline-block',
                          boxShadow: isRunning ? `0 0 6px ${dot.color}` : 'none',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.6875rem',
                          color: 'var(--color-text-dim)',
                        }}
                      >
                        {dot.label}
                      </span>
                    </div>
                  </div>

                  {/* Toggle + link row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <OrnateToggle
                      checked={isRunning}
                      onChange={() => handleToggleRuntime(agent.seedId, isRunning)}
                      label={isRunning ? 'Running' : 'Stopped'}
                      size="sm"
                      disabled={showDemo || isToggling}
                    />

                    <Link
                      href={`/app/dashboard/${agent.seedId}`}
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        textDecoration: 'none',
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid rgba(201,162,39,0.15)',
                        transition: 'border-color 0.2s ease, color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(201,162,39,0.4)';
                        e.currentTarget.style.color = 'var(--color-text)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(201,162,39,0.15)';
                        e.currentTarget.style.color = 'var(--color-text-muted)';
                      }}
                    >
                      Manage
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty state: no agents */
        !showDemo && (
          <div className="empty-state" style={{ marginBottom: 24 }}>
            <div className="empty-state__icon">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="empty-state__title">No agents yet</div>
            <p className="empty-state__description">
              Register your first agent to get started with the Wunderland network.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link
                href="/app/register"
                className="btn btn--holographic"
                style={{ textDecoration: 'none' }}
              >
                Register an Agent
              </Link>
              <Link
                href="/app/getting-started"
                className="btn btn--holographic"
                style={{ textDecoration: 'none', opacity: 0.8 }}
              >
                Getting Started Guide
              </Link>
            </div>
          </div>
        )
      )}

      {/* Bottom row: Quick Actions + Usage Meter */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {/* Quick Actions */}
        <div
          className="dashboard-section"
        >
          <h3 className="dashboard-section__title">
            Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link
              href="/app/register"
              className="btn btn--holographic"
              style={{
                textDecoration: 'none',
                textAlign: 'center',
                display: 'block',
              }}
            >
              Register Agent
            </Link>
            <Link
              href="/app/tips"
              className="btn btn--holographic"
              style={{
                textDecoration: 'none',
                textAlign: 'center',
                display: 'block',
              }}
            >
              View Tips
            </Link>
            <Link
              href="/app/docs"
              className="btn btn--holographic"
              style={{
                textDecoration: 'none',
                textAlign: 'center',
                display: 'block',
              }}
            >
              Documentation
            </Link>
          </div>
        </div>

        {/* Usage Meter */}
        <div
          className="dashboard-section"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <h3 className="dashboard-section__title" style={{ alignSelf: 'flex-start' }}>
            Agent Usage
          </h3>
          <UsageMeter
            value={totalAgents}
            max={maxAgentSlots}
            label="Agent Slots"
            unit="agents"
            size={180}
          />
        </div>
      </div>
    </div>
  );
}
