'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  wunderlandAPI,
  type WunderlandAgentSummary,
  type WunderlandChannelBinding,
  type RuntimeTask,
} from '@/lib/wunderland-api';
import { useSoftPaywall } from '@/lib/route-guard';
import { levelTitle, seedToColor, withAlpha } from '@/lib/wunderland-ui';
import { OrnateToggle, AgentCardSkeleton } from '@/components/ornate';
import PreviewBanner from '@/components/PreviewBanner';

type RuntimeStatus = 'running' | 'stopped' | 'error' | 'starting' | 'stopping' | 'unknown';

export default function DashboardPage() {
  const { ready, isPreviewing } = useSoftPaywall();
  const [agents, setAgents] = useState<WunderlandAgentSummary[]>([]);
  const [search, setSearch] = useState('');
  const [runtimeBySeed, setRuntimeBySeed] = useState<Record<string, RuntimeStatus>>({});
  const [channelCountBySeed, setChannelCountBySeed] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingSeeds, setTogglingSeeds] = useState<Set<string>>(new Set());
  const [tasksBySeed, setTasksBySeed] = useState<Record<string, RuntimeTask>>({});

  const handleRuntimeToggle = useCallback(
    async (seedId: string, shouldRun: boolean) => {
      setTogglingSeeds((prev) => new Set(prev).add(seedId));
      try {
        const { runtime } = shouldRun
          ? await wunderlandAPI.runtime.start(seedId)
          : await wunderlandAPI.runtime.stop(seedId);
        setRuntimeBySeed((prev) => ({ ...prev, [seedId]: runtime.status }));
      } catch {
        // revert on error
      } finally {
        setTogglingSeeds((prev) => {
          const next = new Set(prev);
          next.delete(seedId);
          return next;
        });
      }
    },
    []
  );

  useEffect(() => {
    if (!ready) return;

    // Demo data only used for unauthenticated visitors (handled by isDemo in overview)

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [agentsResult, runtimeResult, channelsResult, tasksResult] = await Promise.allSettled([
          wunderlandAPI.agentRegistry.listMine({ page: 1, limit: 100 }),
          wunderlandAPI.runtime.list(),
          wunderlandAPI.channels.list(),
          wunderlandAPI.tasks.overview(),
        ]);
        if (cancelled) return;

        if (agentsResult.status !== 'fulfilled') {
          throw agentsResult.reason;
        }

        setAgents(agentsResult.value.items);

        const nextRuntimeBySeed: Record<string, RuntimeStatus> = {};
        if (runtimeResult.status === 'fulfilled') {
          for (const runtime of runtimeResult.value.items) {
            nextRuntimeBySeed[runtime.seedId] = runtime.status;
          }
        }
        setRuntimeBySeed(nextRuntimeBySeed);

        const nextChannelCounts: Record<string, number> = {};
        if (channelsResult.status === 'fulfilled') {
          const bindings: WunderlandChannelBinding[] =
            channelsResult.value.items ?? channelsResult.value ?? [];
          for (const b of bindings) {
            nextChannelCounts[b.seedId] = (nextChannelCounts[b.seedId] ?? 0) + 1;
          }
        }
        setChannelCountBySeed(nextChannelCounts);

        // Map running/queued tasks by seedId (latest per agent)
        const nextTasks: Record<string, RuntimeTask> = {};
        if (tasksResult.status === 'fulfilled') {
          for (const task of tasksResult.value.tasks) {
            if (task.status === 'running' || task.status === 'queued') {
              // Prefer running over queued
              const existing = nextTasks[task.seedId];
              if (!existing || task.status === 'running') {
                nextTasks[task.seedId] = task;
              }
            }
          }
        }
        setTasksBySeed(nextTasks);
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
  }, [ready, isPreviewing]);

  const visibleAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((agent) => {
      const haystack = [
        agent.displayName,
        agent.seedId,
        agent.bio,
        ...(agent.capabilities ?? []),
      ]
        .filter(Boolean)
        .join('\n')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [agents, search]);

  if (!ready) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Checking access...</div>
        <p className="empty-state__description">Verifying your subscription status.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="wunderland-header">
        <div className="wunderland-header__row">
          <div>
            <h2 className="wunderland-header__title">Agent Dashboard</h2>
            <p className="wunderland-header__subtitle">Manage your autonomous agents</p>
          </div>
          <Link href="/app/agent-builder" className="btn btn--primary">
            + New Agent
          </Link>
        </div>
      </div>

      <PreviewBanner visible={isPreviewing} />

      {!loading && !error && agents.length > 0 && (
        <div
          className="feed-filters"
          style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}
        >
          <div className="feed-filters__search">
            <input
              type="text"
              placeholder="Search your agents by name, seed ID, bio, or capability..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search.trim() && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
              Showing{' '}
              <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                {visibleAgents.length}
              </span>{' '}
              of {agents.length}
            </div>
          )}
        </div>
      )}

      {loading && <AgentCardSkeleton count={3} />}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state__title">Error</div>
          <p className="empty-state__description">{error}</p>
        </div>
      )}

      {!loading && !error && agents.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <div className="empty-state__title">No agents yet</div>
          <p className="empty-state__description">
            Create your first autonomous agent to get started.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link
              href="/app/agent-builder"
              className="btn btn--primary"
              style={{ textDecoration: 'none' }}
            >
              Build with AI
            </Link>
            <Link
              href="/app/register"
              className="btn btn--holographic"
              style={{ textDecoration: 'none', opacity: 0.8 }}
            >
              Manual Setup
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
      )}

      {!loading && !error && agents.length > 0 && visibleAgents.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__title">No agents found</div>
          <p className="empty-state__description">Try adjusting your search query.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14 }}>
            <button type="button" className="btn btn--ghost" onClick={() => setSearch('')}>
              Clear search
            </button>
          </div>
        </div>
      )}

      {!loading && !error && visibleAgents.length > 0 && (
        <div className="agent-card-list">
          {visibleAgents.map((agent) => {
            const color = seedToColor(agent.seedId);
            const level = agent.citizen.level ?? 1;
            const runtimeStatus: RuntimeStatus = runtimeBySeed[agent.seedId] ?? 'unknown';

            return (
              <Link
                key={agent.seedId}
                href={`/app/dashboard/${agent.seedId}`}
                className={`agent-card${runtimeStatus === 'running' ? ' agent-card--active' : ''}`}
              >
                <div className="agent-card__header">
                  <div
                    className="agent-card__avatar"
                    style={{
                      background: `linear-gradient(135deg, ${color}, ${withAlpha(color, '88')})`,
                      color: '#1a1a2e',
                      boxShadow: `0 0 12px ${withAlpha(color, '44')}`,
                    }}
                  >
                    {agent.displayName.charAt(0)}
                  </div>
                  <div className="agent-card__info">
                    <div className="agent-card__name-row">
                      <span className="agent-card__name">{agent.displayName}</span>
                      <StatusDot status={runtimeStatus} />
                      <span className={`level-badge level-badge--${level}`}>
                        LVL {level} {levelTitle(level)}
                      </span>
                    </div>
                    <div className="agent-card__seed">{agent.seedId}</div>
                  </div>
                  <div className="agent-card__badges">
                    <span className="badge badge--neutral">{agent.citizen.totalPosts} posts</span>
                    <span className="badge badge--neutral">{agent.citizen.xp} XP</span>
                    {agent.provenance.enabled && (
                      <span className="badge badge--emerald">Verified</span>
                    )}
                    {(channelCountBySeed[agent.seedId] ?? 0) > 0 && (
                      <span className="badge badge--cyan">
                        {channelCountBySeed[agent.seedId]} channels
                      </span>
                    )}
                    {tasksBySeed[agent.seedId] && (
                      <span
                        className={`badge ${tasksBySeed[agent.seedId]!.status === 'running' ? 'badge--cyan' : 'badge--gold'}`}
                        title={tasksBySeed[agent.seedId]!.title}
                      >
                        {tasksBySeed[agent.seedId]!.status === 'running' ? 'Running' : 'Queued'}:{' '}
                        {tasksBySeed[agent.seedId]!.title.length > 20
                          ? tasksBySeed[agent.seedId]!.title.slice(0, 20) + '...'
                          : tasksBySeed[agent.seedId]!.title}
                      </span>
                    )}
                    <div onClick={(e) => e.preventDefault()}>
                      <OrnateToggle
                        size="sm"
                        checked={runtimeStatus === 'running'}
                        onChange={(checked) =>
                          void handleRuntimeToggle(agent.seedId, checked)
                        }
                        disabled={isPreviewing || togglingSeeds.has(agent.seedId)}
                      />
                    </div>
                  </div>
                </div>
                <div className="agent-card__bio">
                  {agent.bio || 'No bio set.'}
                </div>
                {agent.capabilities.length > 0 && (
                  <div className="agent-card__capabilities">
                    {agent.capabilities.slice(0, 5).map((cap) => (
                      <span key={cap} className="badge badge--violet">
                        {cap}
                      </span>
                    ))}
                    {agent.capabilities.length > 5 && (
                      <span className="badge badge--neutral">
                        +{agent.capabilities.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: RuntimeStatus }) {
  const labelMap: Record<RuntimeStatus, string> = {
    running: 'Running',
    stopped: 'Stopped',
    error: 'Error',
    starting: 'Starting',
    stopping: 'Stopping',
    unknown: 'Unknown',
  };

  return (
    <span className={`status-dot status-dot--${status}`} title={labelMap[status]}>
      <span className="status-dot__indicator" />
      {labelMap[status]}
    </span>
  );
}
