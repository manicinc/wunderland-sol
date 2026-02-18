'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import type { Route } from 'next';
import { Menu, X, Globe, Sparkles, ArrowRight, Github } from 'lucide-react';
import AgentOSWordmark from './branding/AgentOSWordmark';
import { ModeToggle } from './mode-toggle';
import { ThemeSelector } from './theme-selector';
import { LanguageSwitcher } from './language-switcher';

/**
 * Enhanced SiteHeader with modern design and marketplace link
 */
export function SiteHeader() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const NAV_LINKS = useMemo(() => [
    { href: '/about', label: t('about') },
    { href: '/#features', label: t('features') },
    { href: '/blog', label: 'Blog' },
    { href: 'https://docs.agentos.sh/', label: t('docs') },
  ], [t]);

  const localizeHref = useCallback((href: string) => {
    // Handle empty/root paths – always prefix locale for consistency
    if (!href || href === '/') {
      return `/${locale}`;
    }
    // Handle external links
    if (href.startsWith('http') || href.startsWith('mailto:')) {
      return href;
    }
    // Handle anchors ("#section" links)
    if (href.startsWith('#')) {
      return `/${locale}${href}`;
    }

    // Normalize path (ensure it starts with /)
    const path = href.startsWith('/') ? href : `/${href}`;
    
    // If path is already prefixed with locale, return as-is
    if (path === `/${locale}` || path.startsWith(`/${locale}/`)) {
      return path;
    }

    // For hash links, append to current locale path properly
    if (path.startsWith('/#')) {
      return locale === 'en' ? path : `/${locale}${path}`;
    }

    return `/${locale}${path}`;
  }, [locale]);

  const homeHref = useMemo(() => (locale === 'en' ? '/' : `/${locale}`), [locale]);

  // Debug i18n logs (development only)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    try {
      const localized = NAV_LINKS.map(l => ({ src: l.href, dst: localizeHref(l.href) }));
      // eslint-disable-next-line no-console
      console.info('[i18n:nav]', { locale, homeHref, links: localized });
    } catch {
      // ignore console errors
    }
  }, [locale, homeHref, localizeHref, NAV_LINKS]);

  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const container = menuRef.current;
    const focusable = container?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [];
    focusable[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (event.key === 'Tab' && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const handleHashClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Extract the hash from href (e.g., "/#features" -> "features")
    const hashMatch = href.match(/#(.+)$/);
    if (hashMatch) {
      const targetId = hashMatch[1];
      const element = document.getElementById(targetId);
      if (element) {
        e.preventDefault();
        closeMenu();
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Update URL without triggering navigation
        window.history.pushState(null, '', href);
      }
    }
  };

  return (
    <header
      className="fixed top-0 z-50 w-full animate-fade-in"
      style={{ willChange: 'transform' }}
    >
      {/* Holographic glass panel with subtle iridescent edge */}
      <div
        className="absolute inset-0 backdrop-blur-xl border-b border-transparent shadow-[0_10px_35px_rgba(4,6,15,0.45)]"
        style={{
          backgroundColor: 'var(--color-background-primary)',
          backgroundImage:
            'linear-gradient(135deg,' +
            ' color-mix(in oklab, var(--color-background-primary) 90%, transparent),' +
            ' color-mix(in oklab, var(--color-accent-primary) 16%, transparent) 55%,' +
            ' color-mix(in oklab, var(--color-accent-secondary) 12%, transparent))',
        }}
      />
      {/* Iridescent bottom hairline */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[1px] opacity-70"
        style={{
          background:
            'linear-gradient(90deg,' +
            ' color-mix(in oklab, var(--color-accent-primary) 55%, transparent),' +
            ' color-mix(in oklab, var(--color-accent-secondary) 35%, transparent) 50%,' +
            ' color-mix(in oklab, var(--color-accent-primary) 55%, transparent))',
          boxShadow: '0 0 24px color-mix(in oklab, var(--color-accent-primary) 25%, transparent)',
        }}
      />
      
      <div className="relative z-10 w-full">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-2 sm:px-5 lg:px-6 py-3">
        <Link href={homeHref as Route} aria-label="AgentOS home" className="group flex items-center gap-2 transition-all hover:scale-[1.02] leading-none" onClick={closeMenu}>
          <div className="relative overflow-visible">
            <div className="absolute inset-0 bg-accent-primary/20 blur-xl rounded-full animate-pulse-glow" />
            <AgentOSWordmark className="h-10 relative z-10 transform scale-[1.18]" size="md" />
            <span className="sr-only">AgentOS</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-5 lg:gap-7 text-sm font-medium lg:flex" aria-label="Main navigation">
          {NAV_LINKS.map((link) => {
            const localizedHref = localizeHref(link.href);
            const isExternal = localizedHref.startsWith('http');
            const hasHash = localizedHref.includes('#');
            if (isExternal || hasHash) {
              return (
                  <a
                    key={link.href}
                    href={localizedHref}
                    onClick={hasHash && !isExternal ? (e) => handleHashClick(e, localizedHref) : undefined}
                    className="nav-link group relative inline-block py-2 px-1 text-[var(--color-text-primary)] font-semibold transition-all duration-300 ease-out hover:text-[var(--color-accent-primary)]"
                  >
                    <span className="relative z-10 transition-all duration-300 ease-out">
                      {link.label}
                    </span>
                    <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] transition-all duration-500 ease-out group-hover:w-full" />
                  </a>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={localizedHref as Route}
                  className="nav-link group relative inline-block py-2 px-1 text-[var(--color-text-primary)] font-semibold transition-all duration-300 ease-out hover:text-[var(--color-accent-primary)]"
                >
                  <span className="relative z-10 transition-all duration-300 ease-out">
                    {link.label}
                  </span>
                  <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] transition-all duration-500 ease-out group-hover:w-full" />
                </Link>
              );
            })}
          </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* GitHub repo CTA (prominent with subtle hover) */}
          <a
            href="https://github.com/framersai/agentos"
            className="relative hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-full border border-border-subtle text-[var(--color-text-primary)] hover:text-accent-primary transition-all duration-300 hover:-translate-y-0.5 group"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open AgentOS on GitHub"
            title="Open AgentOS on GitHub"
          >
            <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: 'linear-gradient(90deg, color-mix(in oklab, var(--color-accent-primary) 18%, transparent), color-mix(in oklab, var(--color-accent-secondary) 14%, transparent))' }}
            />
            <Github className="w-4 h-4" />
            <span className="font-semibold">{t('github')}</span>
          </a>
          {/* Marketplace button - Coming Soon */}
          <span
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-morphism text-sm font-semibold text-[var(--color-text-muted)] cursor-not-allowed opacity-60"
            title="Marketplace coming soon"
          >
            <Globe className="w-4 h-4" />
            {t('marketplace')}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]">Soon</span>
          </span>

          {/* Frame.dev CTA - Better styled with high contrast, smaller */}
          <a
            href="https://frame.dev"
            className="hidden md:inline-flex items-center gap-2 px-2 py-1.5 rounded-lg text-[var(--color-text-on-accent)] text-xs font-bold transition-all duration-300 group border border-border-subtle hover:scale-105"
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: 'linear-gradient(90deg, var(--color-accent-primary), var(--color-accent-secondary))' }}
          >
            <Sparkles className="w-3 h-3" />
            Frame.dev
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </a>

          {/* Theme controls and language switcher */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ModeToggle />
            <ThemeSelector />
          </div>

          {/* Mobile GitHub icon */}
          <a
            href="https://github.com/framersai/agentos"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-xl glass-morphism hover:bg-accent-primary/10 transition-all"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open AgentOS on GitHub"
            title="Open AgentOS on GitHub"
          >
            <Github className="h-5 w-5" />
          </a>

          {/* Mobile menu button */}
          <button
            type="button"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex items-center justify-center p-2 rounded-xl glass-morphism hover:bg-accent-primary/10 transition-all lg:hidden min-h-[44px] min-w-[44px]"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`lg:hidden transition-all duration-200 ${menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}
        id="mobile-menu"
        style={{ display: menuOpen ? 'block' : 'none' }}
      >
        <div ref={menuRef} className="mx-4 mb-4 mt-2 rounded-2xl glass-morphism shadow-modern overflow-hidden">
          <nav className="flex flex-col" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => {
              const localizedHref = localizeHref(link.href);
              const isExternal = localizedHref.startsWith('http');
              const hasHash = localizedHref.includes('#');
              if (isExternal || hasHash) {
                return (
                  <a
                    key={link.href}
                    href={localizedHref}
                    onClick={hasHash && !isExternal ? (e) => handleHashClick(e, localizedHref) : closeMenu}
                    className="px-6 py-4 text-base font-bold text-[var(--color-text-primary)] hover:text-accent-primary hover:bg-accent-primary/5 transition-all duration-300 ease-out block border-b border-border-subtle/20 last:border-0"
                  >
                    {link.label}
                  </a>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={localizedHref as Route}
                  onClick={closeMenu}
                  className="px-6 py-4 text-base font-bold text-[var(--color-text-primary)] hover:text-accent-primary hover:bg-accent-primary/5 transition-all duration-300 ease-out block border-b border-border-subtle/20 last:border-0"
                >
                  {link.label}
                </Link>
              );
            })}
            <a
              href="https://app.vca.chat/marketplace"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="px-6 py-4 text-base font-bold text-[var(--color-text-primary)] hover:text-accent-primary hover:bg-accent-primary/5 transition-all duration-300 ease-out flex items-center gap-2 border-b border-border-subtle/20"
            >
              <Globe className="w-5 h-5" />
              {t('marketplace')}
            </a>
            <a
              href="https://github.com/framersai/agentos"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
              className="px-6 py-4 text-base font-bold text-[var(--color-text-primary)] hover:text-accent-primary hover:bg-accent-primary/5 transition-all duration-300 ease-out flex items-center gap-2 border-b border-border-subtle/20"
            >
              <Github className="w-5 h-5" />
              {t('github')}
            </a>
            <div className="p-4">
              <a
                href="https://frame.dev"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="block w-full px-4 py-3 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white text-base font-bold text-center hover:shadow-modern transition-all"
              >
                Visit Frame.dev
              </a>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}