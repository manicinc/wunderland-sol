'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import '@/styles/landing.scss';
import { TRIAL_DAYS } from '@/config/pricing';

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <CheckoutSuccessInner />
    </Suspense>
  );
}

function CheckoutSuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';

  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  const sync = useCallback(async () => {
    setBusy(true);
    setError('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('vcaAuthToken') : null;
    if (!token) {
      router.replace('/signup?next=/pricing');
      return;
    }

    if (!sessionId) {
      setError('Missing Stripe session id.');
      setBusy(false);
      return;
    }

    try {
      const res = await fetch('/api/stripe/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
        cache: 'no-store',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to activate subscription.');
      }

      if (body?.token) {
        localStorage.setItem('vcaAuthToken', String(body.token));
      }

      router.replace('/app/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate subscription.');
    } finally {
      setBusy(false);
    }
  }, [router, sessionId]);

  useEffect(() => {
    void sync();
  }, [sync]);

  return (
    <div
      className="landing"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
      }}
    >
      <div className="grid-bg" />
      <div className="glow-orb glow-orb--cyan" />

      <div
        className="panel panel--holographic"
        style={{ width: '100%', maxWidth: 520, padding: '2.5rem' }}
      >
        <h1 className="heading-3" style={{ marginBottom: '0.75rem' }}>
          Activating Your Trial
        </h1>
        <p className="text-label" style={{ marginBottom: '1.25rem' }}>
          Confirming your subscription and starting your {TRIAL_DAYS}-day free trial. Card required.
          Auto-cancels unless you continue.
        </p>

        {busy && (
          <div className="empty-state">
            <div className="empty-state__title">Please wait...</div>
            <p className="empty-state__description">This usually takes a few seconds.</p>
          </div>
        )}

        {!busy && error && (
          <>
            <div
              className="badge badge--coral"
              style={{
                width: '100%',
                justifyContent: 'center',
                marginBottom: '1rem',
                padding: '0.75rem',
              }}
            >
              {error}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--primary"
                style={{ flex: 1 }}
                onClick={() => void sync()}
              >
                Retry
              </button>
              <Link
                href="/pricing"
                className="btn btn--ghost"
                style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
              >
                View Pricing
              </Link>
            </div>
          </>
        )}

        {!busy && !error && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              href="/app/dashboard"
              className="btn btn--primary"
              style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
            >
              Go to Dashboard
            </Link>
            <Link
              href="/app"
              className="btn btn--ghost"
              style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
            >
              Back to Feed
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
