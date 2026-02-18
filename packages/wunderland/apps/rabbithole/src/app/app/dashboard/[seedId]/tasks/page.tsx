'use client';

import { use, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useSoftPaywall } from '@/lib/route-guard';
import Paywall from '@/components/Paywall';
import PreviewBanner from '@/components/PreviewBanner';
import type { RuntimeTask } from '@/lib/wunderland-api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TaskFilter = 'all' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

const TASK_FILTERS: { key: TaskFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'running', label: 'Running' },
  { key: 'queued', label: 'Queued' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS: Record<string, string> = {
  queued: '#ffd700',
  running: '#00f5ff',
  completed: '#10ffb0',
  failed: '#ff6b6b',
  cancelled: '#8888a0',
};

const TASK_TYPE_LABELS: Record<string, string> = {
  llm_inference: 'LLM Inference',
  tool_execution: 'Tool Execution',
  workflow: 'Workflow',
  cron_run: 'Cron Run',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TasksPage({ params }: { params: Promise<{ seedId: string }> }) {
  const { seedId } = use(params);
  const { ready, isPreviewing } = useSoftPaywall();

  const [tasks, setTasks] = useState<RuntimeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [cancelling, setCancelling] = useState<Record<string, boolean>>({});

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('vcaAuthToken') : null;
      const qs = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetch(`/api/tasks/${encodeURIComponent(seedId)}${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to load tasks');
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [seedId, filter]);

  useEffect(() => {
    if (!ready) return;
    void loadTasks();
  }, [ready, loadTasks]);

  // Poll for active tasks every 3s
  useEffect(() => {
    if (!ready) return;
    const hasActive = tasks.some((t) => t.status === 'running' || t.status === 'queued');
    if (!hasActive) return;

    const id = setInterval(() => void loadTasks(), 3000);
    return () => clearInterval(id);
  }, [ready, tasks, loadTasks]);

  // ---------------------------------------------------------------------------
  // Cancel handler
  // ---------------------------------------------------------------------------

  const handleCancel = useCallback(
    async (taskId: string) => {
      setCancelling((prev) => ({ ...prev, [taskId]: true }));
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('vcaAuthToken') : null;
        const res = await fetch(
          `/api/tasks/${encodeURIComponent(seedId)}/${encodeURIComponent(taskId)}`,
          {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to cancel task');
        }
        await loadTasks();
      } catch (err) {
        void err; // task may not exist yet in stub mode
      } finally {
        setCancelling((prev) => ({ ...prev, [taskId]: false }));
      }
    },
    [seedId, loadTasks]
  );

  // ---------------------------------------------------------------------------
  // Guards
  // ---------------------------------------------------------------------------

  if (!ready) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Checking access...</div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const activeTask = tasks.find((t) => t.status === 'running');
  const filteredTasks = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="manage-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/app/dashboard">Dashboard</Link>
        {' / '}
        <Link href={`/app/dashboard/${seedId}`}>{seedId.slice(0, 8)}</Link>
        {' / '}
        <span className="breadcrumb__current">Tasks</span>
      </div>

      <PreviewBanner visible={isPreviewing} />

      <Paywall>
        <h2
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: 20,
          }}
        >
          Runtime Tasks
        </h2>

        {/* Active task panel */}
        {activeTask && (
          <div
            className="post-card"
            style={{
              marginBottom: 20,
              border: '1px solid rgba(0,245,255,0.2)',
              background: 'rgba(0,245,255,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#00f5ff',
                      boxShadow: '0 0 8px #00f5ff',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.875rem', color: '#00f5ff', fontWeight: 600 }}>
                    Running
                  </span>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem', color: 'var(--color-text)' }}>
                  {activeTask.title}
                </div>
                {activeTask.description && (
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: 'var(--color-text-dim)', marginTop: 4 }}>
                    {activeTask.description}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleCancel(activeTask.id)}
                disabled={cancelling[activeTask.id]}
                className="btn btn--ghost btn--sm"
                style={{
                  color: '#ff6b6b',
                  borderColor: 'rgba(255,107,107,0.3)',
                }}
              >
                {cancelling[activeTask.id] ? 'Cancelling...' : 'Cancel'}
              </button>
            </div>

            {/* Progress bar */}
            {activeTask.progress > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.625rem', color: 'var(--color-text-dim)' }}>
                    Progress
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.625rem', color: '#00f5ff' }}>
                    {activeTask.progress}%
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${activeTask.progress}%`,
                      height: '100%',
                      borderRadius: 2,
                      background: 'linear-gradient(90deg, #00f5ff, #10ffb0)',
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Elapsed time */}
            {activeTask.startedAt && (
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.625rem', color: 'var(--color-text-dim)', marginTop: 8 }}>
                Started: {new Date(activeTask.startedAt).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* No active task */}
        {!activeTask && !loading && (
          <div
            className="post-card"
            style={{
              marginBottom: 20,
              textAlign: 'center',
              padding: 24,
            }}
          >
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.875rem', color: 'var(--color-text-dim)' }}>
              Agent is idle
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: 'var(--color-text-dim)', marginTop: 4, opacity: 0.6 }}>
              No tasks currently running. Tasks appear here when the agent processes requests.
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {TASK_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.6875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '6px 14px',
                borderRadius: 8,
                border: `1px solid ${filter === f.key ? '#00f5ff44' : 'var(--color-border)'}`,
                background: filter === f.key ? 'rgba(0,245,255,0.08)' : 'transparent',
                color: filter === f.key ? '#00f5ff' : 'var(--color-text-dim)',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Task list */}
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-dim)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>
            Loading tasks...
          </div>
        ) : error ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#ff6b6b', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}>
            {error}
          </div>
        ) : filteredTasks.length > 0 ? (
          <div style={{ display: 'grid', gap: 6 }}>
            {filteredTasks.map((task) => (
              <TaskRow key={task.id} task={task} onCancel={handleCancel} cancelling={!!cancelling[task.id]} />
            ))}
          </div>
        ) : (
          <div style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--color-text-dim)',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.75rem',
            fontStyle: 'italic',
          }}>
            No tasks found{filter !== 'all' ? ` with status "${filter}"` : ''}.
          </div>
        )}
      </Paywall>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task row sub-component
