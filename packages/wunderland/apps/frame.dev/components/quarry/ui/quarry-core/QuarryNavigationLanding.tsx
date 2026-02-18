/**
 * QuarryNavigationLanding - Lightweight CSS-only navigation for landing page
 * 
 * PERFORMANCE OPTIMIZED:
 * - Server Component (no 'use client')
 * - No framer-motion - uses CSS transitions
 * - Mobile menu uses CSS checkbox hack
 * - Minimal JavaScript - only for theme toggle
 */

import Link from 'next/link'
import Image from 'next/image'
import { ExternalLink, Download } from 'lucide-react'
import ThemeToggle from '@/components/theme-toggle'
import FocusIcon from '@/components/quarry/ui/icons/FocusIcon'

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

// Navigation items for Quarry (static)
// Hash links use absolute paths to work from any page (e.g. /about)
const navigation = [
  { name: 'Features', href: '/quarry/landing#features', hash: true },
  { name: 'Focus', href: '/quarry/focus' },
  { name: 'Pricing', href: '/quarry/landing#pricing', hash: true },
  { name: 'About', href: '/quarry/about' },
  { name: 'FAQ', href: '/quarry/faq' },
  { name: 'Blog', href: 'https://frame.dev/blog', external: true },
]

export function QuarryNavigationLanding() {
  return (
    <>
      {/* CSS for mobile menu toggle and holographic nav */}
      <style dangerouslySetInnerHTML={{
        __html: `
        /* Mobile menu toggle states - sibling selectors (primary, best support) */
        #mobile-menu-toggle:checked ~ .mobile-menu-panel {
          max-height: calc(100vh - 4rem);
          max-height: calc(100dvh - 4rem);
          opacity: 1;
          visibility: visible;
        }
        #mobile-menu-toggle:checked ~ .mobile-menu-backdrop {
          opacity: 1;
          pointer-events: auto;
          visibility: visible;
        }
        /* Icon toggle via :has() since icons are nested deeper */
        .mobile-nav-wrapper:has(#mobile-menu-toggle:checked) .menu-open-icon {
          display: none;
        }
        .mobile-nav-wrapper:has(#mobile-menu-toggle:checked) .menu-close-icon {
          display: block;
        }
        .mobile-menu-panel {
          max-height: 0;
          opacity: 0;
          visibility: hidden;
          overflow-y: auto;
          transition: max-height 0.3s ease, opacity 0.2s ease, visibility 0.3s ease;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }
        .mobile-menu-backdrop {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity 0.2s ease, visibility 0.2s ease;
        }
        
        /* Holographic Navigation - Light Mode */
        .nav-holographic {
          background: linear-gradient(
            135deg,
            rgba(248, 250, 252, 0.95) 0%,
            rgba(241, 245, 249, 0.92) 25%,
            rgba(236, 254, 255, 0.88) 50%,
            rgba(240, 253, 244, 0.92) 75%,
            rgba(248, 250, 252, 0.95) 100%
          );
          backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
          box-shadow: 
            0 4px 24px -4px rgba(0, 0, 0, 0.08),
            0 2px 8px -2px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            inset 0 -1px 0 rgba(0, 0, 0, 0.02);
        }
        
        /* Holographic Navigation - Dark Mode */
        .dark .nav-holographic {
          background: linear-gradient(
            135deg,
            rgba(15, 23, 42, 0.97) 0%,
            rgba(17, 24, 39, 0.95) 20%,
            rgba(20, 30, 48, 0.93) 40%,
            rgba(22, 33, 52, 0.95) 60%,
            rgba(15, 23, 42, 0.97) 100%
          );
          backdrop-filter: blur(24px) saturate(150%);
          border-bottom: 1px solid rgba(71, 85, 105, 0.3);
          box-shadow: 
            0 4px 32px -4px rgba(0, 0, 0, 0.4),
            0 2px 12px -2px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(148, 163, 184, 0.08),
            inset 0 -1px 0 rgba(0, 0, 0, 0.2),
            0 0 60px -20px rgba(99, 102, 241, 0.15),
            0 0 40px -15px rgba(236, 72, 153, 0.1);
        }
        
        /* Subtle iridescent shimmer on hover (dark mode) */
        .dark .nav-holographic::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(99, 102, 241, 0.03) 25%,
            rgba(168, 85, 247, 0.04) 50%,
            rgba(236, 72, 153, 0.03) 75%,
            transparent 100%
          );
          opacity: 0;
          transition: opacity 0.5s ease;
          pointer-events: none;
        }
        
        .dark .nav-holographic:hover::before {
          opacity: 1;
        }
        
        /* Nav link hover states */
        .nav-link-holographic {
          position: relative;
          transition: all 0.2s ease;
        }
        
        .nav-link-holographic::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 50%;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, #10b981, #14b8a6, #06b6d4);
          transition: all 0.3s ease;
          transform: translateX(-50%);
          border-radius: 1px;
        }
        
        .dark .nav-link-holographic::after {
          background: linear-gradient(90deg, #f43f5e, #ec4899, #a855f7);
        }
        
        .nav-link-holographic:hover::after {
          width: 80%;
        }
        
        /* Try Quarry button glow pulse animation */
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 10px 25px -3px rgba(16, 185, 129, 0.3), 0 4px 6px -2px rgba(16, 185, 129, 0.2);
          }
          50% {
            box-shadow: 0 15px 35px -3px rgba(16, 185, 129, 0.45), 0 6px 10px -2px rgba(16, 185, 129, 0.3);
          }
        }
        .dark .animate-pulse-glow {
          animation: pulse-glow-dark 2s ease-in-out infinite;
        }
        @keyframes pulse-glow-dark {
          0%, 100% {
            box-shadow: 0 10px 25px -3px rgba(236, 72, 153, 0.3), 0 4px 6px -2px rgba(236, 72, 153, 0.2);
          }
          50% {
            box-shadow: 0 15px 35px -3px rgba(236, 72, 153, 0.45), 0 6px 10px -2px rgba(236, 72, 153, 0.3);
          }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      ` }} />

      <nav className="nav-holographic mobile-nav-wrapper fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300">
        {/* Hidden checkbox for CSS-only mobile menu toggle */}
        <input type="checkbox" id="mobile-menu-toggle" className="sr-only peer" aria-label="Toggle mobile menu" />
        
        {/* Backdrop - clicking closes the menu (label for checkbox) */}
        <label 
          htmlFor="mobile-menu-toggle" 
          className="mobile-menu-backdrop lg:hidden fixed inset-0 top-16 bg-slate-950/50 dark:bg-black/60 backdrop-blur-sm z-40 cursor-pointer"
          aria-label="Close menu"
        />
        
        {/* Mobile menu panel - positioned outside flex container for correct fixed positioning */}
        <div className="mobile-menu-panel lg:hidden fixed left-0 right-0 top-16 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 z-50 shadow-2xl shadow-slate-900/20 dark:shadow-black/50">
          <div className="space-y-1 px-4 pb-5 pt-4">
            {navigation.map((item) => {
              if (item.external) {
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
                  >
                    {item.name}
                    <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
                  </a>
                )
              }

              // Hash links - plain <a> tags
              if ('hash' in item && item.hash) {
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
                  >
                    {item.name}
                  </a>
                )
              }

              // Special Focus link styling for mobile with animated icon
              if (item.name === 'Focus') {
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    prefetch={false}
                    className="group flex items-center gap-3 px-4 py-3 text-base font-semibold rounded-xl transition-all duration-200 bg-emerald-50 dark:bg-fuchsia-950/50 text-emerald-700 dark:text-fuchsia-300 border border-emerald-200 dark:border-fuchsia-800"
                  >
                    <FocusIcon size={20} animated className="transition-transform duration-300 group-hover:scale-110" />
                    {item.name}
                  </Link>
                )
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={false}
                  className="flex items-center gap-3 px-4 py-3 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
                >
                  {item.name}
                </Link>
              )
            })}

            {/* Divider */}
            <div className="h-px bg-slate-200 dark:bg-slate-700 my-4" />

            {/* Download Button (hash link) */}
            <a
              href="#pricing"
              className="flex items-center gap-3 px-4 py-3 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
            >
              <Download className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              Download
            </a>

            {/* CTA Button - holographic (prefetch disabled) */}
            <Link
              href="/quarry/app"
              prefetch={false}
              className="group relative flex items-center justify-center gap-2 mx-2 mt-4 px-4 py-3.5 text-base font-semibold text-white rounded-xl transition-all duration-300 overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 dark:from-fuchsia-500 dark:via-purple-500 dark:to-indigo-500 animate-pulse-glow whitespace-nowrap"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
              <QuarryIcon className="w-5 h-5 relative z-10" />
              <span className="relative z-10" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}>Try Quarry</span>
            </Link>
          </div>
        </div>
        
        <div className="container mx-auto px-2 sm:px-4 lg:px-8 h-16">
          <div className="flex h-full items-center justify-between">
            {/* Logo - Quarry */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Link href="/quarry" prefetch={false} className="group flex-shrink-0">
                {/* Quarry Logo (monochromatic) - smaller on mobile */}
                <div className="relative h-10 sm:h-[52px] w-auto">
                  <Image
                    src="/quarry-logo-mono-light.svg"
                    alt="Quarry"
                    width={195}
                    height={52}
                    className="h-10 sm:h-[52px] w-auto object-contain block dark:hidden transition-transform group-hover:scale-105"
                    priority
                  />
                  <Image
                    src="/quarry-logo-mono-dark.svg"
                    alt="Quarry"
                    width={195}
                    height={52}
                    className="h-10 sm:h-[52px] w-auto object-contain hidden dark:block transition-transform group-hover:scale-105"
                    priority
                  />
                </div>
              </Link>
              {/* By Frame.dev badge - hidden on mobile, links to frame.dev */}
              <a
                href="https://frame.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:block group text-[10px] tracking-[0.15em] uppercase font-medium text-gray-400/80 dark:text-gray-500/80 hover:text-emerald-600 dark:hover:text-rose-400 transition-colors duration-300"
                style={{ fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' }}
              >
                <span className="opacity-60">by</span>{' '}
                <span className="font-semibold bg-gradient-to-r from-gray-500 to-gray-400 dark:from-gray-400 dark:to-gray-500 bg-clip-text text-transparent group-hover:from-emerald-600 group-hover:to-teal-500 dark:group-hover:from-rose-400 dark:group-hover:to-red-400 transition-all duration-300">Frame.dev</span>
              </a>
            </div>

            {/* Desktop Navigation - only show on lg+ (1024px) */}
            <div className="hidden lg:flex items-center gap-0.5">
              {navigation.map((item) => {
                if (item.external) {
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nav-link-holographic inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:text-slate-900 dark:hover:text-white transition-all duration-200"
                    >
                      {item.name}
                      <ExternalLink className="w-3 h-3 opacity-40" />
                    </a>
                  )
                }

                // Hash links use plain <a> to avoid route prefetch
                if ('hash' in item && item.hash) {
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      className="nav-link-holographic px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:text-slate-900 dark:hover:text-white transition-all duration-200"
                    >
                      {item.name}
                    </a>
                  )
                }

                // Special styling for Focus link with animated icon
                if (item.name === 'Focus') {
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      prefetch={false}
                      className="group nav-link-holographic relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-fuchsia-500/10 dark:to-purple-500/10 text-emerald-700 dark:text-fuchsia-300 hover:from-emerald-500/20 hover:to-teal-500/20 dark:hover:from-fuchsia-500/20 dark:hover:to-purple-500/20 border border-emerald-500/20 dark:border-fuchsia-500/20"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <FocusIcon size={16} animated className="transition-transform duration-300 group-hover:scale-110" />
                        {item.name}
                      </span>
                    </Link>
                  )
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    prefetch={false}
                    className="nav-link-holographic px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:text-slate-900 dark:hover:text-white transition-all duration-200"
                  >
                    {item.name}
                  </Link>
                )
              })}
            </div>

            {/* Right side: Theme toggle + CTAs - only show on lg+ (1024px) */}
            <div className="hidden lg:flex items-center gap-2.5">
              <ThemeToggle />

              {/* Download Button - Secondary with glass effect (hash link, no prefetch needed) */}
              <a
                href="#pricing"
                className="group inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg border border-slate-200/60 dark:border-slate-700/60 hover:bg-white/80 dark:hover:bg-slate-800/80 hover:border-slate-300/80 dark:hover:border-slate-600/80 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Download className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                <span>Download</span>
              </a>

              {/* CTA Button - Primary with holographic glow (prefetch disabled to save bandwidth) */}
              <Link
                href="/quarry/app"
                prefetch={false}
                className="group relative inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all duration-300 overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 dark:from-fuchsia-500 dark:via-purple-500 dark:to-indigo-500 animate-pulse-glow hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
              >
                {/* Shimmer effect */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
                <QuarryIcon className="w-4 h-4 relative z-10 group-hover:rotate-[-15deg] transition-transform duration-300" />
                <span className="relative z-10" style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}>Try Quarry</span>
              </Link>
            </div>

            {/* Mobile menu button - just the hamburger toggle */}
            <div className="flex lg:hidden items-center gap-1.5 ml-auto">
              <ThemeToggle />
              <label
                htmlFor="mobile-menu-toggle"
                className="inline-flex items-center justify-center rounded-lg p-2.5 text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 hover:bg-white/90 dark:hover:bg-slate-800/90 cursor-pointer transition-all duration-200"
              >
                <span className="sr-only">Toggle menu</span>
                {/* Menu icon */}
                <svg className="menu-open-icon h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                {/* Close icon */}
                <svg className="menu-close-icon h-5 w-5 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </label>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}

export default QuarryNavigationLanding

