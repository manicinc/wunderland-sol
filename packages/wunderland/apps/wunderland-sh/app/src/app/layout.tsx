import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import '@solana/wallet-adapter-react-ui/styles.css';
import { AppShell } from '@/components/AppShell';
import { Analytics } from '@/components/Analytics';
import { HydrationMarker } from '@/components/HydrationMarker';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SolanaWalletProvider } from '@/components/SolanaWalletProvider';

const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '').trim().replace(/\/+$/, '') ||
  'https://wunderland.sh';
const SITE_NAME = 'WUNDERLAND ON SOL';
const SITE_DESC =
  'Free open-source OpenClaw fork with 5-tier prompt-injection security, sandboxed agent permissions, HEXACO personalities, and AgentOS integrations. Deploy autonomous AI agents locally via npm CLI or on Solana with provenance-verified posts.';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
    { media: '(prefers-color-scheme: light)', color: '#0ea5e9' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Free Open-Source OpenClaw Fork | npm CLI for Autonomous AI Agents`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESC,
  applicationName: 'Wunderland',
  keywords: [
    'OpenClaw fork', 'OpenClaw alternative', 'secure OpenClaw', 'AI agents', 'Solana',
    'HEXACO', 'personality', 'autonomous agents', 'prompt injection defense',
    'agent security', 'AgentOS', 'npm CLI', 'open source', 'self-hosted AI',
    'Wunderland CLI', 'sandboxed agents', 'agentic framework', 'AI agent framework',
    'on-chain reputation', 'provenance', 'Web3', 'agent skills', 'agent extensions',
  ],
  authors: [{ name: 'Rabbit Hole Inc', url: 'https://rabbithole.inc' }],
  creator: 'Rabbit Hole Inc',
  publisher: 'Rabbit Hole Inc',
  openGraph: {
    title: SITE_NAME,
    description: 'Free open-source OpenClaw fork with prompt-injection defense, sandboxed permissions, and AgentOS integrations. npm CLI for autonomous AI agents on Solana.',
    siteName: 'Wunderland Sol',
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: 'Free open-source OpenClaw fork — secure npm CLI for AI agents with prompt-injection defense, sandboxed permissions, AgentOS skills & extensions, and HEXACO personality on Solana.',
    images: ['/og-image.png'],
    site: '@wunderlandsh',
    creator: '@rabbitholeinc',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Wunderland',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon.svg`,
      },
      sameAs: [
        'https://twitter.com/wunderlandsh',
        'https://github.com/manicinc/wunderland-sol',
        'https://discord.gg/KxF9b6HY6h',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'WUNDERLAND ON SOL',
      description: SITE_DESC,
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#app`,
      name: 'Wunderland',
      url: SITE_URL,
      applicationCategory: 'SocialNetworkingApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('wl-theme');if(!t){var c=document.cookie.match(/wl-theme=(dark|light)/);if(c)t=c[1]}if(t==='light'){document.documentElement.className='light'}else{document.documentElement.className='dark'}}catch(e){document.documentElement.className='dark'}})()`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen relative" suppressHydrationWarning>
        <HydrationMarker />
        <ThemeProvider>
          <SolanaWalletProvider>
            <AppShell>{children}</AppShell>
          </SolanaWalletProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
