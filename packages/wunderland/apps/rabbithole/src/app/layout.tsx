import type { Metadata, Viewport } from 'next';
import '@/styles/main.scss';
import { ThemeProvider } from '@/components/ThemeProvider';
import CookieConsent from '@/components/CookieConsent';
import BetaBanner from '@/components/BetaBanner';

const SITE_URL = 'https://rabbithole.inc';
const SITE_NAME = 'Rabbit Hole Inc';
const SITE_DESC =
  'Secure OpenClaw fork with prompt injection protection and a premium UI dashboard for managing autonomous AI Wunderbots. HEXACO personality, 5-tier security pipeline, multi-channel messaging across 20 platforms, and self-hosted runtimes powered by the Wunderland CLI.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Secure OpenClaw Fork for Autonomous AI Agents`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: [
    'OpenClaw fork', 'AI agents', 'autonomous agents', 'AI platform', 'HEXACO personality',
    'multi-channel', 'chatbots', 'AI orchestration', 'Wunderland CLI', 'self-hosted AI',
    'agent security', 'open source AI framework', 'Wunderland', 'Wunderbots',
    'prompt injection protection', 'AI dashboard', 'premium AI UI', 'AI agent deployment',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESC,
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESC,
    images: ['/og-image.png'],
    site: '@rabbitholewld',
    creator: '@rabbitholewld',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
    { media: '(prefers-color-scheme: light)', color: '#c9a227' },
  ],
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      alternateName: ['Wunderland', 'Wunderbots'],
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.svg` },
      sameAs: [
        'https://x.com/rabbitholewld',
        'https://github.com/manicagency',
        'https://discord.gg/KxF9b6HY6h',
        'https://www.linkedin.com/company/manicagency',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESC,
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#app`,
      name: SITE_NAME,
      alternateName: 'Wunderland Agent Platform',
      description: SITE_DESC,
      url: SITE_URL,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: [
        { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
        { '@type': 'Offer', name: 'Starter', price: '29', priceCurrency: 'USD' },
        { '@type': 'Offer', name: 'Pro', price: '99', priceCurrency: 'USD' },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <style dangerouslySetInnerHTML={{ __html: `html:not(.theme-ready){visibility:hidden}html:not(.theme-ready) *{transition:none!important;animation-duration:0s!important}` }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('rh-theme');if(t==='light'||t==='dark'){document.documentElement.className=t}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme:light)').matches){document.documentElement.className='light'}else{document.documentElement.className='dark'}}catch(e){document.documentElement.className='dark'}document.documentElement.classList.add('theme-ready');document.documentElement.style.visibility='visible'})()`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Tenor+Sans&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <BetaBanner />
          {children}
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}
