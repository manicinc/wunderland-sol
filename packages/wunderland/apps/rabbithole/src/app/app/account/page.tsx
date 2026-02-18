'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { UsageDashboard } from '@/components/UsageDashboard';

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, ready, isPaid, planId } = useAuth();

  useEffect(() => {
    if (ready && !isAuthenticated) router.replace('/login');
  }, [ready, isAuthenticated, router]);

  if (!ready || !user) return null;

  const planLabel = planId
    ? planId.charAt(0).toUpperCase() + planId.slice(1)
    : isPaid
      ? 'Active'
      : 'Free';

  return (
    <div>
      <div className="wunderland-header">
        <div className="wunderland-header__row">
          <div>
            <h2 className="wunderland-header__title">Account</h2>
            <p className="wunderland-header__subtitle">Billing, usage, and plan details</p>
          </div>
        </div>
      </div>

      {/* Subscription Card */}
      <div
        style={{
          padding: '20px 24px',
          borderRadius: 12,
          border: '1px solid rgba(201,162,39,0.12)',
          background: 'var(--card-bg, rgba(26,26,46,0.4))',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600,
              fontSize: '0.8125rem',
              color: 'var(--color-text, #e8e0d0)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Plan
          </span>
          <span
            className="badge badge--neutral"
            style={{ fontSize: '0.625rem' }}
          >
            {planLabel}
          </span>
        </div>

        <p
          style={{
            fontSize: '0.8125rem',
            color: 'var(--color-text-dim, #8a8aa0)',
            marginBottom: 16,
            lineHeight: 1.6,
          }}
        >
          {isPaid
            ? 'Your subscription is active. Manage billing or change plans below.'
            : 'You are on the free tier. Upgrade for higher daily credits and priority support.'}
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isPaid ? (
            <Link href="/app/account/billing" className="btn btn--primary btn--sm">
              Manage Billing
            </Link>
          ) : (
            <Link href="/pricing" className="btn btn--primary btn--sm">
              View Plans & Upgrade
            </Link>
          )}
        </div>
      </div>

      {/* Usage Dashboard */}
      <UsageDashboard />

      {/* Account Info */}
      <div
        style={{
          padding: '20px 24px',
          borderRadius: 12,
          border: '1px solid rgba(201,162,39,0.12)',
          background: 'var(--card-bg, rgba(26,26,46,0.4))',
          marginBottom: 20,
        }}
      >
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: 'var(--color-text, #e8e0d0)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            display: 'block',
            marginBottom: 16,
          }}
        >
          Account Details
        </span>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '8px 20px',
            fontSize: '0.8125rem',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          <span style={{ color: 'var(--color-text-dim, #8a8aa0)' }}>User ID</span>
          <span style={{ color: 'var(--color-text, #e8e0d0)', wordBreak: 'break-all' }}>
            {user.id}
          </span>
          {user.email && (
            <>
              <span style={{ color: 'var(--color-text-dim, #8a8aa0)' }}>Email</span>
              <span style={{ color: 'var(--color-text, #e8e0d0)' }}>{user.email}</span>
            </>
          )}
          {user.name && (
            <>
              <span style={{ color: 'var(--color-text-dim, #8a8aa0)' }}>Name</span>
              <span style={{ color: 'var(--color-text, #e8e0d0)' }}>{user.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link
          href="/app/dashboard"
          className="btn btn--holographic btn--sm"
          style={{ textDecoration: 'none' }}
        >
          My Agents
        </Link>
        <Link
          href="/app/agent-builder"
          className="btn btn--holographic btn--sm"
          style={{ textDecoration: 'none' }}
        >
          Build New Agent
        </Link>
        <Link
          href="/app/docs"
          className="btn btn--holographic btn--sm"
          style={{ textDecoration: 'none' }}
        >
          Documentation
        </Link>
      </div>
    </div>
  );
}
