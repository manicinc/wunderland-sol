import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service - Frame',
  description: 'Terms of service for Frame and all related products',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen paper-bg">
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <nav className="mb-8">
          <Link href="/" className="text-sm text-ink-600 dark:text-paper-400 hover:text-frame-green transition-colors">
            ← Back to Frame
          </Link>
        </nav>

        <article className="prose prose-lg dark:prose-invert max-w-none">
          <h1 className="text-4xl md:text-5xl font-playfair font-bold ink-text mb-8">
            Terms of Service
          </h1>
          
          <div className="text-ink-700 dark:text-paper-200 space-y-6">
            <p className="text-sm text-ink-600 dark:text-paper-400">
              Last updated: November 9, 2025
            </p>

            <p>
              These Terms of Service ("Terms") govern your use of Frame and its suite of operating systems, operated by Manic Agency LLC ("Company", "we", "our", or "us").
            </p>

            <h2 className="text-2xl font-playfair font-bold mt-8 mb-4">Acceptance of Terms</h2>
            <p>
              By accessing or using our services, you agree to be bound by these Terms. If you disagree with any part of these terms, you may not access our services.
            </p>

            <h2 className="text-2xl font-playfair font-bold mt-8 mb-4">Use License</h2>
            <p>
              Our open-source components are provided under the MIT License. You are free to use, modify, and distribute these components in accordance with the license terms.
            </p>

            <h2 className="text-2xl font-playfair font-bold mt-8 mb-4">Disclaimer</h2>
            <p>
              Our services are provided "as is" without any warranty of any kind, either express or implied. We do not warrant that our services will be uninterrupted, secure, or error-free.
            </p>

            <h2 className="text-2xl font-playfair font-bold mt-8 mb-4">Limitation of Liability</h2>
            <p>
              In no event shall Manic Agency LLC, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages.
            </p>

            <h2 className="text-2xl font-playfair font-bold mt-8 mb-4">Governing Law</h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of California, United States, without regard to its conflict of law provisions.
            </p>

            <h2 className="text-2xl font-playfair font-bold mt-8 mb-4">Contact Information</h2>
            <p>
              For any questions regarding these Terms, please contact us at:
            </p>
            <p>
              Manic Agency LLC<br />
              Email: team@frame.dev<br />
              LinkedIn: <a href="https://www.linkedin.com/company/manic-agency-llc/" className="text-frame-green hover:underline" target="_blank" rel="noopener noreferrer">Manic Agency LLC</a>
            </p>
          </div>
        </article>
      </div>
    </div>
  )
}
