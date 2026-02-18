/**
 * HeroSectionServer - Static Server Component for maximum LCP performance
 * 
 * This is the critical above-the-fold content that needs to render immediately.
 * All animations are CSS-only, no JavaScript required for initial paint.
 * 
 * Key optimizations:
 * - No 'use client' directive - renders on server
 * - No framer-motion - uses Tailwind CSS animations
 * - Background effects are lazy-loaded client components
 * - H1 renders immediately for fast LCP
 */

import Link from 'next/link'
import {
  Check,
  ChevronDown,
  Github,
  Lock,
  Shield,
  Sparkles,
  Star,
  User,
} from 'lucide-react'

// Client component wrapper for deferred background effects
import { DeferredHeroBackgrounds } from './DeferredHeroBackgrounds'

export function HeroSectionServer() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 pt-28 pb-20 overflow-hidden bg-quarry-offwhite dark:bg-quarry-charcoal">
      {/* Deferred background effects - loads after LCP */}
      <DeferredHeroBackgrounds />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="text-center lg:text-left">
            {/* Hero tagline - Static for performance */}
            <div className="mb-4 h-10 relative animate-fade-in [animation-delay:100ms] [animation-fill-mode:backwards]">
              <span className="font-handwriting text-xl sm:text-2xl md:text-3xl text-gray-600 dark:text-gray-300 inline-block">
                The productivity app that does{' '}
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400">
                  everything
                </span>
              </span>
            </div>

            {/* Main Hero Headline - Critical LCP element - NO animation delay */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              <span className="text-quarry-charcoal dark:text-quarry-offwhite">Take notes that</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400">
                organize themselves
              </span>
            </h1>

            {/* Subtitle with privacy-focused messaging */}
            <div className="mb-6 animate-fade-in [animation-delay:150ms] [animation-fill-mode:backwards]">
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-xl leading-relaxed mb-3">
                AI-native. AI-optional. <strong className="text-quarry-charcoal dark:text-quarry-offwhite">100% offline</strong>. Tags, connections, and summaries emerge automatically — <strong className="text-quarry-green-700 dark:text-quarry-green-50">no cloud, no API keys</strong>. MIT Licensed.
              </p>
              {/* Privacy-focused badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border border-emerald-200/50 dark:border-emerald-800/50 animate-fade-in [animation-delay:200ms] [animation-fill-mode:backwards]">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Privacy-focused
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                <Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  E2E encryption for cloud sync
                </span>
              </div>
            </div>

            {/* Edition badges - Neuromorphic style */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-sm mb-8 animate-fade-in [animation-delay:200ms] [animation-fill-mode:backwards]">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 px-4 py-2 rounded-full bg-quarry-offwhite dark:bg-quarry-charcoal-deep shadow-neuro-sm-light dark:shadow-neuro-sm-dark border border-gray-200/30 dark:border-white/5 hover:scale-[1.02] transition-transform">
                <Check className="w-4 h-4 text-quarry-green-700 dark:text-quarry-green-50" />
                <span><strong className="text-quarry-charcoal dark:text-quarry-offwhite">Community</strong> — Free & MIT Licensed</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 px-4 py-2 rounded-full bg-quarry-offwhite dark:bg-quarry-charcoal-deep shadow-neuro-sm-light dark:shadow-neuro-sm-dark border border-gray-200/30 dark:border-white/5 hover:scale-[1.02] transition-transform">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span><strong className="text-quarry-charcoal dark:text-quarry-offwhite">Premium</strong> — <span className="line-through text-gray-400 dark:text-gray-500">$199.99</span> <span className="text-quarry-green-600 dark:text-quarry-green-400 font-semibold">$99.99 Beta</span></span>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center mb-8 animate-fade-in [animation-delay:250ms] [animation-fill-mode:backwards]">
              {/* GitHub Star Button - external link, no prefetch needed */}
              <a
                href="https://github.com/framersai/quarry"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                <Github className="w-5 h-5" />
                <span>Star on GitHub</span>
                <Star className="w-4 h-4 text-amber-400 dark:text-amber-500 group-hover:scale-110 transition-transform" />
              </a>

              {/* Premium Button - hash link, no prefetch needed */}
              <a
                href="#pricing"
                className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-quarry-charcoal dark:bg-quarry-offwhite text-quarry-offwhite dark:text-quarry-charcoal font-semibold shadow-neuro-light dark:shadow-neuro-dark hover:shadow-[0_0_20px_rgba(45,184,106,0.4)] dark:hover:shadow-[0_0_20px_rgba(125,219,163,0.3)] hover:-translate-y-0.5 transition-all"
              >
                {/* Static Premium Icon - Diamond */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L3 9L12 22L21 9L12 2Z" className="fill-quarry-green-400 dark:fill-quarry-green-600" />
                  <path d="M12 5L7 9L12 17L17 9L12 5Z" className="fill-quarry-green-200 dark:fill-quarry-green-400 opacity-80" />
                </svg>
                <span className="flex items-center gap-1.5">
                  <span style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif' }}>Get Premium</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-quarry-green-500/20 dark:bg-quarry-green-600/30 text-quarry-green-100 dark:text-quarry-green-700 font-bold">
                    $99
                  </span>
                </span>
              </a>
            </div>

            {/* Account Sign In Link */}
            <div className="text-center lg:text-left text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in [animation-delay:300ms] [animation-fill-mode:backwards]">
              <span className="inline-flex items-center gap-2">
                Already have an account?{' '}
                <Link
                  href="/quarry/login"
                  prefetch={false}
                  className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  Sign In
                </Link>
              </span>
            </div>

            {/* Beta Pricing Value Banner */}
            <div className="text-center lg:text-left mb-6 animate-fade-in [animation-delay:300ms] [animation-fill-mode:backwards]">
              <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/30">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Beta pricing
                </span>
                <span className="hidden sm:block text-amber-300 dark:text-amber-700">|</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  <strong className="text-quarry-charcoal dark:text-quarry-offwhite">$99.99</strong> lifetime
                  <span className="text-gray-400 dark:text-gray-500 mx-1.5">•</span>
                  <a 
                    href="mailto:team@frame.dev?subject=Student%20Discount" 
                    className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                  >
                    <strong>$69.99</strong> students
                  </a>
                </span>
              </div>
              <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-500">
                <span className="text-quarry-green-600 dark:text-quarry-green-400 font-medium">Free lifetime updates</span> — $199.99 value after beta (incl. team sync & workflows)
              </p>
              <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-600">
                Student? Email <a href="mailto:team@frame.dev?subject=Student%20Discount" className="text-violet-500 dark:text-violet-400 hover:underline">team@frame.dev</a> with your .edu email for a promo code
              </p>
            </div>

            {/* Stats row - Neuromorphic inset style */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 text-center animate-fade-in [animation-delay:350ms] [animation-fill-mode:backwards]">
              {[
                { value: '100%', label: 'Offline' },
                { value: 'MIT', label: 'Licensed' },
                { value: 'Auto', label: 'Organization' },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="cursor-default px-4 py-3 rounded-xl bg-quarry-offwhite dark:bg-quarry-charcoal-deep shadow-neuro-inset-light dark:shadow-neuro-inset-dark hover:scale-[1.02] transition-transform"
                >
                  <div className="text-xl md:text-2xl font-bold text-quarry-charcoal dark:text-quarry-offwhite">{stat.value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* LLM footnote */}
            <p className="mt-6 text-xs text-gray-400 dark:text-gray-500 max-w-md animate-fade-in [animation-delay:400ms] [animation-fill-mode:backwards]">
              Core features (auto-tagging, connections, flashcard generation) work 100% offline. Optional LLM enhancements available via OpenAI, Claude, or local Ollama.{' '}
              <Link href="/quarry/faq#llm" prefetch={false} className="text-quarry-green-700 dark:text-quarry-green-50 hover:text-quarry-green-500 underline underline-offset-2">
                Learn more →
              </Link>
            </p>
          </div>

          {/* Right: Empty space for Knowledge Flow Visualization - Desktop */}
          {/* The actual viz is rendered absolutely positioned by DeferredHeroBackgrounds */}
          <div className="hidden lg:block relative h-[400px] lg:h-[450px]" aria-hidden="true" />
        </div>
      </div>

      {/* Scroll indicator - hash link, no prefetch needed */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-fade-in [animation-delay:500ms] [animation-fill-mode:backwards]">
        <a
          href="#quarry"
          className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-quarry-green-500 transition-colors"
          aria-label="Scroll to learn more about Quarry"
        >
          <span className="sr-only">Scroll down to learn more</span>
          <div className="relative animate-bounce">
            <ChevronDown className="w-6 h-6" aria-hidden="true" />
          </div>
        </a>
      </div>
    </section>
  )
}

export default HeroSectionServer

