/**
 * QuarryNavigation - Dedicated navigation for Quarry landing pages
 * @module codex/ui/QuarryNavigation
 *
 * @remarks
 * - Uses Quarry logos (light/dark mode)
 * - Navigation: Home, Features, About, FAQ
 * - Blog links to frame.dev/blog (external)
 * - "Powered by Frame.dev" badge
 * - CTA: "Try Quarry"
 */

'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ExternalLink, Sparkles, BookOpen, HelpCircle, Newspaper, DollarSign, Download, Calendar } from 'lucide-react'
import ThemeToggle from '@/components/theme-toggle'
import { isQuarryDomain, resolveQuarryPath } from '@/lib/utils/deploymentMode'

// Section IDs to track for active highlighting
const TRACKED_SECTIONS = ['features', 'pricing', 'faq', 'about']

// Custom Quarry Icon - Pickaxe with gem, matches brand
function QuarryIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Pickaxe handle */}
      <path d="M14 14L21 21" className="origin-center" />
      {/* Pickaxe head */}
      <path d="M5 5L10 3L12 5L14 3L19 5L17 10L14 12L10 12L5 5Z" className="fill-current opacity-20" />
      <path d="M5 5L10 3L12 5L14 3L19 5L17 10L14 12L10 12L5 5Z" />
      {/* Gem accent */}
      <path d="M9 8L11 6L13 8L11 10L9 8Z" className="fill-current" />
    </svg>
  )
}

// Navigation items for Quarry
// Use /quarry/landing for hash links since /quarry redirects there
const navigation = [
  { name: 'Features', href: '/quarry/landing#features', icon: Sparkles },
  { name: 'Pricing', href: '/quarry/landing#pricing', icon: DollarSign },
  { name: 'About', href: '/quarry/about', icon: BookOpen },
  { name: 'FAQ', href: '/quarry/faq', icon: HelpCircle },
  { name: 'Blog', href: 'https://frame.dev/blog', icon: Newspaper, external: true },
]

