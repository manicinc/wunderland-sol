'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { HeroSectionRedesigned } from '../../components/sections/hero-section-redesigned';
import { ProductCardsRedesigned } from '../../components/sections/product-cards-redesigned';
import { MultiAgentCollaboration } from '../../components/sections/multi-agent-collaboration';
import { EnterpriseSkyline } from '../../components/sections/enterprise-skyline';
import { HolographicVideoPlayer } from '../../components/media/holographic-video-player';
import { CodePopover, InlineCodePopover } from '../../components/ui/code-popover';
import { GMISection } from '../../components/sections/gmi-section';
import { CodeExamplesSection } from '../../components/sections/code-examples-section';
import { EcosystemSection } from '../../components/sections/ecosystem-section';
import { CTASection } from '../../components/sections/cta-section';
import { SocialProofSection } from '../../components/sections/social-proof-section';
import dynamic from 'next/dynamic';
import { RealStats } from '../../components/real-stats';
import ScrollToTopButton from '../../components/ScrollToTopButton';
import { LazyMotion, domAnimation, motion } from 'framer-motion';
import { Globe, Package, Database, Terminal, Users, Brain, Sparkles, Code2 } from 'lucide-react';

// Lazy load the premium animated background
const PremiumAnimatedBackgroundLazy = dynamic(
  () =>
    import('../../components/ui/premium-animated-background').then(
      m => m.PremiumAnimatedBackground
    ),
  { ssr: false }
);

