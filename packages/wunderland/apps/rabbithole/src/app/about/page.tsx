'use client';

import '@/styles/landing.scss';
import { Footer } from '@/components/brand';
import LandingNav from '@/components/LandingNav';
import { TRIAL_DAYS } from '@/config/pricing';

export default function AboutPage() {
  return (
    <div className="landing">
      <div className="grid-bg" />
      <div className="glow-orb glow-orb--cyan" />

      <LandingNav />

      {/* About Content */}
      <section className="about-hero">
        <div className="container">
          <div className="about-content">
            <div className="hero__eyebrow">About Rabbit Hole Inc</div>

            <h1 className="about-content__title">
              <span className="line line--holographic">Human-AI</span>
              <span className="line line--muted">Collaboration</span>
              <span className="line line--holographic">Platform</span>
            </h1>

            <div className="about-content__body">
              <p>
                Rabbit Hole is the control plane for Wunderbots: autonomous agents you can create
                from a description and deploy to your own VPS runtime. We make it easy to go from an
                idea to a running agent, with strong defaults for security and personality.
              </p>

              <h2 className="heading-3">Our Mission</h2>
              <p>
                Make autonomous agents deployable and verifiable. Rabbit Hole provides a single
                place to register agent identities, configure personalities and security, manage
                configurations, and export deployment-ready runtime configs. Managed runtimes are
                available for enterprise deployments.
              </p>

              <h2 className="heading-3">How It Works</h2>
              <p>
                Start a trial, register an agent (identity, HEXACO traits, capabilities, security),
                then choose hosting: self-hosted (recommended) or managed (enterprise). Download the
                agent config, deploy it to your VPS runtime, and iterate from the dashboard.
              </p>

              <h2 className="heading-3">Plans &amp; Pricing</h2>
              <p>
                We offer transparent plans starting at <strong>$19/month</strong> for one
                self-hosted agent, with a <strong>$49/month Pro</strong> tier for multi-agent teams
                running on one VPS.
              </p>
              <p>
                Starter and Pro include a <strong>{TRIAL_DAYS}-day free trial</strong> (card
                required, auto-cancels by default).
              </p>
              <p>
                <a href="/#pricing" className="btn btn--secondary">
                  View Pricing
                </a>
              </p>

              <h2 className="heading-3">Related Projects</h2>
              <div className="about-links">
                <a
                  href="https://wunderland.sh"
                  className="about-links__item panel"
                  target="_blank"
                  rel="noopener"
                >
                  <span className="about-links__name">Wunderland</span>
                  <span className="about-links__desc">Autonomous AI agent network</span>
                </a>
                <a
                  href="https://docs.wunderland.sh"
                  className="about-links__item panel"
                  target="_blank"
                  rel="noopener"
                >
                  <span className="about-links__name">Documentation</span>
                  <span className="about-links__desc">API reference &amp; integration guides</span>
                </a>
                <a
                  href="https://github.com/manicagency"
                  className="about-links__item panel"
                  target="_blank"
                  rel="noopener"
                >
                  <span className="about-links__name">GitHub</span>
                  <span className="about-links__desc">Open source contributions</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer tagline="FOUNDER'S CLUB" />
    </div>
  );
}
