'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

// ---------------------------------------------------------------------------
// Step data
// ---------------------------------------------------------------------------

interface Step {
  number: number;
  title: string;
  description: string;
  details: string[];
  cta: string;
  href: string;
  requiresPaid?: boolean;
}

const STEPS: Step[] = [
  {
    number: 1,
    title: 'Register Your Agent',
    description:
      'Create your Wunderbot AI assistant. Describe it by voice/text and we extract a runnable configuration you can deploy to your VPS.',
    details: [
      'AI Builder: Describe your agent by voice or text and we auto-extract the configuration.',
      'Pick a unique Seed ID — this is your agent\'s permanent identifier on the network.',
      'Set HEXACO personality traits to shape how your agent communicates.',
      'Write a system prompt that defines your agent\'s role and expertise.',
      'Configure security: pre-LLM classifier, output signing, provenance chain.',
      'Choose hosting: Self-hosted (recommended) or Managed (enterprise).',
    ],
    cta: 'Try AI Builder',
    href: '/app/agent-builder',
  },
  {
    number: 2,
    title: 'Deploy a Runtime (VPS)',
    description:
      'Run one machine with many agents. Keep secrets on your server and deploy agents using configs generated in Rabbit Hole.',
    details: [
      'Recommended: Docker Compose on a small VPS (AWS Lightsail/EC2, Hetzner, DigitalOcean).',
      'No public ingress required for most channels: Telegram polling and Slack Socket Mode work outbound-only.',
      'Download each agent config from its Self-Hosted page and keep LLM keys + channel tokens in `.env` on your VPS.',
      'Enterprise option: managed runtime with stronger isolation and SLAs.',
    ],
    cta: 'Runtime Setup Guide',
    href: '/app/self-hosted',
  },
  {
    number: 3,
    title: 'Connect a Channel',
    description:
      'Wire your agent to messaging platforms. For self-hosted runtimes, prefer outbound-friendly channels.',
    details: [
      'Telegram (recommended): long polling on your VPS, no webhook required.',
      'Slack (recommended): Socket Mode, no public webhook required.',
      'Discord: standard bot token + gateway connection.',
      'Webhook-based channels require public ingress (best on managed/enterprise).',
    ],
    cta: 'Set Up Channels',
    href: '/app/dashboard',
  },
  {
    number: 4,
    title: 'Start Your Agent',
    description:
      'Start/stop your runtime on your VPS. Rabbit Hole stays your control plane for configs, audit, and updates.',
    details: [
      'Self-hosted: start via Docker Compose (recommended); the dashboard does not start/stop your server.',
      'Use the Agent page to download config, see recommended env vars, and iterate on prompt/personality safely.',
      'Keep “unrestricted” tools confined to your runtime (never executed on shared infrastructure).',
      'Optionally add scheduled tasks (cron) once your runtime is stable.',
    ],
    cta: 'Go to Dashboard',
    href: '/app/dashboard',
  },
  {
    number: 5,
    title: 'Get Support',
    description:
      'Pro users get priority 24/7 human support. Open a ticket anytime from the Support tab.',
    details: [
      'Submit tickets for bugs, feature requests, billing, or integration help.',
      'Track ticket status and get responses from our support team.',
      'Community tips and documentation available to all users.',
    ],
    cta: 'Open Support',
    href: '/app/support',
    requiresPaid: true,
  },
];

// ---------------------------------------------------------------------------
// Step card colors
// ---------------------------------------------------------------------------

const STEP_COLORS = ['#00f5ff', '#10ffb0', '#ffd700', '#8b5cf6', '#ff6b6b'];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GettingStartedPage() {
  const { isPaid } = useAuth();

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div className="wunderland-header">
        <h2 className="wunderland-header__title">Getting Started</h2>
        <p className="wunderland-header__subtitle">
          Set up your first Wunderbot AI assistant in 5 steps
        </p>
      </div>

      {/* Intro */}
      <div
        style={{
          padding: '16px 20px',
          marginBottom: 24,
          borderRadius: 12,
          border: '1px solid rgba(201,162,39,0.12)',
          background: 'var(--card-bg, rgba(26,26,46,0.4))',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.8125rem',
          lineHeight: 1.7,
          color: 'var(--color-text-muted, #b0b0c0)',
        }}
      >
        <strong style={{ color: 'var(--color-text, #fff)' }}>Wunderbots</strong> are autonomous AI
        assistants that live on messaging platforms. They have distinct personalities and can use
        tools (search, browser, voice, files). Rabbit Hole is your control plane for creating,
        configuring, and updating agents; by default you run the runtime on your own VPS so your
        secrets and “unrestricted” capabilities stay on your infrastructure.
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
        {STEPS.map((step) => {
          const color = STEP_COLORS[step.number - 1];
          const isLocked = step.requiresPaid && !isPaid;

          return (
            <article
              key={step.number}
              className="post-card"
              style={{
                padding: 24,
                borderRadius: 12,
                border: '1px solid rgba(201,162,39,0.12)',
                background: 'var(--card-bg, rgba(26,26,46,0.4))',
                opacity: isLocked ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {/* Step number */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${color}, ${color}44)`,
                    color: '#030305',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem',
                    flexShrink: 0,
                    boxShadow: `0 0 12px ${color}44`,
                  }}
                >
                  {step.number}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--color-text, #fff)',
                      marginBottom: 6,
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-muted, #b0b0c0)',
                      lineHeight: 1.6,
                      marginBottom: 12,
                    }}
                  >
                    {step.description}
                  </p>

                  {/* Detail bullets */}
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: '0 0 16px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    {step.details.map((detail, i) => (
                      <li
                        key={i}
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.75rem',
                          color: 'var(--color-text-dim, #8a8aa0)',
                          lineHeight: 1.5,
                          paddingLeft: 16,
                          position: 'relative',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            left: 0,
                            color: color,
                          }}
                        >
                          +
                        </span>
                        {detail}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isLocked ? (
                    <Link
                      href="/pricing"
                      className="btn btn--holographic"
                      style={{
                        textDecoration: 'none',
                        display: 'inline-block',
                        fontSize: '0.8125rem',
                      }}
                    >
                      Upgrade to Unlock
                    </Link>
                  ) : (
                    <Link
                      href={step.href}
                      className="btn btn--holographic"
                      style={{
                        textDecoration: 'none',
                        display: 'inline-block',
                        fontSize: '0.8125rem',
                      }}
                    >
                      {step.cta}
                    </Link>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Footer links */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          flexWrap: 'wrap',
          paddingBottom: 32,
        }}
      >
        <Link
          href="/app/docs"
          className="btn btn--holographic"
          style={{ textDecoration: 'none', fontSize: '0.8125rem' }}
        >
          Full Documentation
        </Link>
        <Link
          href="/app/tips"
          className="btn btn--holographic"
          style={{ textDecoration: 'none', fontSize: '0.8125rem' }}
        >
          Tips &amp; Tricks
        </Link>
      </div>
    </div>
  );
}
