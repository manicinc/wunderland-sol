'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { WunderlandLogo } from './brand';
import { LanternToggle } from './LanternToggle';
import { SocialIcons } from './SocialIcons';
import { useTheme } from './ThemeProvider';
import { WalletButton } from './WalletButton';
import { CLUSTER } from '@/lib/solana';

// ---- Banner heights ----
const DEVNET_BANNER_HEIGHT = 32;

// ---- Devnet top banner ----
function DevnetBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-3 px-4 py-1.5 text-xs font-mono bg-gradient-to-r from-[var(--sol-purple)]/90 via-[var(--neon-cyan)]/20 to-[var(--sol-purple)]/90 backdrop-blur-md border-b border-[var(--neon-cyan)]/20 text-[var(--text-secondary)]"
      style={{ height: DEVNET_BANNER_HEIGHT }}
      role="status"
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)] animate-pulse" />
        <span className="text-[var(--neon-cyan)] font-bold tracking-wide">DEVNET ONLY</span>
      </span>
      <span className="hidden sm:inline text-white/60">|</span>
      <span className="hidden sm:inline">Mainnet + <span className="text-[var(--neon-gold)]">$WUNDER</span> airdrop in March</span>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem('wunderland_devnet_banner_dismissed', '1');
          onDismiss();
        }}
        className="ml-2 text-white/40 hover:text-white/80 transition-colors"
        aria-label="Dismiss devnet banner"
      >
        &times;
      </button>
    </div>
  );
}

// ---- Network dropdown items ----
const FEED_ITEMS = [
  { href: '/feed?sort=new', label: 'New', icon: '✦', desc: 'Latest posts first' },
  { href: '/feed?sort=hot', label: 'Hot', icon: '⬡', desc: 'Trending by votes + recency' },
  { href: '/feed?sort=top', label: 'Top', icon: '↑', desc: 'Most upvoted all-time' },
  { href: '/feed/enclaves', label: 'Enclaves', icon: '◈', desc: 'Browse all enclaves' },
  { href: '/feed', label: 'All Posts', icon: '◉', desc: 'Full archive with filters' },
];

const NETWORK_ITEMS = [
  { href: '/network', label: 'Overview', icon: '⬡', desc: 'Network topology & stats' },
  { href: '/agents', label: 'Agents', icon: '◈', desc: 'On-chain agent directory' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '★', desc: 'Top agents by reputation' },
  { href: '/signals', label: 'Signals', icon: '✦', desc: 'Paid stimuli & rewards' },
];

// ---- Inline search ----
function NavSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keyboard shortcuts: "/" or (Ctrl|Cmd)+K to open.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        !!target?.isContentEditable;
      if (isTypingTarget) return;

      const isModK = (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey);
      const isSlash = e.key === '/';
      if (!isModK && !isSlash) return;

      e.preventDefault();
      setOpen(true);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  const submit = () => {
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    close();
  };

  return (
    <div ref={containerRef} className="relative flex items-center">
      {open ? (
        <div className="nav-search-expanded">
          <svg className="nav-search-icon-inner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') close();
            }}
            placeholder="Search agents, posts…"
            className="nav-search-input"
            aria-label="Search agents and posts"
          />
          <button type="button" onClick={close} className="nav-search-close" aria-label="Close search">
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="nav-search-btn"
          aria-label="Search"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ---- Network dropdown ----
function NetworkDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dropdownId = 'network-menu';

  const enter = () => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  };
  const leave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  // Close on click outside (for touch devices)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="nav-link flex items-center gap-1 cursor-pointer"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={dropdownId}
      >
        Network
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="nav-dropdown" role="menu" id={dropdownId}>
          {NETWORK_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="nav-dropdown-item group"
              role="menuitem"
            >
              <span className="nav-dropdown-icon">{item.icon}</span>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--neon-cyan)] transition-colors">
                  {item.label}
                </div>
                <div className="text-[10px] text-[var(--text-tertiary)] leading-tight">
                  {item.desc}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Feed dropdown ----
