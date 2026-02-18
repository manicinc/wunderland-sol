'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sun, Moon, Database, Gauge, Bot, FlaskConical,
  Info, Settings, ChevronDown, ExternalLink, BookOpen, Github,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

const tabs = [
  { name: 'Datasets', href: '/datasets', icon: Database },
  { name: 'Graders', href: '/graders', icon: Gauge },
  { name: 'Candidates', href: '/candidates', icon: Bot },
  { name: 'Experiments', href: '/experiments', icon: FlaskConical },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3021/api';

export function Navigation() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [aboutOpen, setAboutOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAboutOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const aboutActive = pathname.startsWith('/about');

  return (
    <header className="bg-card border-b border-border" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex h-14 items-center justify-between">
          <Link
            href="/"
            className="font-mono text-sm font-semibold tracking-tight text-muted-foreground hover:text-foreground transition-colors"
          >
            eval-harness
          </Link>

          <nav className="flex items-center gap-1">
            {/* About dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setAboutOpen((v) => !v)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all
                  ${aboutActive
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                `}
                style={{ borderRadius: 'var(--radius)' }}
              >
                <Info className="h-4 w-4" />
                <span className="hidden sm:inline">About</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${aboutOpen ? 'rotate-180' : ''}`} />
              </button>

              {aboutOpen && (
                <div
                  className="absolute left-0 top-full mt-1 w-52 bg-card border border-border shadow-lg z-50 py-1"
                  style={{ borderRadius: 'var(--radius)' }}
                >
                  <Link
                    href="/about"
                    onClick={() => setAboutOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Info className="h-4 w-4" />
                    About
                  </Link>
                  <a
                    href={API_BASE.replace(/\/api$/, '/api/docs')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    API Docs
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                  <a
                    href="https://github.com/jddunn/full-stack-eval-harness-example"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Github className="h-4 w-4" />
                    Repository
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                  <div className="border-t border-border my-1" />
                  <Link
                    href="/settings"
                    onClick={() => setAboutOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </div>
              )}
            </div>

            {tabs.map((tab) => {
              const isActive = pathname.startsWith(tab.href);
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                  style={{ borderRadius: 'var(--radius)' }}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.name}</span>
                </Link>
              );
            })}
          </nav>

          <button
            onClick={toggleTheme}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            style={{ borderRadius: 'var(--radius)' }}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
