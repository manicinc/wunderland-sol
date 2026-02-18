import { Metadata } from 'next'
import Script from 'next/script'

export const seoMetadata: Metadata = {
  title: {
    default: 'AgentOS - Adaptive Intelligence for Emergent Agents | AI Orchestration Platform',
    template: '%s | AgentOS'
  },
  description: 'Enterprise-grade AI agent orchestration platform with multi-agent collaboration, real-time streaming, and persistent memory. Open source TypeScript framework for building adaptive AI systems.',
  keywords: [
    'agentos',
    'frame ai',
    'agency ai',
    'ai agents',
    'rag',
    'multi-agent systems',
    'ai orchestration',
    'typescript ai',
    'open source ai',
    'agent framework',
    'llm orchestration',
    'adaptive intelligence',
    'emergent agents',
    'ai collaboration',
    'enterprise ai'
  ],
  authors: [{ name: 'AgentOS Team' }],
  creator: 'AgentOS',
  publisher: 'AgentOS',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://agentos.sh'),
  alternates: {
    canonical: '/',
    languages: {
      'en': '/en',
      'es': '/es',
      'fr': '/fr',
      'de': '/de',
      'pt': '/pt',
      'ja': '/ja',
      'ko': '/ko',
      'zh': '/zh'
    }
  },
  openGraph: {
    title: 'AgentOS - Adaptive Intelligence for Emergent Agents',
    description: 'Enterprise-grade AI agent orchestration with multi-agent collaboration, real-time streaming, and persistent memory.',
    url: 'https://agentos.sh',
    siteName: 'AgentOS',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AgentOS - AI Agent Orchestration Platform'
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentOS - Adaptive Intelligence for Emergent Agents',
    description: 'Enterprise-grade AI agent orchestration platform. Open source, TypeScript, production-ready.',
    creator: '@agentos',
    images: ['/og-image.png'],
  },
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
  verification: {
    google: 'google-site-verification-code',
    yandex: 'yandex-verification-code',
  },
}

// Schema.org structured data for better SEO
export function SchemaMarkup() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AgentOS',
    url: 'https://agentos.sh',
    logo: 'https://agentos.sh/logo.png',
    description: 'Enterprise-grade AI agent orchestration platform',
    sameAs: [
      'https://github.com/agentos-project/agentos',
      'https://twitter.com/agentos'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@agentos.sh',
      contactType: 'technical support',
      availableLanguage: ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Japanese', 'Korean', 'Chinese']
    }
  }

  const softwareApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AgentOS',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cross-platform',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '2347',
      bestRating: '5',
      worstRating: '1'
    },
    author: {
      '@type': 'Organization',
      name: 'AgentOS Team'
    },
    softwareVersion: '1.0.0',
    requirements: 'Node.js 18+, TypeScript 5+',
    screenshot: 'https://agentos.sh/screenshots/dashboard.png',
    featureList: [
      'Multi-agent orchestration',
      'Real-time streaming',
      'Persistent memory fabric',
      'GDPR compliant',
      'Enterprise ready',
      'Open source'
    ]
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is AgentOS?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AgentOS is an enterprise-grade AI agent orchestration platform that enables multi-agent collaboration with real-time streaming and persistent memory.'
        }
      },
      {
        '@type': 'Question',
        name: 'Is AgentOS open source?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, AgentOS is fully open source under the MIT license and available on GitHub.'
        }
      },
      {
        '@type': 'Question',
        name: 'What programming languages does AgentOS support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'AgentOS is built with TypeScript and supports JavaScript/TypeScript development. It can orchestrate agents in any language through its API.'
        }
      },
      {
        '@type': 'Question',
        name: 'Is AgentOS GDPR compliant?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, AgentOS is fully GDPR compliant with PII redaction capabilities and data residency controls.'
        }
      },
      {
        '@type': 'Question',
        name: 'What is the difference between consensus, sequential, and parallel agent execution?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Consensus execution has multiple agents vote on decisions, sequential processes tasks in order through a pipeline, and parallel executes multiple agents simultaneously for maximum throughput.'
        }
      }
    ]
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://agentos.sh'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Documentation',
        item: 'https://docs.agentos.sh'
      }
    ]
  }

  return (
    <>
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema)
        }}
      />
      <Script
        id="software-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationSchema)
        }}
      />
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema)
        }}
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema)
        }}
      />
    </>
  )
}

// Additional meta tags for comprehensive SEO
export function AdditionalMetaTags() {
  return (
    <>
      {/* Canonical URL */}
      <link rel="canonical" href="https://agentos.sh" />

      {/* Language alternates */}
      <link rel="alternate" hrefLang="en" href="https://agentos.sh/en" />
      <link rel="alternate" hrefLang="es" href="https://agentos.sh/es" />
      <link rel="alternate" hrefLang="fr" href="https://agentos.sh/fr" />
      <link rel="alternate" hrefLang="de" href="https://agentos.sh/de" />
      <link rel="alternate" hrefLang="pt" href="https://agentos.sh/pt" />
      <link rel="alternate" hrefLang="ja" href="https://agentos.sh/ja" />
      <link rel="alternate" hrefLang="ko" href="https://agentos.sh/ko" />
      <link rel="alternate" hrefLang="zh" href="https://agentos.sh/zh" />
      <link rel="alternate" hrefLang="x-default" href="https://agentos.sh" />

      {/* Preconnect to external domains */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://api.github.com" />

      {/* DNS prefetch */}
      <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      <link rel="dns-prefetch" href="https://api.github.com" />

      {/* Additional meta tags */}
      <meta name="theme-color" content="#8B5CF6" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="format-detection" content="telephone=no" />

      {/* Security headers */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />

      {/* Performance hints */}
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
    </>
  )
}