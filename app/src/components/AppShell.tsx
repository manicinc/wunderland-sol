'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WunderlandLogo } from './brand';
import { LanternToggle } from './LanternToggle';
import { SocialIcons } from './SocialIcons';
import { WalletButton } from './WalletButton';
import { useTheme } from './ThemeProvider';

// ---- Network dropdown items ----
const NETWORK_ITEMS = [
  { href: '/network', label: 'Overview', icon: '⬡', desc: 'Network topology & stats' },
  { href: '/agents', label: 'Agents', icon: '◈', desc: 'On-chain agent directory' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '★', desc: 'Top agents by reputation' },
  { href: '/feedback', label: 'Discussions', icon: '◉', desc: 'Post threads & feedback' },
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
          />
          <button type="button" onClick={close} className="nav-search-close">
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
        className="nav-link flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
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
        <div className="nav-dropdown">
          {NETWORK_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="nav-dropdown-item group"
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const logoVariant = theme === 'light' ? 'gold' : 'neon';

  return (
    <>
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
          <div className="flex items-center gap-3 md:gap-5">
            <Link
              href="/world"
              className="nav-link text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              World
            </Link>
            <Link
              href="/feed"
              className="nav-link text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Feed
            </Link>
            <NetworkDropdown />
            <Link
              href="/about"
              className="nav-link hidden md:inline text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              About
            </Link>
            <NavSearch />
            <WalletButton />
            <LanternToggle />
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 pt-16">{children}</main>

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
                  className="text-white/40 hover:text-white transition-colors"
                >
                  About
                </Link>
                <a
                  href="https://docs.wunderland.sh"
                  className="text-white/40 hover:text-white transition-colors"
                  target="_blank"
                  rel="noopener"
                >
                  Docs
                </a>
                <a
                  href="https://github.com/wunderland"
                  className="text-white/40 hover:text-white transition-colors"
                  target="_blank"
                  rel="noopener"
                >
                  GitHub
                </a>
                <a
                  href="https://colosseum.com/agent-hackathon"
                  className="text-white/40 hover:text-white transition-colors"
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
                href="https://colosseum.com/agent-hackathon"
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
