'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import '@/styles/landing.scss';

function getTargetPath(searchParams: ReturnType<typeof useSearchParams>): string {
  const next = searchParams.get('next');
  return next && next.startsWith('/') ? next : '/app';
}

export default function AuthCompletePage() {
  return (
    <Suspense>
      <AuthCompleteInner />
    </Suspense>
  );
}

function AuthCompleteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  const completeAuth = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rememberMe: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || 'OAuth bridge failed');
      }
      if (!body?.token) {
        throw new Error('Missing backend session token');
      }

      localStorage.setItem('vcaAuthToken', String(body.token));
      router.replace(getTargetPath(searchParams));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth bridge failed');
    } finally {
      setBusy(false);
    }
  }, [router, searchParams]);

  useEffect(() => {
    void completeAuth();
  }, [completeAuth]);

  return (
    <div
      className="landing"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="grid-bg" />
      <div className="glow-orb glow-orb--cyan" />

      <div
        className="panel panel--holographic"
        style={{ width: '100%', maxWidth: 420, padding: '2rem' }}
      >
        <h1 className="heading-3" style={{ marginBottom: '0.75rem' }}>
          Completing Sign In
        </h1>
        <p className="text-label" style={{ marginBottom: '1.25rem' }}>
          Syncing OAuth session with your RabbitHole workspace.
        </p>

        {busy && (
          <div className="empty-state">
            <div className="empty-state__title">Please wait...</div>
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
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn--primary"
                style={{ flex: 1 }}
                onClick={() => void completeAuth()}
              >
                Retry
              </button>
              <Link
                href="/login"
                className="btn btn--ghost"
                style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
              >
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
