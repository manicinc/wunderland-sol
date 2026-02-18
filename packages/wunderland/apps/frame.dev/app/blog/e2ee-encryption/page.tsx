import type { Metadata } from 'next'
import PageLayout from '@/components/page-layout'
import Link from 'next/link'
import { Calendar, Clock, ArrowLeft, Shield, Key, Lock, Server, Smartphone, Cloud, AlertTriangle } from 'lucide-react'
import { getBlogPost, getRelatedPosts } from '@/lib/blogPosts'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Zero-Friction E2EE: How Frame Encrypts Your Data - Frame Blog',
  description:
    'Deep dive into Frame\'s end-to-end encryption architecture. Learn how we implemented AES-256-GCM with device-bound keys for true zero-knowledge security.',
}

export default function E2EEEncryptionPage() {
  const post = getBlogPost('e2ee-encryption')
  if (!post) {
    notFound()
  }
  const relatedPosts = getRelatedPosts(post.slug)

  return (
    <PageLayout>
      <article className="container mx-auto px-4 max-w-3xl pt-20 pb-20">
        <Link href="/blog" className="inline-flex items-center gap-2 text-frame-green hover:underline mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to blog
        </Link>

        <header className="mb-12">
          <h1 className="text-5xl font-bold mb-6 heading-gradient">{post.title}</h1>
          <div className="flex items-center gap-4 text-sm text-ink-600 dark:text-paper-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(post.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {post.readTime}
            </span>
            <span>By {post.author}</span>
          </div>
        </header>

        <div className="prose prose-lg dark:prose-invert max-w-none body-text">
          <p className="text-xl font-medium mb-8">
            Privacy isn't a feature—it's a foundation. Today we're sharing how Frame implements end-to-end encryption
            to ensure your knowledge stays yours, with zero-friction key management that just works.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">Why We Built E2EE Into Frame</h2>
          <p>
            When you store personal knowledge—notes, ideas, research, writing—you're trusting an application with
            your thoughts. We believe that trust must be backed by cryptographic guarantees, not just policies.
          </p>
          <p>
            Frame encrypts all sensitive data locally before it ever leaves your device. Even if someone gains
            access to your browser storage or (in the future) your cloud sync, they see only encrypted blobs.
            No keys, no content.
          </p>

          <div className="grid gap-6 my-8 md:grid-cols-2">
            <div className="paper-card p-6">
              <Shield className="w-6 h-6 text-cyan-600 mb-3" />
              <h3 className="text-xl font-bold mb-2">Zero-Knowledge Architecture</h3>
              <p>
                Your encryption keys never leave your device. We can't read your data, and neither can anyone
                who intercepts it.
              </p>
            </div>
            <div className="paper-card p-6">
              <Key className="w-6 h-6 text-cyan-600 mb-3" />
              <h3 className="text-xl font-bold mb-2">Automatic Key Management</h3>
              <p>
                No passwords to remember, no key files to backup (in local mode). Your device key is generated
                once and stored securely in IndexedDB.
              </p>
            </div>
          </div>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">The Technical Details</h2>

          <h3 className="text-2xl font-bold mt-8 mb-4">AES-256-GCM: The Gold Standard</h3>
          <p>
            We chose AES-256-GCM (Galois/Counter Mode) for several reasons:
          </p>
          <ul className="space-y-3 my-6">
            <li className="flex items-start gap-3">
              <span className="text-cyan-600 mt-1">•</span>
              <span><strong>256-bit key length</strong>: Computationally infeasible to brute-force, even with quantum computers on the horizon</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-600 mt-1">•</span>
              <span><strong>Authenticated encryption</strong>: GCM mode provides both confidentiality and integrity verification</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-600 mt-1">•</span>
              <span><strong>Native browser support</strong>: Uses the Web Crypto API for hardware-accelerated performance</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-600 mt-1">•</span>
              <span><strong>Industry standard</strong>: The same algorithm used by banks, governments, and security-critical systems</span>
            </li>
          </ul>

          <h3 className="text-2xl font-bold mt-8 mb-4">Device-Bound Keys</h3>
          <p>
            Instead of asking you to create and remember a passphrase, Frame generates a cryptographically random
            256-bit key on first use. This key is stored in IndexedDB—a browser database that survives page
            reloads and is isolated per origin.
          </p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-6">
            <pre className="text-sm">{`// Simplified key generation flow
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,  // extractable for backup
  ['encrypt', 'decrypt']
);

// Store in IndexedDB
await deviceKeyStore.set('device-key', await crypto.subtle.exportKey('raw', key));`}</pre>
          </div>

          <h3 className="text-2xl font-bold mt-8 mb-4">The Envelope Format</h3>
          <p>
            When we encrypt your data, we wrap it in an "envelope" that contains everything needed for decryption:
          </p>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-6">
            <pre className="text-sm">{`interface EncryptedEnvelope {
  version: 1;           // For future format upgrades
  ciphertext: string;   // Base64-encoded encrypted data
  encryptedAt: number;  // Timestamp for auditing
  dataType?: string;    // Optional: "note", "task", etc.
}`}</pre>
          </div>
          <p>
            The IV (initialization vector) is prepended to the ciphertext, ensuring each encryption operation
            produces unique output even for identical plaintext.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">Two Modes of Operation</h2>

          <div className="grid gap-6 my-8 md:grid-cols-2">
            <div className="paper-card p-6 border-2 border-green-200 dark:border-green-800">
              <Smartphone className="w-6 h-6 text-green-600 mb-3" />
              <h3 className="text-xl font-bold mb-2">Local Mode (Current)</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Your device key never leaves your browser. All encryption happens locally, all data stays local.
              </p>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Zero setup required
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Maximum privacy
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-600">!</span>
                  Single-device only
                </li>
              </ul>
            </div>
            <div className="paper-card p-6 border-2 border-blue-200 dark:border-blue-800">
              <Cloud className="w-6 h-6 text-blue-600 mb-3" />
              <h3 className="text-xl font-bold mb-2">Cloud Sync Mode (Coming)</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                A passphrase derives a master key that wraps your device keys, enabling secure multi-device sync.
              </p>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span>
                  Cross-device access
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span>
                  End-to-end encrypted sync
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span>
                  Recovery key option
                </li>
              </ul>
            </div>
          </div>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">What We Encrypt</h2>
          <p>
            Encryption is applied selectively to maximize privacy without impacting performance:
          </p>
          <ul className="space-y-3 my-6">
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-cyan-600 mt-1 flex-shrink-0" />
              <span><strong>Notes & Writing</strong>: All content encrypted before storage</span>
            </li>
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-cyan-600 mt-1 flex-shrink-0" />
              <span><strong>Tasks & Habits</strong>: Personal productivity data stays private</span>
            </li>
            <li className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-cyan-600 mt-1 flex-shrink-0" />
              <span><strong>Search Queries</strong>: Your interests aren't logged in plaintext</span>
            </li>
            <li className="flex items-start gap-3">
              <Server className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
              <span><strong>UI Preferences</strong>: Theme, layout settings remain unencrypted for performance</span>
            </li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">Security Considerations</h2>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-6 my-8 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-2">What E2EE Does NOT Protect Against</h4>
                <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                  <li>• Malware running in your browser with full DOM access</li>
                  <li>• Physical access to an unlocked device</li>
                  <li>• Browser extensions with storage permissions</li>
                  <li>• Memory dumps while the app is running</li>
                </ul>
              </div>
            </div>
          </div>
          <p>
            E2EE protects your data <em>at rest</em> and <em>in transit</em>. For comprehensive security,
            combine it with device-level protections like screen locks, disk encryption, and trusted extensions only.
          </p>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">Looking Ahead</h2>
          <p>
            Our E2EE implementation is just the beginning. Here's what's on the roadmap:
          </p>
          <ul className="space-y-3 my-6">
            <li className="flex items-start gap-3">
              <span className="text-cyan-600 mt-1">1.</span>
              <span><strong>Encrypted Cloud Sync</strong>: Sync across devices without trusting the server</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-600 mt-1">2.</span>
              <span><strong>Recovery Keys</strong>: Printable backup codes for passphrase-protected sync</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-600 mt-1">3.</span>
              <span><strong>Key Rotation</strong>: Periodic re-encryption with new keys</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-600 mt-1">4.</span>
              <span><strong>Audit Logging</strong>: See when and where your data was accessed</span>
            </li>
          </ul>

          <h2 className="text-3xl font-bold mt-12 mb-6 heading-display">Try It Today</h2>
          <p>
            E2EE is enabled by default in Frame. There's nothing to configure—your data is already protected.
            Check the encryption status in Settings, or dive into the technical details in our{' '}
            <Link href="/encryption" className="text-cyan-600 hover:underline">encryption guide</Link>.
          </p>

          <div className="flex gap-4 mt-8">
            <Link
              href="/quarry"
              className="px-6 py-3 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 transition-colors inline-flex items-center gap-2"
            >
              Open Quarry
              <Shield className="w-4 h-4" />
            </Link>
            <Link
              href="https://github.com/framersai/codex"
              className="px-6 py-3 border border-cyan-600 text-cyan-600 rounded-lg font-medium hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
            >
              View on GitHub
            </Link>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-16 pt-12 border-t border-gray-200 dark:border-gray-800">
            <h2 className="text-2xl font-bold mb-8">Related Articles</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="paper-card p-6 hover:border-cyan-500 transition-colors"
                >
                  <h3 className="text-lg font-bold mb-2">{related.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{related.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </PageLayout>
  )
}
