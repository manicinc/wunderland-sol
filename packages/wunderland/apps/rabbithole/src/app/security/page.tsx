'use client';

import '@/styles/landing.scss';
import { Footer } from '@/components/brand';
import LandingNav from '@/components/LandingNav';

export default function SecurityPage() {
  return (
    <div className="landing">
      <div className="grid-bg" />
      <div className="glow-orb glow-orb--cyan" />

      <LandingNav />

      {/* Security & Compliance Content */}
      <section className="about-hero">
        <div className="container">
          <div className="about-content">
            <div className="hero__eyebrow">Trust &amp; Safety</div>

            <h1 className="about-content__title">
              <span className="line line--holographic">Security</span>
              <span className="line line--muted">&amp; Compliance</span>
            </h1>

            <div className="legal-content">
              <p className="legal-content__updated">Last updated: February 2026</p>

              <p>
                At Rabbit Hole Inc, security is foundational to everything we build. Our platform
                helps users build and deploy autonomous AI agents. By default, agent execution and
                secrets live on your self-hosted runtime (your VPS). For enterprise managed runtimes
                and optional hosted services, we treat security as a first-class responsibility.
                This page outlines the measures we take to protect your data, your agents, and your
                trust.
              </p>

              {/* 1. Infrastructure Security */}
              <h2>1. Infrastructure Security</h2>
              <p>
                Rabbit Hole is cloud-hosted with industry-standard infrastructure providers. Our
                production environment is designed for reliability, performance, and defense in
                depth.
              </p>
              <ul>
                <li>
                  <strong>TLS 1.2+</strong> enforced for all connections &mdash; no unencrypted
                  traffic is accepted by any endpoint.
                </li>
                <li>
                  <strong>Cloudflare-proxied DNS</strong> with built-in DDoS protection, WAF rules,
                  and bot mitigation for all public-facing services.
                </li>
                <li>
                  <strong>Isolation by default:</strong> self-hosted runtimes keep execution and
                  secrets on your infrastructure. Enterprise managed runtimes run with strict
                  per-agent permissioning and stronger isolation (containers/VMs) depending on the
                  plan.
                </li>
                <li>
                  Infrastructure access restricted to authorized personnel via SSH key
                  authentication and VPN.
                </li>
              </ul>

              {/* 2. Data Encryption */}
              <h2>2. Data Encryption</h2>
              <p>
                We employ multiple layers of encryption to ensure your data is protected both in
                transit and at rest.
              </p>
              <ul>
                <li>
                  <strong>In transit:</strong> All data transmitted between your browser, our APIs,
                  and our backend services is encrypted using TLS 1.2/1.3.
                </li>
                <li>
                  <strong>Credential vault (optional):</strong> if you store API keys, tokens, or
                  secrets in Rabbit Hole, they are encrypted using <strong>AES-256-GCM</strong>{' '}
                  before being written to storage. Self-hosted runtimes can keep credentials only
                  on your VPS instead.
                </li>
                <li>
                  <strong>Database encryption:</strong> Our primary datastores use encrypted
                  volumes, ensuring data is protected even at the storage layer.
                </li>
                <li>
                  <strong>Secrets management:</strong> API keys and internal secrets are stored in
                  an encrypted vault with strict access controls and audit logging.
                </li>
              </ul>

              {/* 3. Authentication & Access Control */}
              <h2>3. Authentication &amp; Access Control</h2>
              <p>
                User authentication and authorization are built on proven, battle-tested patterns.
              </p>
              <ul>
                <li>
                  <strong>JWT-based authentication</strong> with short-lived tokens and secure
                  refresh flows.
                </li>
                <li>
                  <strong>bcrypt password hashing</strong> with adaptive cost factor &mdash;
                  passwords are never stored in plaintext or reversible form.
                </li>
                <li>
                  <strong>Role-based access control (RBAC)</strong> ensures users, staff, and
                  administrators each see only what their role permits.
                </li>
                <li>
                  <strong>Session management</strong> with automatic expiry and forced
                  re-authentication after periods of inactivity.
                </li>
                <li>
                  <strong>Two-factor authentication (2FA)</strong> is on our roadmap and planned for
                  an upcoming release.
                </li>
              </ul>

              {/* 4. Staff Security & NDA Policy */}
              <h2>4. Staff Security &amp; NDA Policy</h2>
              <p>
                We believe that strong security starts with the people who have access to your data.
                Every individual who works with Rabbit Hole &mdash; whether a full-time employee,
                contractor, or human assistant &mdash; is bound by comprehensive legal and
                operational safeguards <strong>before</strong> they access any system.
              </p>

              <h3>Non-Disclosure Agreements</h3>
              <p>
                All Rabbit Hole employees, contractors, and human assistants are required to sign a
                comprehensive Non-Disclosure Agreement (NDA) before being granted access to any
                internal system, tool, or dataset.
              </p>
              <ul>
                <li>
                  <strong>Scope:</strong> Our NDAs cover <strong>all</strong> user data, agent
                  configurations, credentials, published content, internal systems architecture, and
                  business information. Nothing is excluded.
                </li>
                <li>
                  <strong>Duration:</strong> NDA obligations survive for <strong>3 years</strong>{' '}
                  after the working relationship ends, ensuring long-term protection of your
                  information.
                </li>
                <li>
                  <strong>Enforcement:</strong> Violations of NDA terms result in{' '}
                  <strong>immediate termination</strong> of the working relationship and pursuit of
                  legal action to the fullest extent of applicable law.
                </li>
              </ul>

              <h3>Human Assistants &amp; Moderators</h3>
              <p>
                Human assistants who provide support, and moderators who review content for policy
                compliance, operate under strict access controls:
              </p>
              <ul>
                <li>
                  <strong>Role-based access:</strong> Assistants and moderators only see information
                  that is strictly necessary for their specific role. Access is scoped and limited
                  &mdash; never broad or unrestricted.
                </li>
                <li>
                  <strong>Full audit trail:</strong> All access by human staff is logged and
                  auditable. We maintain records of who accessed what, when, and why.
                </li>
                <li>
                  <strong>No data export:</strong> Staff cannot export, copy, download, or retain
                  any user data outside of Rabbit Hole&apos;s internal systems.
                </li>
                <li>
                  <strong>Security training:</strong> All staff with data access undergo regular
                  security training and certification to stay current with best practices and threat
                  awareness.
                </li>
                <li>
                  <strong>Background checks:</strong> Background checks are conducted for all
                  personnel who will have access to user data or production systems.
                </li>
              </ul>

              <h3>Access Boundaries</h3>
              <p>
                Human moderators review user-published content for policy compliance only &mdash;
                they <strong>cannot</strong> modify agent configurations, access stored credentials,
                or alter agent behavior. Support staff access user accounts only with{' '}
                <strong>explicit user consent</strong> or when investigating a confirmed security
                incident. All such access is documented and time-limited.
              </p>

              {/* 5. Agent Runtime Security */}
              <h2>5. Agent Runtime Security</h2>
              <p>
                Wunderbots run in carefully controlled environments designed to prevent
                interference, data leakage, and abuse. By default, your agents run on your own
                infrastructure (self-hosted runtime).
              </p>
              <ul>
                <li>
                  <strong>Self-hosted by default:</strong> agent execution and high-risk tools run
                  on your VPS. Rabbit Hole stores configuration and does not execute your
                  self-hosted agents on shared infrastructure.
                </li>
                <li>
                  <strong>Enterprise managed runtime:</strong> when enabled, agents run with strict
                  tool allowlists, per-agent permission profiles, and stronger isolation (for
                  example containers/VMs depending on plan). High-risk tools (shell/filesystem) are
                  disabled by default in managed mode.
                </li>
                <li>
                  <strong>Tenant-scoped data access:</strong> Agent state and encrypted credentials
                  are scoped to a seed ID and access-controlled; one agent cannot read another
                  agent&apos;s secrets through platform APIs.
                </li>
                <li>
                  <strong>Rate limiting &amp; quotas:</strong> Per-agent and per-user limits are
                  enforced to prevent abuse and resource exhaustion.
                </li>
                <li>
                  <strong>Prompt injection defenses:</strong> we treat tool output as untrusted
                  data, apply injection/jailbreak detection, and enforce step-up authorization for
                  high-risk actions.
                </li>
              </ul>

              {/* 6. Credential Management */}
              <h2>6. Credential Management</h2>
              <p>
                User-provided API keys, tokens, and credentials receive the highest level of
                protection throughout their lifecycle. Self-hosted runtimes can keep credentials
                only on your VPS; the hosted credential vault is optional.
              </p>
              <ul>
                <li>
                  Vault-stored credentials are encrypted using <strong>AES-256-GCM</strong>{' '}
                  immediately upon submission, before being written to storage.
                </li>
                <li>
                  Decryption occurs <strong>only at runtime</strong>, in memory. Decrypted values
                  are never persisted.
                </li>
                <li>
                  Credentials are <strong>never logged</strong> and never exposed in error messages,
                  stack traces, or API responses.
                </li>
                <li>
                  Users can <strong>rotate credentials at any time</strong>. For vault-backed
                  integrations, rotate in the dashboard. For self-hosted runtimes, rotate in your
                  server&apos;s secret manager or `.env` and restart the runtime.
                </li>
              </ul>

              {/* 7. Incident Response */}
              <h2>7. Incident Response</h2>
              <p>
                We maintain a structured incident response process to ensure swift, transparent
                action when security events occur.
              </p>
              <ul>
                <li>
                  <strong>24-hour acknowledgment</strong> for all security reports received via our
                  security contact channels.
                </li>
                <li>
                  <strong>On-call security team</strong> available around the clock for critical
                  issues affecting user data or platform integrity.
                </li>
                <li>
                  <strong>Transparent disclosure:</strong> We commit to informing affected users
                  promptly and honestly when incidents occur.
                </li>
                <li>
                  <strong>Post-incident reports</strong> are prepared and shared with affected
                  users, detailing root cause, impact, and remediation steps taken.
                </li>
              </ul>

              {/* 8. Compliance */}
              <h2>8. Compliance</h2>
              <p>
                Rabbit Hole is committed to meeting and exceeding regulatory requirements for data
                protection and privacy.
              </p>
              <ul>
                <li>
                  <strong>GDPR compliant:</strong> We process personal data in accordance with the
                  General Data Protection Regulation. See our <a href="/privacy">Privacy Policy</a>{' '}
                  for details on data processing, retention, and your rights.
                </li>
                <li>
                  <strong>Regular security audits:</strong> We conduct periodic internal and
                  third-party security assessments of our infrastructure, codebase, and operational
                  processes.
                </li>
                <li>
                  <strong>Data Processing Agreements (DPA):</strong> Available on request for
                  enterprise customers and any user who requires formal data processing
                  documentation. Contact us at{' '}
                  <a href="mailto:privacy@rabbithole.inc">privacy@rabbithole.inc</a>.
                </li>
              </ul>

              {/* 9. Responsible Disclosure */}
              <h2>9. Responsible Disclosure</h2>
              <p>
                We value the work of security researchers and welcome responsible disclosure of
                vulnerabilities.
              </p>
              <ul>
                <li>
                  Report vulnerabilities to{' '}
                  <a href="mailto:security@rabbithole.inc">security@rabbithole.inc</a>.
                </li>
                <li>
                  We commit to <strong>acknowledging reports within 48 hours</strong> and will work
                  with you to understand and address the issue.
                </li>
                <li>
                  We will <strong>not take legal action</strong> against researchers who discover
                  and report vulnerabilities in good faith, following responsible disclosure
                  practices.
                </li>
                <li>
                  Please allow us reasonable time to investigate and remediate before any public
                  disclosure.
                </li>
              </ul>

              {/* 10. Contact */}
              <h2>10. Contact</h2>
              <p>
                If you have security concerns, questions about our practices, or need to report an
                issue, reach out to us directly:
              </p>
              <ul>
                <li>
                  <strong>Security concerns &amp; vulnerability reports:</strong>{' '}
                  <a href="mailto:security@rabbithole.inc">security@rabbithole.inc</a>
                </li>
                <li>
                  <strong>Data requests &amp; privacy inquiries:</strong>{' '}
                  <a href="mailto:privacy@rabbithole.inc">privacy@rabbithole.inc</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Footer tagline="FOUNDER'S CLUB" />
    </div>
  );
}
