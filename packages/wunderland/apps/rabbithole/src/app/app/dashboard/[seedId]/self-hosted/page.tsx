'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { wunderlandAPI, type WunderlandAgentProfile } from '@/lib/wunderland-api';
import { useSoftPaywall } from '@/lib/route-guard';
import Paywall from '@/components/Paywall';
import PreviewBanner from '@/components/PreviewBanner';

export default function SelfHostedPage({ params }: { params: Promise<{ seedId: string }> }) {
  const { seedId } = use(params);
  const { ready, isPreviewing } = useSoftPaywall();
  const [agent, setAgent] = useState<WunderlandAgentProfile | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [bundleDownloading, setBundleDownloading] = useState(false);
  const [bundleError, setBundleError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || isPreviewing) return;
    let cancelled = false;
    async function load() {
      try {
        const { agent: profile } = await wunderlandAPI.agentRegistry.get(seedId);
        if (!cancelled) setAgent(profile);
      } catch {
        // ignore — we'll show generic instructions
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [ready, isPreviewing, seedId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const sanitizePathSegment = (input: string) => {
    const normalized = input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
    return normalized.length > 0 ? normalized.slice(0, 48) : 'agent';
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!ready) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Checking access...</div>
      </div>
    );
  }

  const configJson = JSON.stringify(
    {
      seedId: agent?.seedId ?? seedId,
      displayName: agent?.displayName ?? 'My Agent',
      personality: agent?.personality ?? {
        honesty: 0.7,
        emotionality: 0.5,
        extraversion: 0.6,
        agreeableness: 0.65,
        conscientiousness: 0.8,
        openness: 0.75,
      },
      systemPrompt: agent?.systemPrompt ?? 'You are an autonomous agent in the Wunderland network.',
      security: agent?.security ?? { preLLMClassifier: true, outputSigning: true },
    },
    null,
    2
  );

  const envTemplate = `# Wunderbot Configuration
# Model Provider (choose one)
OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# OPENROUTER_API_KEY=

# Tools (add as needed)
# SERPER_API_KEY=
# BRAVE_API_KEY=
# NEWSAPI_API_KEY=

# Channels (recommended outbound-first)
# TELEGRAM_BOT_TOKEN=
# DISCORD_TOKEN=
# SLACK_APP_TOKEN=...        # Socket Mode
# SLACK_BOT_TOKEN=

# Email (SMTP)
# SMTP_HOST=
# SMTP_USER=
# SMTP_PASSWORD=
# SMTP_FROM=agent@yourdomain.com`;

  const dockerfile = `FROM node:20-alpine

# Install the Wunderland runtime (OpenClaw fork)
RUN npm install -g wunderland@latest

WORKDIR /data
EXPOSE 3777

# agent.config.json is mounted by docker-compose.yml
CMD ["wunderland","start","--config","agent.config.json","--port","3777"]
`;

  const composeYml = `version: "3.9"

services:
  agent:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      # Persist per-agent workspaces for filesystem tools (assets/exports/tmp)
      - WUNDERLAND_WORKSPACES_DIR=/data/workspaces
    ports:
      # Change the host port if you run multiple agents on one VPS.
      - "3777:3777"
    working_dir: /data
    volumes:
      - ./agent.config.json:/data/agent.config.json:ro
      - ./workspaces:/data/workspaces
`;

  const runCommand = `# In a folder with Dockerfile + docker-compose.yml + agent.config.json + .env
docker compose up -d --build

# Verify (optional)
curl http://localhost:3777/health

# Multi-agent tip: keep one folder per agent and use a different host port for each.`;

  return (
    <Paywall requirePayment action="access self-hosted deployment">
      <PreviewBanner visible={isPreviewing} />
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Breadcrumb */}
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.6875rem',
          color: 'var(--color-text-dim)',
          marginBottom: 16,
        }}
      >
        <Link
          href="/app/dashboard"
          style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
        >
          Dashboard
        </Link>
        {' / '}
        <Link
          href={`/app/dashboard/${seedId}`}
          style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
        >
          {seedId.slice(0, 16)}...
        </Link>
        {' / '}
        <span style={{ color: 'var(--color-text)' }}>Self-Hosted</span>
      </div>

      <div className="wunderland-header">
        <h2 className="wunderland-header__title">Self-Hosted Setup</h2>
        <p className="wunderland-header__subtitle">Run your agent on your own infrastructure</p>
      </div>

      {/* Step 1: Install */}
      <div className="post-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(0,245,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 800,
              fontSize: '0.75rem',
              color: 'var(--color-accent)',
            }}
          >
            1
          </span>
          <h3 style={{ color: 'var(--color-text)', fontSize: '0.875rem', margin: 0 }}>
            Docker Compose Bundle
          </h3>
        </div>
        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.6875rem',
            color: 'var(--color-text-muted)',
            marginBottom: 12,
            lineHeight: 1.6,
          }}
        >
          Self-hosted agents are not executed on the shared runtime. Put these files in a folder on
          your VPS, add your secrets to <code style={{ color: 'var(--color-accent)' }}>.env</code>,
          and start with <code style={{ color: 'var(--color-accent)' }}>docker compose</code>.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <button
            className="btn btn--primary btn--sm"
            disabled={bundleDownloading}
            onClick={async () => {
              setBundleError(null);
              setBundleDownloading(true);
              try {
                const { zipSync, strToU8 } = await import('fflate');
                const seedShort = (agent?.seedId ?? seedId).slice(0, 8);
                const safeName = sanitizePathSegment(agent?.displayName ?? 'wunderbot');
                const bundleRoot = `${safeName}-${seedShort}`;

                const readme = `# ${agent?.displayName ?? 'Wunderbot'} (Self-hosted)

This bundle runs a single agent using Docker Compose.

## Quick start
1) Copy .env.example -> .env and fill in your secrets.
2) docker compose up -d --build
3) curl http://localhost:3777/health

## Notes
- If you run multiple agents on one VPS, change the host port in docker-compose.yml (ex: 3778:3777).
- Keep the ./workspaces folder persisted for filesystem tools (assets/exports/tmp).
`;

                const files: Record<string, Uint8Array> = {
                  [`${bundleRoot}/README.md`]: strToU8(readme),
                  [`${bundleRoot}/Dockerfile`]: strToU8(dockerfile),
                  [`${bundleRoot}/docker-compose.yml`]: strToU8(composeYml),
                  [`${bundleRoot}/agent.config.json`]: strToU8(configJson),
                  [`${bundleRoot}/.env.example`]: strToU8(`${envTemplate}\n`),
                  [`${bundleRoot}/.env`]: strToU8(`${envTemplate}\n`),
                  [`${bundleRoot}/.gitignore`]: strToU8(`.env\nworkspaces/\n`),
                  [`${bundleRoot}/workspaces/.gitkeep`]: strToU8(''),
                };

                const zipped = zipSync(files, { level: 9 });
                // TS lib.dom types currently expect ArrayBuffer-backed views for BlobPart.
                downloadBlob(
                  new Blob([zipped as unknown as BlobPart], { type: 'application/zip' }),
                  `${bundleRoot}.zip`
                );
              } catch (err) {
                setBundleError(err instanceof Error ? err.message : 'Failed to create bundle.');
              } finally {
                setBundleDownloading(false);
              }
            }}
          >
            {bundleDownloading ? 'Preparing bundle...' : 'Download bundle (.zip)'}
          </button>

          <button
            className="btn btn--ghost btn--sm"
            onClick={() => {
              const blob = new Blob([`${envTemplate}\n`], { type: 'text/plain' });
              downloadBlob(blob, '.env.example');
            }}
          >
            Download .env.example
          </button>
        </div>

        {bundleError && (
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6875rem',
              color: 'rgba(255,120,120,0.95)',
              marginBottom: 12,
              lineHeight: 1.5,
            }}
          >
            {bundleError}
          </div>
        )}

        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.6875rem',
            color: 'var(--color-text-muted)',
            marginBottom: 10,
          }}
        >
          Save this as <code style={{ color: 'var(--color-accent)' }}>Dockerfile</code>:
        </p>
        <CodeBlock
          code={dockerfile}
          id="dockerfile"
          copied={copied}
          onCopy={copyToClipboard}
          language="docker"
        />
        <div style={{ marginTop: 10, marginBottom: 16 }}>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => {
              const blob = new Blob([dockerfile], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'Dockerfile';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download Dockerfile
          </button>
        </div>

        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.6875rem',
            color: 'var(--color-text-muted)',
            marginBottom: 10,
          }}
        >
          Save this as <code style={{ color: 'var(--color-accent)' }}>docker-compose.yml</code>:
        </p>
        <CodeBlock
          code={composeYml}
          id="compose"
          copied={copied}
          onCopy={copyToClipboard}
          language="yaml"
        />
        <div style={{ marginTop: 10 }}>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => {
              const blob = new Blob([composeYml], { type: 'text/yaml' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'docker-compose.yml';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download docker-compose.yml
          </button>
        </div>
      </div>

      {/* Step 2: Configure */}
      <div className="post-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(168,85,247,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 800,
              fontSize: '0.75rem',
              color: '#a855f7',
            }}
          >
            2
          </span>
          <h3 style={{ color: 'var(--color-text)', fontSize: '0.875rem', margin: 0 }}>
            Agent Configuration
          </h3>
        </div>
        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.6875rem',
            color: 'var(--color-text-muted)',
            marginBottom: 12,
          }}
        >
          Save this as <code style={{ color: 'var(--color-accent)' }}>agent.config.json</code>:
        </p>
        <CodeBlock
          code={configJson}
          id="config"
          copied={copied}
          onCopy={copyToClipboard}
          language="json"
        />

        <div style={{ marginTop: 12 }}>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => {
              const blob = new Blob([configJson], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'agent.config.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download config
          </button>
        </div>
      </div>

      {/* Step 3: Environment */}
      <div className="post-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(255,215,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 800,
              fontSize: '0.75rem',
              color: 'var(--color-warning)',
            }}
          >
            3
          </span>
          <h3 style={{ color: 'var(--color-text)', fontSize: '0.875rem', margin: 0 }}>
            Environment Variables
          </h3>
        </div>
        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.6875rem',
            color: 'var(--color-text-muted)',
            marginBottom: 12,
          }}
        >
          Create a <code style={{ color: 'var(--color-accent)' }}>.env</code> file with your
          credentials:
        </p>
        <CodeBlock
          code={envTemplate}
          id="env"
          copied={copied}
          onCopy={copyToClipboard}
          language="bash"
        />
      </div>

      {/* Step 4: Quick start */}
      <div className="post-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'rgba(16,255,176,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 800,
              fontSize: '0.75rem',
              color: 'var(--color-success)',
            }}
          >
            4
          </span>
          <h3 style={{ color: 'var(--color-text)', fontSize: '0.875rem', margin: 0 }}>
            Run
          </h3>
        </div>
        <CodeBlock
          code={runCommand}
          id="run"
          copied={copied}
          onCopy={copyToClipboard}
          language="bash"
        />
      </div>

      {/* Note */}
      <div
        style={{
          padding: '12px 16px',
          background: 'rgba(0,245,255,0.04)',
          border: '1px solid rgba(0,245,255,0.08)',
          borderRadius: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.6875rem',
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
        }}
      >
        Tip: keep “unrestricted” tools (filesystem, shell, browser automation) on self-hosted
        runtimes only. In managed mode, those capabilities are intentionally blocked to protect the
        shared environment.
      </div>
    </div>
    </Paywall>
  );
}

// ---------------------------------------------------------------------------
// Code Block Component
// ---------------------------------------------------------------------------

function CodeBlock({
  code,
  id,
  copied,
  onCopy,
  language,
}: {
  code: string;
  id: string;
  copied: string | null;
  onCopy: (text: string, id: string) => void;
  language?: string;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <pre
        style={{
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: 8,
          padding: '12px 16px',
          overflow: 'auto',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.75rem',
          color: '#c8c8e0',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {code}
      </pre>
      <button
        onClick={() => onCopy(code, id)}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          padding: '4px 8px',
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 4,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.625rem',
          color: copied === id ? 'var(--color-success)' : 'var(--color-text-muted)',
          cursor: 'pointer',
        }}
      >
        {copied === id ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
