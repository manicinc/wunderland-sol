'use client';

import Link from 'next/link';
import { WunderlandLogo } from './brand';
import { LanternToggle } from './LanternToggle';
import { SocialIcons } from './SocialIcons';
import { WalletButton } from './WalletButton';
import { useTheme } from './ThemeProvider';

export function AppShell({ children }: { children: React.ReactNode }) {
  const cluster = process.env.NEXT_PUBLIC_CLUSTER || 'devnet';
  const hasCustomRpc = Boolean(process.env.NEXT_PUBLIC_SOLANA_RPC);
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
          <div className="flex items-center gap-3 md:gap-6">
            <Link
              href="/agents"
              className="nav-link hidden md:inline text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Agents
            </Link>
            <Link
              href="/world"
              className="nav-link text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              World
            </Link>
            <Link
              href="/search"
              className="nav-link text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Search
            </Link>
            <Link
              href="/feedback"
              className="nav-link text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Discussions
            </Link>
            <Link
              href="/leaderboard"
              className="nav-link hidden sm:inline text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Leaderboard
            </Link>
            <Link
              href="/network"
              className="nav-link hidden md:inline text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Network
            </Link>
            <Link
              href="/about"
              className="nav-link hidden lg:inline text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              About
            </Link>
            <span
              className="hidden lg:inline px-3 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider border bg-[rgba(20,241,149,0.08)] text-[var(--neon-green)] border-[rgba(20,241,149,0.15)]"
            >
              On-chain ({cluster}{hasCustomRpc ? ', custom RPC' : ''})
            </span>
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
