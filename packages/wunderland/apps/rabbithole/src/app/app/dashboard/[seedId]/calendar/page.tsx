'use client';

import { use, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useSoftPaywall } from '@/lib/route-guard';
import Paywall from '@/components/Paywall';
import PreviewBanner from '@/components/PreviewBanner';
import { wunderlandAPI, type WunderlandCalendarStatus } from '@/lib/wunderland-api';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CalendarPage({ params }: { params: Promise<{ seedId: string }> }) {
  const { seedId } = use(params);
  const { ready, isPreviewing } = useSoftPaywall();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<WunderlandCalendarStatus | null>(null);
  const [connectBusy, setConnectBusy] = useState(false);
  const [revokeStage, setRevokeStage] = useState<'idle' | 'confirm' | 'busy'>('idle');

  useEffect(() => {
    if (!ready) return;
    if (isPreviewing) { setLoading(false); return; }
    let cancelled = false;

    async function loadStatus() {
      setLoading(true);
      setError('');
      try {
        const res = await wunderlandAPI.calendar.status(seedId);
        if (cancelled) return;
        setStatus(res);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load calendar status');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [ready, isPreviewing, seedId]);

  const handleConnect = useCallback(async () => {
    setConnectBusy(true);
    setError('');
    try {
      const { url } = await wunderlandAPI.calendar.auth(seedId);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start OAuth flow');
      setConnectBusy(false);
    }
  }, [seedId]);

  const handleRevoke = useCallback(async () => {
    setRevokeStage('busy');
    setError('');
    try {
      await wunderlandAPI.calendar.revoke(seedId);
      setStatus({ connected: false, email: null, calendarId: null });
      setRevokeStage('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke calendar access');
      setRevokeStage('confirm');
    }
  }, [seedId]);

  if (!ready) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Checking access...</div>
      </div>
    );
  }

  return (
    <Paywall requirePayment action="manage calendar integration">
      <PreviewBanner visible={isPreviewing} />
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Breadcrumb */}
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
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
        <span style={{ color: 'var(--color-text)' }}>Calendar</span>
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
            <h2 className="wunderland-header__title">Google Calendar Integration</h2>
            <p className="wunderland-header__subtitle">
              Connect your agent to Google Calendar for scheduling and availability
            </p>
          </div>
          <Link
            href={`/app/dashboard/${seedId}`}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6875rem',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
            }}
          >
            &larr; Back to agent
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="badge badge--coral"
          style={{
            marginBottom: 20,
            maxWidth: '100%',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.6875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="empty-state">
          <div className="empty-state__title">Loading calendar status...</div>
        </div>
      )}

      {/* Connection Status Card */}
      {!loading && status && (
        <div className="post-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            {/* Calendar SVG icon */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: 'var(--color-text)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                Connection Status
              </div>
            </div>
            {status.connected ? (
              <span className="badge badge--emerald">Connected</span>
            ) : (
              <span className="badge badge--neutral">Not Connected</span>
            )}
          </div>

          {status.connected && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginBottom: 16,
                padding: '12px 16px',
                background: 'rgba(0,245,255,0.04)',
                border: '1px solid rgba(0,245,255,0.08)',
                borderRadius: 8,
              }}
            >
              {status.email && (
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.6875rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <span style={{ color: 'var(--color-text-dim)' }}>Account: </span>
                  {status.email}
                </div>
              )}
              {status.calendarId && (
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.6875rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <span style={{ color: 'var(--color-text-dim)' }}>Calendar ID: </span>
                  <code
                    style={{
                      background: 'rgba(0,0,0,0.2)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: '0.6875rem',
                    }}
                  >
                    {status.calendarId}
                  </code>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {status.connected ? (
              revokeStage === 'confirm' || revokeStage === 'busy' ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="btn btn--sm"
                    style={{
                      background: 'rgba(255,107,107,0.1)',
                      color: 'var(--color-error)',
                      border: '1px solid rgba(255,107,107,0.25)',
                    }}
                    onClick={() => void handleRevoke()}
                    disabled={revokeStage === 'busy'}
                  >
                    {revokeStage === 'busy' ? 'Revoking...' : 'Confirm revoke?'}
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => setRevokeStage('idle')}
                    disabled={revokeStage === 'busy'}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn--ghost btn--sm"
                  style={{ color: 'var(--color-error)' }}
                  onClick={() => setRevokeStage('confirm')}
                >
                  Disconnect
                </button>
              )
            ) : (
              <button
                className="btn btn--primary btn--sm"
                onClick={() => void handleConnect()}
                disabled={connectBusy}
              >
                {connectBusy ? 'Redirecting...' : 'Connect Google Calendar'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Not connected empty state */}
      {!loading && status && !status.connected && (
        <div className="empty-state" style={{ marginBottom: 20 }}>
          <div className="empty-state__icon">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="12" y1="14" x2="12" y2="18" />
              <line x1="10" y1="16" x2="14" y2="16" />
            </svg>
          </div>
          <div className="empty-state__title">No calendar connected</div>
          <p className="empty-state__description">
            Connect a Google Calendar account to enable scheduling capabilities for this agent.
          </p>
        </div>
      )}

      {/* Info section */}
      <div className="post-card">
        <h3
          style={{
            color: 'var(--color-text)',
            fontSize: '0.875rem',
            fontFamily: "'IBM Plex Mono', monospace",
            marginBottom: 16,
          }}
        >
          What this integration enables
        </h3>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.6875rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-text-dim)' }}
            >
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span>
              Your agent can read and create calendar events, check availability, and schedule
              meetings
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-text-dim)' }}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span>
              OAuth tokens are encrypted and stored in your agent&apos;s credential vault
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-text-dim)' }}
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>
              Only calendar scope is requested — no access to email or other Google services
            </span>
          </div>
        </div>
      </div>
    </div>
    </Paywall>
  );
}
