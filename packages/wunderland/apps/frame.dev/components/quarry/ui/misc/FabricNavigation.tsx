/**
 * FabricNavigation - Dedicated navigation for Quarry Codex landing pages
 * @module codex/ui/FabricNavigation
 * 
 * @remarks
 * - Uses Fabric logos (light/dark mode)
 * - Navigation: Home, Features, About, FAQ
 * - Blog links to frame.dev/blog (external)
 * - "Powered by Frame.dev" badge
 * - CTA: "Try Quarry Codex"
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ExternalLink, Sparkles, BookOpen, HelpCircle, Newspaper, Home, Layers } from 'lucide-react'
import ThemeToggle from '@/components/theme-toggle'

// Navigation items for Fabric
const navigation = [
  { name: 'Home', href: '/quarry', icon: Home },
  { name: 'Features', href: '/quarry#features', icon: Sparkles },
  { name: 'About', href: '/quarry/about', icon: BookOpen },
  { name: 'FAQ', href: '/quarry/faq', icon: HelpCircle },
  { name: 'Blog', href: 'https://frame.dev/blog', icon: Newspaper, external: true },
]

export default function FabricNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  // Track scroll for nav background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav 
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled 
          ? 'bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl shadow-sm border-b border-gray-200/50 dark:border-gray-800/50' 
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16">
        <div className="flex h-full items-center justify-between">
          {/* Logo - Quarry Codex */}
          <div className="flex items-center gap-3">
            <Link href="/quarry" className="flex items-center gap-2.5 group">
              {/* Fabric Icon */}
              <div className="relative w-8 h-8 flex-shrink-0">
                <Image
                  src="/fabric-icon-light.svg"
                  alt="Fabric"
                  fill
                  className="object-contain block dark:hidden transition-transform group-hover:scale-110"
                  priority
                />
                <Image
                  src="/fabric-icon-dark.svg"
                  alt="Fabric"
                  fill
                  className="object-contain hidden dark:block transition-transform group-hover:scale-110"
                  priority
                />
              </div>
              {/* Brand Text */}
              <div className="flex flex-col">
                <span
                  className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 text-transparent bg-clip-text"
                  style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}
                >
                  Fabric
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 -mt-0.5">
                  by Frame.dev
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href.includes('#') && pathname === item.href.split('#')[0])
              
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

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Right side: Theme toggle + CTA */}
          <div className="hidden md:flex items-center gap-3">
            {/* Powered by Frame.dev */}
            <a
              href="https://frame.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <Layers className="w-3 h-3" />
              Frame.dev
            </a>

            <ThemeToggle />

            {/* CTA Button */}
            <Link
              href="/quarry"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              <span style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}>Try Fabric</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open menu</span>
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
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl"
          >
            <div className="space-y-1 px-4 pb-4 pt-3">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

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

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-base font-medium rounded-xl transition-colors ${
                      isActive
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-500'}`} />
                    {item.name}
                  </Link>
                )
              })}

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-800 my-3" />

              {/* Frame.dev link */}
              <a
                href="https://frame.dev"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                <Layers className="w-5 h-5 text-gray-500" />
                Frame.dev
                <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
              </a>

              {/* CTA Button */}
              <Link
                href="/quarry"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 mx-4 mt-4 px-4 py-3 text-base font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md"
              >
                <Sparkles className="w-5 h-5" />
                <span style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}>Try Fabric</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

