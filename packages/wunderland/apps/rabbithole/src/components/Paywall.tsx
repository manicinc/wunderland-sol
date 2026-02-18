'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { TRIAL_DAYS } from '@/config/pricing';

// ---------------------------------------------------------------------------
// Paywall — soft overlay for unauthenticated / unpaid users
// ---------------------------------------------------------------------------

interface PaywallProps {
  /** What the user tried to do (shown in the overlay text) */
  action?: string;
  /** Override the default CTA button text */
  ctaText?: string;
  /** Override the default CTA link target */
  ctaHref?: string;
  /** If true, requires payment (not just auth) */
  requirePayment?: boolean;
  /** Called when the user dismisses the overlay (optional) */
  onDismiss?: () => void;
  children?: React.ReactNode;
}

export default function Paywall({
  action = 'access this feature',
  ctaText,
  ctaHref,
  requirePayment = false,
  onDismiss,
  children,
}: PaywallProps) {
  const { isAuthenticated, isPaid } = useAuth();

  // Determine if the paywall should show
  const needsAuth = !isAuthenticated;
  const needsPayment = requirePayment && isAuthenticated && !isPaid;
  const blocked = needsAuth || needsPayment;

  if (!blocked) {
    return <>{children}</>;
  }

  const heading = needsAuth ? 'Sign in to continue' : 'Upgrade to unlock';
  const description = needsAuth
    ? `Create a free account to ${action}.`
    : `A paid subscription is required to ${action}. Start with a ${TRIAL_DAYS}-day free trial (control plane). Your VPS + LLM usage are billed by your providers.`;
  const href = ctaHref ?? (needsAuth ? '/login' : '/pricing');
  const buttonText = ctaText ?? (needsAuth ? 'Sign in' : `Start ${TRIAL_DAYS}-day trial`);

  return (
    <div style={{ position: 'relative' }}>
      {/* Blurred content preview */}
      {children && (
        <div
          style={{
            filter: 'blur(6px)',
            opacity: 0.4,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
          aria-hidden
        >
          {children}
        </div>
      )}

      {/* Glass overlay */}
      <div
        style={{
          position: children ? 'absolute' : 'relative',
          inset: children ? 0 : undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          padding: children ? 0 : '3rem 1rem',
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: '100%',
            padding: '2rem',
            background: 'color-mix(in srgb, var(--color-elevated) 85%, transparent)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: 'var(--border-subtle)',
            borderRadius: 16,
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Lock icon */}
          <div
            style={{
              width: 48,
              height: 48,
              margin: '0 auto 1rem',
              borderRadius: 12,
              background:
                'linear-gradient(135deg, var(--color-accent-muted), rgba(168,85,247,0.15))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>

          <h3
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              margin: '0 0 0.5rem',
            }}
          >
            {heading}
          </h3>

          <p
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
              lineHeight: 1.5,
              margin: '0 0 1.5rem',
            }}
          >
            {description}
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href={href}
              className="btn btn--primary"
              style={{
                textDecoration: 'none',
                padding: '10px 24px',
                fontSize: '0.875rem',
              }}
            >
              {buttonText}
            </Link>
            {onDismiss && (
              <button
                className="btn btn--ghost"
                onClick={onDismiss}
                style={{ padding: '10px 24px', fontSize: '0.875rem' }}
              >
                Maybe later
              </button>
            )}
          </div>

          {needsAuth && (
            <p
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.6875rem',
                color: 'var(--color-text-dim)',
                marginTop: '1rem',
              }}
            >
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}
              >
                Sign up free
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PaywallInline — smaller inline CTA for specific actions (vote, engage, etc.)
// ---------------------------------------------------------------------------

interface PaywallInlineProps {
  action: string;
  requirePayment?: boolean;
}

export function PaywallInline({ action, requirePayment = false }: PaywallInlineProps) {
  const { isAuthenticated, isPaid } = useAuth();

  const needsAuth = !isAuthenticated;
  const needsPayment = requirePayment && isAuthenticated && !isPaid;

  if (!needsAuth && !needsPayment) return null;

  const href = needsAuth ? '/login' : '/pricing';
  const text = needsAuth ? 'Sign in' : 'Upgrade';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: 'var(--color-accent-muted)',
        border: '1px solid var(--color-accent-border)',
        borderRadius: 8,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '0.6875rem',
        color: 'var(--color-text-muted)',
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(0,245,255,0.6)"
        strokeWidth="2.5"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
      <span>
        <Link href={href} style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
          {text}
        </Link>{' '}
        to {action}
      </span>
    </div>
  );
}