export default function LandingPageRedesigned() {
  const t = useTranslations('features');
  const tCommon = useTranslations();
  const tMarketplace = useTranslations('marketplace');
  const tCaseStudies = useTranslations('caseStudies');

  // Enhanced feature cards with code popovers
  const featureCards = [
    {
      icon: Users,
      title: t('multiAgent.title'),
      body: t('multiAgent.description'),
      pill: t('multiAgent.pill'),
      gradient: 'from-violet-500 to-purple-500',
      layout: 'horizontal',
      span: 'lg:col-span-2',
      bullets: [t('multiAgent.bullet1'), t('multiAgent.bullet2')],
      codeExample: {
        title: 'Multi-Agent Setup',
        language: 'typescript',
        code: `const agency = new AgentOS.Agency({
  agents: [
    { role: 'researcher', model: 'gpt-4' },
    { role: 'analyst', model: 'claude-3' },
    { role: 'executor', model: 'llama-3' }
  ],
  orchestration: 'parallel'
});`,
      },
    },
    {
      icon: Package,
      title: t('toolPacks.title'),
      body: t('toolPacks.description'),
      pill: t('toolPacks.pill'),
      gradient: 'from-blue-500 to-cyan-500',
      layout: 'vertical',
      bullets: [t('toolPacks.bullet1'), t('toolPacks.bullet2')],
      codeExample: {
        title: 'Tool Pack Integration',
        language: 'typescript',
        code: `import { WebScraper, DataAnalyzer } from '@agentos/tools';

agent.use(WebScraper, {
  timeout: 5000,
  maxRetries: 3
});`,
      },
    },
    {
      icon: Globe,
      title: t('language.title'),
      body: t('language.description'),
      pill: t('language.pill'),
      gradient: 'from-purple-500 to-pink-500',
      layout: 'vertical',
      bullets: [t('language.bullet1'), t('language.bullet2')],
      codeExample: {
        title: 'Language Support',
        language: 'typescript',
        code: `// Supports 50+ languages
const response = await agent.chat({
  message: userInput,
  language: 'ja', // Japanese
  context: { cultural: true }
});`,
      },
    },
    {
      icon: Database,
      title: t('storage.title'),
      body: t('storage.description'),
      pill: t('storage.pill'),
      gradient: 'from-green-500 to-emerald-500',
      layout: 'horizontal',
      span: 'lg:col-span-2',
      bullets: [t('storage.bullet1'), t('storage.bullet2')],
      codeExample: {
        title: 'Memory Fabric',
        language: 'typescript',
        code: `const memory = new MemoryFabric({
  vector: PineconeDB,
  episodic: Redis,
  working: InMemory,
  sync: true
});`,
      },
    },
    {
      icon: Terminal,
      title: t('workbench.title'),
      body: t('workbench.description'),
      pill: t('workbench.pill'),
      gradient: 'from-orange-500 to-red-500',
      layout: 'vertical',
      bullets: [t('workbench.bullet1'), t('workbench.bullet2'), t('workbench.bullet3')],
      codeExample: {
        title: 'Dev Workbench',
        language: 'bash',
        code: `# Start development environment
agentos dev --port 3000

# Deploy to production
agentos deploy --env production`,
      },
    },
  ];

  return (
    <LazyMotion features={domAnimation}>
      {/* Premium Animated Background */}
      <DeferredPremiumBackground />

      {/* Skip to Content for Accessibility */}
      <a href="#main-content" className="skip-to-content">
        {tCommon('skipToMain')}
      </a>

      {/* Main Content */}
      <main id="main-content">
        {/* Hero Section with Redesigned Components */}
        <HeroSectionRedesigned />

        {/* Video Demo Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text mb-4">
                See AgentOS in Action
              </h2>
              <p className="text-lg text-muted max-w-3xl mx-auto">
                Watch how multi-agent orchestration works in real-world scenarios
              </p>
            </motion.div>

            <HolographicVideoPlayer
              placeholder={true}
              title="AgentOS Platform Demo"
              description="Multi-agent collaboration, real-time streaming, and enterprise orchestration"
            />
          </div>
        </section>

        {/* Product Cards Section */}
        <ProductCardsRedesigned />

        {/* Multi-Agent Collaboration Section */}
        <MultiAgentCollaboration />

        {/* GMI Section with architecture diagrams */}
        <GMISection />

        {/* Enhanced Features Grid with Code Popovers */}
        <section
          id="features"
          className="py-20 px-4 sm:px-6 lg:px-8 holographic-gradient relative overflow-hidden"
        >
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl sm:text-5xl mb-6 font-bold gradient-text">
                Developer-First Platform
              </h2>
              <p className="text-lg text-muted max-w-3xl mx-auto">
                Production-grade infrastructure with full code examples on hover
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-6">
              {featureCards.map((card, index) => {
                const Icon = card.icon;
                const isHorizontal = card.layout === 'horizontal';
                return (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                    className={`group holographic-card h-full ${card.span ?? ''} ${
                      isHorizontal
                        ? 'p-8 md:flex md:items-center md:gap-6'
                        : 'p-8 flex flex-col gap-4'
                    }`}
                  >
                    <div
                      className={`flex ${isHorizontal ? 'items-center gap-6 w-full' : 'items-start gap-4'}`}
                    >
                      <div
                        className={`shrink-0 h-14 w-14 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-lg`}
                      >
                        <Icon className="w-7 h-7 drop-shadow" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-primary/10 text-xs font-semibold text-accent-primary">
                            {card.pill}
                          </span>
                          <CodePopover
                            examples={[card.codeExample]}
                            trigger={
                              <button className="p-1 rounded-lg hover:bg-glass-surface transition-colors">
                                <Code2 className="w-4 h-4 text-accent-primary" />
                              </button>
                            }
                            position="bottom"
                          />
                        </div>
                        <h3 className="text-xl font-bold group-hover:text-accent-primary transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-muted text-sm">{card.body}</p>
                        {card.bullets && (
                          <ul className="space-y-1.5 text-sm">
                            {card.bullets.map(bullet => (
                              <li key={bullet} className="flex items-start gap-2">
                                <span
                                  className="mt-1 h-1.5 w-1.5 rounded-full bg-accent-primary"
                                  aria-hidden="true"
                                />
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Enterprise Skyline Section */}
        <EnterpriseSkyline />

        {/* Code Examples Section */}
        <CodeExamplesSection />

        {/* Social Proof Section */}
        <SocialProofSection />

        {/* Ecosystem Section */}
        <EcosystemSection />

        {/* CTA Section */}
        <CTASection />
      </main>

      {/* Scroll to Top Button */}
      <ScrollToTopButton />
    </LazyMotion>
  );
}

function DeferredPremiumBackground() {
  const [showBg, setShowBg] = useState(false);

  useEffect(() => {
    const mount = () => setShowBg(true);
    if ('requestIdleCallback' in window) {
      const w = window as Window & {
        requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void;
      };
      w.requestIdleCallback(mount, { timeout: 1200 });
    } else {
      const t = setTimeout(mount, 600);
      return () => clearTimeout(t);
    }
  }, []);

  if (!showBg) return null;

  return <PremiumAnimatedBackgroundLazy />;
}
