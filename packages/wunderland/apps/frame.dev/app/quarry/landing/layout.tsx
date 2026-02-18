import type { Metadata } from 'next'
import { FRAME_BASE_URL, QUARRY_BASE_URL } from '@/lib/seo'

// Domain-aware canonical URLs - quarry.space is default, frame.dev if explicitly set
const isFrameDeployment = process.env.NEXT_PUBLIC_DOMAIN === 'frame.dev'
const landingCanonical = isFrameDeployment
  ? `${FRAME_BASE_URL}/quarry/landing`
  : `${QUARRY_BASE_URL}/landing`

// Preconnect hints for critical third-party origins (improves LCP)
function PreconnectHints() {
  return (
    <>
      {/* Preconnect to frame.dev for footer images */}
      <link rel="preconnect" href="https://frame.dev" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://frame.dev" />
      {/* Preconnect to jsdelivr for KaTeX (if used) */}
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
      {/* Preconnect to Google Tag Manager */}
      <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
    </>
  )
}

export const metadata: Metadata = {
  title: 'Quarry - Automatic Second Brain | Free Open Source AI Notes',
  description:
    'Quarry is a free, open-source second brain app where notes organize themselves automatically. AI-powered tagging, connections, and categories without any manual filing. Offline-first PKM with semantic search, knowledge graphs, and spaced repetition. MIT Licensed.',
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
  keywords: [
    // Primary SEO Keywords - High Intent 2025
    'automatic second brain',
    'second brain app',
    'self-organizing notes',
    'notes that organize themselves',
    'AI notes app',
    'free PKM software',
    'open source PKM',
    'free PKMS',
    'AI notetaking app',
    'automatic note organization',
    'best free notetaking app 2025',
    'second brain app free',
    'PKM for students',
    'Zettelkasten app free',
    'offline note taking app',
    'privacy first notes',
    'local first notes app',
    'AI note organization',
    'automatic note categorization',
    // Primary Quarry Brand Keywords
    'Quarry',
    'Quarry notes',
    'Quarry AI notes',
    'Quarry notetaking',
    'Quarry PKM',
    'Quarry PKMS',
    'Quarry knowledge management',
    'Quarry notes app',
    'Quarry Codex',
    'Quarry digital garden',
    'Quarry second brain',
    'Quarry.space',
    'quarry space',
    // Brand Association Keywords
    'Quarry by Frame',
    'Quarry by Frame.dev',
    'Quarry Frame AI',
    'Frame Quarry',
    'Frame.dev Quarry',
    'free open source Quarry',
    'Quarry open source',
    'Quarry MIT license',
    'framers ai quarry',
    // Primary - High Intent
    'personal knowledge management',
    'AI notetaking',
    'free open source notes',
    'markdown notes app',
    'knowledge graph software',
    'PKM system',
    'PKMS',
    'offline notes app',
    'free pkm software',
    'best free PKM 2025',
    'AI PKM app',
    // Competitor Alternatives
    'Obsidian alternative',
    'Notion alternative',
    'Roam alternative',
    'Logseq alternative',
    'best Obsidian alternative 2025',
    'free Notion alternative',
    'best Roam Research alternative free',
    'Notion killer',
    // OpenStrand Protocol
    'OpenStrand',
    'OpenStrand protocol',
    'weaves strands looms',
    // Technical Features
    'semantic search notes',
    'AI notes app',
    'spaced repetition',
    'FSRS flashcards',
    'knowledge base',
    'Zettelkasten',
    'connected notes',
    'digital garden',
    'offline-first',
    'local first notes',
    'client-side processing',
    'MIT licensed notes',
    'privacy-first notes',
    'no subscription notes',
    'lifetime license',
    // Habit Tracking
    'habit tracker notes app',
    'streak tracking PKM',
    'gamified habit building',
    'habit tracking with notes',
    'daily habits app',
    // Calendar & Planning
    'Google Calendar sync notes',
    'bidirectional calendar sync',
    'notes with calendar integration',
    'planner with notes app',
    'task management PKM',
    // Pricing Keywords
    'lifetime license notes app',
    'one time purchase notes',
    'no subscription notes app',
    'pay once notes app',
    'beta pricing PKM',
    'BYOK notes app',
    'bring your own key AI',
    'grandfathered pricing',
    // 2025 AI Trends
    'AI second brain',
    'AI powered notes',
    'automatic note taking app',
    'AI knowledge base',
    'smart notes app 2025',
    // Frame.dev Brand
    'Frame.dev',
    'Codex',
    'Quarry Codex',
  ],
  authors: [{ name: 'FramersAI', url: FRAME_BASE_URL }],
  creator: 'FramersAI (team@frame.dev)',
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
  openGraph: {
    title: 'Quarry - Automatic Second Brain | Free Open Source AI Notes',
    description:
      'Your second brain that builds itself. Quarry automatically organizes your notes with AI-powered tagging, connections, and categories. Free, open-source, offline-first PKM. No folders, no filing—just write.',
    url: `${FRAME_BASE_URL}/quarry/landing`,
    siteName: 'Quarry by Frame.dev',
    type: 'website',
    images: [
      {
        url: `${FRAME_BASE_URL}/og-quarry.png`,
        width: 1200,
        height: 630,
        alt: 'Quarry - Free Open Source AI Notes App',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@framersai',
    creator: '@framersai',
    title: 'Quarry - Automatic Second Brain | Free AI Notes',
    description:
      'Notes that organize themselves. Free, open-source second brain with AI tagging, semantic search, and knowledge graphs. 100% offline. MIT Licensed.',
    images: [`${FRAME_BASE_URL}/og-quarry.png`],
  },
  alternates: {
    canonical: landingCanonical,
  },
  other: {
    'application-name': 'Quarry',
  },
}

// JSON-LD structured data with enhanced Organization and Product schemas
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      '@id': `${FRAME_BASE_URL}/quarry#software`,
      name: 'Quarry - Automatic Second Brain',
      alternateName: ['Quarry', 'Automatic Second Brain', 'Quarry Codex', 'Quarry PKM', 'Quarry.space', 'quarry space', 'Quarry by Frame.dev'],
      description: 'Automatic second brain where notes organize themselves. Free, open-source AI-powered PKM with semantic search, knowledge graphs, and spaced repetition.',
      applicationCategory: 'ProductivityApplication',
      applicationSubCategory: 'Personal Knowledge Management',
      operatingSystem: 'Web, Windows, macOS, Linux, iOS, Android',
      downloadUrl: `${FRAME_BASE_URL}/quarry/app`,
      installUrl: `${FRAME_BASE_URL}/quarry/app`,
      screenshot: [
        `${FRAME_BASE_URL}/screenshots/quarry-editor.png`,
        `${FRAME_BASE_URL}/screenshots/quarry-graph.png`,
        `${FRAME_BASE_URL}/screenshots/quarry-search.png`,
      ],
      offers: [
        {
          '@type': 'Offer',
          name: 'Community Edition',
          price: '0',
          priceCurrency: 'USD',
          description: 'Free forever. Open-source under MIT License.',
          availability: 'https://schema.org/InStock',
        },
        {
          '@type': 'Offer',
          name: 'Premium Lifetime',
          price: '199.99',
          priceCurrency: 'USD',
          description: 'Pay once, lifetime updates forever. Includes team collaboration, sync, and workflows after beta.',
          availability: 'https://schema.org/PreOrder',
        },
        {
          '@type': 'Offer',
          name: 'Premium Beta',
          price: '99.99',
          priceCurrency: 'USD',
          description: 'Beta launch price - $199.99 value. Free lifetime updates included.',
          availability: 'https://schema.org/InStock',
        },
        {
          '@type': 'Offer',
          name: 'Premium Student',
          price: '69.99',
          priceCurrency: 'USD',
          description: 'Student discount (always available). Email team@frame.dev with subject "Student Discount" and your .edu email for a promo code. Free lifetime updates included.',
          availability: 'https://schema.org/InStock',
        },
      ],
      featureList: [
        '100% Offline Processing',
        'AI-Native & AI-Optional',
        'Semantic Search (~10ms)',
        'Knowledge Graphs',
        'Bidirectional Google Calendar Sync',
        'FSRS Spaced Repetition',
        'Auto-Generated Flashcards',
        'OpenStrand Protocol',
        'GitHub Integration',
        '8 Beautiful Themes',
        'Mobile Responsive',
        'Habit Tracking',
        'Day Planner',
        'End-to-End Encryption',
        'Self-Hosting Support',
        'Import/Export (JSON, Markdown, HTML)',
      ],
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '127',
        bestRating: '5',
        worstRating: '1',
      },
      author: {
        '@type': 'Organization',
        '@id': `${FRAME_BASE_URL}#organization`,
      },
    },
    {
      '@type': 'Organization',
      '@id': `${FRAME_BASE_URL}#organization`,
      name: 'Frame.dev',
      alternateName: ['Framers', 'framersai'],
      url: FRAME_BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${FRAME_BASE_URL}/frame-logo-transparent.png`,
        width: 512,
        height: 512,
      },
      sameAs: [
        'https://github.com/framersai',
        'https://twitter.com/framersai',
        'https://linkedin.com/company/framersai',
        'https://discord.gg/gJGpJ2uxrx',
      ],
      brand: [
        {
          '@type': 'Brand',
          name: 'Quarry',
          url: `${FRAME_BASE_URL}/quarry`,
        },
        {
          '@type': 'Brand',
          name: 'OpenStrand',
          url: 'https://openstrand.ai',
        },
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${QUARRY_BASE_URL}#website`,
      name: 'Quarry.space',
      url: QUARRY_BASE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${FRAME_BASE_URL}/quarry/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'FAQPage',
      '@id': `${FRAME_BASE_URL}/quarry/landing#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is Quarry really free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! The Community Edition is completely free and open-source under the MIT License. Premium adds flashcards, quizzes, export, and offline SQLite storage.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does Quarry work offline?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, Quarry is 100% offline-first. All core features including NLP processing, semantic search, and knowledge graphs work without an internet connection.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does Quarry Premium cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Quarry Premium is $99.99 during beta ($69.99 for students). After beta, it will be $199.99 lifetime with team collaboration, sync, and workflows. All beta buyers get free lifetime updates — a $199.99 value. Community edition is free and open source under MIT license.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is OpenStrand?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'OpenStrand is our hierarchical knowledge organization protocol: Fabric contains Weaves (universes), which contain Looms (folders), which contain Strands (atomic knowledge units as markdown files).',
          },
        },
        {
          '@type': 'Question',
          name: 'Does Quarry have habit tracking?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! Quarry includes gamified habit tracking with streak counting, grace periods, freeze protection, and 40+ pre-built templates across health, learning, productivity, and more categories. Earn achievements and XP as you build consistent habits.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is Quarry different from Notion or Obsidian?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Quarry is 100% offline-first and free/open-source. Unlike Notion, your data never leaves your device. Unlike Obsidian, Quarry includes AI-powered auto-organization, built-in flashcards, and a day planner—all without plugins.',
          },
        },
      ],
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${FRAME_BASE_URL}/quarry/landing#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Frame.dev',
          item: FRAME_BASE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Quarry',
          item: `${FRAME_BASE_URL}/quarry`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Landing',
          item: `${FRAME_BASE_URL}/quarry/landing`,
        },
      ],
    },
  ],
}

export default function QuarryLandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <PreconnectHints />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  )
}
