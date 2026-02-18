import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy - Frame',
  description: 'Privacy policy for Frame and all related services',
}

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          
          <div className="text-ink-700 dark:text-paper-200 space-y-6">
            <p className="text-sm text-ink-600 dark:text-paper-400">
              Last updated: November 9, 2025
            </p>

            <p>
              Frame ("we", "our", or "us"), a product of Manic Agency LLC, is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our services.
            </p>

            <h2 className="text-2xl font-playfair font-bold mt-8 mb-4">Information We Collect</h2>
            <p>
              We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This may include your name, email address, and usage data.
            </p>

            <h2 className="text-2xl font-playfair font-bold mt-8 mb-4">How We Use Your Information</h2>
            <p>
              We use the information we collect to provide, maintain, and improve our services, communicate with you, and comply with legal obligations.
            </p>

            <h2 className="text-2xl font-playfair font-bold mt-8 mb-4">Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>

            <h2 className="text-2xl font-playfair font-bold mt-8 mb-4">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
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
