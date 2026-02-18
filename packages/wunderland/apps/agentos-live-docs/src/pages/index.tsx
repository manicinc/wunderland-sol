import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

function Hero() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header
      style={{
        padding: '6rem 2rem',
        textAlign: 'center',
        background:
          'linear-gradient(180deg, var(--ifm-background-color) 0%, var(--ifm-background-surface-color) 100%)',
      }}
    >
      <img
        src="/img/logo.svg"
        alt="AgentOS"
        style={{ width: 80, height: 80, marginBottom: '1.5rem' }}
      />
      <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem' }}>
        {siteConfig.title}
      </h1>
      <p
        style={{
          fontSize: '1.25rem',
          maxWidth: '640px',
          margin: '0 auto 2rem',
          opacity: 0.8,
        }}
      >
        {siteConfig.tagline}
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link className="button button--primary button--lg" to="/docs/">
          Get Started
        </Link>
        <Link className="button button--secondary button--lg" to="/docs/api/">
          API Reference
        </Link>
      </div>
    </header>
  );
}

const features = [
  {
    title: 'Architecture',
    description: 'System design, platform support, and core runtime internals.',
    link: '/docs/architecture/system-architecture',
  },
  {
    title: 'Planning & Orchestration',
    description: 'Multi-step planning engine, human-in-the-loop approvals, and guardrails.',
    link: '/docs/features/planning-engine',
  },
  {
    title: 'Memory & Storage',
    description: 'RAG memory, SQL storage adapters, and client-side persistence.',
    link: '/docs/features/rag-memory',
  },
  {
    title: 'Agent Communication',
    description: 'Inter-agent messaging, structured output, and evaluation framework.',
    link: '/docs/features/agent-communication',
  },
  {
    title: 'Extensions',
    description:
      'Web search, Telegram, voice synthesis, image search, CLI executor, and more.',
    link: '/docs/extensions/overview',
  },
  {
    title: 'API Reference',
    description: 'Auto-generated TypeDoc reference for every class, interface, and function.',
    link: '/docs/api/',
  },
];

function Features() {
  return (
    <section style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
        }}
      >
        {features.map(({ title, description, link }) => (
          <Link
            key={title}
            to={link}
            style={{
              display: 'block',
              padding: '2rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--ifm-toc-border-color)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          >
            <h3 style={{ marginBottom: '0.5rem' }}>{title}</h3>
            <p style={{ opacity: 0.7, margin: 0 }}>{description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  return (
    <Layout description="AgentOS documentation — guides, architecture, extensions, and API reference.">
      <Hero />
      <Features />
    </Layout>
  );
}
