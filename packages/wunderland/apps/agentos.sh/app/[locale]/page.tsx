import { CTASection } from '../../components/sections/cta-section'
import dynamic from 'next/dynamic'
import ScrollToTopButton from '../../components/ScrollToTopButton'
import { HeroSection } from '../../components/sections/hero-section'
import { useTranslations } from 'next-intl'

// Enable static generation for faster initial loads
export const dynamicParams = false
export const revalidate = 3600 // Revalidate every hour

// Lazy load the animated background - client-only, deferred
const AnimatedBackgroundLazy = dynamic(
  () => import('../../components/ui/animated-background').then(m => m.AnimatedBackground),
  { ssr: false, loading: () => null }
)

// Demo Video Player with captions - lazy loaded for better LCP
const DemoVideoPlayerLazy = dynamic(
  () => import('../../components/video/DemoVideoPlayer').then(m => m.DemoVideoPlayer),
  { ssr: false, loading: () => <div className="aspect-video bg-slate-900/50 rounded-xl animate-pulse" /> }
)

const ProductCardsLazy = dynamic(
  () => import('../../components/sections/product-cards-redesigned').then(m => m.ProductCardsRedesigned),
  { ssr: true }
)

const SkylineSectionLazy = dynamic(
  () => import('../../components/sections/skyline-section').then(m => m.SkylineSection),
  { ssr: false }
)

const GMISectionLazy = dynamic(
  () => import('../../components/sections/gmi-section').then(m => m.GMISection),
  { ssr: true }
)

const CodeExamplesSectionLazy = dynamic(
  () => import('../../components/sections/code-examples-section').then(m => m.CodeExamplesSection),
  { ssr: true }
)

const EcosystemSectionLazy = dynamic(
  () => import('../../components/sections/ecosystem-section').then(m => m.EcosystemSection),
  { ssr: true }
)

const SocialProofSectionLazy = dynamic(
  () => import('../../components/sections/social-proof-section').then(m => m.SocialProofSection),
  { ssr: true }
)

const FeaturesGridClient = dynamic(
  () => import('../../components/sections/features-grid-client'),
  { ssr: false }
)

const WorkbenchCTALazy = dynamic(
  () => import('../../components/sections/workbench-cta').then(m => m.WorkbenchCTA),
  { ssr: false }
)

export default function LandingPageRedesigned() {
  const tCommon = useTranslations()

  return (
    <>
      {/* Animated Background - deferred client-side */}
      <AnimatedBackgroundLazy />

      {/* Skip to Content for Accessibility */}
      <a href="#main-content" className="skip-to-content">
        {tCommon('skipToMain')}
      </a>

      {/* Main Content */}
      <main id="main-content">
        {/* Hero Section - SSR enabled for faster LCP */}
        <HeroSection />

        {/* Live Demo Videos with Captions */}
        <div className="lazy-section">
          <DemoVideoPlayerLazy />
        </div>

        {/* AgentOS Workbench CTA */}
        <div className="lazy-section-sm">
          <WorkbenchCTALazy />
        </div>

        {/* Product Cards Section */}
        <div className="lazy-section">
          <ProductCardsLazy />
        </div>

        {/* GMI Section with architecture diagrams */}
        <div className="lazy-section-lg">
          <GMISectionLazy />
        </div>

        {/* Enhanced Features Grid with Code Popovers */}
        <div className="lazy-section-lg">
          <FeaturesGridClient />
        </div>

        {/* Skyline Section */}
        <div className="lazy-section">
          <SkylineSectionLazy />
        </div>

        {/* Code Examples Section */}
        <div className="lazy-section-lg">
          <CodeExamplesSectionLazy />
        </div>

        {/* Social Proof Section */}
        <div className="lazy-section">
          <SocialProofSectionLazy />
        </div>

        {/* Ecosystem Section */}
        <div className="lazy-section">
          <EcosystemSectionLazy />
        </div>

        {/* Enterprise Edition Info */}
        <section 
          className="lazy-section-sm py-10 sm:py-12 px-4 sm:px-6 lg:px-8 relative"
          aria-labelledby="enterprise-heading"
        >
          <article className="max-w-6xl mx-auto holographic-card p-6 sm:p-8">
            <div className="grid md:grid-cols-2 gap-6">
              <header>
                <h2 id="enterprise-heading" className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                  AgentOS Enterprise
                </h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Self-hosting, advanced PII controls, OpenTelemetry-compatible telemetry, and local model hosting. Contact{' '}
                  <a className="underline text-[var(--color-accent-primary)] hover:text-[var(--color-accent-secondary)] transition-colors" href="mailto:team@frame.dev">team@frame.dev</a>.
                </p>
              </header>
              <ul className="space-y-1.5 text-sm text-[var(--color-text-secondary)]" role="list">
                <li>• CI/CD pipelines & self-hosted deployments</li>
                <li>• PII handling, anonymization, audit trails</li>
                <li>• Production telemetry (OpenTelemetry/OTLP) & evaluation</li>
                <li>• GPU orchestration & local models</li>
                <li>• SSO, payments & SDK integrations</li>
              </ul>
            </div>
          </article>
        </section>

        {/* CTA Section */}
        <div className="lazy-section-sm">
          <CTASection />
        </div>
      </main>

      {/* Scroll to Top Button */}
      <ScrollToTopButton />
    </>
  )
}