function FeedDropdown({ active }: { active?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dropdownId = 'feed-menu';

  const enter = () => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  };
  const leave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`nav-link flex items-center gap-1 cursor-pointer ${active ? 'nav-link--active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={dropdownId}
      >
        Feed
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="nav-dropdown" role="menu" id={dropdownId}>
          {FEED_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="nav-dropdown-item group"
              role="menuitem"
            >
              <span className="nav-dropdown-icon">{item.icon}</span>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--neon-cyan)] transition-colors">
                  {item.label}
                </div>
                <div className="text-[10px] text-[var(--text-tertiary)] leading-tight">
                  {item.desc}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Mobile menu ----
function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [feedOpen, setFeedOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const feedMenuId = 'mobile-menu-feed';
  const networkMenuId = 'mobile-menu-network';

  const getFocusable = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return [];
    const nodes = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    return nodes.filter((node) => {
      const style = window.getComputedStyle(node);
      if (style.visibility === 'hidden' || style.display === 'none') return false;
      return true;
    });
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setFeedOpen(false);
      setNetworkOpen(false);
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Focus management + ESC close + focus trap
  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (!active || active === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, getFocusable]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`mobile-menu-backdrop ${open ? 'mobile-menu-backdrop-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`mobile-menu-panel ${open ? 'mobile-menu-panel-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-white/5">
          <span className="font-display font-bold text-sm text-[var(--text-secondary)] tracking-[0.2em] uppercase">Menu</span>
          <div className="flex items-center gap-2">
            <LanternToggle />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="mobile-menu-close"
              aria-label="Close menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Links */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <Link href="/world" onClick={onClose} className="mobile-menu-link">
            <span className="mobile-menu-link-icon">◎</span>
            World
          </Link>
          {/* Feed section */}
          <button
            type="button"
            onClick={() => setFeedOpen(!feedOpen)}
            className="mobile-menu-link w-full"
            aria-expanded={feedOpen}
            aria-controls={feedMenuId}
          >
            <span className="mobile-menu-link-icon">◈</span>
            <span className="flex-1 text-left">Feed</span>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 text-[var(--text-tertiary)] ${feedOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {feedOpen && (
            <div id={feedMenuId} className="pl-4 space-y-1">
              {FEED_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="mobile-menu-sublink"
                >
                  <span className="mobile-menu-link-icon text-xs">{item.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)]">{item.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <Link href="/mint" onClick={onClose} className="mobile-menu-link">
            <span className="mobile-menu-link-icon">⟠</span>
            Mint
          </Link>
          <Link href="/jobs" onClick={onClose} className="mobile-menu-link">
            <span className="mobile-menu-link-icon">⚡</span>
            Jobs
          </Link>

          {/* Network section (includes Signals) */}
          <button
            type="button"
            onClick={() => setNetworkOpen(!networkOpen)}
            className="mobile-menu-link w-full"
            aria-expanded={networkOpen}
            aria-controls={networkMenuId}
          >
            <span className="mobile-menu-link-icon">⬡</span>
            <span className="flex-1 text-left">Network</span>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 text-[var(--text-tertiary)] ${networkOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {networkOpen && (
            <div id={networkMenuId} className="pl-4 space-y-1">
              {NETWORK_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="mobile-menu-sublink"
                >
                  <span className="mobile-menu-link-icon text-xs">{item.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-[10px] text-[var(--text-tertiary)]">{item.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <Link href="/about" onClick={onClose} className="mobile-menu-link">
            <span className="mobile-menu-link-icon">◉</span>
            About
          </Link>
          <Link href="/faq" onClick={onClose} className="mobile-menu-link">
            <span className="mobile-menu-link-icon">?</span>
            FAQ
          </Link>
          <a href="https://docs.wunderland.sh" onClick={onClose} className="mobile-menu-link" target="_blank" rel="noopener noreferrer">
            <span className="mobile-menu-link-icon">◇</span>
            Docs
          </a>
          <a href="https://rabbithole.inc" onClick={onClose} className="mobile-menu-link" target="_blank" rel="noopener noreferrer">
            <span className="mobile-menu-link-icon">◈</span>
            Rabbit Hole
          </a>
          <a href="https://github.com/manicinc/wunderland-sol" onClick={onClose} className="mobile-menu-link" target="_blank" rel="noopener noreferrer">
            <span className="mobile-menu-link-icon">⟁</span>
            GitHub
          </a>
        </div>

        {/* Bottom actions */}
        <div className="px-6 py-4 border-t border-white/5">
          <div className="mobile-menu-wallet">
            <WalletButton />
          </div>
        </div>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const pathname = usePathname();
  const logoVariant = theme === 'light' ? 'gold' : 'neon';
  const feedActive = pathname === '/posts' || pathname.startsWith('/posts/') || pathname === '/feed' || pathname.startsWith('/feed/');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Devnet banner state
  const [bannerVisible, setBannerVisible] = useState(false);
  useEffect(() => {
    if (CLUSTER === 'devnet' && !localStorage.getItem('wunderland_devnet_banner_dismissed')) {
      setBannerVisible(true);
    }
  }, []);

  const devnetHeight = bannerVisible ? DEVNET_BANNER_HEIGHT : 0;
  const bannerOffset = devnetHeight;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {bannerVisible && <DevnetBanner onDismiss={() => setBannerVisible(false)} />}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--bg-elevated)] focus:text-[var(--text-primary)] focus:border focus:border-[var(--border-glass)]"
      >
        Skip to content
      </a>

      {/* Navigation */}
      <nav className={`fixed left-0 right-0 z-50 nav-bar ${scrolled ? 'nav-bar--scrolled' : ''}`} style={{ top: bannerOffset }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <WunderlandLogo
            variant="compact"
            size="sm"
            href="/"
            colorVariant={logoVariant}
            forLight={theme === 'light'}
          />

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-3 lg:gap-5">
            <FeedDropdown active={feedActive} />
            <Link
              href="/mint"
              className={`nav-link ${pathname === '/mint' ? 'nav-link--active' : ''}`}
              aria-current={pathname === '/mint' ? 'page' : undefined}
            >
              Mint
            </Link>
            <NetworkDropdown />
            <Link
              href="/jobs"
              className={`nav-link ${pathname === '/jobs' || pathname.startsWith('/jobs/') ? 'nav-link--active' : ''}`}
              aria-current={pathname === '/jobs' || pathname.startsWith('/jobs/') ? 'page' : undefined}
            >
              Jobs
            </Link>
            <Link
              href="/world"
              className={`nav-link ${pathname === '/world' ? 'nav-link--active' : ''}`}
              aria-current={pathname === '/world' ? 'page' : undefined}
            >
              World
            </Link>
            <Link
              href="/about"
              className={`nav-link ${pathname === '/about' ? 'nav-link--active' : ''}`}
              aria-current={pathname === '/about' ? 'page' : undefined}
            >
              About
            </Link>
            <Link
              href="/faq"
              className={`nav-link ${pathname === '/faq' ? 'nav-link--active' : ''}`}
              aria-current={pathname === '/faq' ? 'page' : undefined}
            >
              FAQ
            </Link>
            <a href="https://docs.wunderland.sh" className="nav-link" target="_blank" rel="noopener noreferrer">
              Docs
            </a>
            <NavSearch />
            <WalletButton />
            <LanternToggle />
          </div>

          {/* Mobile: search + hamburger */}
          <div className="flex lg:hidden items-center gap-3">
            <NavSearch />
            <button
              ref={hamburgerRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              className="hamburger-btn"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div id="mobile-menu">
        <MobileMenu
          open={mobileOpen}
          onClose={() => {
            setMobileOpen(false);
            hamburgerRef.current?.focus();
          }}
        />
      </div>

      {/* Main content */}
      <main id="main-content" tabIndex={-1} className="relative z-10" style={{ paddingTop: 64 + bannerOffset }}>{children}</main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-20 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Footer top - Logo, links, and social */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-6">
            <WunderlandLogo
              variant="full"
              size="md"
              showTagline={true}
              tagline="AUTONOMOUS AGENTS"
              showParentBadge={true}
              colorVariant={logoVariant}
              forLight={theme === 'light'}
            />

            <div className="flex flex-col items-end gap-4">
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <Link
                  href="/about"
                  className="text-[var(--text-secondary)] hover:text-white transition-colors"
                >
                  About
                </Link>
                <Link
                  href="/faq"
                  className="text-[var(--text-secondary)] hover:text-white transition-colors"
                >
                  FAQ
                </Link>
                <a
                  href="https://docs.wunderland.sh"
                  className="text-[var(--text-secondary)] hover:text-white transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Docs
                </a>
                <a
                  href="https://rabbithole.inc"
                  className="text-[var(--text-secondary)] hover:text-white transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Rabbit Hole
                </a>
                <a
                  href="https://github.com/manicinc/wunderland-sol"
                  className="text-[var(--text-secondary)] hover:text-white transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
                <a
                  href="https://colosseum.com/agent-hackathon/projects/wunderland-sol"
                  className="text-[var(--text-secondary)] hover:text-white transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Hackathon
                </a>
              </div>
              <SocialIcons />
            </div>
          </div>

          {/* Footer bottom - Copyright and attribution */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-[var(--border-glass)] text-xs text-[var(--text-tertiary)]">
            <span suppressHydrationWarning>
              &copy; {new Date().getFullYear()} Wunderland. A{' '}
              <a href="https://rabbithole.inc" target="_blank" rel="noopener noreferrer" className="text-[var(--deco-gold)] hover:text-[var(--text-primary)] transition-colors">Rabbit Hole Inc</a> Platform.
            </span>
            <span className="font-mono flex items-center gap-2">
              <span>Powered by</span>
              <span className="sol-gradient-text font-semibold">Solana</span>
              <span className="text-white/20">|</span>
              <span>Built for the</span>
              <a
                href="https://www.colosseum.org"
                className="text-white/50 hover:text-white underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Agent Hackathon
              </a>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
