'use client';

import Link from 'next/link';
import { TRIAL_DAYS } from '@/config/pricing';

/**
 * Sticky banner shown to authenticated-but-unpaid users.
 * Indicates they're viewing sample/demo data with a CTA to upgrade.
 */
export default function PreviewBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 20px',
        marginBottom: 20,
        borderRadius: 12,
        border: '1px solid rgba(201,162,39,0.15)',
        background: 'linear-gradient(135deg, rgba(201,162,39,0.06), rgba(168,85,247,0.04))',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '0.75rem',
        flexWrap: 'wrap',
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(201,162,39,0.6)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ color: 'var(--color-text-muted)' }}>
          Upgrade to register and manage your own AI agents.
        </span>
      </div>
      <Link
        href="/pricing"
        className="btn btn--primary btn--sm"
        style={{ textDecoration: 'none', flexShrink: 0 }}
      >
        Start {TRIAL_DAYS}-day trial
      </Link>
    </div>
  );
}
