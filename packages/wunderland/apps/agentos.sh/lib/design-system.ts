// Modern Neumorphic Design System for AgentOS
// Focused on accessibility, readability, and corporate elegance

export const designTokens = {
  // Color palette - WCAG AAA compliant
  colors: {
    // Primary brand colors
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49',
    },
    // Accent colors for CTAs
    accent: {
      50: '#fdf4ff',
      100: '#fae8ff',
      200: '#f5d0fe',
      300: '#f0abfc',
      400: '#e879f9',
      500: '#d946ef',
      600: '#c026d3',
      700: '#a21caf',
      800: '#86198f',
      900: '#701a75',
      950: '#4a044e',
    },
    // Neutral grays for text and UI
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a',
    },
    // Success, warning, error states
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },

  // Neumorphic shadows for depth
  shadows: {
    // Soft neumorphic shadows
    neumorphic: {
      flat: '0 0 0 1px rgba(0, 0, 0, 0.05)',
      raised: '20px 20px 60px rgba(0, 0, 0, 0.15), -20px -20px 60px rgba(255, 255, 255, 0.15)',
      pressed: 'inset 6px 6px 12px rgba(0, 0, 0, 0.15), inset -6px -6px 12px rgba(255, 255, 255, 0.15)',
      hover: '25px 25px 75px rgba(0, 0, 0, 0.2), -25px -25px 75px rgba(255, 255, 255, 0.2)',
    },
    // Standard elevation shadows
    elevation: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    },
  },

  // Typography system
  typography: {
    fonts: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: '"Space Grotesk", "Inter", sans-serif',
      mono: '"JetBrains Mono", "SF Mono", Monaco, monospace',
    },
    // Fluid typography scales
    sizes: {
      xs: 'clamp(0.75rem, 1vw, 0.875rem)',
      sm: 'clamp(0.875rem, 1.2vw, 1rem)',
      base: 'clamp(1rem, 1.5vw, 1.125rem)',
      lg: 'clamp(1.125rem, 2vw, 1.25rem)',
      xl: 'clamp(1.25rem, 2.5vw, 1.5rem)',
      '2xl': 'clamp(1.5rem, 3vw, 1.875rem)',
      '3xl': 'clamp(1.875rem, 4vw, 2.25rem)',
      '4xl': 'clamp(2.25rem, 5vw, 3rem)',
      '5xl': 'clamp(3rem, 6vw, 3.75rem)',
      '6xl': 'clamp(3.75rem, 7vw, 4.5rem)',
    },
    lineHeight: {
      tight: '1.2',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '1.75',
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },

  // Spacing system
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem',
    '3xl': '6rem',
    '4xl': '8rem',
    '5xl': '12rem',
  },

  // Border radius for neumorphic elements
  borderRadius: {
    none: '0',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '2rem',
    '3xl': '3rem',
    full: '9999px',
  },

  // Animation presets
  animation: {
    duration: {
      fast: '150ms',
      base: '250ms',
      slow: '350ms',
      slower: '500ms',
      slowest: '1000ms',
    },
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  // Breakpoints
  breakpoints: {
    xs: '375px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
}

// Neumorphic component styles
export const neumorphicStyles = {
  card: `
    background: linear-gradient(145deg, var(--neu-light), var(--neu-dark));
    box-shadow: 20px 20px 60px var(--neu-shadow-dark),
                -20px -20px 60px var(--neu-shadow-light);
    border-radius: ${designTokens.borderRadius.xl};
    backdrop-filter: blur(10px);
  `,

  button: `
    background: linear-gradient(145deg, var(--neu-light), var(--neu-dark));
    box-shadow: 8px 8px 16px var(--neu-shadow-dark),
                -8px -8px 16px var(--neu-shadow-light);
    transition: all ${designTokens.animation.duration.base} ${designTokens.animation.easing.smooth};

    &:hover {
      box-shadow: 10px 10px 20px var(--neu-shadow-dark),
                  -10px -10px 20px var(--neu-shadow-light);
      transform: translateY(-2px);
    }

    &:active {
      box-shadow: inset 4px 4px 8px var(--neu-shadow-dark),
                  inset -4px -4px 8px var(--neu-shadow-light);
      transform: translateY(0);
    }
  `,

  input: `
    background: var(--neu-bg);
    box-shadow: inset 4px 4px 8px var(--neu-shadow-dark),
                inset -4px -4px 8px var(--neu-shadow-light);
    border-radius: ${designTokens.borderRadius.lg};
    transition: all ${designTokens.animation.duration.base} ${designTokens.animation.easing.smooth};

    &:focus {
      box-shadow: inset 2px 2px 4px var(--neu-shadow-dark),
                  inset -2px -2px 4px var(--neu-shadow-light),
                  0 0 0 3px var(--focus-ring);
      outline: none;
    }
  `,

  glass: `
    background: linear-gradient(135deg,
                rgba(255, 255, 255, 0.1),
                rgba(255, 255, 255, 0.05));
    backdrop-filter: blur(10px) saturate(180%);
    -webkit-backdrop-filter: blur(10px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
  `,
}

// Accessibility utilities
export const a11y = {
  visuallyHidden: `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  `,

  focusVisible: `
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  `,

  skipLink: `
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 8px;
    text-decoration: none;
    z-index: 999999;

    &:focus {
      top: 0;
    }
  `,
}

// SEO metadata helpers
export const seoDefaults = {
  title: 'AgentOS - TypeScript Runtime for Adaptive AI Agent Intelligence',
  description: 'Build intelligent, adaptive AI agents with AgentOS. Open-source TypeScript runtime for creating autonomous AI systems with agency, memory, and multi-modal capabilities.',
  keywords: [
    'AgentOS',
    'AI agents',
    'artificial intelligence',
    'machine learning',
    'TypeScript AI',
    'autonomous agents',
    'agent runtime',
    'AI framework',
    'adaptive intelligence',
    'agency AI',
    'multi-agent systems',
    'AI orchestration',
    'agent memory',
    'agent tools',
    'AI development',
    'open source AI',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'AgentOS',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AgentOS - Adaptive AI Agent Intelligence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@agentos',
    site: '@agentos',
  },
}

// Structured data schemas
export const structuredData = {
  organization: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AgentOS',
    url: 'https://agentos.sh',
    logo: 'https://agentos.sh/logo.png',
    sameAs: [
      'https://github.com/agentosai',
      'https://twitter.com/agentos',
    ],
  },

  software: {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AgentOS',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cross-platform',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '156',
    },
  },
}