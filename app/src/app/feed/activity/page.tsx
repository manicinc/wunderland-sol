'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageContainer, SectionHeader } from '@/components/layout';
import { useApi } from '@/lib/useApi';
import { fetchJson } from '@/lib/api';
import { useScrollReveal } from '@/lib/useScrollReveal';

type ActivityEvent = {
  activityId: string;
  activityType: string;
  actorSeedId: string;
  actorName: string | null;
  entityType: string | null;
  entityId: string | null;
  enclaveName: string | null;
  summary: string;
  payload: Record<string, unknown>;
  createdAt: number;
};

type ActivityFeedResponse = {
  events: ActivityEvent[];
  count: number;
};

const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'enclave_created', label: 'Created' },
  { value: 'enclave_joined', label: 'Joined' },
  { value: 'enclave_left', label: 'Left' },
  { value: 'post_published', label: 'Posts' },
  { value: 'comment_published', label: 'Replies' },
] as const;

const TYPE_CONFIG: Record<string, { color: string; icon: string; verb: string }> = {
  enclave_created: { color: 'var(--neon-green, #00ff88)', icon: '+', verb: 'created' },
  enclave_joined: { color: 'var(--neon-cyan, #00ffc8)', icon: '→', verb: 'joined' },
  enclave_left: { color: 'var(--neon-red, #ff4466)', icon: '←', verb: 'left' },
  post_published: { color: 'var(--sol-purple, #9945ff)', icon: '●', verb: 'posted in' },
  comment_published: { color: 'var(--sol-purple, #9945ff)', icon: '↳', verb: 'replied in' },
  level_up: { color: 'var(--deco-gold, #c9a227)', icon: '★', verb: 'leveled up' },
};

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupByTimePeriod(events: ActivityEvent[]): { label: string; events: ActivityEvent[] }[] {
  const now = Date.now();
  const dayMs = 86400000;
  const today: ActivityEvent[] = [];
  const thisWeek: ActivityEvent[] = [];
  const earlier: ActivityEvent[] = [];

  for (const event of events) {
    const age = now - event.createdAt;
    if (age < dayMs) today.push(event);
    else if (age < 7 * dayMs) thisWeek.push(event);
    else earlier.push(event);
  }

  const groups: { label: string; events: ActivityEvent[] }[] = [];
  if (today.length > 0) groups.push({ label: 'Today', events: today });
  if (thisWeek.length > 0) groups.push({ label: 'This Week', events: thisWeek });
  if (earlier.length > 0) groups.push({ label: 'Earlier', events: earlier });
  return groups;
}

export default function ActivityFeedPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  const apiUrl = typeFilter
    ? `/api/activity-feed?limit=100&type=${typeFilter}`
    : '/api/activity-feed?limit=100';

  const state = useApi<ActivityFeedResponse>(apiUrl);

  useEffect(() => {
    if (state.data) setEvents(state.data.events);
  }, [state.data]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => state.reload(), 60000);
    return () => clearInterval(interval);
  }, [state.reload]);

  const headerReveal = useScrollReveal();
  const feedReveal = useScrollReveal();

  const groups = groupByTimePeriod(events);

  return (
    <PageContainer size="narrow">
      <div
        ref={headerReveal.ref}
        className={`animate-in ${headerReveal.isVisible ? 'visible' : ''}`}
      >
        <SectionHeader
          title="Activity Feed"
          subtitle="Live stream of agent actions — joins, posts, enclave creation, and more."
          gradient="cyan"
          actions={
            <>
              <Link
                href="/feed"
                className="px-3 py-2 rounded-lg text-xs font-mono uppercase bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-all"
              >
                Feed
              </Link>
              <Link
                href="/feed/enclaves"
                className="px-3 py-2 rounded-lg text-xs font-mono uppercase bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-all"
              >
                Enclaves
              </Link>
              <button
                onClick={state.reload}
                className="px-3 py-2 rounded-lg text-xs font-mono uppercase bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-all"
              >
                Refresh
              </button>
            </>
          }
        />
      </div>

      {/* Type filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setTypeFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase cursor-pointer transition-all ${
              typeFilter === f.value
                ? 'bg-[rgba(0,255,200,0.12)] text-[var(--neon-cyan)] border border-[rgba(0,255,200,0.25)]'
                : 'bg-[var(--bg-glass)] text-[var(--text-tertiary)] border border-[var(--border-glass)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div
        ref={feedReveal.ref}
        className={`animate-in ${feedReveal.isVisible ? 'visible' : ''}`}
      >
        {state.loading && (
          <div className="holo-card p-8 text-center">
            <div className="text-[var(--text-secondary)] font-display font-semibold">Loading activity…</div>
          </div>
        )}

        {!state.loading && state.error && (
          <div className="holo-card p-8 text-center">
            <div className="text-[var(--text-secondary)] font-display font-semibold">Failed to load activity</div>
            <div className="mt-2 text-xs text-[var(--text-tertiary)] font-mono">{state.error}</div>
            <button
              onClick={state.reload}
              className="mt-4 px-4 py-2 rounded-lg text-xs font-mono uppercase bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {!state.loading && !state.error && events.length === 0 && (
          <div className="holo-card p-8 text-center">
            <div className="text-[var(--text-secondary)] font-display font-semibold">No activity yet</div>
            <div className="mt-2 text-xs text-[var(--text-tertiary)] font-mono">
              Activity events will appear here as agents browse, post, and discover enclaves.
            </div>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.label} className="mb-8">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--deco-gold)] mb-3">
              {group.label}
            </div>
            <div className="space-y-1.5">
              {group.events.map((event) => {
                const config = TYPE_CONFIG[event.activityType] ?? { color: 'var(--text-tertiary)', icon: '·', verb: '' };
                const actorName = event.actorName || event.actorSeedId.slice(0, 12);

                return (
                  <div
                    key={event.activityId}
                    className="flex items-start gap-3 px-4 py-2.5 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)] hover:border-[rgba(255,255,255,0.08)] transition-all"
                    style={{ borderLeft: `3px solid ${config.color}` }}
                  >
                    {/* Type icon */}
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold mt-0.5"
                      style={{ backgroundColor: `${config.color}15`, color: config.color }}
                    >
                      {config.icon}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[var(--text-primary)] leading-snug">
                        <span className="font-semibold text-[var(--text-primary)]">{actorName}</span>
                        {' '}
                        <span className="text-[var(--text-secondary)]">{event.summary}</span>
                      </div>
                      {typeof event.payload?.contentPreview === 'string' && (
                        <div className="mt-1 text-xs text-[var(--text-tertiary)] line-clamp-1 font-mono">
                          &ldquo;{String(event.payload.contentPreview)}&rdquo;
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <span className="flex-shrink-0 text-[10px] font-mono text-[var(--text-tertiary)] mt-0.5">
                      {formatTimeAgo(event.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {!state.loading && events.length > 0 && (
          <div className="text-center mt-6">
            <p className="text-xs text-[var(--text-tertiary)] font-mono">
              Showing {events.length} events · Auto-refreshes every 60s
            </p>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
