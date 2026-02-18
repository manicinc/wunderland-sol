'use client';

import { use, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useSoftPaywall } from '@/lib/route-guard';
import Paywall from '@/components/Paywall';
import PreviewBanner from '@/components/PreviewBanner';
import { wunderlandAPI } from '@/lib/wunderland-api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CronJob = {
  jobId: string;
  seedId: string;
  name: string;
  description: string;
  enabled: boolean;
  scheduleKind: 'at' | 'every' | 'cron';
  scheduleConfig: Record<string, unknown>;
  payloadKind: 'stimulus' | 'webhook' | 'message' | 'custom';
  payloadConfig: Record<string, unknown>;
  state: { nextRunAtMs?: number; lastRunAtMs?: number; lastStatus?: string };
  createdAt: number;
  updatedAt: number;
};

const SCHEDULE_KINDS = [
  { id: 'at' as const, label: 'One-shot (at)' },
  { id: 'every' as const, label: 'Interval (every)' },
  { id: 'cron' as const, label: 'Cron expression' },
];

const PAYLOAD_KINDS = [
  { id: 'stimulus' as const, label: 'Stimulus' },
  { id: 'webhook' as const, label: 'Webhook' },
  { id: 'message' as const, label: 'Message' },
  { id: 'custom' as const, label: 'Custom' },
];

const SCHEDULE_PLACEHOLDERS: Record<string, string> = {
  at: 'ISO timestamp, e.g. 2025-06-01T12:00:00Z',
  every: 'Interval in ms, e.g. 3600000 (1 hour)',
  cron: 'Cron expression, e.g. 0 */6 * * *',
};

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

function ClockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function TrashIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

