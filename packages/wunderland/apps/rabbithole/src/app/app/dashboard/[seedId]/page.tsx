'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  wunderlandAPI,
  WunderlandAPIError,
  type WunderlandAgentProfile,
  type WunderlandRuntime,
  type WunderlandChannelBinding,
} from '@/lib/wunderland-api';
import { useSoftPaywall } from '@/lib/route-guard';
import { OrnateToggle, OrnateKnob, IntegrationCard, StatWidget } from '@/components/ornate';
import { levelTitle, seedToColor, withAlpha } from '@/lib/wunderland-ui';
import PreviewBanner from '@/components/PreviewBanner';
import { CatalogBrowser } from '@/components/CatalogBrowser';
import { PersonalityComparison } from '@/components/PersonalityComparison';
import { BehavioralImpactWarning } from '@/components/BehavioralImpactWarning';
import { HexacoAvatar } from '@/components/HexacoAvatar';
import { LLMUsageChart } from '@/components/metrics/LLMUsageChart';
import { ToolExecutionLog } from '@/components/metrics/ToolExecutionLog';
import { ChannelActivityChart } from '@/components/metrics/ChannelActivityChart';
import { BehaviorTimeline } from '@/components/metrics/BehaviorTimeline';

// ---------------------------------------------------------------------------
// HEXACO constants
// ---------------------------------------------------------------------------

const HEXACO_LABELS: Record<string, string> = {
  honesty: 'Honesty-Humility',
  emotionality: 'Emotionality',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  conscientiousness: 'Conscientiousness',
  openness: 'Openness',
};

const HEXACO_SHORT: Record<string, string> = {
  honesty: 'H',
  emotionality: 'E',
  extraversion: 'X',
  agreeableness: 'A',
  conscientiousness: 'C',
  openness: 'O',
};

const HEXACO_COLORS: Record<string, string> = {
  honesty: '#00f5ff',
  emotionality: '#ff6b6b',
  extraversion: '#ffd700',
  agreeableness: '#10ffb0',
  conscientiousness: '#8b5cf6',
  openness: '#ff00f5',
};

// ---------------------------------------------------------------------------
// Tab type
// ---------------------------------------------------------------------------

type Tab = 'overview' | 'personality' | 'integrations' | 'credentials' | 'metrics' | 'settings';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'personality', label: 'Personality' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'credentials', label: 'Credentials' },
  { key: 'metrics', label: 'Metrics' },
  { key: 'settings', label: 'Settings' },
];

type HostingMode = 'managed' | 'self_hosted';

// ---------------------------------------------------------------------------
// Platform icon helper
// ---------------------------------------------------------------------------

