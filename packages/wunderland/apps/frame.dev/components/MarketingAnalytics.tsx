/**
 * Marketing Analytics Wrapper
 *
 * Conditionally renders external analytics (GA4, Clarity) and cookie consent
 * ONLY on marketing/landing pages.
 *
 * EXCLUDED (no tracking, no cookies):
 * - /quarry/app/* (the actual app - 100% local/private)
 * - All Electron app routes (detected via window.electronAPI)
 *
 * INCLUDED (marketing pages with analytics):
 * - / (frame.dev home)
 * - /quarry/landing (quarry marketing page)
 * - /privacy, /cookies, /about, /blog, etc.
 *
 * This ensures the app remains tracking-free with local-only analytics.
 * Users' reading habits and knowledge exploration stay completely private.
 */

'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Analytics from '@/components/Analytics'
import CookieConsent from '@/components/CookieConsent'
import { isQuarryDomain } from '@/lib/utils/deploymentMode'

interface MarketingAnalyticsProps {
  /** Google Analytics 4 Measurement ID (e.g., G-XXXXXXXXXX) */
  gaId?: string
  /** Microsoft Clarity Project ID */
  clarityId?: string
}

/**
 * Check if running in Electron (desktop app)
 */
function isElectron(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any).electronAPI
}

/**
 * Normalize path for quarry.space domain
 * On quarry.space: /app/* should be treated as /quarry/app/*
 */
function normalizePath(pathname: string): string {
  if (!isQuarryDomain()) return pathname
  
  // On quarry.space, add /quarry prefix to match the route logic
  if (pathname === '/') return '/quarry/landing'
  if (pathname.startsWith('/')) return `/quarry${pathname}`
  return pathname
}

/**
 * Marketing landing pages that SHOULD have analytics
 */
const MARKETING_PAGES = [
  '/',
  '/about',
  '/blog',
  '/privacy',
  '/cookies',
  '/legal',
  '/team',
  '/jobs',
  '/products',
  '/faq',
  '/docs',
  '/quarry/landing',
  '/quarry/waitlist',
  '/quarry/about',
  '/quarry/faq',
  '/quarry/privacy',
  '/quarry/changelog',
  '/quarry/architecture',
  '/quarry/api-docs',
]

/**
 * Check if the current path should have marketing analytics
 */
function shouldShowMarketingAnalytics(rawPathname: string): boolean {
  // Never show analytics in Electron app
  if (isElectron()) {
    return false
  }

  // Normalize path for quarry.space domain
  const pathname = normalizePath(rawPathname)

  // Check if it's an explicit marketing page
  if (MARKETING_PAGES.includes(pathname)) {
    return true
  }

  // Check prefix matches for marketing sections
  if (pathname.startsWith('/blog/') || 
      pathname.startsWith('/legal/') ||
      pathname.startsWith('/docs/')) {
    return true
  }

  // The /quarry/app route and all other /quarry/* routes are private - NO analytics
  if (pathname.startsWith('/quarry/app') || 
      pathname.startsWith('/quarry/browse') ||
      pathname.startsWith('/quarry/search') ||
      pathname.startsWith('/quarry/reflect') ||
      pathname.startsWith('/quarry/write') ||
      pathname.startsWith('/quarry/learn') ||
      pathname.startsWith('/quarry/plan') ||
      pathname.startsWith('/quarry/settings') ||
      pathname.startsWith('/quarry/collections') ||
      pathname.startsWith('/quarry/graph') ||
      pathname.startsWith('/quarry/analytics') ||
      pathname.startsWith('/quarry/activity') ||
      pathname.startsWith('/quarry/new') ||
      pathname.startsWith('/quarry/research') ||
      pathname.startsWith('/quarry/tags') ||
      pathname.startsWith('/quarry/supertags') ||
      pathname.startsWith('/quarry/evolution') ||
      pathname.startsWith('/quarry/templates') ||
      pathname.startsWith('/quarry/spiral') ||
      pathname.startsWith('/quarry/dashboard')) {
    return false
  }

  // Default: show on root pages, hide on app pages
  return !pathname.startsWith('/quarry/')
}

/**
 * Get domain-specific analytics IDs
 * Different tracking for frame.dev vs quarry.space
 * Includes hardcoded fallbacks in case GitHub Actions variables aren't configured
 */
function getDomainAnalyticsIds(): { gaId?: string; clarityId?: string } {
  if (isQuarryDomain()) {
    return {
      gaId: process.env.NEXT_PUBLIC_GA_ID_QUARRY || 'G-KSBYWCTX7M',
      clarityId: process.env.NEXT_PUBLIC_CLARITY_ID_QUARRY || 'uwnv1p0ghl',
    }
  }
  return {
    gaId: process.env.NEXT_PUBLIC_GA_ID_FRAME || 'G-RC49Q2HH4Q',
    clarityId: process.env.NEXT_PUBLIC_CLARITY_ID_FRAME || 'uwkt6diqm4',
  }
}

export default function MarketingAnalytics({ gaId, clarityId }: MarketingAnalyticsProps) {
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)

  // Only run on client side to properly detect Electron
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Don't render anything during SSR or on app pages
  if (!isClient || !shouldShowMarketingAnalytics(pathname)) {
    return null
  }

  // Use domain-specific IDs, fallback to props (for backwards compatibility)
  const domainIds = getDomainAnalyticsIds()
  const effectiveGaId = domainIds.gaId || gaId
  const effectiveClarityId = domainIds.clarityId || clarityId

  return (
    <>
      <Analytics gaId={effectiveGaId} clarityId={effectiveClarityId} />
      <CookieConsent />
    </>
  )
}
