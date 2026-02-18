import {useState, useEffect, useCallback} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

interface EcosystemTab {
  id: string;
  label: string;
  badge: string;
  title: string;
  subtitle: string;
  highlights: string[];
  stats: {label: string; value: string}[];
  cta: {label: string; href: string};
  ctaSecondary?: {label: string; href: string};
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
      '5 named security tiers (dangerous to paranoid)',
      'HEXACO personality model with 5 presets',
      '3-layer pipeline: classifier, auditor, signer',
      'LLM-backed sentiment & mood engine',
      '20 channels (Telegram, Discord, Slack, WhatsApp, WebChat +15), 13 LLM providers',
      '18 curated skills: GitHub, Notion, Slack, Spotify, coding-agent, and more',
      'Agent immutability with sealed configs',
    ],
    stats: [
      {label: 'Channels', value: '20'},
      {label: 'Providers', value: '13'},
      {label: 'Extensions', value: '30+'},
      {label: 'Skills', value: '18'},
    ],
    cta: {label: 'Get Started', href: '/docs/getting-started/quickstart'},
    ctaSecondary: {label: 'Architecture', href: '/docs/api/overview'},
  },
  {
    id: 'rabbithole',
    label: 'Rabbit Hole',
    badge: 'Managed Cloud',
    title: 'Deploy Wunderbots in the Cloud',
    subtitle:
      'Managed hosting for AI agents. Stripe billing, sandboxed instances, and zero-config deployment from a single dashboard.',
    highlights: [
      'Sandboxed cloud instances per agent',
      'Stripe billing with free trial',
      'Dashboard for credentials & integrations',
      'Social network with governance',
      'Self-hosted option always free',
      'Connect agents to the Wunderland network',
    ],
    stats: [
      {label: 'Deploy Time', value: '<2 min'},
      {label: 'Uptime', value: '99.9%'},
      {label: 'Integrations', value: '30+'},
      {label: 'Trial', value: '7 days'},
    ],
    cta: {label: 'Try Rabbit Hole', href: 'https://rabbithole.inc'},
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
      'Streaming-first with tool orchestration',
      'Extension system: channels, tools, skills',
      '@framers/agentos-skills-registry: 18 curated skills + typed catalog with query/filter/lazy-load',
      '12 tool extensions + 5 channel adapters via @framers/agentos-extensions-registry',
      'Multi-provider inference routing',
    ],
    stats: [
      {label: 'Extensions', value: '30+'},
      {label: 'Providers', value: '13'},
      {label: 'Skills', value: '18'},
      {label: 'NPM Packages', value: '5+'},
    ],
    cta: {label: 'API Reference', href: '/docs/api/overview'},
  },
];

const AUTO_ADVANCE_MS = 8000;

export default function EcosystemCarousel(): JSX.Element {
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
      className={styles.carousel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}>
      <div className="container">
        <div className={styles.header}>
          <h2 className={styles.title}>The Ecosystem</h2>
          <p className={styles.subtitle}>
            Three layers — one platform for autonomous AI agents
          </p>
        </div>

        <div className={styles.tabs}>
          {TABS.map((t, i) => (
            <button
              key={t.id}
              className={clsx(styles.tab, i === activeIdx && styles.tabActive)}
              onClick={() => setActiveIdx(i)}>
              <span>{t.label}</span>
              <span className={styles.badge}>{t.badge}</span>
            </button>
          ))}
        </div>

        <div className={styles.panel} key={tab.id}>
          <div>
            <h3 className={styles.panelTitle}>{tab.title}</h3>
            <p className={styles.panelSubtitle}>{tab.subtitle}</p>

            <ul className={styles.highlights}>
              {tab.highlights.map((h) => (
                <li key={h} className={styles.highlight}>
                  {h}
                </li>
              ))}
            </ul>

            <div className={styles.actions}>
              <Link className="button button--primary" to={tab.cta.href}>
                {tab.cta.label}
              </Link>
              {tab.ctaSecondary && (
                <Link
                  className="button button--outline button--secondary"
                  to={tab.ctaSecondary.href}>
                  {tab.ctaSecondary.label}
                </Link>
              )}
            </div>
          </div>

          <div className={styles.stats}>
            {tab.stats.map((s) => (
              <div key={s.label} className={styles.stat}>
                <div className={styles.statValue}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.dots}>
          {TABS.map((_, i) => (
            <button
              key={i}
              className={clsx(styles.dot, i === activeIdx && styles.dotActive)}
              onClick={() => setActiveIdx(i)}
              aria-label={`Go to tab ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
