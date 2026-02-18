import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy – Frame.dev',
  description: 'How we handle your data and protect your privacy',
}

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Last updated: December 12, 2025
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <h2>Our Commitment</h2>
          <p>
            At Frame.dev, we believe privacy is a fundamental right. We collect <strong>zero personal
            information</strong> and never sell, share, or monetize user data.
          </p>

          <h2>What We Collect</h2>
          <p>
            Frame.dev and the Quarry Codex viewer use <strong>anonymous analytics</strong> to understand
            how people use our tools. This helps us improve the experience for everyone.
          </p>

          <h3>Anonymous Usage Data</h3>
          <p>When you visit Frame.dev or use the Codex viewer, we may collect:</p>
          <ul>
            <li><strong>Page views</strong> – which pages you visit</li>
            <li><strong>Session duration</strong> – how long you spend on the site</li>
            <li><strong>Device type</strong> – desktop, mobile, or tablet (no device IDs)</li>
            <li><strong>Referrer</strong> – where you came from (search engine, link, etc.)</li>
            <li><strong>Country/region</strong> – approximate location (city-level, <strong>IP anonymized</strong>)</li>
            <li><strong>Browser type</strong> – Chrome, Firefox, Safari, etc. (no fingerprinting)</li>
          </ul>

          <h3>What We Do NOT Collect</h3>
          <ul>
            <li>✗ Names, emails, or phone numbers</li>
            <li>✗ Account credentials or passwords (we don't have accounts)</li>
            <li>✗ Full IP addresses (automatically truncated by GA4)</li>
            <li>✗ Cross-site tracking or ad targeting data</li>
            <li>✗ Biometric, financial, or health information</li>
            <li>✗ Any personally identifiable information (PII)</li>
          </ul>

          <h2>Analytics Tools</h2>
          <p>
            We use two industry-standard, privacy-focused analytics platforms:
          </p>

          <h3>Google Analytics 4 (GA4)</h3>
          <ul>
            <li><strong>IP Anonymization</strong> enabled (last octet removed)</li>
            <li><strong>Google Signals</strong> disabled (no cross-device tracking)</li>
            <li><strong>Ad Personalization</strong> disabled</li>
            <li>First-party cookies only (no third-party trackers)</li>
          </ul>

          <h3>Microsoft Clarity</h3>
          <ul>
            <li>Session recordings and heatmaps for UX research</li>
            <li>Automatically masks sensitive form inputs</li>
            <li>No PII stored or tracked</li>
          </ul>

          <h2>Do Not Track (DNT)</h2>
          <p>
            If your browser sends a "Do Not Track" signal (<code>DNT: 1</code>), we <strong>respect
            it</strong> and will not load any analytics scripts.
          </p>
          <p>
            To enable DNT:
          </p>
          <ul>
            <li><strong>Chrome/Edge</strong>: Settings → Privacy & Security → Send "Do Not Track"</li>
            <li><strong>Firefox</strong>: Preferences → Privacy → Send "Do Not Track"</li>
            <li><strong>Safari</strong>: Preferences → Privacy → Prevent cross-site tracking</li>
          </ul>

          <h2>Cookies</h2>
          <p>
            We use minimal, functional cookies to remember your preferences (like dark mode). Analytics
            cookies are loaded only with your consent through our cookie banner, and are first-party only.
          </p>
          <p>
            You can withdraw consent at any time by clearing your browser cookies or rejecting them in our 
            cookie consent banner.
          </p>

          <table>
            <thead>
              <tr>
                <th>Cookie Name</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>theme</code></td>
                <td>Remembers light/dark mode</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td><code>cookie-consent</code></td>
                <td>Stores your cookie preferences</td>
                <td>Permanent (localStorage)</td>
              </tr>
              <tr>
                <td><code>_ga</code></td>
                <td>GA4 anonymous ID (with consent)</td>
                <td>2 years</td>
              </tr>
              <tr>
                <td><code>_clck</code></td>
                <td>Clarity session ID (with consent)</td>
                <td>1 year</td>
              </tr>
            </tbody>
          </table>

          <h2>GDPR Compliance</h2>
          <p>
            Frame.dev is fully compliant with the EU General Data Protection Regulation (GDPR):
          </p>
          <ul>
            <li><strong>Lawful Basis</strong>: Legitimate interest (improving the product)</li>
            <li><strong>Data Minimization</strong>: We collect only what's necessary</li>
            <li><strong>Anonymization</strong>: All identifiers are stripped or hashed</li>
            <li><strong>Right to Object</strong>: Enable DNT to opt out</li>
            <li><strong>Data Retention</strong>: Analytics data auto-deleted after 14 months</li>
          </ul>

          <h2>Open Source Transparency</h2>
          <p>
            The Quarry Codex viewer is{' '}
            <Link
              href="https://github.com/framersai/frame.dev"
              className="text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              open source
            </Link>
            . You can inspect our analytics implementation in <code>components/Analytics.tsx</code>.
          </p>

          <h2>Third-Party Services</h2>
          <p>
            Frame.dev uses the following external services:
          </p>
          <ul>
            <li>
              <strong>GitHub</strong> – For hosting and serving Codex content (public repos only){' '}
              <a
                href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                Privacy Policy
              </a>
            </li>
            <li>
              <strong>Google Fonts</strong> – For typography (cached locally, no tracking){' '}
              <a
                href="https://developers.google.com/fonts/faq/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                Privacy FAQ
              </a>
            </li>
          </ul>

          <h2>Children's Privacy</h2>
          <p>
            Frame.dev does not knowingly collect data from anyone under 13. If we discover such data,
            it will be deleted immediately.
          </p>

          <h2>Updates to This Policy</h2>
          <p>
            We may update this policy to reflect new features or legal requirements. Changes will be
            posted here with an updated "Last updated" date.
          </p>

          <h2>Contact</h2>
          <p>
            Questions or concerns? Email us at{' '}
            <a
              href="mailto:privacy@frame.dev"
              className="text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              privacy@frame.dev
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

