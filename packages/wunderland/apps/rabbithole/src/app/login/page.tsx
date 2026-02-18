'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import '@/styles/landing.scss';
import { TRIAL_DAYS } from '@/config/pricing';
import { RabbitHoleLogo } from '@/components/brand';
import LandingNav from '@/components/LandingNav';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [useGlobalAccess, setUseGlobalAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthNext = (() => {
    const next = searchParams.get('next');
    return next && next.startsWith('/') ? next : '/app';
  })();
  const oauthCallbackUrl = `/auth/complete?next=${encodeURIComponent(oauthNext)}`;
  const handleOAuth = (provider: 'google' | 'github') => {
    signIn(provider, { callbackUrl: oauthCallbackUrl });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!password || (!useGlobalAccess && !email)) {
      setError(
        useGlobalAccess
          ? 'Please enter the global access password'
          : 'Please enter email and password'
      );
      setLoading(false);
      return;
    }

    try {
      const endpoint = useGlobalAccess ? `${API_BASE}/auth/global` : `${API_BASE}/auth/login`;
      const payload = useGlobalAccess ? { password, rememberMe } : { email, password, rememberMe };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.message || 'Authentication failed');
        return;
      }

      if (typeof window !== 'undefined' && body?.token) {
        localStorage.setItem('vcaAuthToken', String(body.token));
      }

      const next = searchParams.get('next');
      const target = next && next.startsWith('/') ? next : '/app';
      router.push(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

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
      <LandingNav />
      <div className="grid-bg" />
      <div className="glow-orb glow-orb--cyan" />

      <div
        className="panel panel--holographic"
        style={{ width: '100%', maxWidth: 420, padding: '2.5rem' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <RabbitHoleLogo variant="compact" size="md" href="/" tagline="" showTagline={false} />
          </div>
          <h1
            className="heading-3 auth-title"
            style={{ marginBottom: '0.5rem' }}
          >
            Welcome Back
          </h1>
          <p className="text-label auth-subtitle">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {!useGlobalAccess && (
            <div style={{ marginBottom: '1rem' }}>
              <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="cta__input"
                style={{ width: '100%' }}
              />
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              {useGlobalAccess ? 'Global Access Password' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="cta__input"
              style={{ width: '100%' }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginBottom: '1.5rem',
            }}
          >
            <label
              className="text-label"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={useGlobalAccess}
                onChange={(e) => setUseGlobalAccess(e.target.checked)}
                style={{ accentColor: 'var(--color-accent)' }}
              />
              Use global access (admin)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label
                className="text-label"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--color-accent)' }}
                />
                Remember me
              </label>
              {!useGlobalAccess && (
                <Link
                  href="/signup"
                  className="text-label"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Need an account?
                </Link>
              )}
            </div>
          </div>

          {error && (
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
          )}

          <button
            type="submit"
            className="btn btn--primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <p
            className="text-label"
            style={{
              marginTop: '0.75rem',
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
            }}
          >
            New here? Start with a {TRIAL_DAYS}-day free trial (card required, auto-cancels by
            default) on Starter or Pro.
          </p>
        </form>

        {(process.env.NEXT_PUBLIC_OAUTH_GOOGLE === 'true' || process.env.NEXT_PUBLIC_OAUTH_GITHUB === 'true') && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                margin: '1.5rem 0',
              }}
            >
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              <span
                className="text-label"
                style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}
              >
                OR CONTINUE WITH
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {process.env.NEXT_PUBLIC_OAUTH_GOOGLE === 'true' && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                  onClick={() => handleOAuth('google')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google
                </button>
              )}
              {process.env.NEXT_PUBLIC_OAUTH_GITHUB === 'true' && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                  onClick={() => handleOAuth('github')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  GitHub
                </button>
              )}
            </div>
          </>
        )}

        <div className="divider" style={{ margin: '1.5rem 0' }} />

        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--color-accent)' }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
