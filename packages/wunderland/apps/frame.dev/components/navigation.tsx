'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Layers, Bot, Code2, Globe, Shield, Package, ExternalLink, Search, MessageCircle, Sparkles, Tag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import ThemeToggle from './theme-toggle'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'

// Custom animated caret component
function AnimatedCaret({ isOpen, className = '' }: { isOpen: boolean; className?: string }) {
  return (
    <motion.svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      className={className}
      animate={{ rotate: isOpen ? 180 : 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      <path
        d="M2 3.5L5 6.5L8 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  )
}

type ProductSubItem = {
  name: string
  href: string
  icon: LucideIcon
}

type ProductItem = {
  name: string
  href: string
  description: string
  icon: LucideIcon
  color: string
  bgColor: string
  external?: boolean
  hasInfinityIcon?: boolean
  isLive?: boolean
  submenu?: ProductSubItem[]
}

const navigation = [
  { name: 'Products', href: '#', hasDropdown: true },
  { name: 'About', href: '/about' },
  { name: 'Blog', href: '/blog' },
  { name: 'FAQ', href: '/faq' },
]

const productsDropdown: Record<string, ProductItem[]> = {
  'Frame Products': [
    {
      name: 'Quarry',
      href: '/quarry',
      description: 'AI-native personal knowledge management',
      icon: Code2,
      // Use frame green / cyan hues instead of purple
      color: 'text-frame-green',
      bgColor: 'bg-frame-green/10 dark:bg-frame-green/20',
      submenu: [
        { name: 'Quarry Codex', href: '/quarry', icon: Code2 },
        { name: 'Tags & Categories', href: '/quarry/browse', icon: Tag },
        { name: 'Search & Explore', href: '/quarry/search', icon: Search },
        { name: 'Architecture', href: '/quarry/architecture', icon: Layers },
        { name: 'Lifetime Edition Waitlist', href: '/quarry/waitlist', icon: Sparkles }
      ]
    },
    {
      name: 'SafeOS',
      href: 'https://safeos.sh',
      description: 'Local AI care & security—free forever',
      icon: Shield,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      external: true,
      isLive: true
    },
    {
      name: 'Frame API',
      href: '/quarry/api',
      description: 'API for humanity\'s knowledge',
      icon: Globe,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    }
  ],
  'External Products': [
    {
      name: 'AgentOS',
      href: 'https://agentos.sh',
      description: 'Adaptive AI agency runtime',
      icon: Bot,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      external: true
    },
    {
      name: 'OpenStrand',
      href: 'https://openstrand.ai',
      description: 'AI-native knowledge infrastructure',
      icon: Layers,
      color: 'text-frame-green',
      bgColor: 'bg-frame-green/10',
      external: true,
      hasInfinityIcon: true
    }
  ],
  'Marketplace': [
    {
      name: 'Extensions',
      href: 'https://github.com/framersai/agentos-extensions',
      description: 'Browse AgentOS extensions',
      icon: Package,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      external: true
    }
  ]
}

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [productsOpen, setProductsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownButtonRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const resolvePath = useQuarryPath()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      // Don't close if clicking button or inside dropdown
      if (
        dropdownRef.current?.contains(target) ||
        dropdownButtonRef.current?.contains(target)
      ) {
        return
      }
      setProductsOpen(false)
    }

    if (productsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [productsOpen])

  return (
    <>
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="skip-link"
      >
        Skip to main content
      </a>
      
      <nav
        className="fixed top-0 z-50 w-full bg-white/80 dark:bg-obsidian-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-obsidian-800"
        role="navigation"
        aria-label="Main navigation"
      >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16">
        <div className="flex h-full items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group" aria-label="Frame.dev - Go to homepage">
              {/* Logo slightly larger but optically centered in the 64px nav bar */}
              <div className="relative w-32 h-32 translate-y-1">
                <Image
                  src="/frame-logo-no-subtitle.svg"
                  alt="Frame.dev"
                  fill
                  className="transition-transform group-hover:scale-110"
                  priority
                />
              </div>
            </Link>
          </div>

            {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-1">
              {navigation.map((item) => (
                <div
                  key={item.name}
                  className="relative"
                  ref={item.hasDropdown ? dropdownRef : undefined}
                  onMouseEnter={() => item.hasDropdown && setProductsOpen(true)}
                  onMouseLeave={() => item.hasDropdown && setProductsOpen(false)}
                >
                  {item.hasDropdown ? (
                    <button
                      ref={dropdownButtonRef}
                      onClick={() => setProductsOpen(!productsOpen)}
                      className="group inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-obsidian-300 rounded-lg hover:bg-gray-100 dark:hover:bg-obsidian-900 hover:text-gray-900 dark:hover:text-white transition-colors min-h-[44px]"
                      aria-expanded={productsOpen}
                      aria-haspopup="menu"
                      aria-label="Products menu"
                    >
                      {item.name}
                      <AnimatedCaret isOpen={productsOpen} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ) : (
                <Link
                      href={item.href}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors min-h-[44px] flex items-center ${
                        pathname === item.href
                          ? 'bg-gray-100 dark:bg-obsidian-900 text-gray-900 dark:text-white'
                          : 'text-gray-700 dark:text-obsidian-300 hover:bg-gray-100 dark:hover:bg-obsidian-900 hover:text-gray-900 dark:hover:text-white'
                      }`}
                      aria-current={pathname === item.href ? 'page' : undefined}
                    >
                      {item.name}
                </Link>
                  )}

                  {/* Products Dropdown */}
                  {item.hasDropdown && (
                    <AnimatePresence>
                      {productsOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.96 }}
                          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                          className="absolute left-0 mt-2 w-80 rounded-xl bg-white dark:bg-obsidian-950 shadow-2xl border border-gray-200 dark:border-obsidian-800 overflow-hidden"
                        >
                          {Object.entries(productsDropdown).map(([category, items], categoryIndex) => (
                            <div key={category} className={categoryIndex > 0 ? 'border-t border-gray-200 dark:border-obsidian-800' : ''}>
                              <div className="px-4 py-2 bg-gray-50 dark:bg-obsidian-900/50">
                                <p className="text-xs font-semibold text-gray-500 dark:text-obsidian-500 uppercase tracking-wider">
                                  {category}
                                </p>
                              </div>
                              <div className="py-2">
                                {items.map((product) => {
                                  const Icon = product.icon
                                  const content = (
                                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-obsidian-900 transition-colors group">
                                      <div className={`p-2 rounded-lg ${product.bgColor}`}>
                                        {product.name === 'Quarry' ? (
                                          <>
                                            <Image
                                              src="/fabric-icon-light.svg"
                                              alt="Quarry"
                                              width={24}
                                              height={24}
                                              className="object-contain block dark:hidden"
                                            />
                                            <Image
                                              src="/fabric-icon-dark.svg"
                                              alt="Quarry"
                                              width={24}
                                              height={24}
                                              className="object-contain hidden dark:block"
                                            />
                                          </>
                                        ) : product.name === 'OpenStrand' ? (
                                          <Image
                                            src="/openstrand-logo.svg"
                                            alt="OpenStrand"
                                            width={24}
                                            height={24}
                                            className="object-contain"
                                          />
                                        ) : product.name === 'AgentOS' ? (
                                          <Image
                                            src="/agentos-icon.svg"
                                            alt="AgentOS"
                                            width={24}
                                            height={24}
                                            className="object-contain dark:invert"
                                          />
                                        ) : product.hasInfinityIcon ? (
                                          <svg className={`w-5 h-5 ${product.color}`} viewBox="0 0 24 24" fill="none">
                                            <path d="M18.178 8c3.096 0 5.822 2.016 5.822 4s-2.726 4-5.822 4c-1.408 0-2.726-.416-3.726-1.12-.432.352-.864.672-1.296.992-.752.544-1.52.896-2.404 1.024-.896.128-1.68 0-2.324-.208a6.474 6.474 0 0 1-1.296-.576c-.992.704-2.304 1.12-3.712 1.12C1.224 16.224 0 14.208 0 12.224s2.016-4 4.224-4c1.408 0 2.72.416 3.712 1.12.448-.352.88-.672 1.312-.992.736-.544 1.504-.896 2.388-1.024.896-.128 1.68 0 2.34.208.448.144.88.336 1.28.576.992-.704 2.304-1.12 3.712-1.12h.02Zm0 2c-.56 0-1.168.128-1.68.32.448.416.752.864.928 1.312.096.256.144.512.144.768 0 .256-.048.512-.144.768-.176.448-.48.896-.928 1.312.528.192 1.12.32 1.68.32 2.208 0 3.84-1.12 3.84-2s-1.632-2-3.84-2Zm-8.832 1.312a3.073 3.073 0 0 1-.144-.224c-.336-.56-1.024-1.04-2.032-1.2a3.118 3.118 0 0 0-.928 0c-.416.064-.768.192-1.072.352.128.144.256.288.368.432.192.24.368.48.512.736l.096.16c.096.16.16.32.224.48.064-.16.128-.32.224-.48l.096-.16c.144-.256.32-.496.512-.736.048-.048.096-.112.144-.16Zm2.368-.4c.144.144.256.304.368.464.016.032.032.048.048.08.096.16.16.32.224.48l.144.416c.096-.16.224-.336.368-.496.24-.272.592-.544 1.072-.72-.144-.144-.288-.272-.432-.4-.192-.16-.416-.32-.64-.448-.24-.128-.48-.208-.704-.256-.384-.08-.704-.08-1.024-.016.224.256.416.56.576.896Zm3.392 2.368a1.925 1.925 0 0 0-.368.464c-.016.032-.048.064-.064.096-.096.16-.16.304-.208.464l-.144.416c-.096-.176-.224-.352-.368-.512-.24-.256-.576-.528-1.056-.704.144.144.272.272.432.4.176.16.4.32.624.448.24.128.48.208.704.24.192.032.368.032.544.016.128 0 .24-.016.368-.032-.224-.256-.416-.56-.576-.896h.096Zm-8.368 0c-.144.336-.352.64-.576.896.56-.096 1.168.048 1.712.368.24.144.464.304.64.48.144.128.288.272.432.384-.48-.16-.816-.432-1.056-.704-.144-.16-.272-.336-.368-.512a3.948 3.948 0 0 0-.352-.88c-.032-.032-.048-.064-.08-.096a1.925 1.925 0 0 0-.368-.464h.016Zm-2.56-.336c-.48.16-.816.432-1.056.72-.144.16-.272.336-.368.496.192-.56.528-1.088.912-1.504-.144.08-.288.176-.416.272h-.064Zm.928 2.416c-.016-.048-.064-.096-.096-.16l-.128-.256c-.096.176-.224.352-.368.512-.24.272-.576.544-1.056.72.48-.176.928-.512 1.248-.944.128-.176.256-.368.368-.576l.032-.048v-.256.96Zm2.176-2.72c-.016.032-.032.048-.048.08a6.255 6.255 0 0 0-.368.464 3.948 3.948 0 0 0-.352.88l-.144.416c-.096-.16-.128-.304-.224-.48l-.096-.16-.128-.256c-.096.16-.128.32-.224.48l-.096.16-.128.256c-.096-.176-.144-.336-.24-.496-.16-.272-.384-.528-.64-.736.56.096 1.168-.048 1.728-.368.24-.144.448-.304.624-.48l.096-.08Z" fill="currentColor"/>
                                          </svg>
                                        ) : (
                                          <Icon className={`w-5 h-5 ${product.color}`} />
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-white group-hover:text-frame-green flex items-center gap-2">
                                          {product.name}
                                          {product.isLive && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded-full uppercase tracking-wide">
                                              Live
                                            </span>
                                          )}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-obsidian-400">
                                          {product.description}
                                        </p>
                                      </div>
                                      {product.external && (
                                        <ExternalLink className="w-4 h-4 text-gray-500 dark:text-obsidian-500 group-hover:text-gray-700 dark:group-hover:text-obsidian-300 flex-shrink-0" />
                                      )}
                                    </div>
                                  )

                                  return product.external ? (
                                    <a
                                      key={product.name}
                                      href={product.href}
                target="_blank"
                rel="noopener noreferrer"
                                      className="block"
                                    >
                                      {content}
                                    </a>
                                  ) : (
                                    <Link
                                      key={product.name}
                                      href={resolvePath(product.href)}
                                      className="block"
                                      onClick={() => setProductsOpen(false)}
                                    >
                                      {content}
                                    </Link>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              ))}
            </div>
            </div>

          {/* Right-side actions: Discord, theme toggle, GitHub */}
          <div className="hidden md:flex items-center gap-3">
              <Link
                href="https://discord.gg/VXXC4SJMKh"
                target="_blank"
                rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-obsidian-300 hover:text-gray-900 dark:hover:text-white rounded-full px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-obsidian-900 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Discord</span>
            </Link>
            <ThemeToggle />
            </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 hover:text-gray-900 dark:hover:text-white min-w-[44px] min-h-[44px] touch-manipulation active:scale-95 transition-transform"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Close main menu' : 'Open main menu'}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
          </div>
        </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop overlay - tap to close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 top-16 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => {
                setMobileMenuOpen(false)
                setProductsOpen(false)
              }}
              aria-hidden="true"
            />
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl relative z-50"
              role="menu"
              aria-label="Mobile navigation menu"
            >
              <div
                className="space-y-2 px-4 pb-6 pt-4 max-h-[80vh] overflow-y-auto overscroll-contain"
              style={{
                pointerEvents: 'auto',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))'
              }}
            >
              {navigation.map((item) => (
                <div key={item.name}>
                  {item.hasDropdown ? (
                    <>
                      <button
                        onClick={() => setProductsOpen(!productsOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 text-base font-semibold text-gray-900 dark:text-gray-100 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-all touch-manipulation min-h-[52px]"
                      >
                        {item.name}
                        <AnimatedCaret isOpen={productsOpen} className="w-5 h-5" />
                      </button>
                      {productsOpen && (
                  <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                          className="mt-2 ml-2 space-y-3 overflow-hidden"
                          style={{ pointerEvents: 'auto' }}
                        >
                          {Object.entries(productsDropdown).map(([category, items]) => (
                            <div key={category} className="pb-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-2">
                                {category}
                              </p>
                              {items.map((product) => {
                                const Icon = product.icon
                                return (
                                  <div key={product.name}>
                                    {product.external ? (
                                      <a
                                        href={product.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => {
                                          setMobileMenuOpen(false)
                                          setProductsOpen(false)
                                        }}
                                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 rounded-lg transition-all touch-manipulation min-h-[48px]"
                                      >
                                        <Icon className={`w-5 h-5 ${product.color} flex-shrink-0`} />
                                        <span className="flex-1 flex items-center gap-2">
                                          {product.name}
                                          {product.isLive && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded-full uppercase">
                                              Live
                                            </span>
                                          )}
                                        </span>
                                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                                      </a>
                                    ) : (
                                      <Link
                                        href={resolvePath(product.href)}
                                        onClick={(e) => {
                                          e.preventDefault()
                                          const href = resolvePath(product.href)
                                          setMobileMenuOpen(false)
                                          setProductsOpen(false)
                                          setTimeout(() => router.push(href), 10)
                                        }}
                                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 rounded-lg transition-all touch-manipulation min-h-[48px]"
                                      >
                                        <Icon className={`w-5 h-5 ${product.color} flex-shrink-0`} />
                                        <span className="flex-1 flex items-center gap-2">
                                          {product.name}
                                          {product.isLive && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded-full uppercase">
                                              Live
                                            </span>
                                          )}
                                        </span>
                                      </Link>
                                    )}
                                    {/* Submenu items hidden on mobile - matches desktop behavior */}
                                  </div>
                                )
                              })}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className={`flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-all touch-manipulation min-h-[52px] cursor-pointer ${
                        pathname === item.href
                          ? 'bg-frame-green/10 dark:bg-frame-green/20 text-frame-green dark:text-frame-green'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
                      }`}
                      onClick={(e) => {
                        e.preventDefault()
                        const href = item.href
                        setMobileMenuOpen(false)
                        setTimeout(() => router.push(href), 10)
                      }}
                    >
                      {item.name}
                    </Link>
                  )}
                </div>
              ))}
              
              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-800 my-2" />
              
              {/* Discord Mobile */}
              <a
                href="https://discord.gg/VXXC4SJMKh"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 rounded-xl transition-all touch-manipulation min-h-[52px]"
                onClick={() => setMobileMenuOpen(false)}
              >
                <MessageCircle className="w-5 h-5 text-frame-green flex-shrink-0" />
                <span>Discord</span>
                <ExternalLink className="w-4 h-4 ml-auto flex-shrink-0" />
              </a>
              
              {/* Theme Toggle Mobile */}
              <div className="px-4 py-3">
                <ThemeToggle />
              </div>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
    </>
  )
}