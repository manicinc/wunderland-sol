'use client';

import { useCallback, useEffect, useMemo, useState, memo } from 'react';
import { ArrowRight, Github, Terminal, Star, GitBranch, Shield } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Toast } from '../ui/toast';
import { LinkButton } from '../ui/LinkButton';
import { Button } from '../ui/Button';
import { applyVisualTheme } from '@/lib/visual-design-system';
import { useTheme } from 'next-themes';

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

// Skeleton placeholder for morphing text
const TextSkeleton = ({ width }: { width: string }) => (
  <span 
    className="inline-block rounded bg-gradient-to-r from-violet-500/20 to-cyan-500/20 animate-pulse"
    style={{ width, height: '1em', verticalAlign: 'middle' }}
  />
);

// Lazy load heavy animation components - deferred for better LCP
// Use ResponsiveNeuralConstellation for a single scalable instance instead of 4 separate ones
const ResponsiveNeuralConstellation = dynamic(() => import('../hero/neural-constellation').then(m => ({ default: m.ResponsiveNeuralConstellation })), {
  ssr: false,
  loading: () => null
});

const ParticleMorphText = dynamic(() => import('../hero/particle-morph-text').then(m => ({ default: m.ParticleMorphText })), {
  ssr: false,
  loading: () => <TextSkeleton width="120px" />
});

