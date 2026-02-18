'use client';

import '@/styles/landing.scss';
import { Footer } from '@/components/brand';
import LandingNav from '@/components/LandingNav';

export default function CookiePolicyPage() {
  return (
    <div className="landing">
      <div className="grid-bg" />
      <div className="glow-orb glow-orb--cyan" />

      <LandingNav />

      {/* Cookie Policy Content */}
      <section className="about-hero">
        <div className="container">
          <div className="about-content">
            <div className="hero__eyebrow">Legal &amp; Compliance</div>

            <h1 className="about-content__title">
              <span className="line line--holographic">Cookie</span>
              <span className="line line--muted">Policy</span>
            </h1>

            <div className="legal-content">
              <p>
                <em>Last updated: February 2025</em>
              </p>

              <p>
                This Cookie Policy explains how Rabbit Hole Inc (&quot;rabbithole.inc&quot;,
                &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) uses cookies and similar
                technologies when you visit or interact with our platform.
              </p>

              {/* 1. What Are Cookies */}
              <h2 className="heading-3">What Are Cookies</h2>
              <p>
                Cookies are small text files that are stored on your device (computer, tablet, or
                mobile) when you visit a website. They allow the site to recognise your device and
                remember information about your visit, such as your preferences, login status, and
                browsing activity. Cookies can be &quot;session&quot; cookies (deleted when you
                close your browser) or &quot;persistent&quot; cookies (retained until they expire or
                you delete them).
              </p>

              {/* 2. How We Use Cookies */}
              <h2 className="heading-3">How We Use Cookies</h2>
              <p>We use cookies and local storage for the following purposes:</p>
              <ul>
                <li>
                  <strong>Authentication</strong> &mdash; To keep you signed in and validate your
                  session across page loads using a JWT token stored in localStorage.
                </li>
                <li>
                  <strong>Preferences</strong> &mdash; To remember your UI settings such as
                  light/dark theme selection and sidebar state so the interface feels consistent
                  between visits.
                </li>
                <li>
                  <strong>Analytics</strong> &mdash; To understand how users interact with our
                  platform through anonymised session recordings and heatmaps, helping us improve
                  usability and fix issues.
                </li>
              </ul>

              {/* 3. Cookie Categories */}
              <h2 className="heading-3">Cookie Categories</h2>
              <p>
                The following table lists all cookies and local storage keys used by rabbithole.inc:
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Cookie</th>
                      <th>Category</th>
                      <th>Purpose</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <code>vcaAuthToken</code>
                      </td>
                      <td>Strictly Necessary</td>
                      <td>JWT authentication token</td>
                      <td>Session</td>
                    </tr>
                    <tr>
                      <td>
                        <code>rh-theme</code>
                      </td>
                      <td>Functional</td>
                      <td>Light/dark mode preference</td>
                      <td>Persistent</td>
                    </tr>
                    <tr>
                      <td>
                        <code>rh-consent</code>
                      </td>
                      <td>Strictly Necessary</td>
                      <td>Cookie consent preferences</td>
                      <td>1 year</td>
                    </tr>
                    <tr>
                      <td>
                        <code>rh-sidebar</code>
                      </td>
                      <td>Functional</td>
                      <td>Sidebar collapsed state</td>
                      <td>Persistent</td>
                    </tr>
                    <tr>
                      <td>
                        <code>_clck</code>
                      </td>
                      <td>Analytics</td>
                      <td>Microsoft Clarity user ID</td>
                      <td>1 year</td>
                    </tr>
                    <tr>
                      <td>
                        <code>_clsk</code>
                      </td>
                      <td>Analytics</td>
                      <td>Microsoft Clarity session</td>
                      <td>Session</td>
                    </tr>
                    <tr>
                      <td>
                        <code>CLID</code>
                      </td>
                      <td>Analytics</td>
                      <td>Microsoft Clarity tracking</td>
                      <td>1 year</td>
                    </tr>
                    <tr>
                      <td>
                        <code>ANONCHK</code>
                      </td>
                      <td>Analytics</td>
                      <td>Microsoft Clarity dedup</td>
                      <td>10 minutes</td>
                    </tr>
                    <tr>
                      <td>
                        <code>MR</code>
                      </td>
                      <td>Analytics</td>
                      <td>Microsoft Clarity referral</td>
                      <td>7 days</td>
                    </tr>
                    <tr>
                      <td>
                        <code>SM</code>
                      </td>
                      <td>Analytics</td>
                      <td>Microsoft Clarity session</td>
                      <td>Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4. Consent Categories */}
              <h2 className="heading-3">Consent Categories</h2>
              <p>
                Our cookie consent mechanism groups cookies into four categories. Your choices are
                saved in the <code>rh-consent</code> local storage key.
              </p>
              <ul>
                <li>
                  <strong>Strictly Necessary</strong> &mdash; Always on. These are required for
                  authentication and core platform functionality. They cannot be disabled without
                  breaking the application.
                </li>
                <li>
                  <strong>Functional</strong> &mdash; Enabled by default. These cookies store your
                  UI preferences such as theme and sidebar state. You can disable them, but the
                  platform will fall back to default settings on each visit.
                </li>
                <li>
                  <strong>Analytics</strong> &mdash; Off by default; requires explicit opt-in.
                  Analytics cookies power Microsoft Clarity session recording and heatmaps, which
                  help us understand how users interact with the platform and identify usability
                  issues.
                </li>
                <li>
                  <strong>Marketing</strong> &mdash; Not currently used. This category is reserved
                  for future use. No marketing cookies are set today.
                </li>
              </ul>

              {/* 5. Managing Cookies */}
              <h2 className="heading-3">Managing Cookies</h2>
              <p>You can manage your cookie preferences in several ways:</p>
              <ul>
                <li>
                  <strong>Consent banner</strong> &mdash; When you first visit rabbithole.inc, a
                  consent banner allows you to choose which categories to enable. To revisit your
                  choices at any time, click the cookie icon in the bottom-left corner of the page,
                  or clear the <code>rh-consent</code> key from your browser&apos;s localStorage to
                  trigger the banner again.
                </li>
                <li>
                  <strong>Browser settings</strong> &mdash; Most browsers allow you to block or
                  delete cookies through their privacy/settings panel. Refer to your browser&apos;s
                  help documentation for instructions.
                </li>
              </ul>
              <p>
                <strong>Note:</strong> Disabling Strictly Necessary cookies will prevent
                authentication from working and effectively break the application. We strongly
                recommend keeping these enabled.
              </p>

              {/* 6. Microsoft Clarity */}
              <h2 className="heading-3">Microsoft Clarity</h2>
              <p>
                We use Microsoft Clarity as our analytics provider. Clarity records anonymised
                session replays and generates heatmaps to help us understand how users interact with
                our platform. This data allows us to identify usability issues, optimise page
                layouts, and improve the overall experience.
              </p>
              <p>
                Session data is processed by Microsoft and is subject to their privacy policy. No
                personally identifiable information is captured in session recordings.
              </p>
              <p>Session recordings may include:</p>
              <ul>
                <li>Page views and navigation paths</li>
                <li>Clicks and tap interactions</li>
                <li>Scroll depth and behaviour</li>
                <li>Form interactions (all text inputs are masked by default)</li>
              </ul>
              <p>
                For more information about how Microsoft Clarity handles data, please review the{' '}
                <a
                  href="https://clarity.microsoft.com/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Microsoft Clarity Terms of Service
                </a>
                .
              </p>

              {/* 7. Third-Party Cookies */}
              <h2 className="heading-3">Third-Party Cookies</h2>
              <p>
                When you proceed through our checkout flow, Stripe (our payment processor) may set
                its own cookies to facilitate secure payment processing, fraud detection, and
                compliance. These cookies are governed by{' '}
                <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
                  Stripe&apos;s Privacy Policy
                </a>{' '}
                and are outside our direct control.
              </p>

              {/* 8. Updates */}
              <h2 className="heading-3">Updates to This Policy</h2>
              <p>
                We may update this Cookie Policy from time to time to reflect changes in our
                practices, technology, or legal requirements. When we make changes, we will update
                the &quot;Last updated&quot; date at the top of this page. We encourage you to
                review this policy periodically to stay informed about how we use cookies.
              </p>

              {/* 9. Contact */}
              <h2 className="heading-3">Contact</h2>
              <p>
                If you have any questions about our use of cookies or this policy, please contact us
                at <a href="mailto:privacy@rabbithole.inc">privacy@rabbithole.inc</a>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer tagline="FOUNDER'S CLUB" />
    </div>
  );
}