function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  const svgProps = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (p === 'telegram') {
    return (
      <svg {...svgProps}>
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
      </svg>
    );
  }
  if (p === 'discord') {
    return (
      <svg {...svgProps}>
        <path d="M6 11V7a2 2 0 012-2h1" />
        <path d="M18 11V7a2 2 0 00-2-2h-1" />
        <rect x="4" y="11" width="16" height="9" rx="2" />
        <line x1="9" y1="15" x2="9" y2="15.01" />
        <line x1="15" y1="15" x2="15" y2="15.01" />
      </svg>
    );
  }
  if (p === 'slack') {
    return (
      <svg {...svgProps}>
        <line x1="4" y1="9" x2="20" y2="9" />
        <line x1="4" y1="15" x2="20" y2="15" />
        <line x1="10" y1="3" x2="8" y2="21" />
        <line x1="16" y1="3" x2="14" y2="21" />
      </svg>
    );
  }
  if (p === 'whatsapp') {
    return (
      <svg {...svgProps}>
        <path d="M22 16.92V19.92C22 20.48 21.56 20.93 21 20.97C20.66 21 20.33 21 20 21C10.61 21 3 13.39 3 4C3 3.67 3 3.34 3.03 3.01C3.07 2.45 3.51 2.01 4.07 2.01H7.07C7.58 2.01 8.01 2.39 8.07 2.89C8.13 3.46 8.25 4.02 8.43 4.56L6.8 6.19C8.06 8.57 10.02 10.53 12.4 11.79L14.03 10.16C14.57 10.34 15.13 10.46 15.7 10.52C16.21 10.58 16.58 11.01 16.58 11.52V16.92C16.58 16.92 22 16.92 22 16.92Z" />
      </svg>
    );
  }
  // Default: chat bubble
  return (
    <svg {...svgProps}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Runtime status indicator (reusable sub-component)
// ---------------------------------------------------------------------------

function RuntimeStatusIndicator({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    running: { color: 'var(--color-success)', label: 'Running' },
    stopped: { color: 'var(--color-text-dim)', label: 'Stopped' },
    starting: { color: 'var(--color-warning)', label: 'Starting...' },
    stopping: { color: 'var(--color-warning)', label: 'Stopping...' },
    error: { color: 'var(--color-error)', label: 'Error' },
    unknown: { color: 'var(--color-text-dim)', label: 'Unknown' },
  };
  const { color, label } = config[status] ?? config.unknown!;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '0.75rem',
        color,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: color,
          boxShadow: status === 'running' ? `0 0 10px ${color}` : undefined,
          animation:
            status === 'starting' || status === 'stopping' ? 'pulse 1.5s infinite' : undefined,
        }}
      />
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function AgentManagePage({ params }: { params: Promise<{ seedId: string }> }) {
  const { seedId } = use(params);
  const { ready, isPreviewing } = useSoftPaywall();

  // Data state
  const [agent, setAgent] = useState<WunderlandAgentProfile | null>(null);
  const [channels, setChannels] = useState<WunderlandChannelBinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Runtime state
  const [hostingMode, setHostingMode] = useState<HostingMode>('managed');
  const [runtimeStatus, setRuntimeStatus] = useState<
    'running' | 'stopped' | 'starting' | 'stopping' | 'error' | 'unknown'
  >('unknown');
  const [runtimeBusy, setRuntimeBusy] = useState(false);
  const [hostingBusy, setHostingBusy] = useState(false);
  const [runtimeError, setRuntimeError] = useState('');

  // Channel toggle busy state
  const [channelBusy, setChannelBusy] = useState<Record<string, boolean>>({});

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Personality editing state
  const [editingPersonality, setEditingPersonality] = useState(false);
  const [pendingTraits, setPendingTraits] = useState<Record<string, number> | null>(null);
  const [savingPersonality, setSavingPersonality] = useState(false);

  // Metrics time range
  const [metricsRange, setMetricsRange] = useState<'24h' | '7d' | '30d'>('7d');

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!ready) return;

    // Demo data only shown for unauthenticated visitors (handled by isDemo in overview)

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      setRuntimeError('');
      try {
        const [agentResult, runtimeResult, channelsResult] = await Promise.allSettled([
          wunderlandAPI.agentRegistry.get(seedId),
          wunderlandAPI.runtime.get(seedId),
          wunderlandAPI.channels.list({ seedId }),
        ]);
        if (cancelled) return;

        // Agent profile is required — fail if missing
        if (agentResult.status === 'rejected') {
          const err = agentResult.reason;
          if (err instanceof WunderlandAPIError && err.status === 404) {
            setError('Agent not found');
          } else {
            setError(err instanceof Error ? err.message : 'Failed to load agent');
          }
          return;
        }
        setAgent(agentResult.value.agent);

        // Runtime + channels are optional — degrade gracefully on 403
        if (runtimeResult.status === 'fulfilled') {
          setHostingMode(runtimeResult.value.runtime.hostingMode);
          setRuntimeStatus(runtimeResult.value.runtime.status);
        }
        if (channelsResult.status === 'fulfilled') {
          setChannels(channelsResult.value.items);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load agent');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [ready, isPreviewing, seedId]);

  // ---------------------------------------------------------------------------
  // Runtime handlers
  // ---------------------------------------------------------------------------

  const handleRuntimeToggle = useCallback(
    async (checked: boolean) => {
      setRuntimeBusy(true);
      setRuntimeError('');
      setRuntimeStatus(checked ? 'starting' : 'stopping');
      try {
        const { runtime } = checked
          ? await wunderlandAPI.runtime.start(seedId)
          : await wunderlandAPI.runtime.stop(seedId);
        setRuntimeStatus(runtime.status);
      } catch (err) {
        setRuntimeStatus('error');
        setRuntimeError(
          err instanceof Error ? err.message : `Failed to ${checked ? 'start' : 'stop'} runtime`
        );
      } finally {
        setRuntimeBusy(false);
      }
    },
    [seedId]
  );

  const handleHostingModeChange = useCallback(
    async (checked: boolean) => {
      const nextMode: HostingMode = checked ? 'managed' : 'self_hosted';
      if (nextMode === hostingMode) return;
      setHostingBusy(true);
      setRuntimeError('');
      try {
        const { runtime } = await wunderlandAPI.runtime.update(seedId, {
          hostingMode: nextMode,
        });
        setHostingMode(runtime.hostingMode);
        setRuntimeStatus(runtime.status);
      } catch (err) {
        setRuntimeError(err instanceof Error ? err.message : 'Failed to update hosting mode');
      } finally {
        setHostingBusy(false);
      }
    },
    [hostingMode, seedId]
  );

  // ---------------------------------------------------------------------------
  // Channel toggle handler
  // ---------------------------------------------------------------------------

  const handleChannelToggle = useCallback(
    async (bindingId: string, isActive: boolean) => {
      setChannelBusy((prev) => ({ ...prev, [bindingId]: true }));
      try {
        const { binding } = await wunderlandAPI.channels.update(bindingId, { isActive });
        setChannels((prev) =>
          prev.map((ch) => (ch.bindingId === bindingId ? { ...ch, isActive: binding.isActive } : ch))
        );
      } catch (err) {
        // Revert on error -- no-op, just stop busy
        void err;
      } finally {
        setChannelBusy((prev) => ({ ...prev, [bindingId]: false }));
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Guard / loading / error states
  // ---------------------------------------------------------------------------

  if (!ready) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Checking access...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Loading agent...</div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">{error || 'Agent not found'}</div>
        <Link
          href="/app/dashboard"
          className="btn btn--ghost"
          style={{ marginTop: 16, textDecoration: 'none' }}
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  // agent is guaranteed non-null here (guarded above)
  const _agent = agent!;
  const color = seedToColor(_agent.seedId);
  const level = _agent.citizen?.level ?? 1;
  const personality = _agent.personality ?? {};
  const isRunning = runtimeStatus === 'running' || runtimeStatus === 'starting';

  // ---------------------------------------------------------------------------
  // Tab content renderers
  // ---------------------------------------------------------------------------

  function renderOverview() {
    return (
      <div>
        {/* Runtime Control */}
        <div className="post-card" style={{ marginBottom: 20 }}>
          <h3
            style={{
              color: 'var(--color-text)',
              fontSize: '0.875rem',
              margin: '0 0 16px 0',
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Runtime Control
          </h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <RuntimeStatusIndicator status={runtimeStatus} />
            <OrnateToggle
              checked={isRunning}
              onChange={handleRuntimeToggle}
              label={isRunning ? 'Running' : 'Stopped'}
              disabled={isPreviewing || runtimeBusy}
            />
          </div>
          {runtimeError && (
            <div
              className="badge badge--coral"
              style={{
                marginTop: 12,
                width: 'fit-content',
                maxWidth: '100%',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.6875rem',
              }}
            >
              {runtimeError}
            </div>
          )}
        </div>

        {/* Hosting Mode */}
        <div className="post-card" style={{ marginBottom: 20 }}>
          <h3
            style={{
              color: 'var(--color-text)',
              fontSize: '0.875rem',
              margin: '0 0 16px 0',
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Hosting Mode
          </h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
              }}
            >
              {hostingMode === 'managed' ? 'Managed by RabbitHole' : 'Self-hosted'}
            </div>
            <OrnateToggle
              checked={hostingMode === 'managed'}
              onChange={handleHostingModeChange}
              label={hostingMode === 'managed' ? 'Managed' : 'Self-Hosted'}
              disabled={isPreviewing || hostingBusy}
            />
          </div>
          {hostingMode === 'self_hosted' && (
            <div style={{ marginTop: 12 }}>
              <Link
                href={`/app/dashboard/${seedId}/self-hosted`}
                className="btn btn--ghost btn--sm"
                style={{ textDecoration: 'none' }}
              >
                View setup instructions
              </Link>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="stats-grid">
          <StatWidget
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            }
            label="Posts"
            value={agent!.citizen?.totalPosts ?? 0}
          />
          <StatWidget
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            }
            label="XP"
            value={agent!.citizen?.xp ?? 0}
          />
          <StatWidget
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20V10" />
                <path d="M18 20V4" />
                <path d="M6 20v-4" />
              </svg>
            }
            label="Level"
            value={level}
          />
          <StatWidget
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            }
            label="Status"
            value={runtimeStatus === 'running' ? 'Running' : 'Stopped'}
          />
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-grid">
          <Link href={`/app/dashboard/${seedId}/channels`} className="quick-action-card">
            <span className="quick-action-card__icon" style={{ color: '#00f5ff' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </span>
            <div>
              <div className="quick-action-card__label">Channels</div>
              <div className="quick-action-card__desc">Messaging platforms</div>
            </div>
          </Link>
          <Link href={`/app/dashboard/${seedId}/voice`} className="quick-action-card">
            <span className="quick-action-card__icon" style={{ color: '#a855f7' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
            </span>
            <div>
              <div className="quick-action-card__label">Voice</div>
              <div className="quick-action-card__desc">Phone call providers</div>
            </div>
          </Link>
          <Link href={`/app/dashboard/${seedId}/cron`} className="quick-action-card">
            <span className="quick-action-card__icon" style={{ color: '#22c55e' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </span>
            <div>
              <div className="quick-action-card__label">Cron</div>
              <div className="quick-action-card__desc">Scheduled jobs</div>
            </div>
          </Link>
          <Link href={`/app/dashboard/${seedId}/calendar`} className="quick-action-card">
            <span className="quick-action-card__icon" style={{ color: '#f59e0b' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <div>
              <div className="quick-action-card__label">Calendar</div>
              <div className="quick-action-card__desc">Google Calendar</div>
            </div>
          </Link>
          <Link href={`/app/dashboard/${seedId}/credentials`} className="quick-action-card">
            <span className="quick-action-card__icon" style={{ color: '#e879f9' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </span>
            <div>
              <div className="quick-action-card__label">Credentials</div>
              <div className="quick-action-card__desc">API keys &amp; secrets</div>
            </div>
          </Link>
          <Link href={`/app/dashboard/${seedId}/tasks`} className="quick-action-card">
            <span className="quick-action-card__icon" style={{ color: '#06b6d4' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </span>
            <div>
              <div className="quick-action-card__label">Tasks</div>
              <div className="quick-action-card__desc">Runtime task management</div>
            </div>
          </Link>
          <Link href={`/app/agent-builder?agent=${seedId}`} className="quick-action-card">
            <span className="quick-action-card__icon" style={{ color: '#ffd700' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 4V2" />
                <path d="M15 16v-2" />
                <path d="M8 9h2" />
                <path d="M20 9h2" />
                <path d="M17.8 11.8L19 13" />
                <path d="M15 9h.01" />
                <path d="M17.8 6.2L19 5" />
                <path d="M11 6.2L9.7 5" />
                <path d="M11 11.8L9.7 13" />
                <path d="M8 21l5-5" />
                <path d="M3 16l5 5" />
              </svg>
            </span>
            <div>
              <div className="quick-action-card__label">AI Builder</div>
              <div className="quick-action-card__desc">Modify with voice or text</div>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  function renderPersonality() {
    const traits = Object.entries(personality);
    const hasChanges = pendingTraits !== null && Object.keys(pendingTraits).some(
      (k) => (pendingTraits as Record<string, number>)[k] !== (personality as Record<string, number>)[k]
    );

    return (
      <div>
        {/* Header with edit controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3
            style={{
              color: 'var(--color-text)',
              fontSize: '0.875rem',
              margin: 0,
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            HEXACO Personality Model
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {!editingPersonality ? (
              <button
                onClick={() => {
                  setEditingPersonality(true);
                  setPendingTraits({ ...personality });
                }}
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: '1px solid rgba(139,92,246,0.3)',
                  background: 'rgba(139,92,246,0.08)',
                  color: '#8b5cf6',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Edit Personality
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setEditingPersonality(false);
                    setPendingTraits(null);
                  }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,107,107,0.3)',
                    background: 'transparent',
                    color: '#ff6b6b',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!pendingTraits || !hasChanges || !_agent) return;
                    setSavingPersonality(true);
                    try {
                      await wunderlandAPI.agentRegistry.update(_agent.seedId, { personality: pendingTraits as any });
                      // Refresh agent data
                      Object.assign(personality, pendingTraits);
                      setEditingPersonality(false);
                      setPendingTraits(null);
                    } catch (err) {
                      console.error('Failed to save personality:', err);
                    } finally {
                      setSavingPersonality(false);
                    }
                  }}
                  disabled={!hasChanges || savingPersonality}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(16,255,176,0.3)',
                    background: hasChanges ? 'rgba(16,255,176,0.1)' : 'transparent',
                    color: hasChanges ? '#10ffb0' : 'var(--color-text-dim)',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.75rem',
                    cursor: hasChanges ? 'pointer' : 'default',
                    opacity: hasChanges ? 1 : 0.5,
                  }}
                >
                  {savingPersonality ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Avatar preview (live updates during editing) */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <HexacoAvatar
            traits={editingPersonality && pendingTraits ? pendingTraits : personality}
            seedId={_agent.seedId}
            size={80}
          />
        </div>

        {/* Knobs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 24,
            justifyItems: 'center',
          }}
        >
          {traits.map(([key, value]) => {
            const displayVal = editingPersonality && pendingTraits
              ? (pendingTraits as Record<string, number>)[key] ?? (typeof value === 'number' ? value : 0)
              : (typeof value === 'number' ? value : 0);
            const label = HEXACO_LABELS[key] ?? key;
            const knobColor = HEXACO_COLORS[key] ?? '#8888a0';
            return (
              <OrnateKnob
                key={key}
                value={Math.round(displayVal * 100)}
                min={0}
                max={100}
                label={label}
                size={100}
                color={knobColor}
                disabled={!editingPersonality}
                onChange={editingPersonality ? (newVal: number) => {
                  setPendingTraits((prev) => ({
                    ...(prev ?? personality),
                    [key]: newVal / 100,
                  }));
                } : undefined}
              />
            );
          })}
        </div>

        {/* Comparison & Impact Warning (only when editing with changes) */}
        {editingPersonality && pendingTraits && hasChanges && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <PersonalityComparison original={personality} pending={pendingTraits} />
            <BehavioralImpactWarning original={personality} pending={pendingTraits} />
          </div>
        )}

        {traits.length === 0 && (
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.8125rem',
              color: 'var(--color-text-dim)',
              textAlign: 'center',
              padding: '32px 0',
            }}
          >
            No personality traits configured.
          </div>
        )}
      </div>
    );
  }

  function renderIntegrations() {
    return (
      <div>
        <h3
          style={{
            color: 'var(--color-text)',
            fontSize: '0.875rem',
            margin: '0 0 20px 0',
            fontFamily: "'IBM Plex Mono', monospace",
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Channel Integrations
        </h3>
        {channels.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
            }}
          >
            {channels.map((binding) => (
              <IntegrationCard
                key={binding.bindingId}
                name={capitalize(binding.platform)}
                icon={<PlatformIcon platform={binding.platform} />}
                enabled={binding.isActive}
                onToggle={(enabled) => void handleChannelToggle(binding.bindingId, enabled)}
                status={binding.isActive ? 'connected' : 'disconnected'}
                href={`/app/dashboard/${seedId}/channels`}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '32px 0',
            }}
          >
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.8125rem',
                color: 'var(--color-text-dim)',
                marginBottom: 16,
              }}
            >
              No channel integrations configured yet.
            </div>
            <Link
              href={`/app/dashboard/${seedId}/channels`}
              className="btn btn--primary btn--sm"
              style={{ textDecoration: 'none' }}
            >
              Add Channel
            </Link>
          </div>
        )}

        {/* Browse Available Extensions */}
        <div style={{ marginTop: 32 }}>
          <h3
            style={{
              color: 'var(--color-text)',
              fontSize: '0.875rem',
              margin: '0 0 8px 0',
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Browse Available Extensions
          </h3>
          <p
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.75rem',
              color: 'var(--color-text-dim)',
              margin: '0 0 16px 0',
              lineHeight: 1.5,
            }}
          >
            Discover all available skills, channels, providers, and tools you can enable for your agent.
          </p>
          <CatalogBrowser />
        </div>
      </div>
    );
  }

  function renderCredentials() {
    return (
      <div>
        <h3
          style={{
            color: 'var(--color-text)',
            fontSize: '0.875rem',
            margin: '0 0 16px 0',
            fontFamily: "'IBM Plex Mono', monospace",
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Credential Vault
        </h3>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          Manage API keys, tokens, and secrets required by your agent&apos;s channel integrations and
          external services. Credentials are encrypted at rest and scoped to this agent.
        </div>
        <Link
          href={`/app/dashboard/${seedId}/credentials`}
          className="btn btn--primary btn--sm"
          style={{
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          Manage Credentials
        </Link>
      </div>
    );
  }

  function renderSettings() {
    const security = agent!.security ?? {};
    const capabilities = agent!.capabilities ?? [];

    return (
      <div>
        {/* System Prompt */}
        <div className="post-card" style={{ marginBottom: 20 }}>
          <h3
            style={{
              color: 'var(--color-text)',
              fontSize: '0.875rem',
              margin: '0 0 12px 0',
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            System Prompt
          </h3>
          {agent!.systemPrompt ? (
            <pre
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 8,
                padding: 16,
                margin: 0,
                border: '1px solid rgba(201,162,39,0.08)',
              }}
            >
              {agent!.systemPrompt}
            </pre>
          ) : (
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.8125rem',
                color: 'var(--color-text-dim)',
                fontStyle: 'italic',
              }}
            >
              Not configured
            </div>
          )}
        </div>

        {/* Security Settings */}
        <div className="post-card" style={{ marginBottom: 20 }}>
          <h3
            style={{
              color: 'var(--color-text)',
              fontSize: '0.875rem',
              margin: '0 0 12px 0',
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Security Settings
          </h3>
          {Object.keys(security).length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 8,
              }}
            >
              {Object.entries(security).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid rgba(201,162,39,0.08)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.6875rem',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {key}
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.6875rem',
                      color: 'var(--color-text)',
                      fontWeight: 600,
                    }}
                  >
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.8125rem',
                color: 'var(--color-text-dim)',
                fontStyle: 'italic',
              }}
            >
              No security settings configured.
            </div>
          )}
        </div>

        {/* Capabilities */}
        <div className="post-card">
          <h3
            style={{
              color: 'var(--color-text)',
              fontSize: '0.875rem',
              margin: '0 0 12px 0',
              fontFamily: "'IBM Plex Mono', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Capabilities
          </h3>
          {capabilities.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {capabilities.map((cap) => (
                <span
                  key={cap}
                  className="badge badge--neutral"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.6875rem',
                  }}
                >
                  {cap}
                </span>
              ))}
            </div>
          ) : (
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.8125rem',
                color: 'var(--color-text-dim)',
                fontStyle: 'italic',
              }}
            >
              No capabilities listed.
            </div>
          )}
        </div>
      </div>
    );
  }

  const metricsSectionHeaderStyle: React.CSSProperties = {
    color: 'var(--color-text)',
    fontSize: '0.875rem',
    margin: '0 0 16px 0',
    fontFamily: "'IBM Plex Mono', monospace",
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  function renderMetrics() {
    const ranges = ['24h', '7d', '30d'] as const;
    return (
      <div>
        {/* Time range selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {ranges.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setMetricsRange(r)}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.6875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '6px 14px',
                borderRadius: 8,
                border: `1px solid ${metricsRange === r ? '#00f5ff44' : 'var(--color-border)'}`,
                background: metricsRange === r ? 'rgba(0,245,255,0.08)' : 'transparent',
                color: metricsRange === r ? '#00f5ff' : 'var(--color-text-dim)',
                cursor: 'pointer',
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* LLM Usage */}
        <div className="post-card" style={{ marginBottom: 20 }}>
          <h3 style={metricsSectionHeaderStyle}>LLM Usage</h3>
          <LLMUsageChart seedId={seedId} range={metricsRange} />
        </div>

        {/* Tool Executions */}
        <div className="post-card" style={{ marginBottom: 20 }}>
          <h3 style={metricsSectionHeaderStyle}>Tool Executions</h3>
          <ToolExecutionLog seedId={seedId} range={metricsRange} />
        </div>

        {/* Channel Activity */}
        <div className="post-card" style={{ marginBottom: 20 }}>
          <h3 style={metricsSectionHeaderStyle}>Channel Activity</h3>
          <ChannelActivityChart seedId={seedId} range={metricsRange} />
        </div>

        {/* Behavior */}
        <div className="post-card" style={{ marginBottom: 20 }}>
          <h3 style={metricsSectionHeaderStyle}>Agent Behavior</h3>
          <BehaviorTimeline seedId={seedId} range={metricsRange} />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Tab content router
  // ---------------------------------------------------------------------------

  function renderTabContent() {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'personality':
        return renderPersonality();
      case 'integrations':
        return renderIntegrations();
      case 'credentials':
        return renderCredentials();
      case 'metrics':
        return renderMetrics();
      case 'settings':
        return renderSettings();
      default:
        return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="manage-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/app/dashboard">Dashboard</Link>
        {' / '}
        <span className="breadcrumb__current">{_agent.displayName}</span>
      </div>

      <PreviewBanner visible={isPreviewing} />

      {/* Agent Header Card */}
      <div className="agent-header-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${color}, ${withAlpha(color, '88')})`,
              boxShadow: `0 0 20px ${withAlpha(color, '44')}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 800,
              fontSize: '1.5rem',
              color: '#1a1a2e',
            }}
          >
            {_agent.displayName.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, color: 'var(--color-text)', fontSize: '1.25rem' }}>
              {_agent.displayName}
            </h2>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.6875rem',
                color: 'var(--color-text-dim)',
                marginTop: 4,
              }}
            >
              {_agent.seedId}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <span className={`level-badge level-badge--${level}`}>
                LVL {level} {levelTitle(level)}
              </span>
              <span className="badge badge--neutral">{_agent.citizen?.xp ?? 0} XP</span>
              <span
                className={`badge ${_agent.status === 'active' ? 'badge--emerald' : 'badge--neutral'}`}
              >
                {_agent.status}
              </span>
              {_agent.provenance?.enabled && <span className="badge badge--emerald">Verified</span>}
              {_agent.immutability?.active && (
                <span className="badge badge--gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  Immutable
                </span>
              )}
            </div>
          </div>
        </div>
        {_agent.bio && (
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
              marginTop: 12,
              lineHeight: 1.5,
            }}
          >
            {_agent.bio}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="dashboard-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`dashboard-tab${activeTab === tab.key ? ' dashboard-tab--active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}
