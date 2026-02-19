'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Tab Data ────────────────────────────────────────────────────────────────

interface EcosystemTab {
  id: string;
  label: string;
  badge: string;
  title: string;
  subtitle: string;
  highlights: string[];
  stats: { label: string; value: string }[];
  cta: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
  codeSnippet?: { label: string; code: string };
}

const TABS: EcosystemTab[] = [
  {
    id: 'wunderland',
    label: 'Wunderland',
    badge: 'Open Source',
    title: 'OpenClaw Fork with Enhanced Security',
    subtitle:
      'Self-host AI agents with HEXACO personality, adaptive mood, and a 3-layer security pipeline — from dangerous to paranoid.',
    highlights: [
      '5 named security tiers (dangerous → paranoid)',
      'HEXACO personality model with 5 presets',
      '3-layer pipeline: classifier → auditor → signer',
      'Circuit breaker, cost guard, stuck detection — prevents runaway loops',
      'LLM-backed sentiment & mood engine',
      '28 channels (messaging + social; incl IRC and Zalo Personal), 13 LLM providers',
      '18 curated skills: GitHub, Notion, Slack, Spotify, coding-agent, and more',
      'Agent immutability with sealed configs',
    ],
    codeSnippet: { label: 'Add a skill', code: 'wunderland skills enable github weather' },
    stats: [
      { label: 'Channels', value: '28' },
      { label: 'Providers', value: '13' },
      { label: 'Extensions', value: '30+' },
      { label: 'Skills', value: '18' },
    ],
    cta: { label: 'Visit wunderland.sh', href: 'https://wunderland.sh' },
    ctaSecondary: { label: 'Read Docs', href: 'https://docs.wunderland.sh' },
  },
  {
    id: 'rabbithole',
    label: 'Rabbit Hole',
    badge: 'Control Plane',
    title: 'Export Docker Compose Bundles',
    subtitle:
      'A dashboard for creating agents from voice/text, configuring personality + security, and exporting Docker Compose bundles for your self-hosted runtime.',
    highlights: [
      'Indie-first: self-hosted runtime by default',
      'Export Docker Compose + config + env templates (secrets stay on your VPS)',
      'Prompt injection defenses + step-up authorization defaults',
      'Curated skills/extensions from official registries only',
      'Optional enterprise managed runtime (stronger isolation + SLAs)',
    ],
    stats: [
      { label: 'Default', value: 'Self-hosted' },
      { label: 'Runtime', value: '1 VPS' },
      { label: 'Integrations', value: '30+' },
      { label: 'Trial', value: '3 days' },
    ],
    cta: { label: 'View Pricing', href: '#pricing' },
    ctaSecondary: { label: 'Open Dashboard', href: '/app' },
  },
  {
    id: 'agentos',
    label: 'AgentOS',
    badge: 'Runtime',
    title: 'The Cognitive Foundation',
    subtitle:
      'AgentOS is the open-source cognitive runtime powering Wunderland — personas, streaming, tools, RAG, and a rich extension ecosystem.',
    highlights: [
      'GMI cognitive architecture',
      'Safety primitives: circuit breaker, cost guard, stuck detection',
      'Streaming-first with tool orchestration',
      'Extension system: channels, tools, skills',
      '@framers/agentos-skills-registry: 18 curated skills + typed catalog with query/filter/lazy-load',
      '26 tool extensions + 28 channel adapters via @framers/agentos-extensions-registry',
      'Multi-provider inference routing',
    ],
    stats: [
      { label: 'Extensions', value: '30+' },
      { label: 'Providers', value: '13' },
      { label: 'Skills', value: '18' },
      { label: 'NPM Packages', value: '5+' },
    ],
    codeSnippet: { label: 'Query the catalog', code: "import { searchSkills } from '@framers/agentos-skills-registry/catalog'" },
    cta: { label: 'AgentOS Docs', href: 'https://docs.agentos.sh' },
  },
];

// ── Auto-advance interval (ms) ──────────────────────────────────────────────
const AUTO_ADVANCE_MS = 8000;

// ── Component ───────────────────────────────────────────────────────────────

export function EcosystemCarousel() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const advance = useCallback(() => {
    setActiveIdx((prev) => (prev + 1) % TABS.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(advance, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused, advance]);

  const tab = TABS[activeIdx];

  return (
    <section
      className="ecosystem"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="container">
        <div className="ecosystem__header">
          <h2 className="ecosystem__title">The Ecosystem</h2>
          <p className="ecosystem__subtitle">
            Three layers — one platform for autonomous AI agents
          </p>
        </div>

        {/* Tab Selector */}
        <div className="ecosystem__tabs">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              className={`ecosystem__tab${i === activeIdx ? ' ecosystem__tab--active' : ''}`}
              onClick={() => setActiveIdx(i)}
            >
              <span className="ecosystem__tab-label">{t.label}</span>
              <span className="ecosystem__tab-badge">{t.badge}</span>
            </button>
          ))}
        </div>

        {/* Content Panel */}
        <div className="ecosystem__panel" key={tab.id}>
          <div className="ecosystem__panel-content">
            <h3 className="ecosystem__panel-title">{tab.title}</h3>
            <p className="ecosystem__panel-subtitle">{tab.subtitle}</p>

            <ul className="ecosystem__highlights">
              {tab.highlights.map((h) => (
                <li key={h} className="ecosystem__highlight">
                  {h}
                </li>
              ))}
            </ul>

            {tab.codeSnippet && (
              <div className="ecosystem__snippet">
                <span className="ecosystem__snippet-label">{tab.codeSnippet.label}</span>
                <code className="ecosystem__snippet-code">{tab.codeSnippet.code}</code>
              </div>
            )}

            <div className="ecosystem__panel-actions">
              <a href={tab.cta.href} className="btn btn--primary">
                {tab.cta.label}
              </a>
              {tab.ctaSecondary && (
                <a href={tab.ctaSecondary.href} className="btn btn--ghost">
                  {tab.ctaSecondary.label}
                </a>
              )}
            </div>
          </div>

          <div className="ecosystem__panel-stats">
            {tab.stats.map((s) => (
              <div key={s.label} className="ecosystem__stat">
                <div className="ecosystem__stat-value">{s.value}</div>
                <div className="ecosystem__stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Dots */}
        <div className="ecosystem__dots">
          {TABS.map((_, i) => (
            <button
              key={i}
              className={`ecosystem__dot${i === activeIdx ? ' ecosystem__dot--active' : ''}`}
              onClick={() => setActiveIdx(i)}
              aria-label={`Go to tab ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
