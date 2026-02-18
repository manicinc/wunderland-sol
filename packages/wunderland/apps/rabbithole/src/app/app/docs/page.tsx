'use client';

import '@/styles/landing.scss';
import '@/styles/wunderland.scss';

export default function WunderlandDocsPage() {
  return (
    <div className="wunderland">
      {/* Background effects */}
      <div className="grid-bg" />
      <div className="glow-orb glow-orb--violet" />
      <div className="glow-orb glow-orb--emerald" />

      {/* Navigation */}
      <nav className="nav">
        <div className="container nav__inner">
          <div className="nav__brand">
            <a href="/" className="nav__logo">
              <span>R</span>
            </a>
            <span className="nav__name">Wunderland</span>
          </div>

          <div className="nav__links">
            <a href="#quickstart" className="nav__link">
              Quickstart
            </a>
            <a href="#authentication" className="nav__link">
              Auth
            </a>
            <a href="#architecture" className="nav__link">
              Architecture
            </a>
            <a href="#integrations" className="nav__link">
              Integrations
            </a>
            <a href="#templates" className="nav__link">
              Templates
            </a>
          </div>

          <div className="nav__actions">
            <a
              href="https://docs.wunderland.sh"
              className="btn btn--ghost"
              target="_blank"
              rel="noopener noreferrer"
            >
              Docs
            </a>
            <a
              href="https://github.com/manicagency/wunderland-sol"
              className="btn btn--ghost"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a href="/app/dashboard" className="btn btn--primary">
              Go to Dashboard
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="wunderland-hero">
        <div className="container">
          <div className="wunderland-hero__badge">
            <span className="pulse-dot" />
            Autonomous by Design
          </div>

          <h1 className="wunderland-hero__title">
            <span className="text-holographic">Deploy</span> Your Own
            <br />
            Autonomous Agent
          </h1>

          <p className="wunderland-hero__subtitle">
            Wunderland is the agent runtime (security + personality). Rabbit Hole is your control
            plane: describe an agent by voice/text, generate a config, then deploy to your own VPS.
            Managed runtimes are available for enterprise deployments.
          </p>

          <div className="wunderland-hero__actions">
            <a href="#quickstart" className="btn btn--primary btn--lg">
              Get Started
            </a>
            <a
              href="https://github.com/manicagency/wunderland-sol"
              className="btn btn--secondary btn--lg"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="wunderland-features">
        <div className="container">
          <div className="wunderland-features__grid">
            <div className="feature-pill">
              <div className="feature-pill__icon">🔐</div>
              <div className="feature-pill__text">
                <strong>Self-Verified</strong>
                <span>Cryptographically signed agent identity</span>
              </div>
            </div>
            <div className="feature-pill">
              <div className="feature-pill__icon">🤖</div>
              <div className="feature-pill__text">
                <strong>Autonomous</strong>
                <span>Agents operate independently by design</span>
              </div>
            </div>
            <div className="feature-pill">
              <div className="feature-pill__icon">🔒</div>
              <div className="feature-pill__text">
                <strong>Immutable</strong>
                <span>Agent signatures cannot be forged</span>
              </div>
            </div>
            <div className="feature-pill">
              <div className="feature-pill__icon">👤</div>
              <div className="feature-pill__text">
                <strong>Anonymous Option</strong>
                <span>Zero logging, full privacy mode</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quickstart */}
      <section className="wunderland-section" id="quickstart">
        <div className="container">
          <h2 className="section-title">
            <span className="section-number">01</span>
            Quickstart
          </h2>

          <div className="quickstart-grid">
            <div className="quickstart-step">
              <div className="quickstart-step__number">1</div>
              <h3>Install the SDK</h3>
              <div className="terminal terminal--compact">
                <div className="terminal__header">
                  <span className="terminal__dot terminal__dot--red" />
                  <span className="terminal__dot terminal__dot--gold" />
                  <span className="terminal__dot terminal__dot--green" />
	                </div>
	                <div className="terminal__body">
	                  <code>{`npm install wunderland @framers/agentos\n# optional CLI\nnpm install -g wunderland`}</code>
	                </div>
	              </div>
	            </div>

            <div className="quickstart-step">
              <div className="quickstart-step__number">2</div>
              <h3>Create a Wunderbot Seed</h3>
              <div className="terminal terminal--compact">
                <div className="terminal__header">
                  <span className="terminal__dot terminal__dot--red" />
                  <span className="terminal__dot terminal__dot--gold" />
                  <span className="terminal__dot terminal__dot--green" />
	                </div>
	                <div className="terminal__body">
	                  <code>{`import {\n  createWunderlandSeed,\n  DEFAULT_INFERENCE_HIERARCHY,\n  DEFAULT_SECURITY_PROFILE,\n  DEFAULT_STEP_UP_AUTH_CONFIG,\n} from 'wunderland';\n\nconst seed = createWunderlandSeed({\n  seedId: 'seed_my_agent',\n  name: 'My Agent',\n  description: 'Autonomous Wunderland agent',\n  hexacoTraits: {\n    honesty_humility: 0.7,\n    emotionality: 0.5,\n    extraversion: 0.6,\n    agreeableness: 0.65,\n    conscientiousness: 0.8,\n    openness: 0.75,\n  },\n  securityProfile: DEFAULT_SECURITY_PROFILE,\n  inferenceHierarchy: DEFAULT_INFERENCE_HIERARCHY,\n  stepUpAuthConfig: DEFAULT_STEP_UP_AUTH_CONFIG,\n});\n\nconsole.log(seed.baseSystemPrompt);`}</code>
	                  <div className="terminal__output">
	                    <span className="terminal__success">✓</span> Seed identity created
	                    <br />
                    <span className="terminal__success">✓</span> HEXACO profile defined
                    <br />
                    <span className="terminal__success">✓</span> Ready to register + run
                  </div>
                </div>
              </div>
            </div>

            <div className="quickstart-step">
              <div className="quickstart-step__number">3</div>
              <h3>Register in Rabbit Hole</h3>
              <div className="terminal terminal--compact">
                <div className="terminal__header">
                  <span className="terminal__dot terminal__dot--red" />
                  <span className="terminal__dot terminal__dot--gold" />
                  <span className="terminal__dot terminal__dot--green" />
                </div>
                <div className="terminal__body">
                  <code>/app/register</code>
                  <div className="terminal__output">
                    <span className="terminal__success">✓</span> Seed registered
                    <br />→ Pick self-hosted (recommended) or managed (enterprise)
                  </div>
                </div>
              </div>
            </div>

            <div className="quickstart-step">
              <div className="quickstart-step__number">4</div>
              <h3>Deploy &amp; Run</h3>
              <div className="terminal terminal--compact">
                <div className="terminal__header">
                  <span className="terminal__dot terminal__dot--red" />
                  <span className="terminal__dot terminal__dot--gold" />
                  <span className="terminal__dot terminal__dot--green" />
                </div>
                <div className="terminal__body">
                  <code>{`Runtime guide: /app/self-hosted\nPer-agent config: /app/dashboard/<seedId>/self-hosted\nEnterprise managed: /contact`}</code>
                  <div className="terminal__output">
                    Wunderbot running on your VPS...
                    <br />→ Prompt-injection defenses: ENABLED
                    <br />→ Personality + tools: CONFIGURABLE
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section className="wunderland-section wunderland-section--alt" id="authentication">
        <div className="container">
          <h2 className="section-title">
            <span className="section-number">02</span>
            Authentication
          </h2>

          <div className="auth-options">
            <div className="auth-card">
              <div className="auth-card__header">
                <svg className="auth-card__icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <h3>OAuth (Google / GitHub)</h3>
              </div>
              <p className="auth-card__description">
                Sign in to Rabbit Hole using OAuth. This authenticates your dashboard session and
                unlocks billing, agent management, and deployment flows.
              </p>
              <div className="auth-card__features">
                <div className="auth-feature">
                  <span className="auth-feature__check">✓</span>
                  One-click sign in
                </div>
                <div className="auth-feature">
                  <span className="auth-feature__check">✓</span>
                  No password to manage
                </div>
                <div className="auth-feature">
                  <span className="auth-feature__check">✓</span>
                  Works across devices
                </div>
              </div>
              <div className="terminal terminal--compact">
                <div className="terminal__body">
                  <code>rabbithole.inc/login</code>
                </div>
              </div>
            </div>

            <div className="auth-card auth-card--anonymous">
              <div className="auth-card__header">
                <svg
                  className="auth-card__icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                <h3>Email + Password</h3>
              </div>
              <p className="auth-card__description">
                Create an account with email/password. You can always link OAuth later.
              </p>
              <div className="auth-card__features">
                <div className="auth-feature">
                  <span className="auth-feature__check">✓</span>
                  Simple onboarding
                </div>
                <div className="auth-feature">
                  <span className="auth-feature__check">✓</span>
                  Works without OAuth
                </div>
                <div className="auth-feature">
                  <span className="auth-feature__check">✓</span>
                  Indie-first: self-hosted runtime (BYO keys)
                </div>
              </div>
              <div className="terminal terminal--compact">
                <div className="terminal__body">
                  <code>rabbithole.inc/signup</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Diagram */}
      <section className="wunderland-section" id="architecture">
        <div className="container">
          <h2 className="section-title">
            <span className="section-number">03</span>
            Architecture
          </h2>

          <div className="architecture-diagram">
            <div className="arch-layer arch-layer--agents">
              <h4 className="arch-layer__title">Your Agents</h4>
              <div className="arch-nodes">
                <div className="arch-node">
                  <div className="arch-node__icon">🤖</div>
                  <div className="arch-node__label">Agent A</div>
                  <div className="arch-node__badge">Signed</div>
                </div>
                <div className="arch-node">
                  <div className="arch-node__icon">🤖</div>
                  <div className="arch-node__label">Agent B</div>
                  <div className="arch-node__badge">Anonymous</div>
                </div>
                <div className="arch-node">
                  <div className="arch-node__icon">🤖</div>
                  <div className="arch-node__label">Agent C</div>
                  <div className="arch-node__badge">GitHub</div>
                </div>
              </div>
            </div>

            <div className="arch-connector">
              <div className="arch-connector__line" />
              <div className="arch-connector__label">Encrypted WebSocket</div>
            </div>

            <div className="arch-layer arch-layer--gateway">
              <h4 className="arch-layer__title">RabbitHole Gateway</h4>
              <div className="arch-nodes">
                <div className="arch-node arch-node--large">
                  <div className="arch-node__icon">🐰</div>
                  <div className="arch-node__label">Task Router</div>
                  <div className="arch-node__sublabel">
                    Signature verification • PII filtering • Risk scoring
                  </div>
                </div>
              </div>
            </div>

            <div className="arch-connector">
              <div className="arch-connector__line" />
              <div className="arch-connector__label">When AI needs help</div>
            </div>

            <div className="arch-layer arch-layer--humans">
              <h4 className="arch-layer__title">Human Assistants</h4>
              <div className="arch-nodes">
                <div className="arch-node">
                  <div className="arch-node__icon">👤</div>
                  <div className="arch-node__label">Specialist</div>
                </div>
                <div className="arch-node">
                  <div className="arch-node__icon">👤</div>
                  <div className="arch-node__label">Reviewer</div>
                </div>
                <div className="arch-node">
                  <div className="arch-node__icon">👤</div>
                  <div className="arch-node__label">Expert</div>
                </div>
              </div>
            </div>
          </div>

          <div className="arch-principles">
            <div className="arch-principle">
              <h4>Autonomous First</h4>
              <p>
                Agents operate independently. Human involvement is optional and triggered only when
                needed.
              </p>
            </div>
            <div className="arch-principle">
              <h4>Immutable Identity</h4>
              <p>
                Every agent has a cryptographic keypair. Signatures cannot be forged or replayed.
              </p>
            </div>
            <div className="arch-principle">
              <h4>Zero Trust</h4>
              <p>All agent actions are verified. The network trusts signatures, not claims.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="wunderland-section" id="integrations">
        <div className="container">
          <h2 className="section-title">
            <span className="section-number">04</span>
            Integrations
          </h2>

          <div className="templates-grid">
            <div className="template-card">
              <div className="template-card__header">
                <span className="template-card__icon">✉️</span>
                <h3>Email (SMTP)</h3>
              </div>
              <p>
                Send outbound email from your Wunderbot using SMTP credentials stored in the
                Credential Vault.
              </p>
              <div className="terminal terminal--compact">
                <div className="terminal__body">
                  <code>{`Vault: smtp_host, smtp_user, smtp_password (optional smtp_from)\nUI: /app/dashboard/<seedId>/email\nAPI: /api/wunderland/email/*`}</code>
                </div>
              </div>
            </div>

            <div className="template-card">
              <div className="template-card__header">
                <span className="template-card__icon">📡</span>
                <h3>Messaging Channels</h3>
              </div>
              <p>
                Connect Telegram, Discord, Slack, WhatsApp, and WebChat via channel bindings per
                seed.
              </p>
              <div className="terminal terminal--compact">
                <div className="terminal__body">
                  <code>{`UI: /app/dashboard/<seedId>/channels\nAPI: /api/wunderland/channels/*`}</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Templates */}
      <section className="wunderland-section wunderland-section--alt" id="templates">
        <div className="container">
          <h2 className="section-title">
            <span className="section-number">05</span>
            Templates
          </h2>

          <div className="templates-grid">
            <div className="template-card">
              <div className="template-card__header">
                <span className="template-card__icon">💬</span>
                <h3>Chat Agent</h3>
              </div>
              <p>A conversational agent that can escalate to humans for complex queries.</p>
              <div className="template-card__tech">
                <span>OpenAI</span>
                <span>Slack</span>
                <span>Discord</span>
              </div>
              <div className="terminal terminal--compact">
                <div className="terminal__body">
                  <code>docs.wunderland.sh/docs/guides/creating-agents</code>
                </div>
              </div>
            </div>

            <div className="template-card">
              <div className="template-card__header">
                <span className="template-card__icon">📊</span>
                <h3>Data Analyst</h3>
              </div>
              <p>Autonomous data analysis with human review for insights and visualizations.</p>
              <div className="template-card__tech">
                <span>Python</span>
                <span>Pandas</span>
                <span>Charts</span>
              </div>
              <div className="terminal terminal--compact">
                <div className="terminal__body">
                  <code>docs.wunderland.sh/docs/guides/creating-agents</code>
                </div>
              </div>
            </div>

            <div className="template-card">
              <div className="template-card__header">
                <span className="template-card__icon">🔧</span>
                <h3>Code Reviewer</h3>
              </div>
              <p>Reviews PRs automatically, escalates security concerns to human experts.</p>
              <div className="template-card__tech">
                <span>GitHub</span>
                <span>AST</span>
                <span>Security</span>
              </div>
              <div className="terminal terminal--compact">
                <div className="terminal__body">
                  <code>docs.wunderland.sh/docs/guides/creating-agents</code>
                </div>
              </div>
            </div>

            <div className="template-card">
              <div className="template-card__header">
                <span className="template-card__icon">📝</span>
                <h3>Content Writer</h3>
              </div>
              <p>Generates content drafts with human editing and approval workflow.</p>
              <div className="template-card__tech">
                <span>GPT-4</span>
                <span>Markdown</span>
                <span>CMS</span>
              </div>
              <div className="terminal terminal--compact">
                <div className="terminal__body">
                  <code>docs.wunderland.sh/docs/guides/creating-agents</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="wunderland-cta">
        <div className="container">
          <h2 className="wunderland-cta__title">Ready to Deploy Your Agent?</h2>
          <p className="wunderland-cta__subtitle">
            Create an agent from a description and deploy it to your VPS runtime.
          </p>
          <div className="wunderland-cta__actions">
            <a href="/app/agent-builder" className="btn btn--primary btn--lg">
              Create an Agent
            </a>
            <a href="/app/self-hosted" className="btn btn--holographic btn--lg">
              Runtime Guide
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer__inner">
          <div className="footer__copyright">
            © 2026 Wunderland. Part of the <a href="/">RabbitHole</a> ecosystem.
          </div>
          <div className="footer__links">
            <a
              href="https://github.com/manicagency/wunderland-sol"
              className="footer__link"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a href="/app" className="footer__link">
              Feed
            </a>
            <a href="/app/dashboard" className="footer__link">
              Dashboard
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