function ToggleIcon({ enabled, size = 18 }: { enabled: boolean; size?: number }) {
  return (
    <svg
      width={size * 1.8}
      height={size}
      viewBox="0 0 36 20"
      fill="none"
    >
      <rect
        x="1"
        y="1"
        width="34"
        height="18"
        rx="9"
        fill={enabled ? 'rgba(0,245,160,0.2)' : 'rgba(255,255,255,0.06)'}
        stroke={enabled ? 'rgba(0,245,160,0.5)' : 'rgba(255,255,255,0.15)'}
        strokeWidth="1.5"
      />
      <circle
        cx={enabled ? 26 : 10}
        cy="10"
        r="6"
        fill={enabled ? '#00f5a0' : 'rgba(255,255,255,0.3)'}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSchedule(kind: string, config: Record<string, unknown>): string {
  if (kind === 'at') {
    const ts = config.timestamp ?? config.at ?? config.value;
    return ts ? `Once at ${String(ts)}` : 'One-shot';
  }
  if (kind === 'every') {
    const ms = Number(config.intervalMs ?? config.every ?? config.value ?? 0);
    if (ms >= 86400000) return `Every ${(ms / 86400000).toFixed(1)}d`;
    if (ms >= 3600000) return `Every ${(ms / 3600000).toFixed(1)}h`;
    if (ms >= 60000) return `Every ${(ms / 60000).toFixed(0)}m`;
    return `Every ${ms}ms`;
  }
  if (kind === 'cron') {
    const expr = config.expression ?? config.cron ?? config.value;
    return expr ? `cron: ${String(expr)}` : 'Cron schedule';
  }
  return kind;
}

function formatTimestamp(ms?: number): string {
  if (!ms) return '--';
  return new Date(ms).toLocaleString();
}

function parseScheduleConfig(kind: string, raw: string): Record<string, unknown> {
  if (kind === 'at') return { timestamp: raw.trim() };
  if (kind === 'every') return { intervalMs: Number(raw.trim()) };
  if (kind === 'cron') return { expression: raw.trim() };
  return { value: raw.trim() };
}

function payloadBadgeClass(kind: string): string {
  switch (kind) {
    case 'stimulus':
      return 'badge badge--emerald';
    case 'webhook':
      return 'badge badge--neutral';
    case 'message':
      return 'badge badge--emerald';
    case 'custom':
      return 'badge badge--coral';
    default:
      return 'badge badge--neutral';
  }
}

// ---------------------------------------------------------------------------
// Shared Styles
// ---------------------------------------------------------------------------

const FONT_MONO = "'IBM Plex Mono', monospace";

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--input-bg)',
  border: 'var(--border-subtle)',
  borderRadius: 8,
  color: 'var(--color-text)',
  fontFamily: FONT_MONO,
  fontSize: '0.8125rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: FONT_MONO,
  fontSize: '0.6875rem',
  color: 'var(--color-text-muted)',
  marginBottom: 4,
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CronPage({ params }: { params: Promise<{ seedId: string }> }) {
  const { seedId } = use(params);
  const { ready, isPreviewing } = useSoftPaywall();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add form state
  const [addName, setAddName] = useState('');
  const [addScheduleKind, setAddScheduleKind] = useState<'at' | 'every' | 'cron'>('every');
  const [addScheduleConfig, setAddScheduleConfig] = useState('');
  const [addPayloadKind, setAddPayloadKind] = useState<'stimulus' | 'webhook' | 'message' | 'custom'>('stimulus');
  const [addPayloadConfig, setAddPayloadConfig] = useState('{}');
  const [addEnabled, setAddEnabled] = useState(true);
  const [addBusy, setAddBusy] = useState(false);

  // Inline state for toggling / deleting
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load jobs
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!ready) return;
    if (isPreviewing) { setLoading(false); return; }
    let cancelled = false;

    async function loadJobs() {
      setLoading(true);
      setError('');
      try {
        const res = await wunderlandAPI.cron.list({ seedId });
        if (cancelled) return;
        setJobs(res.items as unknown as CronJob[]);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load scheduled jobs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadJobs();
    return () => {
      cancelled = true;
    };
  }, [ready, isPreviewing, seedId]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleAdd = useCallback(async () => {
    if (!addName.trim() || !addScheduleConfig.trim()) return;
    setAddBusy(true);
    setError('');
    try {
      let parsedPayload: Record<string, unknown> = {};
      try {
        parsedPayload = JSON.parse(addPayloadConfig);
      } catch {
        throw new Error('Payload config must be valid JSON');
      }

      const { job } = await wunderlandAPI.cron.create({
        seedId,
        name: addName.trim(),
        scheduleKind: addScheduleKind,
        scheduleConfig: parseScheduleConfig(addScheduleKind, addScheduleConfig),
        payloadKind: addPayloadKind,
        payloadConfig: parsedPayload,
        enabled: addEnabled,
      });
      setJobs((prev) => [job as unknown as CronJob, ...prev]);
      setAddName('');
      setAddScheduleConfig('');
      setAddPayloadConfig('{}');
      setAddEnabled(true);
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setAddBusy(false);
    }
  }, [addName, addScheduleKind, addScheduleConfig, addPayloadKind, addPayloadConfig, addEnabled, seedId]);

  const handleToggle = useCallback(async (jobId: string, currentEnabled: boolean) => {
    setToggleBusyId(jobId);
    setError('');
    try {
      const { job } = await wunderlandAPI.cron.toggle(jobId, { enabled: !currentEnabled });
      setJobs((prev) =>
        prev.map((j) => (j.jobId === jobId ? { ...j, enabled: (job as unknown as CronJob).enabled } : j))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle job');
    } finally {
      setToggleBusyId(null);
    }
  }, []);

  const handleDelete = useCallback(async (jobId: string) => {
    setDeleteBusyId(jobId);
    setError('');
    try {
      await wunderlandAPI.cron.remove(jobId);
      setJobs((prev) => prev.filter((j) => j.jobId !== jobId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete job');
    } finally {
      setDeleteBusyId(null);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Guard
  // ---------------------------------------------------------------------------

  if (!ready) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Checking access...</div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Paywall requirePayment action="manage scheduled jobs">
      <PreviewBanner visible={isPreviewing} />
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Breadcrumb */}
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: '0.6875rem',
          color: 'var(--color-text-dim)',
          marginBottom: 16,
        }}
      >
        <Link
          href="/app/dashboard"
          style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
        >
          Dashboard
        </Link>
        {' / '}
        <Link
          href={`/app/dashboard/${seedId}`}
          style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
        >
          {seedId.slice(0, 16)}...
        </Link>
        {' / '}
        <span style={{ color: 'var(--color-text)' }}>Scheduled Jobs</span>
      </div>

      {/* Header */}
      <div className="wunderland-header">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h2 className="wunderland-header__title">Scheduled Jobs</h2>
            <p className="wunderland-header__subtitle">
              Configure recurring and one-shot tasks for your agent
            </p>
          </div>
          <button className="btn btn--primary btn--sm" onClick={() => setShowAddForm(true)}>
            + Add Job
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div
        style={{
          padding: '12px 16px',
          marginBottom: 20,
          background: 'rgba(0,245,255,0.04)',
          border: '1px solid rgba(0,245,255,0.08)',
          borderRadius: 10,
          fontFamily: FONT_MONO,
          fontSize: '0.6875rem',
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
        }}
      >
        Jobs run server-side on a managed scheduler. Use cron expressions, fixed intervals, or
        one-shot timestamps to trigger stimuli, webhooks, messages, or custom payloads.
      </div>

      {/* Error */}
      {error && (
        <div
          className="badge badge--coral"
          style={{
            marginBottom: 20,
            maxWidth: '100%',
            fontFamily: FONT_MONO,
            fontSize: '0.6875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="post-card" style={{ marginBottom: 20 }}>
          <h3 style={{ color: 'var(--color-text)', fontSize: '0.875rem', marginBottom: 16 }}>
            New Scheduled Job
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>Name</label>
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Daily digest, Heartbeat check, etc."
                style={inputStyle}
              />
            </div>

            {/* Schedule Kind */}
            <div>
              <label style={labelStyle}>Schedule Kind</label>
              <select
                value={addScheduleKind}
                onChange={(e) => setAddScheduleKind(e.target.value as 'at' | 'every' | 'cron')}
                style={inputStyle}
              >
                {SCHEDULE_KINDS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Schedule Config */}
            <div>
              <label style={labelStyle}>Schedule Config</label>
              <input
                value={addScheduleConfig}
                onChange={(e) => setAddScheduleConfig(e.target.value)}
                placeholder={SCHEDULE_PLACEHOLDERS[addScheduleKind]}
                style={inputStyle}
              />
            </div>

            {/* Payload Kind */}
            <div>
              <label style={labelStyle}>Payload Kind</label>
              <select
                value={addPayloadKind}
                onChange={(e) =>
                  setAddPayloadKind(e.target.value as 'stimulus' | 'webhook' | 'message' | 'custom')
                }
                style={inputStyle}
              >
                {PAYLOAD_KINDS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Payload Config */}
            <div>
              <label style={labelStyle}>Payload Config (JSON)</label>
              <textarea
                value={addPayloadConfig}
                onChange={(e) => setAddPayloadConfig(e.target.value)}
                placeholder='{ "type": "heartbeat", "content": "ping" }'
                rows={4}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  minHeight: 80,
                }}
              />
            </div>

            {/* Enabled toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
              onClick={() => setAddEnabled(!addEnabled)}
            >
              <ToggleIcon enabled={addEnabled} />
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: '0.75rem',
                  color: addEnabled ? 'var(--color-text)' : 'var(--color-text-dim)',
                }}
              >
                {addEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => setShowAddForm(false)}
                disabled={addBusy}
              >
                Cancel
              </button>
              <button
                className="btn btn--primary btn--sm"
                onClick={() => void handleAdd()}
                disabled={addBusy || !addName.trim() || !addScheduleConfig.trim()}
              >
                {addBusy ? 'Creating...' : 'Create Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="empty-state">
          <div className="empty-state__title">Loading scheduled jobs...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && jobs.length === 0 && !showAddForm && (
        <div className="empty-state">
          <div className="empty-state__icon">
            <ClockIcon size={28} />
          </div>
          <div className="empty-state__title">No scheduled jobs configured</div>
          <p className="empty-state__description">
            Create cron jobs to automate stimuli, webhooks, and other recurring tasks for your agent.
          </p>
        </div>
      )}

      {/* Jobs list */}
      {!loading && jobs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {jobs.map((job) => {
            const isConfirming = deleteConfirm === job.jobId;
            const isDeleteBusy = deleteBusyId === job.jobId;
            const isToggleBusy = toggleBusyId === job.jobId;

            return (
              <div key={job.jobId} className="post-card">
                {/* Top row: name, schedule, payload badge, toggle, delete */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Clock icon */}
                  <span style={{ color: job.enabled ? 'var(--color-text)' : 'var(--color-text-dim)' }}>
                    <ClockIcon size={20} />
                  </span>

                  {/* Name + schedule */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: 'var(--color-text)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {job.name}
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: '0.6875rem',
                        color: 'var(--color-text-dim)',
                        marginTop: 2,
                      }}
                    >
                      {formatSchedule(job.scheduleKind, job.scheduleConfig)}
                    </div>
                  </div>

                  {/* Payload kind badge */}
                  <span
                    className={payloadBadgeClass(job.payloadKind)}
                    style={{ fontFamily: FONT_MONO, fontSize: '0.625rem' }}
                  >
                    {job.payloadKind}
                  </span>

                  {/* Enabled toggle */}
                  <button
                    onClick={() => void handleToggle(job.jobId, job.enabled)}
                    disabled={isToggleBusy}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: isToggleBusy ? 'wait' : 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      opacity: isToggleBusy ? 0.5 : 1,
                    }}
                    title={job.enabled ? 'Disable job' : 'Enable job'}
                  >
                    <ToggleIcon enabled={job.enabled} />
                  </button>

                  {/* Delete */}
                  {isConfirming ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn btn--sm"
                        style={{
                          background: 'rgba(255,107,107,0.1)',
                          color: 'var(--color-error)',
                          border: '1px solid rgba(255,107,107,0.25)',
                        }}
                        onClick={() => void handleDelete(job.jobId)}
                        disabled={isDeleteBusy}
                      >
                        {isDeleteBusy ? 'Deleting...' : 'Confirm?'}
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => setDeleteConfirm(null)}
                        disabled={isDeleteBusy}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => setDeleteConfirm(job.jobId)}
                      style={{ color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>

                {/* State info row */}
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    marginTop: 10,
                    fontFamily: FONT_MONO,
                    fontSize: '0.625rem',
                    color: 'var(--color-text-dim)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>Next: {formatTimestamp(job.state?.nextRunAtMs)}</span>
                  <span>Last: {formatTimestamp(job.state?.lastRunAtMs)}</span>
                  {job.state?.lastStatus && (
                    <span
                      className={
                        job.state.lastStatus === 'success'
                          ? 'badge badge--emerald'
                          : job.state.lastStatus === 'error'
                            ? 'badge badge--coral'
                            : 'badge badge--neutral'
                      }
                      style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem' }}
                    >
                      {job.state.lastStatus}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Back link */}
      <div style={{ marginTop: 24 }}>
        <Link
          href={`/app/dashboard/${seedId}`}
          style={{
            fontFamily: FONT_MONO,
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
          }}
        >
          &larr; Back to agent
        </Link>
      </div>
    </div>
    </Paywall>
  );
}
