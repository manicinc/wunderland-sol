'use client'

import { motion } from 'framer-motion'
import ThemeToggle from './theme-toggle'
import Link from 'next/link'

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.5 }}
      className="mt-20"
      role="contentinfo"
    >
      {/* Discord CTA Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-y border-emerald-500/20 py-6 mb-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <span className="font-semibold text-gray-900 dark:text-white">Join our Discord for support & onboarding</span>
            </div>
            <a
              href="https://discord.gg/VXXC4SJMKh"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold text-sm hover:bg-emerald-800 transition-colors min-h-[44px]"
            >
              Join Discord
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* OpenStrand Section with Quarry logo */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-6 mb-4">
          {/* Quarry Logo (horizontal, same as header) */}
          <Link href="/quarry" className="flex items-center gap-2">
            <img src="/quarry-logo-light.svg" alt="Quarry by Frame.dev" className="h-8 w-auto dark:hidden" width="120" height="32" />
            <img src="/quarry-logo-dark.svg" alt="Quarry by Frame.dev" className="hidden h-8 w-auto dark:block" width="120" height="32" />
          </Link>
          <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">|</span>
          {/* OpenStrand Logo - use absolute URL for cross-domain compatibility */}
          <a href="https://openstrand.ai" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            <img src="https://frame.dev/openstrand-logo.svg" alt="OpenStrand" className="h-8 w-auto dark:hidden" width="120" height="32" />
            <img src="https://frame.dev/openstrand-logo-gradient.svg" alt="OpenStrand" className="hidden h-8 w-auto dark:block" width="120" height="32" />
          </a>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Powered by OpenStrand • The backbone of all Frame operating systems
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          All Frame projects are open source • MIT & Apache 2.0 licensed • Community & Enterprise editions available
        </p>
      </div>

      {/* Links Grid */}
      <nav className="container mx-auto px-4" aria-label="Footer navigation">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 max-w-5xl mx-auto mb-12">
          {/* Quarry by Frame - New prominent section */}
          <div>
            <h3 className="font-bold text-sm mb-3 text-gray-600 dark:text-gray-400 uppercase tracking-wider">Quarry</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/quarry/app" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green">Try Quarry Free</Link></li>
              <li><Link href="/quarry/landing" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green">Features</Link></li>
              <li><Link href="/quarry/architecture" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green">Architecture</Link></li>
              <li><Link href="/quarry/self-host" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green">Self-Hosting</Link></li>
              <li><Link href="/quarry/api-docs" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green">API Docs</Link></li>
              <li><Link href="/quarry/waitlist" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green">Premium Waitlist</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-sm mb-3 text-gray-600 dark:text-gray-400 uppercase tracking-wider">Products</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="https://agentos.sh" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green" target="_blank" rel="noopener noreferrer">AgentOS</a></li>
              <li><a href="https://openstrand.ai" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green" target="_blank" rel="noopener noreferrer">OpenStrand</a></li>
              <li><a href="https://vca.chat" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green" target="_blank" rel="noopener noreferrer">VCA Marketplace</a></li>
              <li><span className="text-gray-600 dark:text-gray-400">WebOS (Soon)</span></li>
              <li><span className="text-gray-600 dark:text-gray-400">HomeOS (Soon)</span></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-sm mb-3 text-gray-600 dark:text-gray-400 uppercase tracking-wider">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green">About Frame.dev</Link></li>
              <li><Link href="/faq" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green">FAQ</Link></li>
              <li><Link href="/blog" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green">Blog</Link></li>
              <li><Link href="/jobs" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green">Careers</Link></li>
              <li><a href="mailto:team@frame.dev" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green">Contact</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-sm mb-3 text-gray-600 dark:text-gray-400 uppercase tracking-wider">Connect</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="https://discord.gg/VXXC4SJMKh" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green" target="_blank" rel="noopener noreferrer">Discord Community</a></li>
              <li><a href="https://github.com/framersai" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              <li><a href="https://twitter.com/framersai" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green" target="_blank" rel="noopener noreferrer">Twitter/X</a></li>
              <li><a href="https://linkedin.com/company/framersai" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
              <li><a href="https://npmjs.com/org/framers" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green" target="_blank" rel="noopener noreferrer">NPM</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-sm mb-3 text-gray-600 dark:text-gray-400 uppercase tracking-wider">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/legal/privacy" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green">Privacy Policy</Link></li>
              <li><Link href="/legal/terms" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green">Terms of Service</Link></li>
              <li><Link href="/cookies" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green">Cookie Policy</Link></li>
              <li><a href="https://github.com/framersai/quarry/blob/master/LICENSE" className="nav-link text-gray-700 dark:text-gray-300 hover:text-frame-green" target="_blank" rel="noopener noreferrer">MIT License</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="text-center py-6 border-t border-gray-200/50 dark:border-gray-700/50">
          {/* Social Icons */}
          <div className="flex items-center justify-center gap-4 mb-4">
            {/* Twitter/X */}
            <a
              href="https://twitter.com/framersai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-frame-green dark:text-gray-400 dark:hover:text-frame-green transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Follow Frame.dev on Twitter @framersai"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            {/* GitHub */}
            <a
              href="https://github.com/framersai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-frame-green dark:text-gray-400 dark:hover:text-frame-green transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="View Frame.dev on GitHub @framersai"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            {/* Discord */}
            <a
              href="https://discord.gg/VXXC4SJMKh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-frame-green dark:text-gray-400 dark:hover:text-frame-green transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Join Frame.dev Discord community"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>
            {/* LinkedIn */}
            <a
              href="https://linkedin.com/company/framersai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-frame-green dark:text-gray-400 dark:hover:text-frame-green transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Follow Frame.dev on LinkedIn"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
            <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">|</span>
            <ThemeToggle />
          </div>
          {/* Cross-site links for SEO */}
          <div className="flex items-center justify-center gap-3 mb-3 text-xs">
            <a href="https://frame.dev" className="text-gray-500 hover:text-frame-green dark:text-gray-400 transition-colors">Frame.dev</a>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <a href="https://quarry.space" className="text-gray-500 hover:text-frame-green dark:text-gray-400 transition-colors">Quarry.space</a>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <a href="https://manic.agency" className="text-gray-500 hover:text-frame-green dark:text-gray-400 transition-colors" target="_blank" rel="noopener noreferrer">Manic Agency</a>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            @framersai everywhere
          </p>
          <p
            className="text-sm text-gray-600 dark:text-gray-300 mb-2 italic"
            style={{
              fontFamily: '"Brush Script MT", "Apple Chancery", cursive',
              letterSpacing: '0.02em'
            }}
          >
            The OS for humans, the codex of humanity.
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            © 2026 Frame.dev • A project by <a href="https://manic.agency" className="hover:text-frame-green transition-colors" target="_blank" rel="noopener noreferrer">Manic Agency LLC</a>
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            <a href="mailto:team@frame.dev" className="hover:text-frame-green transition-colors">team@frame.dev</a>
          </p>
        </div>
      </nav>
    </motion.footer>
  )
}