export default function QuarryNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [onQuarryDomain, setOnQuarryDomain] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const pathname = usePathname()

  // Detect domain on client-side
  useEffect(() => {
    setOnQuarryDomain(isQuarryDomain())
  }, [])

  // Track active section for nav highlighting using Intersection Observer
  useEffect(() => {
    // Only track on landing pages
    const isLandingPage = pathname === '/quarry' || pathname === '/quarry/landing' || pathname === '/'
    if (!isLandingPage) return

    const observers: IntersectionObserver[] = []
    const sectionVisibility = new Map<string, number>()

    TRACKED_SECTIONS.forEach((sectionId) => {
      const element = document.getElementById(sectionId)
      if (!element) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            sectionVisibility.set(sectionId, entry.intersectionRatio)
            
            // Find the most visible section
            let maxRatio = 0
            let mostVisible: string | null = null
            sectionVisibility.forEach((ratio, id) => {
              if (ratio > maxRatio) {
                maxRatio = ratio
                mostVisible = id
              }
            })
            
            if (maxRatio > 0.1) {
              setActiveSection(mostVisible)
            } else {
              setActiveSection(null)
            }
          })
        },
        {
          threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
          rootMargin: '-80px 0px -40% 0px',
        }
      )

      observer.observe(element)
      observers.push(observer)
    })

    return () => {
      observers.forEach((observer) => observer.disconnect())
    }
  }, [pathname])

  // Helper to resolve paths based on domain
  const resolvePath = useMemo(
    () => (path: string) => resolveQuarryPath(path, onQuarryDomain),
    [onQuarryDomain]
  )

  // Handle hash link clicks - scroll smoothly if already on the same page
  const handleHashLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const hashIndex = href.indexOf('#')
    if (hashIndex === -1) return // Not a hash link, let normal navigation happen
    
    const pathBeforeHash = href.substring(0, hashIndex) || '/quarry/landing'
    const hash = href.substring(hashIndex)
    
    // Normalize paths for comparison (handle /quarry vs /quarry/landing and root domain)
    const currentPathNormalized = pathname.replace(/\/$/, '') || '/quarry/landing'
    const targetPathNormalized = pathBeforeHash.replace(/\/$/, '')
    
    // Check if we're already on the target page (landing page can be /, /quarry, or /quarry/landing)
    const landingPaths = ['/quarry/landing', '/quarry', '/']
    const isCurrentLandingPage = landingPaths.includes(currentPathNormalized)
    const isTargetLandingPage = landingPaths.includes(targetPathNormalized)
    const isOnTargetPage = currentPathNormalized === targetPathNormalized || 
      (isCurrentLandingPage && isTargetLandingPage) ||
      (onQuarryDomain && isTargetLandingPage && currentPathNormalized === '/')
    
    if (isOnTargetPage) {
      e.preventDefault()
      const element = document.querySelector(hash)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
        // Update URL hash without navigation
        window.history.pushState(null, '', hash)
      }
    }
    // Otherwise, let the Link component handle normal navigation
  }, [pathname, onQuarryDomain])

  // Track scroll for nav background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on Escape key
  useEffect(() => {
    if (!mobileMenuOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileMenuOpen])

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 border-b ${
        scrolled
          ? 'bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl shadow-sm border-gray-200/50 dark:border-gray-800/50'
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16">
        <div className="flex h-full items-center justify-between">
          {/* Logo - Quarry */}
          <div className="flex items-center gap-3">
            <Link href={resolvePath('/quarry')} className="group flex-shrink-0">
              {/* Quarry Logo (monochromatic) */}
              <div className="relative h-[52px] w-auto">
                <Image
                  src="/quarry-logo-mono-light.svg"
                  alt="Quarry"
                  width={195}
                  height={52}
                  className="h-[52px] w-auto object-contain block dark:hidden transition-transform group-hover:scale-105"
                  priority
                />
                <Image
                  src="/quarry-logo-mono-dark.svg"
                  alt="Quarry"
                  width={195}
                  height={52}
                  className="h-[52px] w-auto object-contain hidden dark:block transition-transform group-hover:scale-105"
                  priority
                />
              </div>
            </Link>
            {/* By Frame.dev badge - links to frame.dev */}
            <a
              href="https://frame.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="group text-[10px] tracking-[0.15em] uppercase font-medium text-gray-400/80 dark:text-gray-500/80 hover:text-emerald-600 dark:hover:text-rose-400 transition-colors duration-300"
              style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
            >
              <span className="opacity-60">by</span>{' '}
              <span className="font-semibold bg-gradient-to-r from-gray-500 to-gray-400 dark:from-gray-400 dark:to-gray-500 bg-clip-text text-transparent group-hover:from-emerald-600 group-hover:to-teal-500 dark:group-hover:from-rose-400 dark:group-hover:to-red-400 transition-all duration-300">Frame.dev</span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const resolvedHref = resolvePath(item.href)
              // Only mark as active if exact match (hash links are never "active" since they're on-page anchors)
              const isActive = !resolvedHref.includes('#') && pathname === resolvedHref

              if (item.external) {
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {item.name}
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                )
              }

              // Check if this is a hash link
              const isHashLink = resolvedHref.includes('#')
              
              // Check if this hash link matches the currently active section
              const hashTarget = resolvedHref.split('#')[1]
              const isSectionActive = hashTarget && activeSection === hashTarget

              return (
                <Link
                  key={item.name}
                  href={resolvedHref}
                  onClick={isHashLink ? (e) => handleHashLinkClick(e, resolvedHref) : undefined}
                  className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive || isSectionActive
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {item.name}
                  {/* Active indicator dot */}
                  {isSectionActive && (
                    <motion.span
                      layoutId="activeSection"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Right side: Theme toggle + CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />

            {/* Download Button - Secondary */}
            <Link
              href={resolvePath('/quarry#pricing')}
              onClick={(e) => handleHashLinkClick(e, resolvePath('/quarry#pricing'))}
              className="group inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </Link>

            {/* CTA Button - Primary, Animated Quarry icon */}
            <Link
              href={resolvePath('/quarry/app')}
              className="group inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-rose-500 dark:to-red-500 rounded-lg hover:from-emerald-600 hover:to-teal-600 dark:hover:from-rose-600 dark:hover:to-red-600 transition-all shadow-md hover:shadow-lg hover:shadow-emerald-500/25 dark:hover:shadow-rose-500/25"
            >
              <motion.span
                className="inline-block"
                whileHover={{ rotate: -15, scale: 1.1 }}
                whileTap={{ rotate: 15, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                <QuarryIcon className="w-4 h-4" />
              </motion.span>
              <span style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}>Try Quarry</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <span className="sr-only">{mobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop overlay - click to close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 top-16 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              id="mobile-menu"
              role="menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl relative z-50"
            >
              <div className="space-y-1 px-4 pb-4 pt-3">
              {navigation.map((item) => {
                const Icon = item.icon
                const resolvedHref = resolvePath(item.href)
                const isActive = pathname === resolvedHref

                if (item.external) {
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                      <Icon className="w-5 h-5 text-gray-500" />
                      {item.name}
                      <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
                    </a>
                  )
                }

                // Check if this is a hash link
                const isHashLink = resolvedHref.includes('#')

                return (
                  <Link
                    key={item.name}
                    href={resolvedHref}
                    onClick={(e) => {
                      if (isHashLink) {
                        handleHashLinkClick(e, resolvedHref)
                      }
                      setMobileMenuOpen(false)
                    }}
                    className={`flex items-center gap-3 px-4 py-3 text-base font-medium rounded-xl transition-colors ${
                      isActive
                        ? 'bg-emerald-100 dark:bg-rose-900/30 text-emerald-700 dark:text-rose-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600 dark:text-rose-400' : 'text-gray-500'}`} />
                    {item.name}
                  </Link>
                )
              })}

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-800 my-3" />

              {/* Download Button */}
              <Link
                href={resolvePath('/quarry#pricing')}
                onClick={(e) => {
                  handleHashLinkClick(e, resolvePath('/quarry#pricing'))
                  setMobileMenuOpen(false)
                }}
                className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                <Download className="w-5 h-5 text-gray-500" />
                Download
              </Link>

              {/* CTA Button - Animated Quarry icon */}
              <Link
                href={resolvePath('/quarry/app')}
                onClick={() => setMobileMenuOpen(false)}
                className="group flex items-center justify-center gap-2 mx-4 mt-4 px-4 py-3 text-base font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-rose-500 dark:to-red-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 dark:hover:from-rose-600 dark:hover:to-red-600 transition-all shadow-md"
              >
                <motion.span
                  className="inline-block"
                  whileHover={{ rotate: -15, scale: 1.1 }}
                  whileTap={{ rotate: 15, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <QuarryIcon className="w-5 h-5" />
                </motion.span>
                <span style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}>Try Quarry</span>
              </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  )
}
