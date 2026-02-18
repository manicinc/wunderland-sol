import type { Metadata } from 'next'
import QuarryUrlCleanup from '@/components/quarry/QuarryUrlCleanup'
import { OpenTabsProvider } from '@/components/quarry/contexts/OpenTabsContext'
import { QuarryErrorBoundary } from '@/components/quarry/QuarryErrorBoundary'
import { CacheVersionGuard } from '@/components/quarry/CacheVersionGuard'
import { AuthProvider } from '@/lib/auth'
import { FRAME_BASE_URL, QUARRY_BASE_URL, ALL_QUARRY_KEYWORDS } from '@/lib/seo'
import CheckoutComingSoonBanner from '@/components/quarry/ui/status/CheckoutComingSoonBanner'

/**
 * Quarry Layout
 * Applies to all /quarry/* routes
 * - Sets Quarry favicon for all routes
 * - Provides shared metadata with Quarry branding
 * - Cleans up URLs on quarry.space domain
 * - Quarry is the primary product
 *
 * Domain-aware SEO (quarry.space is default):
 * - Default: uses quarry.space as canonical
 * - When NEXT_PUBLIC_DOMAIN=frame.dev, uses frame.dev/quarry as canonical
 */

// Default to quarry.space - only use frame.dev if explicitly set
const isFrameDeployment = process.env.NEXT_PUBLIC_DOMAIN === 'frame.dev'
const baseUrl = isFrameDeployment ? FRAME_BASE_URL : QUARRY_BASE_URL
const canonicalUrl = isFrameDeployment ? `${FRAME_BASE_URL}/quarry` : QUARRY_BASE_URL

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    template: isFrameDeployment ? '%s – Quarry by Frame.dev' : '%s | Quarry',
    default: 'Quarry - Automatic Second Brain | Free Open Source AI Notes',
  },
  description: 'Quarry is your automatic second brain - free, open-source AI-powered personal knowledge management. Build your knowledge graph, semantic search in 10ms, works 100% offline. The best free Notion and Obsidian alternative.',
  applicationName: 'Quarry',
  keywords: ALL_QUARRY_KEYWORDS as unknown as string[],
  authors: [{ name: 'Frame.dev', url: FRAME_BASE_URL }],
  creator: 'Frame.dev',
  publisher: 'Frame.dev',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/quarry-icon-mono-light.svg', media: '(prefers-color-scheme: light)', type: 'image/svg+xml' },
      { url: '/quarry-icon-mono-dark.svg', media: '(prefers-color-scheme: dark)', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    siteName: isFrameDeployment ? 'Quarry by Frame.dev' : 'Quarry',
    title: 'Quarry - Automatic Second Brain | Free Open Source AI Notes',
    description: 'Your automatic second brain - free, open-source AI-powered personal knowledge management. Semantic search, knowledge graph, 100% offline.',
    images: [
      {
        url: `${baseUrl}/og-quarry.png`,
        width: 1200,
        height: 630,
        alt: 'Quarry - Automatic Second Brain',
      },
    ],
    type: 'website',
    url: canonicalUrl,
  },
  twitter: {
    card: 'summary_large_image',
    site: '@framersai',
    creator: '@framersai',
    title: 'Quarry - Automatic Second Brain',
    description: 'Free, open-source AI-powered personal knowledge management. Semantic search, knowledge graph, 100% offline.',
    images: [`${baseUrl}/og-quarry.png`],
  },
  alternates: {
    // Clear canonical - no hreflang confusion
    canonical: canonicalUrl,
  },
  category: 'productivity',
}

export default function QuarryLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <QuarryErrorBoundary>
      <AuthProvider>
        <OpenTabsProvider>
          <CacheVersionGuard>
            <QuarryUrlCleanup />
            <CheckoutComingSoonBanner />
            {children}
          </CacheVersionGuard>
        </OpenTabsProvider>
      </AuthProvider>
    </QuarryErrorBoundary>
  )
}
