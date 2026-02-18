import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import dynamic from 'next/dynamic'
import { Inter, Playfair_Display, JetBrains_Mono, Crimson_Pro, Fraunces, Caveat } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { SecurityProvider } from '@/lib/config/securityConfig'
import MarketingAnalytics from '@/components/MarketingAnalytics'
import CRTEffect from '@/components/terminal/CRTEffect'
import { InitializeImportExport } from '@/components/InitializeImportExport'
import { FRAME_BASE_URL } from '@/lib/seo'

// Dynamic import for LockScreenGate to ensure proper client-side rendering
const LockScreenGate = dynamic(
  () => import('@/components/quarry/ui/security/LockScreen').then(mod => mod.LockScreenGate),
  { ssr: false }
)
import './globals.css'
import '@/styles/typography.css'
// KaTeX CSS moved to pages that need it - not needed on landing page

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({ 
  weight: ['400', '600', '700', '900'],
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const crimson = Crimson_Pro({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-crimson',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

const fraunces = Fraunces({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-caveat',
  display: 'swap',
})

const themeClassMap = {
  light: 'light',
  dark: 'dark',
  'sepia-light': 'sepia-light',
  'sepia-dark': 'sepia-dark',
  'terminal-light': 'terminal-light',
  'terminal-dark': 'terminal-dark',
  'oceanic-light': 'oceanic-light',
  'oceanic-dark': 'oceanic-dark',
} as const

const themeOptions = Object.keys(themeClassMap) as Array<keyof typeof themeClassMap>

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export const metadata: Metadata = {
  metadataBase: new URL(FRAME_BASE_URL),
  title: {
    default: 'Frame.dev – AI Infrastructure for Knowledge and Superintelligence',
    template: '%s | Frame.dev',
  },
  description:
    'Frame.dev is building adaptive AI infrastructure that is emergent and permanent—denoising the web, powering AI agents, and serving as the OS for humans and the codex of humanity.',
  applicationName: 'Frame.dev',
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
  keywords: [
    // Frame.dev Brand Keywords
    'Frame.dev',
    'frame dev',
    'framersai',
    'FramersAI',
    'team@frame.dev',
    // Superintelligence & AI Infrastructure
    'superintelligence',
    'AI infrastructure',
    'artificial superintelligence',
    'ASI',
    'AGI',
    'denoising the web',
    'codex of humanity',
    'AI agents',
    'emergent AI',
    'adaptive AI',
    'knowledge infrastructure',
    // Products by Frame.dev
    'Quarry by Frame.dev',
    'Voice Chat Assistant',
    'OpenStrand',
    'AgentOS',
    // General AI Keywords
    'artificial intelligence',
    'machine learning',
    'AI native',
    'AI-powered',
    'knowledge graph',
    'semantic search',
  ],
  authors: [{ name: 'Frame.dev', url: FRAME_BASE_URL }],
  creator: 'Frame.dev',
  publisher: 'Frame.dev',
  openGraph: {
    title: 'Frame.dev – AI Infrastructure for Knowledge and Superintelligence',
    description:
      'Building adaptive AI infrastructure that is emergent and permanent—denoising the web, powering AI agents, and serving as the OS for humans.',
    url: FRAME_BASE_URL,
    siteName: 'Frame.dev',
    type: 'website',
    images: [
      {
        url: `${FRAME_BASE_URL}/og-frame.png`,
        width: 1200,
        height: 630,
        alt: 'Frame.dev – AI Infrastructure for Superintelligence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@framersai',
    creator: '@framersai',
    title: 'Frame.dev – AI Infrastructure for Knowledge and Superintelligence',
    description:
      'Building adaptive AI infrastructure that is emergent and permanent—denoising the web, powering AI agents, and serving as the OS for humans.',
    images: [`${FRAME_BASE_URL}/og-frame.png`],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  category: 'technology',
  alternates: {
    canonical: FRAME_BASE_URL,
  },
  other: {
    contact: 'team@frame.dev',
  },
}

// Enhanced JSON-LD structured data for Organization + SoftwareApplication
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${FRAME_BASE_URL}#organization`,
      name: 'Frame.dev',
      alternateName: ['Framers', 'framersai', 'Frame'],
      url: FRAME_BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${FRAME_BASE_URL}/frame-logo-transparent.png`,
        width: 512,
        height: 512,
      },
      description: 'Frame.dev is building the AI infrastructure for superintelligence—denoising the web, powering AI agents, and serving as the OS for humans.',
      foundingDate: '2024',
      sameAs: [
        'https://twitter.com/framersai',
        'https://github.com/framersai',
        'https://linkedin.com/company/framersai',
        'https://discord.gg/gJGpJ2uxrx',
        'https://npmjs.com/org/framers',
      ],
      brand: [
        {
          '@type': 'Brand',
          name: 'Quarry',
          url: `${FRAME_BASE_URL}/quarry`,
          description: 'Free open source AI-powered personal knowledge management',
        },
        {
          '@type': 'Brand',
          name: 'OpenStrand',
          url: 'https://openstrand.ai',
          description: 'AI-native knowledge infrastructure protocol',
        },
        {
          '@type': 'Brand',
          name: 'AgentOS',
          url: 'https://agentos.sh',
          description: 'Adaptive AI agency runtime',
        },
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'team@frame.dev',
        contactType: 'customer support',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${FRAME_BASE_URL}#website`,
      name: 'Frame.dev',
      url: FRAME_BASE_URL,
      publisher: {
        '@id': `${FRAME_BASE_URL}#organization`,
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${FRAME_BASE_URL}/quarry/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${FRAME_BASE_URL}/quarry#software`,
      name: 'Quarry - Automatic Second Brain',
      alternateName: ['Quarry', 'Quarry Codex', 'Quarry PKM', 'Quarry Space', 'Automatic Second Brain', 'Quarry by Frame.dev', 'quarry.space'],
      applicationCategory: 'ProductivityApplication',
      applicationSubCategory: 'Personal Knowledge Management',
      operatingSystem: 'Web, Windows, macOS, Linux, iOS, Android',
      downloadUrl: `${FRAME_BASE_URL}/quarry/app`,
      url: 'https://quarry.space',
      sameAs: [
        'https://quarry.space',
        'https://github.com/framersai/quarry',
      ],
      offers: [
        {
          '@type': 'Offer',
          name: 'Open Source Edition',
          price: '0',
          priceCurrency: 'USD',
          description: 'Full-featured open source PKMS. MIT Licensed. Forever free.',
          availability: 'https://schema.org/InStock',
        },
        {
          '@type': 'Offer',
          name: 'Premium Edition',
          price: '79',
          priceCurrency: 'USD',
          description: 'Lifetime license with cloud sync and advanced AI features. $49 for students.',
          availability: 'https://schema.org/InStock',
        },
      ],
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '127',
        bestRating: '5',
        worstRating: '1',
      },
      author: {
        '@id': `${FRAME_BASE_URL}#organization`,
      },
      creator: {
        '@type': 'Organization',
        name: 'FramersAI',
        email: 'team@frame.dev',
        url: 'https://frame.dev',
      },
      isAccessibleForFree: true,
      license: 'https://opensource.org/licenses/MIT',
      description: 'Quarry is your automatic second brain - free, open-source AI-powered personal knowledge management. Build your knowledge graph, semantic search in 10ms, works 100% offline. The best free Notion and Obsidian alternative with AI Q&A built-in.',
      featureList: [
        'Automatic organization with AI',
        'AI-powered Q&A for your notes',
        'Semantic search (~10ms)',
        'Knowledge graph visualization',
        'Markdown with rich formatting',
        'Connected notes (bidirectional links)',
        '8 beautiful themes',
        'Multilingual support',
        '100% Offline-first',
        'Free and open source (MIT License)',
        'FSRS spaced repetition flashcards',
        'Day planner with habit tracking',
        'End-to-end encryption',
        'Self-hosting support',
      ],
      screenshot: [
        `${FRAME_BASE_URL}/og-quarry.png`,
        `${FRAME_BASE_URL}/screenshots/quarry-editor.png`,
      ],
      softwareVersion: '1.0',
      keywords: 'automatic second brain, free notetaking app, open source PKM, personal knowledge management, knowledge graph, ai native notes, free open source, quarry space, framersai',
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external resources for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Preconnect to frame.dev for cross-domain assets (saves 100ms LCP) */}
        <link rel="preconnect" href="https://frame.dev" />
        <link rel="dns-prefetch" href="https://frame.dev" />
        {/* Preconnect to CDNs for third-party scripts */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00C896" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Frame.dev" />
        
        {/* Additional SEO meta tags */}
        <meta name="author" content="Frame.dev" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Enhanced SEO - JSON-LD Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        
        {/* KaTeX removed from global layout - load only on pages that need math rendering via KaTeXLoader component */}
      </head>
      <body className={`${inter.variable} ${playfair.variable} ${crimson.variable} ${jetbrains.variable} ${fraunces.variable} ${caveat.variable} font-sans antialiased bg-paper-50 dark:bg-ink-950 text-ink-900 dark:text-paper-50`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="theme"
          themes={themeOptions}
          value={themeClassMap}
        >
          <SecurityProvider>
            <LockScreenGate>
              <InitializeImportExport />
              <CRTEffect>
                <div className="bg-paper-texture">
                  {children}
                </div>
              </CRTEffect>
              {/* Domain-specific analytics IDs selected automatically via isQuarryDomain() */}
              <MarketingAnalytics />
            </LockScreenGate>
          </SecurityProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
