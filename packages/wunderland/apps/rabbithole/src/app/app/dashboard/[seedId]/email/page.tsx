'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSoftPaywall } from '@/lib/route-guard';
import Paywall from '@/components/Paywall';
import PreviewBanner from '@/components/PreviewBanner';
import { wunderlandAPI, type WunderlandEmailIntegrationStatus } from '@/lib/wunderland-api';

export default function EmailIntegrationPage({ params }: { params: Promise<{ seedId: string }> }) {
  const { seedId } = use(params);
  const { ready, isPreviewing } = useSoftPaywall();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<WunderlandEmailIntegrationStatus | null>(null);

  const [to, setTo] = useState('');
  const [from, setFrom] = useState('');
  const [subject, setSubject] = useState('Wunderland SMTP Test');
  const [text, setText] = useState('');
  const [sendBusy, setSendBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (isPreviewing) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      setResult(null);
      try {
        const res = await wunderlandAPI.email.status(seedId);
        if (cancelled) return;
        setStatus(res);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load email integration status');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [ready, isPreviewing, seedId]);

  const sendTest = useCallback(async () => {
    setSendBusy(true);
    setError('');
    setResult(null);
    try {
      const res = await wunderlandAPI.email.test({
        seedId,
        to: to.trim(),
        from: from.trim() || undefined,
        subject: subject.trim() || undefined,
        text: text.trim() || undefined,
      });
      setResult(res.serverResponse || 'Sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setSendBusy(false);
    }
  }, [seedId, to, from, subject, text]);

  if (!ready) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Checking access...</div>
      </div>
    );
  }

  return (
    <Paywall requirePayment action="manage email integration">
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
        <span style={{ color: 'var(--color-text)' }}>Email</span>
      </div>

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
            <h2 className="wunderland-header__title">Email Integration</h2>
            <p className="wunderland-header__subtitle">
              Send outbound email from your Wunderbot via SMTP (stored in Credential Vault)
            </p>
          </div>
          <Link
            href={`/app/dashboard/${seedId}/credentials`}
            className="btn btn--ghost btn--sm"
            style={{ textDecoration: 'none' }}
          >
            Open Credential Vault
          </Link>
        </div>
      </div>

      {loading && (
        <div className="empty-state">
          <div className="empty-state__title">Loading integration...</div>
        </div>
      )}

      {!loading && status && (
        <div
          className="post-card"
          style={{
            marginBottom: 16,
            borderColor: status.configured ? 'rgba(16,255,176,0.25)' : 'rgba(255,107,107,0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className={`badge ${status.configured ? 'badge--emerald' : 'badge--coral'}`}>
              {status.configured ? 'Configured' : 'Not Configured'}
            </span>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.6875rem',
                color: 'var(--color-text-dim)',
              }}
            >
              Required: {status.required.join(', ')}
            </div>
          </div>

          {status.missing.length > 0 && (
            <div
              style={{
                marginTop: 10,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.6875rem',
                color: 'var(--color-text-muted)',
                lineHeight: 1.6,
              }}
            >
              Missing:{' '}
              <span style={{ color: 'var(--color-error)' }}>{status.missing.join(', ')}</span>
              <div style={{ marginTop: 8, opacity: 0.9 }}>
                Tip: set <code>smtp_host</code> as <code>smtp.example.com:587</code> if you need a
                custom port.
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          className="badge badge--coral"
          style={{
            marginBottom: 16,
            maxWidth: '100%',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.6875rem',
          }}
        >
          {error}
        </div>
      )}

      <div className="post-card">
        <h3 style={{ color: 'var(--color-text)', fontSize: '0.875rem', marginBottom: 16 }}>
          Send Test Email
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.6875rem',
                color: 'var(--color-text-muted)',
                marginBottom: 4,
              }}
            >
              To
            </label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="you@company.com"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--input-bg)',
                border: 'var(--border-subtle)',
                borderRadius: 8,
                color: 'var(--color-text)',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.8125rem',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.6875rem',
                color: 'var(--color-text-muted)',
                marginBottom: 4,
              }}
            >
              From (optional)
            </label>
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="agent@yourdomain.com"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--input-bg)',
                border: 'var(--border-subtle)',
                borderRadius: 8,
                color: 'var(--color-text)',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.8125rem',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.6875rem',
                color: 'var(--color-text-muted)',
                marginBottom: 4,
              }}
            >
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--input-bg)',
                border: 'var(--border-subtle)',
                borderRadius: 8,
                color: 'var(--color-text)',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.8125rem',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.6875rem',
                color: 'var(--color-text-muted)',
                marginBottom: 4,
              }}
            >
              Message (optional)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`SMTP integration is live.\n\nseedId: ${seedId}`}
              rows={6}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--input-bg)',
                border: 'var(--border-subtle)',
                borderRadius: 8,
                color: 'var(--color-text)',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.8125rem',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className="btn btn--primary btn--sm"
              onClick={() => void sendTest()}
              disabled={sendBusy || !to.trim()}
            >
              {sendBusy ? 'Sending...' : 'Send Test Email'}
            </button>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.6875rem',
                color: 'var(--color-text-dim)',
              }}
            >
              Uses <code>smtp_host</code> + <code>smtp_user</code> + <code>smtp_password</code>.
            </span>
          </div>

          {result && (
            <div
              className="badge badge--emerald"
              style={{
                width: 'fit-content',
                maxWidth: '100%',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.6875rem',
              }}
            >
              {result}
            </div>
          )}
        </div>
      </div>
    </div>
    </Paywall>
  );
}
