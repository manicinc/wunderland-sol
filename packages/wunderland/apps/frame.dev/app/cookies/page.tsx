import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cookie Policy – Frame.dev',
  description: 'Learn about how Frame.dev uses cookies and how to manage your cookie preferences.',
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-8"
        >
          ← Back to Frame.dev
        </Link>

        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
          Cookie Policy
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Last updated: December 12, 2025
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <h2>What Are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website. They help 
            websites remember your preferences and understand how you use the site.
          </p>

          <h2>How We Use Cookies</h2>
          <p>
            Frame.dev uses cookies for two main purposes:
          </p>
          <ol>
            <li><strong>Essential Functionality</strong> – Remembering your preferences (like theme selection)</li>
            <li><strong>Analytics</strong> – Understanding site usage to improve the experience (with your consent)</li>
          </ol>

          <h2>Types of Cookies We Use</h2>

          <h3>1. Essential Cookies (No Consent Required)</h3>
          <p>
            These cookies are necessary for the website to function properly. They cannot be disabled.
          </p>
          <table>
            <thead>
              <tr>
                <th>Cookie</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>theme</code></td>
                <td>Stores your theme preference (light/dark/sepia/terminal mode)</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td><code>cookie-consent</code></td>
                <td>Remembers your cookie consent choice</td>
                <td>Permanent (localStorage)</td>
              </tr>
            </tbody>
          </table>

          <h3>2. Analytics Cookies (Consent Required)</h3>
          <p>
            These cookies help us understand how visitors use our site. They are only activated if you 
            accept cookies in our consent banner.
          </p>

          <h4>Google Analytics 4</h4>
          <table>
            <thead>
              <tr>
                <th>Cookie</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>_ga</code></td>
                <td>Distinguishes unique users (anonymously)</td>
                <td>2 years</td>
              </tr>
              <tr>
                <td><code>_ga_*</code></td>
                <td>Persists session state</td>
                <td>2 years</td>
              </tr>
              <tr>
                <td><code>_gid</code></td>
                <td>Distinguishes users</td>
                <td>24 hours</td>
              </tr>
            </tbody>
          </table>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Privacy features enabled:</strong> IP anonymization, no Google Signals, no ad personalization
          </p>

          <h4>Microsoft Clarity</h4>
          <table>
            <thead>
              <tr>
                <th>Cookie</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>_clck</code></td>
                <td>Persists user ID for session recordings</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td><code>_clsk</code></td>
                <td>Connects multiple page views in a single session</td>
                <td>1 day</td>
              </tr>
              <tr>
                <td><code>CLID</code></td>
                <td>Identifies first-time visitors</td>
                <td>1 year</td>
              </tr>
            </tbody>
          </table>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Privacy features:</strong> Automatic masking of sensitive content, no PII collection
          </p>

          <h2>What We Track (With Your Consent)</h2>
          <p>
            When you accept analytics cookies, we collect:
          </p>
          <ul>
            <li><strong>Page views</strong> – Which pages you visit</li>
            <li><strong>Session duration</strong> – How long you spend on the site</li>
            <li><strong>Scroll depth</strong> – How far you scroll down pages (25%, 50%, 75%, 100%)</li>
            <li><strong>Time on page</strong> – Engagement metrics</li>
            <li><strong>Click events</strong> – Interactions with buttons, links, CTAs</li>
            <li><strong>Device type</strong> – Desktop, mobile, or tablet</li>
            <li><strong>Browser</strong> – Chrome, Firefox, Safari, etc.</li>
            <li><strong>Geographic location</strong> – Country/city (IP anonymized)</li>
            <li><strong>Referral source</strong> – Where you came from (search, social, direct)</li>
          </ul>

          <h2>What We Don't Track</h2>
          <ul>
            <li>❌ Personal names or email addresses</li>
            <li>❌ Full IP addresses (always anonymized)</li>
            <li>❌ Cross-site browsing history</li>
            <li>❌ Advertising identifiers</li>
            <li>❌ Sensitive personal information</li>
          </ul>

          <h2>Managing Your Cookie Preferences</h2>

          <h3>Option 1: Cookie Consent Banner</h3>
          <p>
            When you first visit Frame.dev, you'll see a cookie consent banner. You can:
          </p>
          <ul>
            <li><strong>Accept All Cookies</strong> – Enable analytics for the best experience</li>
            <li><strong>Reject Non-Essential</strong> – Only essential cookies (theme preference)</li>
            <li><strong>Customize</strong> – Learn more before deciding</li>
          </ul>
          <p>
            To change your choice later, clear your browser cookies and revisit the site.
          </p>

          <h3>Option 2: Browser Settings</h3>
          <p>
            You can block cookies entirely in your browser:
          </p>
          <ul>
            <li>
              <strong>Chrome:</strong> Settings → Privacy & Security → Cookies → Block third-party cookies
            </li>
            <li>
              <strong>Firefox:</strong> Preferences → Privacy → Enhanced Tracking Protection → Strict
            </li>
            <li>
              <strong>Safari:</strong> Preferences → Privacy → Block all cookies
            </li>
            <li>
              <strong>Edge:</strong> Settings → Privacy → Cookies → Block third-party cookies
            </li>
          </ul>

          <h3>Option 3: Do Not Track (DNT)</h3>
          <p>
            Enable "Do Not Track" in your browser, and we'll automatically skip analytics:
          </p>
          <ul>
            <li><strong>Chrome/Edge:</strong> Settings → Privacy → Send "Do Not Track"</li>
            <li><strong>Firefox:</strong> Preferences → Privacy → Send "Do Not Track"</li>
          </ul>

          <h3>Option 4: Browser Extensions</h3>
          <p>
            Use privacy extensions to block tracking:
          </p>
          <ul>
            <li><a href="https://ublockorigin.com" target="_blank" rel="noopener">uBlock Origin</a></li>
            <li><a href="https://privacybadger.org" target="_blank" rel="noopener">Privacy Badger</a></li>
            <li><a href="https://www.ghostery.com" target="_blank" rel="noopener">Ghostery</a></li>
          </ul>

          <h2>How Long Do We Keep Cookies?</h2>
          <table>
            <thead>
              <tr>
                <th>Cookie Type</th>
                <th>Retention Period</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Essential (theme)</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td>Consent preference</td>
                <td>Until you clear it</td>
              </tr>
              <tr>
                <td>Google Analytics</td>
                <td>Up to 2 years</td>
              </tr>
              <tr>
                <td>Microsoft Clarity</td>
                <td>Up to 1 year</td>
              </tr>
            </tbody>
          </table>
          <p>
            Analytics data is automatically deleted after 14 months.
          </p>

          <h2>GDPR, CCPA, and Your Rights</h2>
          <p>
            Under GDPR (EU) and CCPA (California), you have the right to:
          </p>
          <ul>
            <li><strong>Know</strong> what data we collect (see above)</li>
            <li><strong>Access</strong> your data (contact us)</li>
            <li><strong>Delete</strong> your data (clear cookies or contact us)</li>
            <li><strong>Opt-out</strong> of analytics (reject cookies or enable DNT)</li>
          </ul>

          <h2>Third-Party Privacy Policies</h2>
          <ul>
            <li>
              <a 
                href="https://policies.google.com/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                Google Analytics Privacy Policy
              </a>
            </li>
            <li>
              <a 
                href="https://privacy.microsoft.com/privacystatement" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                Microsoft Clarity Privacy Policy
              </a>
            </li>
          </ul>

          <h2>Updates to This Policy</h2>
          <p>
            We may update this Cookie Policy to reflect changes in our practices or legal requirements. 
            The "Last updated" date at the top shows when changes were made.
          </p>

          <h2>Questions?</h2>
          <p>
            Contact us at{' '}
            <a 
              href="mailto:team@frame.dev"
              className="text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              team@frame.dev
            </a>
            {' '}or read our full{' '}
            <Link 
              href="/privacy"
              className="text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              Privacy Policy
            </Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