const HeroSectionInner = memo(function HeroSectionInner() {
  const t = useTranslations('hero');
  const locale = useLocale();
  const { theme: currentTheme, resolvedTheme } = useTheme();
  const [showToast, setShowToast] = useState(false);
  const [githubStars, setGithubStars] = useState<number | null>(null);
  const [githubForks, setGithubForks] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const isDark = resolvedTheme === 'dark';

  // Mark as mounted after hydration, then trigger content ready
  useEffect(() => { 
    setMounted(true);
    // Small delay for smooth fade-in
    const timer = setTimeout(() => setContentReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const themeMap: Record<string, string> = {
      'sakura-sunset': 'sakura-sunset', 'twilight-neo': 'twilight-neo',
      'aurora-daybreak': 'aurora-daybreak', 'warm-embrace': 'warm-embrace', 'retro-terminus': 'retro-terminus'
    };
    applyVisualTheme(themeMap[currentTheme || ''] || 'aurora-daybreak', isDark);
  }, [currentTheme, isDark, mounted]);

  const productStats = useMemo(() => [
    { label: t('stats.githubStars'), value: githubStars ?? '—', icon: Star },
    { label: t('stats.forks'), value: githubForks ?? '—', icon: GitBranch }
  ], [githubStars, githubForks, t]);

  // Fetch GitHub stats with cache
  useEffect(() => {
    const cached = sessionStorage.getItem('github-stats');
    const parsed = cached ? safeJsonParse<{ stars: number; forks: number; ts: number }>(cached) : null;
    if (parsed && Date.now() - parsed.ts < 300000) { // 5 min cache
      setGithubStars(parsed.stars);
      setGithubForks(parsed.forks);
      return;
    }
    fetch('https://api.github.com/repos/framersai/agentos')
      .then(r => r.json())
      .then(d => {
        if (typeof d.stargazers_count === 'number') {
          setGithubStars(d.stargazers_count);
          setGithubForks(d.forks_count);
          sessionStorage.setItem('github-stats', JSON.stringify({ stars: d.stargazers_count, forks: d.forks_count, ts: Date.now() }));
        }
      })
      .catch(() => {});
  }, []);

  const copyCommand = useCallback(() => {
    navigator.clipboard.writeText('npm install @framers/agentos');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, []);

  const highlights = [
    { title: 'Streaming-first', detail: 'Token-level delivery' },
    { title: 'Deterministic', detail: 'Auditable routing' },
    { title: 'Zero-copy memory', detail: 'Unified recall' },
    { title: 'Portable', detail: 'Export anywhere' }
  ];

  const morphingWords: [string, string] = ['Adaptive', 'Emergent'];

  return (
    <section className="relative min-h-screen flex items-center bg-[var(--color-background-primary)] overflow-hidden" itemScope itemType="https://schema.org/SoftwareApplication">
      <meta itemProp="name" content="AgentOS" />
      <meta itemProp="applicationCategory" content="AI Framework" />
      <meta itemProp="operatingSystem" content="Any" />
      
      {/* Loading skeleton overlay - fades out when content ready */}
      <div 
        className={`absolute inset-0 z-20 bg-[var(--color-background-primary)] transition-opacity duration-300 pointer-events-none ${contentReady ? 'opacity-0' : 'opacity-100'}`}
        aria-hidden="true"
      >
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-18 mt-16">
          <div className="max-w-2xl space-y-4">
            <div className="h-10 w-64 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 rounded animate-pulse" />
            <div className="h-10 w-48 bg-gradient-to-r from-pink-500/10 to-indigo-500/10 rounded animate-pulse" />
            <div className="h-4 w-96 bg-[var(--color-background-secondary)] rounded animate-pulse mt-4" />
            <div className="flex gap-2 mt-4">
              <div className="h-10 w-32 bg-violet-500/20 rounded-lg animate-pulse" />
              <div className="h-10 w-36 bg-[var(--color-background-secondary)] rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Background gradient - CSS only */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 100% 80% at 70% 30%, rgba(139,92,246,0.12) 0%, transparent 50%)'
            : 'radial-gradient(ellipse 100% 80% at 70% 30%, rgba(139,92,246,0.06) 0%, transparent 50%)'
        }}
        aria-hidden="true"
      />

      {/* Neural Constellation - right side, single responsive instance */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30 sm:opacity-50 lg:opacity-70" 
        style={{ marginLeft: 'calc(15% + 40px)', marginTop: '-8%' }} 
        aria-hidden="true"
      >
        <ResponsiveNeuralConstellation />
      </div>

      <div className={`relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-18 transition-opacity duration-500 ${contentReady ? 'opacity-100' : 'opacity-0'}`}>
        <article className="max-w-2xl">
          <h1 className="font-bold tracking-tight mb-4" itemProp="description">
            <div className="text-[22px] sm:text-[30px] lg:text-[40px] leading-normal flex items-center">
              <span className="inline-block mr-2" style={{ marginTop: '-4px' }}>
                <ParticleMorphText words={morphingWords} interval={2500} fontSize={22} gradientFrom={isDark ? '#a78bfa' : '#8b5cf6'} gradientTo={isDark ? '#67e8f9' : '#06b6d4'} startIndex={0} className="sm:hidden" />
                <ParticleMorphText words={morphingWords} interval={2500} fontSize={30} gradientFrom={isDark ? '#a78bfa' : '#8b5cf6'} gradientTo={isDark ? '#67e8f9' : '#06b6d4'} startIndex={0} className="hidden sm:inline-block lg:hidden" />
                <ParticleMorphText words={morphingWords} interval={2500} fontSize={40} gradientFrom={isDark ? '#a78bfa' : '#8b5cf6'} gradientTo={isDark ? '#67e8f9' : '#06b6d4'} startIndex={0} className="hidden lg:inline-block" />
              </span>
              <span className="text-[var(--color-text-primary)]">intelligence</span>
            </div>
            <div className="text-[22px] sm:text-[30px] lg:text-[40px] leading-normal flex items-center">
              <span className="text-[var(--color-text-secondary)]">for&nbsp;</span>
              <span className="inline-block mr-2" style={{ marginTop: '-4px' }}>
                <ParticleMorphText words={morphingWords} interval={2500} fontSize={22} gradientFrom={isDark ? '#f472b6' : '#ec4899'} gradientTo={isDark ? '#818cf8' : '#6366f1'} startIndex={1} className="sm:hidden" />
                <ParticleMorphText words={morphingWords} interval={2500} fontSize={30} gradientFrom={isDark ? '#f472b6' : '#ec4899'} gradientTo={isDark ? '#818cf8' : '#6366f1'} startIndex={1} className="hidden sm:inline-block lg:hidden" />
                <ParticleMorphText words={morphingWords} interval={2500} fontSize={40} gradientFrom={isDark ? '#f472b6' : '#ec4899'} gradientTo={isDark ? '#818cf8' : '#6366f1'} startIndex={1} className="hidden lg:inline-block" />
              </span>
              <span className="text-[var(--color-text-primary)]">agents</span>
            </div>
          </h1>

          <p className="text-sm sm:text-base text-[var(--color-text-secondary)] mb-4 max-w-lg" itemProp="abstract">
            {t('subtitle')}
          </p>

          {/* CTAs */}
          <nav className="flex flex-wrap gap-2 mb-4" aria-label="Primary actions">
            <LinkButton href={`/${locale === 'en' ? '' : locale + '/'}docs`} variant="primary" size="lg" className="group text-sm">
              {t('getStarted')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </LinkButton>
            <a href="https://github.com/framersai/agentos" target="_blank" rel="noopener noreferrer" 
               className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] dark:text-white font-medium text-sm hover:border-[var(--color-accent-primary)] hover:bg-[var(--color-background-elevated)] transition-all"
               itemProp="codeRepository">
              <Github className="w-4 h-4 text-[var(--color-text-primary)]" aria-hidden="true" />
              <span className="text-[var(--color-text-primary)]">View on GitHub</span>
            </a>
          </nav>

          {/* Install command */}
          <div className="mb-4">
            <Button onClick={copyCommand} variant="secondary" className="gap-2 text-xs sm:text-sm" aria-label="Copy install command">
              <Terminal className="w-4 h-4 text-[var(--color-accent-primary)]" aria-hidden="true" />
              <code className="font-mono">npm install @framers/agentos</code>
            </Button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mb-3" aria-label="GitHub statistics">
            {productStats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-1.5 text-sm">
                <stat.icon className="w-4 h-4 text-[var(--color-accent-primary)]" aria-hidden="true" />
                <span className="font-semibold text-[var(--color-text-primary)]">{stat.value}</span>
                <span className="text-[var(--color-text-muted)]">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Badges - dynamic shields.io images */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="flex flex-wrap gap-2 mb-5" aria-label="Package badges">
            <a href="https://www.npmjs.com/package/@framers/agentos" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://img.shields.io/npm/v/@framers/agentos?logo=npm&color=cb3837" alt="npm version" className="h-5" />
            </a>
            <a href="https://codecov.io/gh/framersai/agentos" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://img.shields.io/codecov/c/github/framersai/agentos?logo=codecov" alt="test coverage" className="h-5" />
            </a>
            <a href="https://github.com/framersai/agentos/actions/workflows/ci.yml" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://img.shields.io/github/actions/workflow/status/framersai/agentos/ci.yml?logo=github" alt="CI status" className="h-5" />
            </a>
            <span className="hover:opacity-80 transition-opacity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://img.shields.io/badge/TypeScript-5.4+-3178c6?logo=typescript&logoColor=white" alt="TypeScript" className="h-5" />
            </span>
            <a href="https://github.com/framersai/agentos/blob/master/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://img.shields.io/badge/License-Apache_2.0-blue?logo=apache&logoColor=white" alt="Apache 2.0 License" className="h-5" />
            </a>
          </div>

          {/* Features */}
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-2 list-none p-0" aria-label="Key features">
            {highlights.map((h) => (
              <li key={h.title} className="p-2 rounded-md bg-[var(--color-background-secondary)]/40 border border-[var(--color-border-subtle)]/30">
                <div className="text-xs font-medium text-[var(--color-text-primary)]">{h.title}</div>
                <div className="text-[10px] text-[var(--color-text-muted)]">{h.detail}</div>
              </li>
            ))}
          </ul>

          {/* Compliance badges */}
          <div className="mt-4 flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" aria-hidden="true" />{t('compliance.gdpr')}</span>
            <span aria-hidden="true">•</span>
            <span>{t('compliance.soc2')}</span>
          </div>
        </article>
      </div>

      <Toast message={t('copiedToClipboard')} isVisible={showToast} onClose={() => setShowToast(false)} />
    </section>
  );
});

export function HeroSection() {
  return <HeroSectionInner />;
}
