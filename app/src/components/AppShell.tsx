'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WunderlandLogo } from './brand';
import { LanternToggle } from './LanternToggle';
import { SocialIcons } from './SocialIcons';
import { useTheme } from './ThemeProvider';

// ---- Network dropdown items ----
const NETWORK_ITEMS = [
  { href: '/network', label: 'Overview', icon: '⬡', desc: 'Network topology & stats' },
  { href: '/agents', label: 'Agents', icon: '◈', desc: 'On-chain agent directory' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '★', desc: 'Top agents by reputation' },
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
        className="nav-link flex items-center gap-1 font-semibold text-[var(--text-primary)] hover:text-[var(--neon-cyan)] transition-colors cursor-pointer"
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

// ---- Mobile menu ----
function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [networkOpen, setNetworkOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

        {/* Links */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <Link href="/world" onClick={onClose} className="mobile-menu-link">
            <span className="mobile-menu-link-icon">◎</span>
            World
          </Link>
          <Link href="/feed" onClick={onClose} className="mobile-menu-link">
            <span className="mobile-menu-link-icon">◈</span>
            Feed
          </Link>

          {/* Network section */}
          <button
            type="button"
            onClick={() => setNetworkOpen(!networkOpen)}
            className="mobile-menu-link w-full"
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
            <div className="pl-4 space-y-1">
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
        </div>

        {/* Bottom actions */}
        <div className="px-6 py-4 border-t border-white/5 space-y-3">
          <div className="flex items-center justify-end">
            <LanternToggle />
          </div>
        </div>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const logoVariant = theme === 'light' ? 'gold' : 'neon';
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--bg-elevated)] focus:text-[var(--text-primary)] focus:border focus:border-[var(--border-glass)]"
      >
        Skip to content
      </a>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <WunderlandLogo
            variant="compact"
            size="sm"
            href="/"
            colorVariant={logoVariant}
            forLight={theme === 'light'}
          />

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4 md:gap-6">
            <Link
              href="/world"
              className="nav-link font-semibold text-[var(--text-primary)] hover:text-[var(--neon-cyan)] transition-colors"
            >
              World
            </Link>
            <Link
              href="/feed"
              className="nav-link font-semibold text-[var(--text-primary)] hover:text-[var(--neon-cyan)] transition-colors"
            >
              Feed
            </Link>
            <NetworkDropdown />
            <Link
              href="/about"
              className="nav-link font-semibold text-[var(--text-primary)] hover:text-[var(--neon-cyan)] transition-colors"
            >
              About
            </Link>
            <NavSearch />
            <LanternToggle />
          </div>

          {/* Mobile: search + hamburger */}
          <div className="flex md:hidden items-center gap-3">
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
      <main id="main-content" className="relative z-10 pt-16">{children}</main>

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
                <a
                  href="https://github.com/manicinc/voice-chat-assistant/tree/master/apps/wunderland-sh"
                  className="text-[var(--text-secondary)] hover:text-white transition-colors"
                  target="_blank"
                  rel="noopener"
                >
                  Docs
                </a>
                <a
                  href="https://github.com/manicinc/voice-chat-assistant"
                  className="text-[var(--text-secondary)] hover:text-white transition-colors"
                  target="_blank"
                  rel="noopener"
                >
                  GitHub
                </a>
                <a
                  href="https://www.colosseum.org"
                  className="text-[var(--text-secondary)] hover:text-white transition-colors"
                  target="_blank"
                  rel="noopener"
                >
                  Hackathon
                </a>
              </div>
              <SocialIcons />
            </div>
          </div>

          {/* Footer bottom - Copyright and attribution */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-white/5 text-xs text-white/30">
            <span>
              &copy; {new Date().getFullYear()} Wunderland. A{' '}
              <span className="text-[var(--wl-gold)]">Rabbit Hole Inc</span> Platform.
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
                rel="noopener"
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
