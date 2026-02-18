'use client'

import { useEffect, lazy, Suspense } from 'react'
import dynamic from 'next/dynamic'
import {
  HeroSection,
  AIQASection,
  SpiralLearningSection,
} from './components/sections'
import QuarryNavigation from '@/components/quarry/ui/quarry-core/QuarryNavigation'
import Footer from '@/components/footer'
import { ScrollToTop } from './components/ScrollToTop'
import { ScrollProgress } from './components/ScrollProgress'
import './fabric-landing.css'

// Skeleton loader for lazy sections with shimmer effect
const SectionSkeleton = () => (
  <div className="relative h-96 my-8 mx-4 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-900/50">
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
    <div className="p-8 space-y-6">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      <div className="space-y-3">
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-4 w-4/6 bg-gray-200 dark:bg-gray-800 rounded" />
      </div>
      <div className="grid grid-cols-3 gap-4 pt-4">
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      </div>
    </div>
  </div>
)

// Lazy load below-fold components for better initial page load performance
const TabbedInfoSection = dynamic(() => import('./components/TabbedInfoSection').then(m => ({ default: m.TabbedInfoSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const AIEditorFeaturesSection = dynamic(() => import('./components/AIEditorFeaturesSection').then(m => ({ default: m.AIEditorFeaturesSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const FabricSection = dynamic(() => import('./components/sections').then(m => ({ default: m.FabricSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const FeaturesGridSection = dynamic(() => import('./components/sections').then(m => ({ default: m.FeaturesGridSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const SupertagsShowcaseSection = dynamic(() => import('./components/sections').then(m => ({ default: m.SupertagsShowcaseSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const SupernotesSection = dynamic(() => import('./components/sections').then(m => ({ default: m.SupernotesSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const CollectionsSection = dynamic(() => import('./components/sections').then(m => ({ default: m.CollectionsSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const DynamicDocumentsSection = dynamic(() => import('./components/sections').then(m => ({ default: m.DynamicDocumentsSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const BlockTaggingSection = dynamic(() => import('./components/sections').then(m => ({ default: m.BlockTaggingSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const ResearchShowcaseSection = dynamic(() => import('./components/sections').then(m => ({ default: m.ResearchShowcaseSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const TemplateShowcaseSection = dynamic(() => import('./components/sections').then(m => ({ default: m.TemplateShowcaseSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const APIShowcaseSection = dynamic(() => import('./components/sections').then(m => ({ default: m.APIShowcaseSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const PlannerSection = dynamic(() => import('./components/sections').then(m => ({ default: m.PlannerSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const StorageOptionsSection = dynamic(() => import('./components/sections').then(m => ({ default: m.StorageOptionsSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const FabricSyncSection = dynamic(() => import('./components/sections').then(m => ({ default: m.FabricSyncSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const CompetitorComparisonSection = dynamic(() => import('./components/sections').then(m => ({ default: m.CompetitorComparisonSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const UseCasesSection = dynamic(() => import('./components/sections').then(m => ({ default: m.UseCasesSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const QuickFAQSection = dynamic(() => import('./components/sections').then(m => ({ default: m.QuickFAQSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const LaunchPriceBanner = dynamic(() => import('./components/sections').then(m => ({ default: m.LaunchPriceBanner })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const PricingSection = dynamic(() => import('./components/sections').then(m => ({ default: m.PricingSection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})
const FinalCTASection = dynamic(() => import('./components/sections').then(m => ({ default: m.FinalCTASection })), {
  loading: () => <SectionSkeleton />,
  ssr: true,
})

/* ═══════════════════════════════════════════════════════════════════════════════
   QUARRY LANDING PAGE
   Monochromatic neuromorphic design with green accents
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function QuarryLandingPage() {
  // Handle hash scroll on page load (for navigation from other pages)
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      // Retry scroll until element is found (animations may delay render)
      const scrollToHash = (attempts = 0) => {
        const element = document.querySelector(hash)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        } else if (attempts < 10) {
          // Retry with increasing delay (50, 100, 150... up to 500ms)
          setTimeout(() => scrollToHash(attempts + 1), 50 * (attempts + 1))
        }
      }
      // Initial delay to let React hydrate
      setTimeout(() => scrollToHash(), 150)
    }
  }, [])

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-quarry-offwhite dark:bg-quarry-charcoal text-quarry-charcoal dark:text-quarry-offwhite selection:bg-quarry-green-500/20 selection:text-quarry-green-700 dark:selection:text-quarry-green-50">
      {/* Scroll Progress Indicator */}
      <ScrollProgress />

      {/* Navigation */}
      <QuarryNavigation />

      {/* Main content */}
      <main className="codex-landing">
        <HeroSection />
        <AIQASection />
        <SpiralLearningSection />
        <TabbedInfoSection />
        <FabricSection />
        <FeaturesGridSection />
        <SupertagsShowcaseSection />
        <SupernotesSection />
        <CollectionsSection />
        <DynamicDocumentsSection />
        <BlockTaggingSection />
        <AIEditorFeaturesSection />
        <ResearchShowcaseSection />
        <TemplateShowcaseSection />
        <APIShowcaseSection />
        <PlannerSection />
        <StorageOptionsSection />
        <CompetitorComparisonSection />
        <FabricSyncSection />
        <UseCasesSection />
        <LaunchPriceBanner />
        <PricingSection />
        <FinalCTASection />
        <QuickFAQSection />
      </main>

      {/* Scroll to Top Button */}
      <ScrollToTop />

      {/* Footer */}
      <Footer />
    </div>
  )
}