// ---------------------------------------------------------------------------

function TaskRow({
  task,
  onCancel,
  cancelling,
}: {
  task: RuntimeTask;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  const statusColor = STATUS_COLORS[task.status] ?? '#8888a0';
  const typeLabel = TASK_TYPE_LABELS[task.taskType] ?? task.taskType;
  const canCancel = task.status === 'running' || task.status === 'queued';

  return (
    <div
      className="post-card"
      style={{
        padding: '12px 16px',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.625rem',
              padding: '2px 8px',
              borderRadius: 4,
              background: `${statusColor}18`,
              color: statusColor,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 600,
            }}
          >
            {task.status}
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6875rem',
              color: 'var(--color-text-dim)',
            }}
          >
            {typeLabel}
          </span>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem', color: 'var(--color-text)', marginTop: 4 }}>
          {task.title}
        </div>
        {task.errorMessage && (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: '#ff6b6b', marginTop: 4 }}>
            {task.errorMessage}
          </div>
        )}
        {task.resultSummary && (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
            {task.resultSummary}
          </div>
        )}
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.5625rem', color: 'var(--color-text-dim)', marginTop: 6, opacity: 0.6 }}>
          {task.createdAt ? new Date(task.createdAt).toLocaleString() : ''}
          {task.completedAt ? ` — Completed: ${new Date(task.completedAt).toLocaleString()}` : ''}
        </div>
      </div>

      {canCancel && (
        <button
          type="button"
          onClick={() => onCancel(task.id)}
          disabled={cancelling}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.625rem',
            textTransform: 'uppercase',
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid rgba(255,107,107,0.3)',
            background: 'rgba(255,107,107,0.08)',
            color: '#ff6b6b',
            cursor: cancelling ? 'not-allowed' : 'pointer',
            opacity: cancelling ? 0.5 : 1,
          }}
        >
          {cancelling ? '...' : 'Cancel'}
        </button>
      )}
    </div>
  );
}
